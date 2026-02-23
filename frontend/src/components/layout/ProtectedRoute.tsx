// =============================================================
// ZeroSend — components/layout/ProtectedRoute.tsx
//
// パス        : frontend/src/components/layout/ProtectedRoute.tsx
// 作成日      : 2026-02-23
// 更新日      : 2026-02-23
//
// 概要        : F-15 認証ガード HOC（Higher-Order Component）
//               JWT 未認証 → /login リダイレクト
//               requireAdmin=true 時、admin ロール以外 → / リダイレクト
//               全不正アクセス試行を securityLogger で記録
//
// セキュリティ設計:
//   - 未認証アクセス試行をすべて UNAUTHORIZED_ACCESS として記録
//   - admin 権限不足アクセスを FORBIDDEN_ACCESS として記録
//   - リダイレクト前にアクセスしたパスを記録（監査証跡）
//   - Outlet レンダリング前にトークン有効期限の確認を実施
//
// Props:
//   requireAdmin  boolean  (default: false)  admin ロール必須フラグ
//
// 使用箇所:
//   @/App.tsx  認証必須ルートのラッパーとして使用
// =============================================================

import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { logUnauthorizedAccess, logForbiddenAccess } from '@/lib/securityLogger'

interface ProtectedRouteProps {
  requireAdmin?: boolean
}

export function ProtectedRoute({ requireAdmin = false }: ProtectedRouteProps) {
  const location        = useLocation()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const user            = useAuthStore(s => s.user)
  const checkTokenExpiry = useAuthStore(s => s.checkTokenExpiry)

  // レンダリング前にトークン有効期限チェック（期限切れなら logout() が呼ばれる）
  useEffect(() => {
    if (isAuthenticated) {
      checkTokenExpiry()
    }
  }, [isAuthenticated, checkTokenExpiry, location.pathname])

  // ── 未認証チェック ──
  if (!isAuthenticated) {
    logUnauthorizedAccess(location.pathname)

    // state にアクセス先を保存（ログイン後に元のページに戻れるよう）
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // ── Admin 権限チェック ──
  if (requireAdmin && user?.role !== 'admin') {
    logForbiddenAccess(location.pathname, user?.role ?? 'unknown')
    return <Navigate to="/" replace />
  }

  return <Outlet />
}