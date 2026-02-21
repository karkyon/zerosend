// =====================================
// ファイルパス  : zerosend/src/services/auth.service.ts
//
// 説明・目的・機能概要:
//   認証サービス。
//   login()      : email_hash 検索 → bcrypt 検証 → JWT 発行
//   verifyTotp() : ロック確認 → TOTP 検証 → auth_token 発行 → Redis 保存
//   verifyJwt()  : JWT 署名検証（auth.middleware から呼ばれる）
//   全操作で audit_log を記録する。
//
// 作成日時 : 2026-02-21
// 更新日時 : 2026-02-21
//
// 依存関係:
//   jsonwebtoken, otplib, node:crypto
//   ../lib/prisma, ./redis.service, ../utils/hash
//   ../utils/crypto, ../utils/logger, ../types/errors, ../types/index
// =====================================

import jwt from 'jsonwebtoken'
import { authenticator } from 'otplib'
import { randomBytes } from 'node:crypto'

import { prisma } from '../lib/prisma.js'
import {
  setAuthSession,
  incrementLock,
  getLockCount,
  isLocked,
  LOCK_LIMIT,
} from './redis.service.js'
import { verifyPassword } from '../utils/hash.js'
import { hashEmail } from '../utils/hash.js'
import { aesDecrypt } from '../utils/crypto.js'
import { logger } from '../utils/logger.js'
import {
  UnauthorizedError,
  AuthFailedError,
  AuthLockedError,
  NotFoundError,
  BadRequestError,
} from '../types/errors.js'
import type { JwtPayload } from '../types/index.js'

// ─── JWT 設定 ─────────────────────────────────────────────────────────────────

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not set')
  return secret
}

const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? '8h') as jwt.SignOptions['expiresIn']

// ─── AuthService.login() ─────────────────────────────────────────────────────

export type LoginInput = {
  email: string
  password: string
  ipAddress?: string
  userAgent?: string
}

export type LoginResult = {
  accessToken: string
  expiresIn: string
  userId: string
  displayName: string
  role: 'user' | 'admin'
}

/**
 * AuthService.login()
 *
 * 1. email_hash でユーザ検索（email を DB に平文で送らない）
 * 2. bcrypt でパスワード検証
 * 3. アカウント有効確認
 * 4. JWT 発行 (sub=userId, email, role)
 * 5. last_login_at 更新 + audit_log(auth_success/auth_fail)
 */
export async function login(input: LoginInput): Promise<LoginResult> {
  const emailHash = hashEmail(input.email)

  // 1. email_hash でユーザ検索
  const user = await prisma.user.findUnique({
    where: { emailHash },
    select: {
      id:           true,
      email:        true,
      displayName:  true,
      role:         true,
      passwordHash: true,
      isActive:     true,
    },
  })

  // 2. ユーザが存在しない場合: タイミング攻撃対策のためダミー bcrypt を実行
  if (!user) {
    await verifyPassword('__dummy__', '$2b$12$00000000000000000000000000000000000000000000000000000')
    // 監査ログ（user不明のため actor_id は null）
    await writeAuditLog({
      eventType:  'auth_fail',
      result:     'failure',
      ipAddress:  input.ipAddress,
      userAgentHash: input.userAgent ? hashEmail(input.userAgent) : undefined,
      metadata:   { reason: 'user_not_found', emailHash },
    })
    throw new UnauthorizedError('Invalid credentials')
  }

  // 3. bcrypt 検証
  const passwordOk = await verifyPassword(input.password, user.passwordHash)

  if (!passwordOk || !user.isActive) {
    await writeAuditLog({
      actorId:    user.id,
      eventType:  'auth_fail',
      result:     'failure',
      ipAddress:  input.ipAddress,
      userAgentHash: input.userAgent ? hashEmail(input.userAgent) : undefined,
      metadata:   { reason: passwordOk ? 'account_inactive' : 'wrong_password' },
    })
    throw new UnauthorizedError('Invalid credentials')
  }

  // 4. JWT 発行
  const payload: JwtPayload = {
    sub:   user.id,
    email: user.email,
    role:  user.role as 'user' | 'admin',
  }
  const accessToken = jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN })

  // 5. last_login_at 更新 (非同期・エラーは無視)
  prisma.user.update({
    where: { id: user.id },
    data:  { lastLoginAt: new Date() },
  }).catch((err) => logger.warn('[AuthService] Failed to update lastLoginAt', { err }))

  // 監査ログ
  await writeAuditLog({
    actorId:   user.id,
    eventType: 'auth_success',
    result:    'success',
    ipAddress: input.ipAddress,
    userAgentHash: input.userAgent ? hashEmail(input.userAgent) : undefined,
  })

  logger.info('[AuthService] login success', { userId: user.id, role: user.role })

  return {
    accessToken,
    expiresIn:   JWT_EXPIRES_IN as string,
    userId:      user.id,
    displayName: user.displayName,
    role:        user.role as 'user' | 'admin',
  }
}

