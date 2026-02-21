import { Hono } from 'hono'
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware.js'
import type { AppEnv } from '../types/index.js'

export const adminRoute = new Hono()

// 全エンドポイントに JWT 認証 + 管理者ロール確認を適用
adminRoute.use('*', authMiddleware)
adminRoute.use('*', adminMiddleware)

// GET  /api/v1/admin/sessions
adminRoute.get('/sessions', async (c) =>
  c.json({ message: 'admin/sessions GET — not yet implemented' }))

// GET  /api/v1/admin/sessions/:id
adminRoute.get('/sessions/:id', async (c) =>
  c.json({ message: 'admin/sessions/:id GET — not yet implemented' }))

// DELETE /api/v1/admin/sessions/:id
adminRoute.delete('/sessions/:id', async (c) =>
  c.json({ message: 'admin/sessions/:id DELETE — not yet implemented' }))

// POST /api/v1/admin/sessions/:id/unlock
adminRoute.post('/sessions/:id/unlock', async (c) =>
  c.json({ message: 'admin/sessions/:id/unlock — not yet implemented' }))

// GET  /api/v1/admin/logs
adminRoute.get('/logs', async (c) =>
  c.json({ message: 'admin/logs GET — not yet implemented' }))

// GET  /api/v1/admin/logs/export
adminRoute.get('/logs/export', async (c) =>
  c.json({ message: 'admin/logs/export GET — not yet implemented' }))

// GET  /api/v1/admin/users
adminRoute.get('/users', async (c) =>
  c.json({ message: 'admin/users GET — not yet implemented' }))

// DELETE /api/v1/admin/users/:id
adminRoute.delete('/users/:id', async (c) =>
  c.json({ message: 'admin/users/:id DELETE — not yet implemented' }))
