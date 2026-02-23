// =============================================================
// ZeroSend — App.tsx
//
// パス        : frontend/src/App.tsx
// 作成日      : 2026-02-23
// 更新日      : 2026-02-23
//
// 概要        : React Router v7 ルーティング設定
//               Routes: /login / / (send) / /list / /download/:token / /admin
//
// 依存関係    :
//   react-router-dom               ^7     BrowserRouter / Routes / Route / Navigate
//   @tanstack/react-query          ^5     QueryClientProvider
//   @tanstack/react-query-devtools ^5     ReactQueryDevtools (開発環境のみ)
//   @/lib/queryClient              local  QueryClient インスタンス
//   @/components/layout/ProtectedRoute  local  認証ガード HOC
//   @/components/layout/Navbar     local  共通ナビゲーションバー
//   @/pages/LoginPage              local  /login
//   @/pages/SendPage               local  / (送信画面)
//   @/pages/ListPage               local  /list (送信履歴)
//   @/pages/DownloadPage           local  /download/:token (受信画面)
//   @/pages/AdminPage              local  /admin (管理者ダッシュボード)
// =============================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/queryClient'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { Navbar } from '@/components/layout/Navbar'
import { LoginPage } from '@/pages/LoginPage'
import { SendPage } from '@/pages/SendPage'
import { ListPage } from '@/pages/ListPage'
import { DownloadPage } from '@/pages/DownloadPage'
import { AdminPage } from '@/pages/AdminPage'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Navbar />
        <main>
          <Routes>
            {/* 認証不要ルート */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/download/:token" element={<DownloadPage />} />

            {/* 認証必須ルート */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<SendPage />} />
              <Route path="/list" element={<ListPage />} />
            </Route>

            {/* Admin専用ルート */}
            <Route element={<ProtectedRoute requireAdmin />}>
              <Route path="/admin" element={<AdminPage />} />
            </Route>

            {/* その他 → 送信画面 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </BrowserRouter>

      {/* TanStack Query DevTools（開発環境のみ） */}
      {import.meta.env.DEV && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}