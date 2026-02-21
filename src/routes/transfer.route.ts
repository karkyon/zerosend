import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middlewares/auth.middleware.js'
import type { AppEnv } from '../types/index.js'

// ── Zod バリデーションスキーマ ───────────────────────────────────
const initiateSchema = z.object({
  recipient_email:    z.string().email(),
  cloud_type:         z.enum(['box', 'gdrive', 'onedrive', 'dropbox', 'server']),
  file_size_bytes:    z.number().int().positive().max(1_073_741_824),
  file_hash_sha3:     z.string().length(64),
  encrypted_filename: z.string().optional(),
  expires_in_seconds: z.number().int().min(1).max(86400).default(86400),
  max_downloads:      z.number().int().min(1).max(5).default(1),
  split_upload:       z.boolean().default(false),
})

const storeKeySchema = z.object({
  encrypted_key_b64: z.string().min(1),
  cloud_file_id:     z.string().min(1),
})

const finalizeUrlSchema = z.object({
  send_email:        z.boolean(),
  email_template_id: z.string().default('default'),
  custom_message:    z.string().max(500).optional(),
})

// ── Route 定義（全エンドポイントに JWT 認証必須）────────────────
export const transferRoute = new Hono()
transferRoute.use('*', authMiddleware)

// POST /api/v1/transfer/initiate
transferRoute.post('/initiate', zValidator('json', initiateSchema), async (c) => {
  const body     = c.req.valid('json')
  const senderId = c.get('userId')
  // TODO: TransferService.initiate(senderId, body)
  return c.json({ message: 'transfer/initiate — not yet implemented' }, 201)
})

// POST /api/v1/transfer/:id/key
transferRoute.post('/:id/key', zValidator('json', storeKeySchema), async (c) => {
  const sessionId = c.req.param('id')
  const body      = c.req.valid('json')
  const senderId  = c.get('userId')
  // TODO: TransferService.storeKey(senderId, sessionId, body)
  return c.json({ message: 'transfer/key — not yet implemented' }, 200)
})

// POST /api/v1/transfer/:id/url
transferRoute.post('/:id/url', zValidator('json', finalizeUrlSchema), async (c) => {
  const sessionId = c.req.param('id')
  const body      = c.req.valid('json')
  const senderId  = c.get('userId')
  // TODO: TransferService.finalizeUrl(senderId, sessionId, body)
  return c.json({ message: 'transfer/url — not yet implemented' }, 200)
})

// POST /api/v1/transfer/:id/split-parts
transferRoute.post('/:id/split-parts', async (c) => {
  const sessionId = c.req.param('id')
  const senderId  = c.get('userId')
  // TODO: TransferService.registerSplitParts(senderId, sessionId, body)
  return c.json({ message: 'transfer/split-parts — not yet implemented' }, 201)
})
