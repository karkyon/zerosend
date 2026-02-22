// =====================================
// ファイルパス  : zerosend/backend/src/routes/admin.route.ts
//
// 説明・目的・機能概要:
//   管理者エンドポイントコントローラ。
//   全エンドポイントは JWT + role=admin が必須（admin.middleware で検証）。
//   GET    /api/v1/admin/sessions           : セッション一覧
//   GET    /api/v1/admin/sessions/:id       : セッション詳細
//   DELETE /api/v1/admin/sessions/:id       : セッション強制削除
//   POST   /api/v1/admin/sessions/:id/unlock: ロック解除
//   GET    /api/v1/admin/logs               : 監査ログ一覧
//   GET    /api/v1/admin/logs/export        : 監査ログ CSV エクスポート
//   GET    /api/v1/admin/users              : ユーザー一覧
//   DELETE /api/v1/admin/users/:id          : ユーザー削除
//
// 作成日時 : 2026-02-22
// 更新日時 : 2026-02-22
//
// 依存関係:
//   hono, ../services/admin.service, ../types/index
// =====================================

import { Hono }                         from 'hono'
import {
  getSessions,
  getSession,
  deleteSession,
  unlockSession,
  getLogs,
  exportLogs,
  getUsers,
  deleteUser,
}                                       from '../services/admin.service.js'
import type { AppEnv }                  from '../types/index.js'

export const adminRoute = new Hono<AppEnv>()

// ─── GET /api/v1/admin/sessions ──────────────────────────────────────────────

adminRoute.get('/sessions', async (c) => {
  const q = c.req.query()

  const result = await getSessions({
    status:         q.status,
    senderEmail:    q.sender_email,
    recipientEmail: q.recipient_email,
    from:           q.from,
    to:             q.to,
    page:           q.page    ? Number(q.page)     : 1,
    perPage:        q.per_page ? Number(q.per_page) : 50,
  })

  return c.json({
    total:       result.total,
    page:        result.page,
    per_page:    result.perPage,
    total_pages: result.totalPages,
    data:        result.data,
  }, 200)
})

// ─── GET /api/v1/admin/sessions/:id ─────────────────────────────────────────

adminRoute.get('/sessions/:id', async (c) => {
  const id     = c.req.param('id')
  const result = await getSession(id)
  return c.json(result, 200)
})

// ─── DELETE /api/v1/admin/sessions/:id ──────────────────────────────────────

adminRoute.delete('/sessions/:id', async (c) => {
  const id      = c.req.param('id')
  const adminId = c.get('userId')
  await deleteSession(id, adminId)
  return c.json({ deleted: true }, 200)
})

// ─── POST /api/v1/admin/sessions/:id/unlock ──────────────────────────────────

adminRoute.post('/sessions/:id/unlock', async (c) => {
  const id      = c.req.param('id')
  const adminId = c.get('userId')
  await unlockSession(id, adminId)
  return c.json({ unlocked: true }, 200)
})

// ─── GET /api/v1/admin/logs ───────────────────────────────────────────────────

adminRoute.get('/logs', async (c) => {
  const q = c.req.query()

  const result = await getLogs({
    eventType: q.event_type,
    result:    q.result,
    from:      q.from,
    to:        q.to,
    page:      q.page     ? Number(q.page)     : 1,
    perPage:   q.per_page ? Number(q.per_page) : 50,
  })

  return c.json({
    total:       result.total,
    page:        result.page,
    per_page:    result.perPage,
    total_pages: result.totalPages,
    data:        result.data,
  }, 200)
})

// ─── GET /api/v1/admin/logs/export ───────────────────────────────────────────

adminRoute.get('/logs/export', async (c) => {
  const csv = await exportLogs()
  c.header('Content-Type',        'text/csv; charset=utf-8')
  c.header('Content-Disposition', 'attachment; filename="audit_logs.csv"')
  return c.body(csv, 200)
})

// ─── GET /api/v1/admin/users ─────────────────────────────────────────────────

adminRoute.get('/users', async (c) => {
  const q = c.req.query()

  const result = await getUsers({
    search:  q.search,
    page:    q.page     ? Number(q.page)     : 1,
    perPage: q.per_page ? Number(q.per_page) : 50,
  })

  return c.json({
    total:       result.total,
    page:        result.page,
    per_page:    result.perPage,
    total_pages: result.totalPages,
    data:        result.data,
  }, 200)
})

// ─── DELETE /api/v1/admin/users/:id ─────────────────────────────────────────

adminRoute.delete('/users/:id', async (c) => {
  const id      = c.req.param('id')
  const adminId = c.get('userId')
  await deleteUser(id, adminId)
  return c.json({ deleted: true }, 200)
})