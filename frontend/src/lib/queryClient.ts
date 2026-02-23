// =============================================================
// ZeroSend — lib/queryClient.ts
//
// パス        : frontend/src/lib/queryClient.ts
// 作成日      : 2026-02-23
// 更新日      : 2026-02-23
//
// 概要        : TanStack Query QueryClient グローバル設定
//               staleTime / gcTime / retry / onError 設定
//
// 依存関係    :
//   @tanstack/react-query  ^5     QueryClient
//   @/lib/apiClient        local  ApiError (リトライ判定に使用)
//
// 設定値      :
//   staleTime    : 2分  (120,000ms)
//   gcTime       : 10分 (600,000ms)
//   retry        : 401/403/404/410/423 はリトライしない / 最大2回
//   mutations    : リトライなし
//
// 使用箇所    :
//   @/App.tsx              QueryClientProvider に渡す
// =============================================================

import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/apiClient'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,      // 2分間はキャッシュをフレッシュとみなす
      gcTime: 1000 * 60 * 10,         // 10分後にキャッシュGC
      retry: (failureCount, error) => {
        // 401/403/404/410 はリトライしない
        if (error instanceof ApiError) {
          const noRetry = [401, 403, 404, 410, 423]
          if (noRetry.includes(error.status)) return false
        }
        return failureCount < 2
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
})