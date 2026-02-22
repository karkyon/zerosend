// =====================================
// ファイルパス  : zerosend/backend/src/lib/redis.ts
//
// 説明・目的・機能概要:
//   ioredis クライアントシングルトン。
//   globalThis を利用し tsx watch (HMR) による多重接続を防ぐ。
//   enc_key / session / lock / rate / challenge の各 Redis キーを管理する起点。
//
// 作成日時 : 2026-02-21
// 更新日時 : 2026-02-22
//
// 依存関係:
//   ioredis
// =====================================

import { Redis } from 'ioredis'

type RedisClient = Redis

const globalForRedis = globalThis as unknown as {
  redis: RedisClient | undefined
}

export const redis: RedisClient =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
  })

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis
}

redis.on('error', (err: Error) => {
  console.error('[Redis] connection error:', err.message)
})

redis.on('ready', () => {
  console.log('[Redis] connected')
})

redis.on('close', () => {
  console.warn('[Redis] connection closed')
})

redis.on('reconnecting', () => {
  console.log('[Redis] reconnecting...')
})