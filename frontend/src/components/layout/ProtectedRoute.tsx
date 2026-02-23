// =============================================================
// ZeroSend — components/layout/ProtectedRoute.tsx
//
// パス        : frontend/src/components/layout/ProtectedRoute.tsx
// 作成日      : 2026-02-23
// 更新日      : 2026-02-23
//
// 概要        : 認証ガード HOC (Higher-Order Component)
//               JWT 未認証 → /login へリダイレクト
//               requireAdmin=true 時、admin ロール以外 → / へリダイレクト
//
// 依存関係    :
//   react-router-dom       ^7     Navigate / Outlet
//   @/stores/authStore     local  useAuthStore (isAuthenticated / user.role)
//
// Props       :
//   requireAdmin  boolean  (default: false)  admin ロール必須フラグ
//
// 使用箇所    :
//   @/App.tsx              認証必須ルートのラッパーとして使用
// =============================================================

import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

interface ProtectedRouteProps {
  requireAdmin?: boolean
}

export function ProtectedRoute({ requireAdmin = false }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requireAdmin && user?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}