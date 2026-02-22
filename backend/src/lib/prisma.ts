// =====================================
// ファイルパス  : zerosend/backend/src/lib/prisma.ts
//
// 説明・目的・機能概要:
//   Prisma Client シングルトン。
//   Prisma 7.x では @prisma/adapter-pg (DriverAdapter) が必須。
//   PrismaPg には接続文字列ではなく pg.Pool インスタンスを渡す。
//   globalThis を使って tsx watch (HMR) による多重インスタンス化を防ぐ。
//
// 作成日時 : 2026-02-21
// 更新日時 : 2026-02-22
// =====================================

import { PrismaClient } from '@prisma/client'
import { PrismaPg }     from '@prisma/adapter-pg'
import pg               from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
      ?? 'postgresql://zerosend:zerosend_dev_pass@localhost:5432/zerosend_db',
  })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  })
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
