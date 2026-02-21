// =====================================
// ファイルパス  : zerosend/src/lib/redis.ts
//
// 説明・目的・機能概要:
//   ioredis クライアントシングルトン。
//   enc_key / session / lock / rate / challenge の各 Redis キーを管理する起点。
//   全 Service 層はこのインスタンスを経由して Redis へアクセスする。
//
// 作成日時 : 2026-02-21
// 更新日時 : 2026-02-21
//
// 依存関係:
//   ioredis
// =====================================

import Redis from 'ioredis'

// Redis Client シングルトン (ioredis)
export const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
})

redis.on('error', (err) => {
  console.error('[Redis] Connection error:', err)
})

redis.on('ready', () => {
  console.log('[Redis] Connected')
})