// =====================================
// ファイルパス  : zerosend/src/types/index.ts
//
// 説明・目的・機能概要:
//   共通型定義。
//   Hono Context 型拡張（AppEnv / AppContext）、RFC 7807 ProblemDetail 型、
//   ページネーション型、JWT ペイロード型、TransferSession 作成レスポンス型を定義する。
//
// 作成日時 : 2026-02-21
// 更新日時 : 2026-02-21
//
// 依存関係:
//   hono
// =====================================

import type { Context } from 'hono'

// Hono Context の型拡張 — auth.middleware が注入するユーザ情報
export type AppEnv = {
  Variables: {
    userId: string
    userRole: 'user' | 'admin'
    userEmail: string
  }
}

export type AppContext = Context<AppEnv>

// RFC 7807 Problem Details 型
export type ProblemDetail = {
  type: string
  title: string
  status: number
  detail?: string
  instance?: string
  [key: string]: unknown
}

// ページネーション共通型
export type Paginated<T> = {
  data: T[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

// 転送セッション作成レスポンス型
export type InitiateResult = {
  sessionId: string
  uploadUrl: string
  recipientPublicKeyB64: string
  urlToken: string
  expiresAt: Date
}

// JWT ペイロード型
export type JwtPayload = {
  sub: string        // userId
  email: string
  role: 'user' | 'admin'
  iat?: number
  exp?: number
}