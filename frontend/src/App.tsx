// =============================================================
// ZeroSend — App.tsx
//
// パス        : frontend/src/App.tsx
// 作成日      : 2026-02-23
// 更新日      : 2026-02-23
//
// 概要        : React Router v7 ルーティング設定
//               Routes: /login / /register / / (send) / /list / /download/:token / /admin
//
// Phase 1 変更点:
//   - /register ルート追加 (F-13)
//   - useTokenExpiryWatch を AppShell に追加 (F-12)
//     → ログイン中の全画面でトークン有効期限を1分ごとにチェック
//     → 期限切れ時は authStore.logout('token_expired') が自動実行
//
// 依存関係:
//   react-router-dom               ^7
//   @tanstack/react-query          ^5
//   @tanstack/react-query-devtools ^5
//   @/lib/queryClient
//   @/components/layout/ProtectedRoute
//   @/components/layout/Navbar
//   @/pages/LoginPage              useTokenExpiryWatch もここからインポート
//   @/pages/RegisterPage
//   @/pages/SendPage
//   @/pages/ListPage
//   @/pages/DownloadPage
//   @/pages/AdminPage
// =============================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/queryClient'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { Navbar } from '@/components/layout/Navbar'
import { LoginPage, useTokenExpiryWatch } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { SendPage } from '@/pages/SendPage'
import { ListPage } from '@/pages/ListPage'
import { DownloadPage } from '@/pages/DownloadPage'
import { AdminPage } from '@/pages/AdminPage'

// ─── トークン有効期限監視を内包したアプリシェル ────────────────

function AppShell() {
  // F-12: トークン有効期限の定期チェック（60秒ごと）
  // 期限切れ → authStore.logout('token_expired') → ProtectedRoute が /login にリダイレクト
  useTokenExpiryWatch(60_000)

  return (
    <>
      <Navbar />
      <main>
        <Routes>
          {/* 認証不要ルート */}
          <Route path="/login"              element={<LoginPage />} />
          <Route path="/register"           element={<RegisterPage />} />    {/* F-13 追加 */}
          <Route path="/download/:token"    element={<DownloadPage />} />

          {/* 認証必須ルート */}
          <Route element={<ProtectedRoute />}>
            <Route path="/"     element={<SendPage />} />
            <Route path="/list" element={<ListPage />} />
          </Route>

          {/* Admin 専用ルート */}
          <Route element={<ProtectedRoute requireAdmin />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>

          {/* 未定義パス → トップへ */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  )
}

// ─── App ルートコンポーネント ──────────────────────────────────

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>

      {/* TanStack Query DevTools（開発環境のみ） */}
      {import.meta.env.DEV && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}