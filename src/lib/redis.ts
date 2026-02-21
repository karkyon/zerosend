import Redis from 'ioredis'

// Redis Client シングルトン
export const redis = new Redis(
  process.env.REDIS_URL ?? 'redis://localhost:6379',
  {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  }
)

redis.on('error', (err) => {
  console.error('[Redis] Connection error:', err)
})

redis.on('ready', () => {
  console.log('[Redis] Connected and ready')
})
