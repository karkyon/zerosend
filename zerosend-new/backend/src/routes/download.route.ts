import { Hono } from 'hono'
import type { AppEnv } from '../types/index.js'

export const downloadRoute = new Hono()

// GET /api/v1/download/:token — URLアクセス・受信者情報取得
downloadRoute.get('/:token', async (c) => {
  const token    = c.req.param('token')
  const clientIp = c.req.header('x-forwarded-for') ?? 'unknown'
  // TODO: DownloadService.getSessionInfo(token, clientIp)
  return c.json({ message: 'download/info — not yet implemented' }, 200)
})

// GET /api/v1/download/:token/key — K_enc 取得（2FA 成功後）
downloadRoute.get('/:token/key', async (c) => {
  const token     = c.req.param('token')
  const authToken = c.req.header('Authorization')?.replace('Bearer ', '')
  if (!authToken) return c.json({ type: '/errors/unauthorized', status: 401 }, 401)
  // TODO: DownloadService.getKey(token, authToken)
  return c.json({ message: 'download/key — not yet implemented' }, 200)
})

// POST /api/v1/download/:token/complete — DL完了・即時削除
downloadRoute.post('/:token/complete', async (c) => {
  const token     = c.req.param('token')
  const authToken = c.req.header('Authorization')?.replace('Bearer ', '')
  if (!authToken) return c.json({ type: '/errors/unauthorized', status: 401 }, 401)
  // TODO: DownloadService.complete(token, authToken)
  return c.json({ message: 'download/complete — not yet implemented' }, 200)
})
