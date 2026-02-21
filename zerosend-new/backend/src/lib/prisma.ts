// =====================================
// ファイルパス  : zerosend/src/lib/prisma.ts
//
// 説明・目的・機能概要:
//   Prisma Client シングルトン。
//   globalThis を利用し HMR（Hot Module Replacement）による多重インスタンス化を防ぐ。
//   全 Service 層がこのインスタンスを経由して DB へアクセスする。
//
// 作成日時 : 2026-02-21
// 更新日時 : 2026-02-21
//
// 依存関係:
//   @prisma/client
// =====================================

import { PrismaClient } from '@prisma/client'

// Prisma Client シングルトン
// globalThis を使って HMR による多重生成を防ぐ（development 環境対策）
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}