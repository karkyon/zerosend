// =====================================
// ファイルパス  : zerosend/src/routes/auth.route.ts
//
// 説明・目的・機能概要:
//   認証エンドポイントコントローラ。
//   POST /api/v1/auth/login         : Zod 検証 → AuthService.login() → 200
//   POST /api/v1/auth/totp/verify   : Zod 検証 → AuthService.verifyTotp() → 200/401/423
//
// 作成日時 : 2026-02-21
// 更新日時 : 2026-02-21
//
// 依存関係:
//   hono, ../services/auth.service
//   ../validators/auth.validator, ../types/errors, ../types/index
// =====================================

import { Hono } from 'hono'
import { login, verifyTotp } from '../services/auth.service.js'
import { loginSchema, verifyTotpSchema } from '../validators/auth.validator.js'
import { BadRequestError } from '../types/errors.js'
import type { AppEnv } from '../types/index.js'

export const authRoute = new Hono<AppEnv>()

// ─── POST /api/v1/auth/login ─────────────────────────────────────────────────

authRoute.post('/login', async (c) => {
  const raw = await c.req.json().catch(() => null)
  const result = loginSchema.safeParse(raw)

  if (!result.success) {
    throw new BadRequestError(result.error.issues.map(i => i.message).join(', '))
  }

  const { email, password } = result.data
  const ipAddress = c.req.header('X-Forwarded-For') ?? c.req.header('X-Real-IP')
  const userAgent = c.req.header('User-Agent')

  const loginResult = await login({ email, password, ipAddress, userAgent })

  return c.json({
    access_token: loginResult.accessToken,
    expires_in:   loginResult.expiresIn,
    user: {
      id:           loginResult.userId,
      display_name: loginResult.displayName,
      role:         loginResult.role,
    },
  }, 200)
})

// ─── POST /api/v1/auth/totp/verify ──────────────────────────────────────────

authRoute.post('/totp/verify', async (c) => {
  const raw = await c.req.json().catch(() => null)
  const result = verifyTotpSchema.safeParse(raw)

  if (!result.success) {
    throw new BadRequestError(result.error.issues.map(i => i.message).join(', '))
  }

  const { url_token, email, otp } = result.data
  const ipAddress = c.req.header('X-Forwarded-For') ?? c.req.header('X-Real-IP')
  const userAgent = c.req.header('User-Agent')

  const totpResult = await verifyTotp({ urlToken: url_token, email, otp, ipAddress, userAgent })

  return c.json({
    auth_token:  totpResult.authToken,
    expires_in:  totpResult.expiresIn,
  }, 200)
})