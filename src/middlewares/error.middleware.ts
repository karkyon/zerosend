import type { ErrorHandler } from 'hono'
import {
  AppError,
  AuthFailedError,
  AuthLockedError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  GoneError,
  BadRequestError,
  EmailFailedError,
} from '../types/errors.js'

// 全エラーをここで一括変換 → RFC 7807 形式のレスポンス
// Controller (routes/) は try/catch を書かない
export const errorHandler: ErrorHandler = (err, c) => {
  const instance = c.req.url

  if (err instanceof AuthFailedError) {
    return c.json(
      { type: '/errors/auth-failed', title: err.message,
        status: 401, remaining_attempts: err.remaining, instance },
      401,
    )
  }
  if (err instanceof AuthLockedError) {
    return c.json({ type: '/errors/locked', title: err.message, status: 423, instance }, 423)
  }
  if (err instanceof UnauthorizedError) {
    return c.json({ type: '/errors/unauthorized', title: err.message, status: 401, instance }, 401)
  }
  if (err instanceof ForbiddenError) {
    return c.json({ type: '/errors/forbidden', title: err.message, status: 403, instance }, 403)
  }
  if (err instanceof NotFoundError) {
    return c.json({ type: '/errors/not-found', title: err.message, status: 404, instance }, 404)
  }
  if (err instanceof GoneError) {
    return c.json({ type: '/errors/gone', title: err.message, status: 410, instance }, 410)
  }
  if (err instanceof BadRequestError) {
    return c.json({ type: '/errors/bad-request', title: err.message, status: 400, instance }, 400)
  }
  if (err instanceof EmailFailedError) {
    return c.json({ type: '/errors/email-failed', title: err.message, status: 424, instance }, 424)
  }
  if (err instanceof AppError) {
    return c.json({ type: `/errors/${err.code}`, title: err.message, status: 500, instance }, 500)
  }

  // 未知のエラー — 詳細は隠蔽してログに残す
  console.error('[Unhandled Error]', err)
  return c.json(
    { type: '/errors/internal', title: 'Internal Server Error', status: 500, instance },
    500,
  )
}
