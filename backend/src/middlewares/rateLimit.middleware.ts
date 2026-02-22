// =====================================
// ファイルパス  : zerosend/backend/src/middlewares/rateLimit.middleware.ts
//
// 説明・目的・機能概要:
//   Redis ベースのレートリミットミドルウェア。
//   rate:{ip} キーを TTL 60秒 でインクリメントし、
//   上限超過時に 429 Too Many Requests を返す。
//
//   設定値（環境変数で上書き可能）:
//     RATE_LIMIT_UNAUTH  : 未認証リクエスト上限 (default: 100 req/min)
//     RATE_LIMIT_AUTH    : 認証済みリクエスト上限 (default: 1000 req/min)
//
// 作成日時 : 2026-02-22
// 更新日時 : 2026-02-22
//
// 依存関係:
//   hono, ../lib/redis, ../types/errors
// =====================================

import type { MiddlewareHandler } from 'hono'
import { redis }                  from '../lib/redis.js'
import { TooManyRequestsError }   from '../types/errors.js'

const RATE_TTL_SEC   = 60
const LIMIT_UNAUTH   = Number(process.env.RATE_LIMIT_UNAUTH ?? 100)
const LIMIT_AUTH     = Number(process.env.RATE_LIMIT_AUTH   ?? 1000)

/**
 * rateLimitMiddleware
 *
 * Authorization ヘッダーの有無で上限を切り替える。
 * Redis INCR + EXPIRE でウィンドウカウンタを管理する。
 */
export const rateLimitMiddleware: MiddlewareHandler = async (c, next) => {
  // IP アドレス取得（プロキシ対応）
  const ip = c.req.header('X-Forwarded-For')?.split(',')[0].trim()
           ?? c.req.header('X-Real-IP')
           ?? 'unknown'

  const isAuth = !!c.req.header('Authorization')
  const limit  = isAuth ? LIMIT_AUTH : LIMIT_UNAUTH
  const key    = `rate:${ip}`

  const count = await redis.incr(key)
  if (count === 1) {
    // 初回のみ TTL を設定
    await redis.expire(key, RATE_TTL_SEC)
  }

  // レスポンスヘッダーに残リクエスト数を付与
  c.header('X-RateLimit-Limit',     String(limit))
  c.header('X-RateLimit-Remaining', String(Math.max(0, limit - count)))
  c.header('X-RateLimit-Reset',     String(RATE_TTL_SEC))

  if (count > limit) {
    throw new TooManyRequestsError(
      `Rate limit exceeded. Limit: ${limit} req/${RATE_TTL_SEC}s`
    )
  }

  await next()
}