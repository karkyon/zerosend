import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { AppEnv } from '../types/index.js'

// ── Zod バリデーションスキーマ ───────────────────────────────────
const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8),
})

const totpVerifySchema = z.object({
  url_token: z.string().min(1),
  email:     z.string().email(),
  otp:       z.string().length(6),
})

const fido2BeginSchema = z.object({
  url_token: z.string().min(1),
  email:     z.string().email(),
})

// ── Route 定義 ────────────────────────────────────────────────────
export const authRoute = new Hono()

// POST /api/v1/auth/login
authRoute.post('/login', zValidator('json', loginSchema), async (c) => {
  const body = c.req.valid('json')
  // TODO: AuthService.login(body.email, body.password)
  return c.json({ message: 'auth/login — not yet implemented' }, 200)
})

// POST /api/v1/auth/totp/verify
authRoute.post('/totp/verify', zValidator('json', totpVerifySchema), async (c) => {
  const body = c.req.valid('json')
  // TODO: AuthService.verifyTotp(body.url_token, body.email, body.otp)
  return c.json({ message: 'auth/totp/verify — not yet implemented' }, 200)
})

// POST /api/v1/auth/fido2/begin
authRoute.post('/fido2/begin', zValidator('json', fido2BeginSchema), async (c) => {
  const body = c.req.valid('json')
  // TODO: AuthService.fido2Begin(body.url_token, body.email)
  return c.json({ message: 'auth/fido2/begin — not yet implemented' }, 200)
})

// POST /api/v1/auth/fido2/complete
authRoute.post('/fido2/complete', async (c) => {
  // TODO: AuthService.fido2Complete(credential)
  return c.json({ message: 'auth/fido2/complete — not yet implemented' }, 200)
})
