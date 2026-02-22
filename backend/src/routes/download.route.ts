// =====================================
// ファイルパス  : zerosend/backend/src/routes/download.route.ts
//
// 説明・目的・機能概要:
//   ファイル受信エンドポイントコントローラ。
//   GET  /api/v1/download/:token           : セッション情報取得（認証不要）
//   GET  /api/v1/download/:token/key       : K_enc 取得（auth_token 必須）
//   POST /api/v1/download/:token/complete  : DL完了・ゼロ保持削除（auth_token 必須）
//
// 作成日時 : 2026-02-22
// 更新日時 : 2026-02-22
//
// 依存関係:
//   hono, ../services/download.service, ../types/index, ../types/errors
// =====================================

import { Hono }                                      from 'hono'
import { getInfo, getKey, complete }                 from '../services/download.service.js'
import { UnauthorizedError }                         from '../types/errors.js'
import type { AppEnv }                               from '../types/index.js'

export const downloadRoute = new Hono<AppEnv>()

function extractBearer(authHeader: string | undefined): string | null {
  if (!authHeader) return null
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  return match ? match[1] : null
}

// ─── GET /api/v1/download/:token ────────────────────────────────────────────

downloadRoute.get('/:token', async (c) => {
  const urlToken  = c.req.param('token')
  const ipAddress = c.req.header('X-Forwarded-For') ?? c.req.header('X-Real-IP')

  const info = await getInfo(urlToken, ipAddress)

  return c.json({
    sender_display_name:  info.senderDisplayName,
    file_size_bytes:      info.fileSizeBytes.toString(),
    expires_at:           info.expiresAt.toISOString(),
    remaining_downloads:  info.remainingDownloads,
    twofa_type:           info.twofaType,
  }, 200)
})

// ─── GET /api/v1/download/:token/key ────────────────────────────────────────

downloadRoute.get('/:token/key', async (c) => {
  const urlToken  = c.req.param('token')
  const authToken = extractBearer(c.req.header('Authorization'))
  const ipAddress = c.req.header('X-Forwarded-For') ?? c.req.header('X-Real-IP')

  if (!authToken) throw new UnauthorizedError('Bearer auth_token is required')

  const result = await getKey(urlToken, authToken, ipAddress)

  return c.json({
    encrypted_key_b64: result.encryptedKeyB64,
    cloud_file_url:    result.cloudFileUrl,
    file_hash_sha3:    result.fileHashSha3,
  }, 200)
})

// ─── POST /api/v1/download/:token/complete ───────────────────────────────────

downloadRoute.post('/:token/complete', async (c) => {
  const urlToken  = c.req.param('token')
  const authToken = extractBearer(c.req.header('Authorization'))
  const ipAddress = c.req.header('X-Forwarded-For') ?? c.req.header('X-Real-IP')

  if (!authToken) throw new UnauthorizedError('Bearer auth_token is required')

  await complete(urlToken, authToken, ipAddress)

  return c.json({ deleted: true, message: 'File and encryption key permanently deleted' }, 200)
})