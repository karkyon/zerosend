// =====================================
// ファイルパス  : zerosend/src/app.ts
//
// 説明・目的・機能概要:
//   Hono アプリケーションのエントリポイント。
//   グローバルミドルウェア登録・全ルートマウント・エラーハンドラ設定・サーバ起動を担当。
//   Swagger UI (/docs) と OpenAPI spec (/api/openapi.json) も提供する。
//   ビジネスロジックは一切記述しない。
//
// 作成日時 : 2026-02-21
// 更新日時 : 2026-02-21
//
// 依存関係:
//   @hono/node-server, hono, @hono/swagger-ui
//   ./middlewares/error.middleware, ./routes/*, ./types/index, ./openapi/spec
// =====================================

import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger as honoLogger } from 'hono/logger'
import { swaggerUI } from '@hono/swagger-ui'
import { errorHandler } from './middlewares/error.middleware.js'
import { authRoute }     from './routes/auth.route.js'
import { transferRoute } from './routes/transfer.route.js'
import { downloadRoute } from './routes/download.route.js'
import { adminRoute }    from './routes/admin.route.js'
import { openApiSpec }   from './openapi/spec.js'
import type { AppEnv }   from './types/index.js'

const app = new Hono<AppEnv>()

// ─── グローバルミドルウェア ──────────────────────────────────────────────────
app.use('*', honoLogger())
app.use('*', cors({
  origin: process.env.FRONTEND_BASE_URL ?? 'http://localhost:3000',
  allowHeaders: ['Authorization', 'Content-Type'],
  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
}))

// ─── ヘルスチェック ──────────────────────────────────────────────────────────
app.get('/health', (c) => c.json({
  status:  'ok',
  service: 'ZeroSend API',
  version: '0.1.0',
  time:    new Date().toISOString(),
}))

// ─── Swagger UI (/docs) ──────────────────────────────────────────────────────
// ブラウザで http://localhost:8000/docs を開くと Swagger UI が表示される
// Authorize ボタンに JWT を貼り付けて全エンドポイントを単体テスト可能
app.get('/docs', swaggerUI({ url: '/api/openapi.json' }))

// ─── OpenAPI 3.0 Spec (JSON) ─────────────────────────────────────────────────
// curl http://localhost:8000/api/openapi.json | jq
app.get('/api/openapi.json', (c) => c.json(openApiSpec))

// ─── ルート登録 ──────────────────────────────────────────────────────────────
app.route('/api/v1/auth',     authRoute)
app.route('/api/v1/transfer', transferRoute)
app.route('/api/v1/download', downloadRoute)
app.route('/api/v1/admin',    adminRoute)

// ─── 集中エラーハンドリング ──────────────────────────────────────────────────
app.onError(errorHandler)

// ─── 404 フォールスルー ──────────────────────────────────────────────────────
app.notFound((c) => c.json({
  type:     '/errors/not-found',
  title:    'Endpoint not found',
  status:   404,
  instance: c.req.url,
}, 404))

// ─── サーバ起動 ──────────────────────────────────────────────────────────────
const port = Number(process.env.PORT) || 8000
console.log(`🚀 ZeroSend API starting on port ${port} (${process.env.NODE_ENV ?? 'development'})`)
console.log(`📖 Swagger UI : http://localhost:${port}/docs`)
console.log(`📄 OpenAPI JSON: http://localhost:${port}/api/openapi.json`)

serve({ fetch: app.fetch, port })