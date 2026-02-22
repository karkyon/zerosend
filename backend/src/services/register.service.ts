// =====================================
// ファイルパス  : zerosend/backend/src/services/register.service.ts
//
// 説明・目的・機能概要:
//   ユーザー登録サービス。
//   register() : email_hash 重複確認 → bcrypt → users INSERT → user_public_keys INSERT
//   email 平文は DB に保存しない（email_hash のみ保存）。
//   Kyber-768 公開鍵のフィンガープリント（SHA3-256）を計算して保存。
//
// 作成日時 : 2026-02-22
// 更新日時 : 2026-02-22
//
// 依存関係:
//   ../lib/prisma, ../utils/hash, ../utils/logger
//   ../types/errors
// =====================================

import { prisma }                                    from '../lib/prisma.js'
import { hashEmail, hashPassword, publicKeyFingerprint } from '../utils/hash.js'
import { logger }                                    from '../utils/logger.js'
import { ConflictError, BadRequestError }            from '../types/errors.js'

// ─── RegisterService.register() ─────────────────────────────────────────────

export type RegisterInput = {
  email:          string
  displayName:    string
  password:       string
  publicKeyB64:   string   // Kyber-768 公開鍵 Base64
  keyType:        string   // 'kyber768' 固定
  totpSecretEnc?: string   // AES-256-GCM 暗号化済み TOTP シークレット（任意）
}

export type RegisterResult = {
  userId:         string
  keyFingerprint: string
}

/**
 * RegisterService.register()
 *
 * 1. keyType バリデーション（kyber768 のみ許可）
 * 2. email_hash で重複チェック（平文メールは DB に送らない）
 * 3. bcrypt でパスワードハッシュ化
 * 4. users テーブルに INSERT（email 平文保存 + email_hash 保存）
 * 5. user_public_keys テーブルに INSERT（is_primary=true）
 * 6. { userId, keyFingerprint } 返却
 */
export async function register(input: RegisterInput): Promise<RegisterResult> {
  // 1. keyType バリデーション
  if (input.keyType !== 'kyber768') {
    throw new BadRequestError(`Unsupported key type: ${input.keyType}. Only 'kyber768' is supported.`)
  }

  // 公開鍵 Base64 の基本バリデーション
  if (!input.publicKeyB64 || input.publicKeyB64.trim().length === 0) {
    throw new BadRequestError('public_key_b64 is required')
  }
  let keyBuf: Buffer
  try {
    keyBuf = Buffer.from(input.publicKeyB64, 'base64')
    if (keyBuf.length === 0) throw new Error('empty')
  } catch {
    throw new BadRequestError('public_key_b64 must be a valid Base64 string')
  }

  // 2. email_hash 重複チェック
  const emailHash = hashEmail(input.email)
  const existing  = await prisma.user.findUnique({
    where:  { emailHash },
    select: { id: true },
  })
  if (existing) {
    throw new ConflictError('Email already registered')
  }

  // 3. bcrypt パスワードハッシュ化
  const passwordHash = await hashPassword(input.password)

  // 公開鍵フィンガープリント（SHA3-256）
  const fingerprint = publicKeyFingerprint(input.publicKeyB64)

  // 4 & 5. トランザクションで users + user_public_keys を一括 INSERT
  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        email:          input.email,          // 平文メールも保存（送信時に必要）
        emailHash,
        displayName:    input.displayName,
        passwordHash,
        role:           'user',
        totpSecretEnc:  input.totpSecretEnc ?? null,
        isActive:       true,
      },
      select: { id: true },
    })

    await tx.userPublicKey.create({
      data: {
        userId:       createdUser.id,
        publicKeyB64: input.publicKeyB64,
        fingerprint,
        keyType:      'kyber768',
        isPrimary:    true,
        isRevoked:    false,
      },
    })

    return createdUser
  })

  logger.info('[RegisterService] User registered', {
    userId:      user.id,
    displayName: input.displayName,
    fingerprint,
  })

  return {
    userId:         user.id,
    keyFingerprint: fingerprint,
  }
}