// ─── AuthService.verifyTotp() ────────────────────────────────────────────────

export type VerifyTotpInput = {
  urlToken: string    // ダウンロードURLのトークン（どのセッションの2FAか識別）
  email: string       // 受信者メールアドレス（ユーザ検索に使用）
  otp: string         // 6桁 TOTP コード
  ipAddress?: string
  userAgent?: string
}

export type VerifyTotpResult = {
  authToken: string   // 以降の /download/:token/key で使用する Bearer トークン
  expiresIn: number   // 秒
}

/**
 * AuthService.verifyTotp()
 *
 * 1. lock:{url_token} を Redis で確認 → 5回失敗でロック済なら 423
 * 2. url_token でセッション取得 → 有効期限・ステータス確認
 * 3. 受信者 email_hash でユーザ検索 → totp_secret_enc 取得
 * 4. AES-256-GCM で TOTP シークレット復号
 * 5. otplib で TOTP 検証（±1ウィンドウ許容）
 * 6. 失敗: lock カウントインクリメント + audit_log(auth_fail)
 * 7. 成功: auth_token 生成 → Redis session:{auth_token} に保存(TTL:600s) + audit_log(auth_success)
 */
export async function verifyTotp(input: VerifyTotpInput): Promise<VerifyTotpResult> {
  const { urlToken, email, otp } = input

  // 1. ロック確認
  if (await isLocked(urlToken)) {
    await writeAuditLog({
      eventType: 'lock',
      result:    'failure',
      ipAddress: input.ipAddress,
      metadata:  { urlToken, reason: 'already_locked' },
    })
    throw new AuthLockedError(`URL ${urlToken} is locked due to too many failed attempts`)
  }

  // 2. transfer_session 取得（url_token で検索）
  const session = await prisma.transferSession.findUnique({
    where:  { urlToken },
    select: {
      id:             true,
      status:         true,
      expiresAt:      true,
      recipientEmail: true,
      deletedAt:      true,
    },
  })

  if (!session || session.deletedAt) {
    throw new NotFoundError(`Session not found: ${urlToken}`)
  }
  if (session.expiresAt < new Date()) {
    throw new NotFoundError(`Session expired: ${urlToken}`)
  }
  if (session.status === 'deleted' || session.status === 'expired') {
    throw new NotFoundError(`Session is no longer available: ${urlToken}`)
  }

  // 3. 受信者 email_hash でユーザ検索
  const emailHash = hashEmail(email)
  const user = await prisma.user.findUnique({
    where:  { emailHash },
    select: { id: true, totpSecretEnc: true, isActive: true },
  })

  if (!user || !user.isActive) {
    await handleTotpFailure(urlToken, input)
    throw new AuthFailedError(await remainingAttempts(urlToken))
  }

  if (!user.totpSecretEnc) {
    // TOTP 未登録
    throw new BadRequestError('TOTP is not configured for this user')
  }

  // 4. TOTP シークレット復号
  let totpSecret: string
  try {
    totpSecret = aesDecrypt(user.totpSecretEnc)
  } catch (err) {
    logger.error('[AuthService] Failed to decrypt TOTP secret', { userId: user.id })
    throw new BadRequestError('TOTP configuration error')
  }

  // 5. TOTP 検証 (otplib: ±1ウィンドウ = 90秒の猶予)
  authenticator.options = { window: 1 }
  const isValid = authenticator.check(otp, totpSecret)

  if (!isValid) {
    // 6. 失敗処理
    await handleTotpFailure(urlToken, input, user.id)
    throw new AuthFailedError(await remainingAttempts(urlToken))
  }

  // 7. 成功: auth_token 生成 → Redis に保存
  const authToken = randomBytes(32).toString('base64url')
  await setAuthSession(authToken, { userId: user.id, urlToken })

  // 監査ログ
  await writeAuditLog({
    actorId:       user.id,
    sessionId:     session.id,
    eventType:     'auth_success',
    result:        'success',
    ipAddress:     input.ipAddress,
    userAgentHash: input.userAgent ? hashEmail(input.userAgent) : undefined,
    metadata:      { method: 'totp' },
  })

  logger.info('[AuthService] TOTP verification success', { userId: user.id, urlToken })

  return {
    authToken,
    expiresIn: 600,  // 10分
  }
}

