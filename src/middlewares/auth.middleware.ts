import type { MiddlewareHandler } from 'hono'
import jwt from 'jsonwebtoken'
import { UnauthorizedError, ForbiddenError } from '../types/errors.js'
import type { AppEnv } from '../types/index.js'

// JWT を検証して userId / userRole / userEmail を Context に注入
export const authMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const header = c.req.header('Authorization')
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Authorization header missing or invalid')
  }
  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      sub:   string
      role:  'user' | 'admin'
      email: string
    }
    c.set('userId',    payload.sub)
    c.set('userRole',  payload.role)
    c.set('userEmail', payload.email)
    await next()
  } catch {
    throw new UnauthorizedError('Invalid or expired JWT token')
  }
}

// 管理者ロール確認（authMiddleware の後に使用）
export const adminMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (c.get('userRole') !== 'admin') {
    throw new ForbiddenError('Admin role required')
  }
  await next()
}
