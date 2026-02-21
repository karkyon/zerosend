// =====================================
// ファイルパス  : zerosend/src/services/transfer.service.ts
//
// 説明・目的・機能概要:
//   ファイル転送セッション管理サービス。
//   initiate()    : 受信者公開鍵取得 → 署名付きアップロード URL 生成 → transfer_sessions INSERT
//   storeKey()    : K_enc を Redis へ保存 → cloud_file_id 更新
//   finalizeUrl() : status→ready 更新 → メール送信 → share_url 返却
//   ゼロ保持設計に従い、ファイル本体・平文 AES 鍵はサーバを経由しない。
//
// 作成日時 : 2026-02-21
// 更新日時 : 2026-02-21
//
// 依存関係:
//   node:crypto, ../lib/prisma, ./cloud.service
//   ./redis.service, ./email.service, ../utils/hash
//   ../utils/logger, ../types/errors, ../types/index
// =====================================

import { randomBytes } from 'node:crypto'

import { prisma } from '../lib/prisma.js'
import { createSignedUploadUrl } from './cloud.service.js'
import type { CloudType } from './cloud.service.js'
import { hashEmail } from '../utils/hash.js'
import { logger } from '../utils/logger.js'
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  CloudStorageError,
} from '../types/errors.js'
import type { InitiateResult } from '../types/index.js'

// ─── TransferService.initiate() ─────────────────────────────────────────────

export type InitiateInput = {
  senderId:         string
  senderEmail:      string
  recipientEmail:   string
  fileHashSha3:     string     // SHA3-256(平文ファイル) hex — クライアントが計算して送信
  encryptedFilename?: string   // 暗号化済みファイル名（任意）
  fileSizeBytes:    bigint
  cloudType:        CloudType
  maxDownloads?:    number     // 1〜5 (default: 1)
  expiresInHours?:  number     // 有効期間 (default: 72h)
}

/**
 * TransferService.initiate()
 *
 * 1. recipient email_hash で user_public_keys から Kyber-768 公開鍵取得
 * 2. CloudService.createSignedUploadUrl() でクラウド署名付き URL 生成
 * 3. transfer_sessions に INSERT（status: 'initiated'）
 * 4. audit_log(url_issued) 記録
 * 5. { sessionId, uploadUrl, recipientPublicKeyB64, urlToken, expiresAt } 返却
 *
 * ※ ファイル本体・平文 AES 鍵はサーバを通過しない（ゼロ保持設計）
 */
