// =====================================
// ファイルパス  : zerosend/src/middlewares/auth.middleware.ts
//
// 説明・目的・機能概要:
//   JWT Bearer トークン検証ミドルウェア。
//   Authorization ヘッダから JWT を取り出し verifyJwt() で検証後、
//   userId / userRole / userEmail を Hono Context へ注入する。
//   adminMiddleware: 管理者ロール確認（authMiddleware の後に使用）。
//
// 作成日時 : 2026-02-21
// 更新日時 : 2026-02-21
//
// 依存関係:
//   hono, ../services/auth.service, ../types/errors, ../types/index
// =====================================

import type { MiddlewareHandler } from 'hono'
import { verifyJwt } from '../services/auth.service.js'
import { UnauthorizedError } from '../types/errors.js'
import type { AppEnv } from '../types/index.js'

/**
 * JWT Bearer トークン検証ミドルウェア
 * Authorization: Bearer <token> ヘッダを検証し
 * c.set('userId'), c.set('userRole'), c.set('userEmail') に注入
 */
export const authMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const authHeader = c.req.header('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid Authorization header')
  }

  const token = authHeader.slice(7)
  const payload = verifyJwt(token)  // throws UnauthorizedError on failure

  c.set('userId',    payload.sub)
  c.set('userRole',  payload.role)
  c.set('userEmail', payload.email)

  await next()
}

/**
 * 管理者ロール確認ミドルウェア
 * authMiddleware の後に使用すること
 */
export const adminMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const role = c.get('userRole')
  if (role !== 'admin') {
    const { ForbiddenError } = await import('../types/errors.js')
    throw new ForbiddenError('Admin role required')
  }
  await next()
}