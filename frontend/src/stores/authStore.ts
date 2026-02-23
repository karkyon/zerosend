// =============================================================
// ZeroSend — stores/authStore.ts
//
// パス        : frontend/src/stores/authStore.ts
// 作成日      : 2026-02-23
// 更新日      : 2026-02-23
//
// 概要        : JWT アクセストークン・ユーザー情報管理 Zustand ストア
//               access_token はメモリ保持のみ（localStorage 不使用 / XSS対策）
//
// 依存関係    :
//   zustand                ^5     create
//   @/types/api            local  UserRole
//
// State       :
//   accessToken    string | null   JWT Bearer トークン
//   user           AuthUser | null ログイン中ユーザー情報
//   isAuthenticated boolean        認証状態フラグ
//
// Actions     :
//   setAuth(token, user)   ログイン成功時に呼ぶ
//   logout()               トークン・ユーザー情報をクリア
//   getToken()             apiClient の beforeRequest フックから呼ぶ
//
// 使用箇所    :
//   @/main.tsx             setupApiClient に getToken を渡す
//   @/components/layout/ProtectedRoute  認証ガード
//   @/components/layout/Navbar          ユーザー表示・ログアウト
//   @/pages/LoginPage      setAuth() 呼び出し
// =============================================================

import { create } from 'zustand'
import type { UserRole } from '@/types/api'

interface AuthUser {
  id: string
  email: string
  displayName: string
  role: UserRole
  totpEnabled: boolean
}

interface AuthState {
  accessToken: string | null
  user: AuthUser | null
  isAuthenticated: boolean

  // Actions
  setAuth: (token: string, user: AuthUser) => void
  logout: () => void
  getToken: () => string | null
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  accessToken: null,
  user: null,
  isAuthenticated: false,

  setAuth: (token, user) =>
    set({ accessToken: token, user, isAuthenticated: true }),

  logout: () =>
    set({ accessToken: null, user: null, isAuthenticated: false }),

  getToken: () => get().accessToken,
}))