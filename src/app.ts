import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { errorHandler }  from './middlewares/error.middleware.js'
import { authRoute }     from './routes/auth.route.js'
import { transferRoute } from './routes/transfer.route.js'
import { downloadRoute } from './routes/download.route.js'
import { adminRoute }    from './routes/admin.route.js'
import type { AppEnv }   from './types/index.js'

// ── Hono アプリケーション ─────────────────────────────────────────
const app = new Hono()

// ── グローバルミドルウェア ────────────────────────────────────────
app.use('*', logger())
app.use('*', cors())

// ── ヘルスチェック ────────────────────────────────────────────────
app.get('/health', (c) =>
  c.json({
    status:    'ok',
    service:   'ZeroSend API',
    version:   '0.1.0',
    timestamp: new Date().toISOString(),
  }),
)

// ── ルート登録 ────────────────────────────────────────────────────
app.route('/api/v1/auth',     authRoute)
app.route('/api/v1/transfer', transferRoute)
app.route('/api/v1/download', downloadRoute)
app.route('/api/v1/admin',    adminRoute)

// ── 集中エラーハンドリング（全 Controller の try/catch を一元化）──
app.onError(errorHandler)

// ── サーバ起動 ────────────────────────────────────────────────────
const port = Number(process.env.PORT) || 8000
console.log(`ZeroSend API starting on port ${port}...`)
serve({ fetch: app.fetch, port })
