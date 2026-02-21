// =====================================
// ファイルパス  : zerosend/src/routes/transfer.route.ts
//
// 説明・目的・機能概要:
//   ファイル転送エンドポイントコントローラ（JWT 認証必須）。
//   POST /api/v1/transfer/initiate  : セッション作成・署名付き URL 取得
//   POST /api/v1/transfer/:id/key   : K_enc を Redis へ保存
//   POST /api/v1/transfer/:id/url   : status→ready 更新・メール送信
//
// 作成日時 : 2026-02-21
// 更新日時 : 2026-02-21
//
// 依存関係:
//   hono, ../middlewares/auth.middleware
//   ../services/transfer.service, ../validators/transfer.validator
//   ../types/errors, ../types/index, ../services/cloud.service
// =====================================

import { Hono } from 'hono'
import { authMiddleware } from '../middlewares/auth.middleware.js'
import { initiate, storeKey, finalizeUrl } from '../services/transfer.service.js'
import {
  initiateTransferSchema,
  storeKeySchema,
} from '../validators/transfer.validator.js'
import { BadRequestError } from '../types/errors.js'
import type { AppEnv } from '../types/index.js'
import type { CloudType } from '../services/cloud.service.js'

export const transferRoute = new Hono<AppEnv>()

// 全エンドポイント: JWT 認証必須
transferRoute.use('*', authMiddleware)

// ─── POST /api/v1/transfer/initiate ─────────────────────────────────────────
// セッション作成 → 受信者公開鍵取得 → 署名付きアップロード URL 返却

transferRoute.post('/initiate', async (c) => {
  const raw = await c.req.json().catch(() => null)
  const result = initiateTransferSchema.safeParse(raw)

  if (!result.success) {
    throw new BadRequestError(result.error.issues.map(i => i.message).join(', '))
  }

  const body = result.data
  const senderId    = c.get('userId')
  const senderEmail = c.get('userEmail')

  const initiateResult = await initiate({
    senderId,
    senderEmail,
    recipientEmail:    body.recipient_email,
    fileHashSha3:      body.file_hash_sha3,
    encryptedFilename: body.encrypted_filename,
    fileSizeBytes:     BigInt(body.file_size_bytes),
    cloudType:         body.cloud_type as CloudType,
    maxDownloads:      body.max_downloads,
    expiresInHours:    body.expires_in_hours,
  })

  return c.json({
    session_id:              initiateResult.sessionId,
    upload_url:              initiateResult.uploadUrl,
    recipient_public_key_b64: initiateResult.recipientPublicKeyB64,
    url_token:               initiateResult.urlToken,
    expires_at:              initiateResult.expiresAt.toISOString(),
  }, 201)
})

// ─── POST /api/v1/transfer/:id/key ───────────────────────────────────────────
// クライアントが K_enc(Kyber-768でラップした AES 鍵) を Redis へ保存

transferRoute.post('/:id/key', async (c) => {
  const sessionId = c.req.param('id')
  const raw = await c.req.json().catch(() => null)
  const result = storeKeySchema.safeParse(raw)

  if (!result.success) {
    throw new BadRequestError(result.error.issues.map(i => i.message).join(', '))
  }

  const senderId = c.get('userId')
  await storeKey({
    sessionId,
    senderId,
    encKeyB64:   result.data.enc_key_b64,
    cloudFileId: result.data.cloud_file_id,
  })

  return c.json({ message: 'Encrypted key stored successfully' }, 200)
})

// ─── POST /api/v1/transfer/:id/url ───────────────────────────────────────────
// ステータス ready 更新 + 受信者へメール送信

transferRoute.post('/:id/url', async (c) => {
  const sessionId = c.req.param('id')
  const senderId  = c.get('userId')

  const finalResult = await finalizeUrl({ sessionId, senderId })

  return c.json({
    share_url:  finalResult.shareUrl,
    email_sent: finalResult.emailSent,
  }, 200)
})