// ─── JWT 検証（auth.middleware から呼ばれる） ─────────────────────────────────

export function verifyJwt(token: string): JwtPayload {
  try {
    return jwt.verify(token, getJwtSecret()) as JwtPayload
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token expired')
    }
    throw new UnauthorizedError('Invalid token')
  }
}

// ─── Private helpers ──────────────────────────────────────────────────────────

async function handleTotpFailure(
  urlToken: string,
  input: VerifyTotpInput,
  userId?: string,
): Promise<void> {
  const count = await incrementLock(urlToken)

  await writeAuditLog({
    actorId:       userId,
    eventType:     'auth_fail',
    result:        'failure',
    ipAddress:     input.ipAddress,
    userAgentHash: input.userAgent ? hashEmail(input.userAgent) : undefined,
    metadata:      { urlToken, failCount: count, method: 'totp' },
  })

  // ロック閾値到達時: lock イベントも記録
  if (count >= LOCK_LIMIT) {
    await writeAuditLog({
      actorId:   userId,
      eventType: 'lock',
      result:    'failure',
      ipAddress: input.ipAddress,
      metadata:  { urlToken, lockedAt: new Date().toISOString() },
    })
    logger.warn('[AuthService] URL locked due to too many TOTP failures', { urlToken, count })
  }
}

async function remainingAttempts(urlToken: string): Promise<number> {
  const count = await getLockCount(urlToken)
  return Math.max(0, LOCK_LIMIT - count)
}

// ─── 監査ログ書き込み ────────────────────────────────────────────────────────

type AuditLogInput = {
  sessionId?:    string
  actorId?:      string
  eventType:     'auth_success' | 'auth_fail' | 'lock' | 'unlock' | 'url_issued' | 'access' | 'dl_success' | 'dl_fail' | 'deleted' | 'admin_delete'
  result:        'success' | 'failure'
  ipAddress?:    string
  userAgentHash?: string
  metadata?:     Record<string, unknown>
}

async function writeAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        sessionId:     input.sessionId,
        actorId:       input.actorId,
        eventType:     input.eventType as any,
        result:        input.result as any,
        ipAddress:     input.ipAddress,
        userAgentHash: input.userAgentHash,
        metadata:      input.metadata ?? null,
      },
    })
  } catch (err) {
    // 監査ログ失敗はサービス継続を妨げない（ログだけ残す）
    logger.error('[AuthService] Failed to write audit log', { err, input })
  }
}