// =====================================
// ファイルパス  : zerosend/src/validators/auth.validator.ts
//
// 説明・目的・機能概要:
//   認証エンドポイント用 Zod バリデーションスキーマ。
//   loginSchema      : POST /auth/login のリクエストボディ検証
//   verifyTotpSchema : POST /auth/totp/verify のリクエストボディ検証
//
// 作成日時 : 2026-02-21
// 更新日時 : 2026-02-21
//
// 依存関係:
//   zod
// =====================================

import { z } from 'zod'

// POST /api/v1/auth/login
export const loginSchema = z.object({
  email:    z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type LoginBody = z.infer<typeof loginSchema>

// POST /api/v1/auth/totp/verify
export const verifyTotpSchema = z.object({
  url_token: z.string().min(1, 'url_token is required'),
  email:     z.string().email('Invalid email format'),
  otp:       z.string().length(6, 'OTP must be 6 digits').regex(/^\d{6}$/, 'OTP must be numeric'),
})

export type VerifyTotpBody = z.infer<typeof verifyTotpSchema>