export async function initiate(input: InitiateInput): Promise<InitiateResult> {
  // ── バリデーション ──────────────────────────────────────────────────────
  if (input.fileSizeBytes <= 0n) {
    throw new BadRequestError('file_size_bytes must be positive')
  }
  if (input.fileHashSha3.length !== 64) {
    throw new BadRequestError('file_hash_sha3 must be a 64-char hex string (SHA3-256)')
  }
  const maxDownloads = input.maxDownloads ?? 1
  if (maxDownloads < 1 || maxDownloads > 5) {
    throw new BadRequestError('max_downloads must be between 1 and 5')
  }

  // ── 1. 受信者の Kyber-768 公開鍵取得 ────────────────────────────────────
  const recipientEmailHash = hashEmail(input.recipientEmail)

  // 受信者ユーザ取得
  const recipientUser = await prisma.user.findUnique({
    where:  { emailHash: recipientEmailHash },
    select: { id: true, isActive: true },
  })

  if (!recipientUser || !recipientUser.isActive) {
    throw new NotFoundError(`Recipient not found: ${input.recipientEmail}`)
  }

  // プライマリ有効公開鍵を取得
  const publicKey = await prisma.userPublicKey.findFirst({
    where: {
      userId:    recipientUser.id,
      keyType:   'kyber768',
      isPrimary: true,
      isRevoked: false,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    select: {
      id:          true,
      publicKeyB64: true,
    },
  })

  if (!publicKey) {
    throw new NotFoundError(
      `No active Kyber-768 public key found for recipient: ${input.recipientEmail}`
    )
  }

  // ── 2. クラウド署名付きアップロード URL 生成 ────────────────────────────
  // transfer_sessions.id がないので仮 ID で URL を発行し、後で session を INSERT
  const tempSessionRef = randomBytes(8).toString('hex')

  let uploadResult: Awaited<ReturnType<typeof createSignedUploadUrl>>
  try {
    uploadResult = await createSignedUploadUrl(
      input.cloudType,
      tempSessionRef,
      input.fileSizeBytes,
    )
  } catch (err) {
    logger.error('[TransferService] Failed to create signed upload URL', { err })
    throw new CloudStorageError('Failed to create upload URL')
  }

  // ── 3. transfer_sessions に INSERT ──────────────────────────────────────
  const urlToken  = generateUrlToken()
  const expiresAt = new Date(
    Date.now() + (input.expiresInHours ?? 72) * 60 * 60 * 1000
  )

  const session = await prisma.transferSession.create({
    data: {
      urlToken,
      senderId:           input.senderId,
      recipientKeyId:     publicKey.id,
      recipientEmail:     input.recipientEmail,
      recipientEmailHash,
      fileHashSha3:       input.fileHashSha3,
      encryptedFilename:  input.encryptedFilename ?? null,
      fileSizeBytes:      input.fileSizeBytes,
      cloudType:          input.cloudType,
      // cloudFileId は PUT 完了後の /transfer/:id/key で設定
      cloudFileId:        null,
      maxDownloads,
      expiresAt,
      status:             'initiated',
      keyCacheRef:        `enc_key:${urlToken}`,
    },
    select: { id: true, urlToken: true, expiresAt: true },
  })

  // ── 4. 監査ログ ──────────────────────────────────────────────────────────
  await writeAuditLog({
    sessionId: session.id,
    actorId:   input.senderId,
    eventType: 'url_issued',
    result:    'success',
    metadata:  {
      cloudType:      input.cloudType,
      fileSizeBytes:  input.fileSizeBytes.toString(),
      recipientEmail: input.recipientEmail,
      maxDownloads,
      expiresAt:      expiresAt.toISOString(),
    },
  })

  logger.info('[TransferService] Session initiated', {
    sessionId: session.id,
    urlToken,
    senderId:  input.senderId,
  })

  // ── 5. レスポンス ─────────────────────────────────────────────────────────
  return {
    sessionId:             session.id,
    uploadUrl:             uploadResult.uploadUrl,
    recipientPublicKeyB64: publicKey.publicKeyB64,
    urlToken:              session.urlToken,
    expiresAt:             session.expiresAt,
  }
}

// ─── TransferService.storeKey() ──────────────────────────────────────────────

export type StoreKeyInput = {
  sessionId:    string
  senderId:     string
  encKeyB64:    string   // Kyber-768 でラップした K_enc (Base64)
  cloudFileId:  string   // クラウドへの PUT 完了後に確定したファイル ID
}

/**
 * TransferService.storeKey()
 *
 * 1. セッション権限確認（sender_id 一致・status=initiated）
 * 2. Redis SET enc_key:{url_token} = K_enc, TTL=3600s
 * 3. transfer_sessions.cloud_file_id 更新
 * 4. audit_log 記録
 */
export async function storeKey(input: StoreKeyInput): Promise<void> {
  const session = await prisma.transferSession.findUnique({
    where:  { id: input.sessionId },
    select: { urlToken: true, senderId: true, status: true },
  })

  if (!session) throw new NotFoundError(`Session not found: ${input.sessionId}`)
  if (session.senderId !== input.senderId) {
    throw new ForbiddenError('You are not the sender of this session')
  }
  if (session.status !== 'initiated') {
    throw new BadRequestError(`Session status is not 'initiated': ${session.status}`)
  }

  // Redis に K_enc 保存
  const { setEncKey } = await import('./redis.service.js')
  await setEncKey(session.urlToken, input.encKeyB64)

  // cloud_file_id 更新
  await prisma.transferSession.update({
    where: { id: input.sessionId },
    data:  { cloudFileId: input.cloudFileId },
  })

  await writeAuditLog({
    sessionId: input.sessionId,
    actorId:   input.senderId,
    eventType: 'url_issued',
    result:    'success',
    metadata:  { step: 'key_stored', cloudFileId: input.cloudFileId },
  })

  logger.info('[TransferService] K_enc stored in Redis', {
    sessionId: input.sessionId,
    urlToken:  session.urlToken,
  })
}

// ─── TransferService.finalizeUrl() ───────────────────────────────────────────

export type FinalizeUrlInput = {
  sessionId:  string
  senderId:   string
}

export type FinalizeUrlResult = {
  shareUrl:  string
  emailSent: boolean
}

/**
 * TransferService.finalizeUrl()
 *
 * 1. セッション権限確認（status=initiated, cloud_file_id が設定済み）
 * 2. status → 'ready' に更新
 * 3. EmailService.sendDownloadLink() でメール送信
 * 4. share_url 生成・返却
 */
export async function finalizeUrl(input: FinalizeUrlInput): Promise<FinalizeUrlResult> {
  const session = await prisma.transferSession.findUnique({
    where:  { id: input.sessionId },
    select: {
      urlToken:       true,
      senderId:       true,
      status:         true,
      cloudFileId:    true,
      recipientEmail: true,
      expiresAt:      true,
    },
  })

  if (!session) throw new NotFoundError(`Session not found: ${input.sessionId}`)
  if (session.senderId !== input.senderId) {
    throw new ForbiddenError('You are not the sender of this session')
  }
  if (!session.cloudFileId) {
    throw new BadRequestError('File has not been uploaded yet. Call /key first.')
  }
  if (session.status !== 'initiated') {
    throw new BadRequestError(`Session status is not 'initiated': ${session.status}`)
  }

  // status → ready
  await prisma.transferSession.update({
    where: { id: input.sessionId },
    data:  { status: 'ready' },
  })

  const shareUrl = buildShareUrl(session.urlToken)

  // メール送信（email.service.ts は別途実装）
  let emailSent = false
  try {
    const { sendDownloadLink } = await import('./email.service.js')
    await sendDownloadLink({
      to:         session.recipientEmail,
      shareUrl,
      expiresAt:  session.expiresAt,
    })
    emailSent = true
  } catch (err) {
    logger.warn('[TransferService] Email sending failed', { err, sessionId: input.sessionId })
    // メール失敗でも処理継続（EmailFailedError はコントローラで 424 にする場合あり）
  }

  logger.info('[TransferService] Session finalized', {
    sessionId: input.sessionId,
    shareUrl,
    emailSent,
  })

  return { shareUrl, emailSent }
}

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * 256bit Base64URL ワンタイムトークン生成
 * transfer_sessions.url_token に使用
 */
function generateUrlToken(): string {
  return randomBytes(32).toString('base64url')
}

function buildShareUrl(urlToken: string): string {
  const base = process.env.FRONTEND_BASE_URL ?? 'http://localhost:3000'
  return `${base}/download/${urlToken}`
}

type AuditLogInput = {
  sessionId?:  string
  actorId?:    string
  eventType:   'url_issued' | 'auth_success' | 'auth_fail' | 'dl_success' | 'dl_fail' | 'deleted' | 'admin_delete' | 'lock' | 'unlock' | 'access'
  result:      'success' | 'failure'
  ipAddress?:  string
  metadata?:   Record<string, unknown>
}

async function writeAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        sessionId: input.sessionId,
        actorId:   input.actorId,
        eventType: input.eventType as any,
        result:    input.result    as any,
        ipAddress: input.ipAddress,
        metadata:  input.metadata ?? null,
      },
    })
  } catch (err) {
    logger.error('[TransferService] Failed to write audit log', { err })
  }
}