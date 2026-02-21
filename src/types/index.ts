import type { Context } from 'hono'

// Hono Context の型拡張
// auth.middleware.ts が検証後にこれらの値を set() する
export type AppEnv = {
  Variables: {
    userId:    string
    userRole:  'user' | 'admin'
    userEmail: string
  }
}

export type AppContext = Context

// RFC 7807 Problem Details 形式
export type ProblemDetail = {
  type:      string
  title:     string
  status:    number
  detail?:   string
  instance?: string
  [key: string]: unknown
}

// ページネーション共通型
export type Paginated = {
  data:       T[]
  total:      number
  page:       number
  perPage:    number
  totalPages: number
}
