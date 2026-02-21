// =====================================
// ファイルパス  : zerosend/src/middlewares/error.middleware.ts
//
// 説明・目的・機能概要:
//   集中エラーハンドリングミドルウェア（Hono onError ハンドラ）。
//   Service 層がスローするドメイン例外クラスを RFC 7807 Problem Details 形式の
//   HTTP レスポンスに変換する。全 Controller は try/catch を記述しない。
//
// 作成日時 : 2026-02-21
// 更新日時 : 2026-02-21
//
// 依存関係:
//   hono, ../types/errors, ../utils/logger
// =====================================

import type { ErrorHandler } from 'hono'
import {
  AppError, UnauthorizedError, AuthLockedError, AuthFailedError,
  NotFoundError, GoneError, ConflictError, BadRequestError,
  ForbiddenError, EmailFailedError,
} from '../types/errors.js'
import { logger } from '../utils/logger.js'

export const errorHandler: ErrorHandler = (err, c) => {
  const instance = c.req.url

  if (err instanceof AuthFailedError) {
    return c.json({
      type:               '/errors/auth-failed',
      title:              err.message,
      status:             401,
      instance,
      remaining_attempts: err.remaining,
    }, 401)
  }
  if (err instanceof AuthLockedError) {
    return c.json({ type: '/errors/locked',       title: err.message, status: 423, instance }, 423)
  }
  if (err instanceof UnauthorizedError) {
    return c.json({ type: '/errors/unauthorized', title: err.message, status: 401, instance }, 401)
  }
  if (err instanceof ForbiddenError) {
    return c.json({ type: '/errors/forbidden',    title: err.message, status: 403, instance }, 403)
  }
  if (err instanceof NotFoundError) {
    return c.json({ type: '/errors/not-found',    title: err.message, status: 404, instance }, 404)
  }
  if (err instanceof GoneError) {
    return c.json({ type: '/errors/gone',         title: err.message, status: 410, instance }, 410)
  }
  if (err instanceof BadRequestError) {
    return c.json({ type: '/errors/bad-request',  title: err.message, status: 400, instance }, 400)
  }
  if (err instanceof ConflictError) {
    return c.json({ type: '/errors/conflict',     title: err.message, status: 409, instance }, 409)
  }
  if (err instanceof EmailFailedError) {
    return c.json({ type: '/errors/email-failed', title: err.message, status: 424, instance }, 424)
  }
  if (err instanceof AppError) {
    return c.json({ type: `/errors/${err.code}`,  title: err.message, status: 500, instance }, 500)
  }

  // 未知のエラー — 詳細は隠蔽
  logger.error('[Unhandled Error]', { err: String(err), stack: (err as Error).stack })
  return c.json({ type: '/errors/internal', title: 'Internal Server Error', status: 500, instance }, 500)
}