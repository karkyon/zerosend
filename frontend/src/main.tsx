// =============================================================
// ZeroSend — main.tsx
//
// パス        : frontend/src/main.tsx
// 作成日      : 2026-02-23
// 更新日      : 2026-02-23
//
// 概要        : React 19 エントリポイント
//               APIクライアントに認証フックを登録する
//
// 依存関係    :
//   react                  ^19    StrictMode / createRoot
//   react-dom/client       ^19    DOM マウント
//   @/index.css            local  グローバルスタイル
//   @/App                  local  ルートコンポーネント
//   @/lib/apiClient        local  setupApiClient()
//   @/stores/authStore     local  useAuthStore (getToken / logout)
//   @/stores/keyStore      local  useKeyStore (clearKey)
// =============================================================

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/index.css'
import App from '@/App'
import { setupApiClient } from '@/lib/apiClient'
import { useAuthStore } from '@/stores/authStore'
import { useKeyStore } from '@/stores/keyStore'

// ─── APIクライアントに認証ストアをバインド ───────────────────
setupApiClient(
  () => useAuthStore.getState().getToken(),
  () => {
    // 401 → 自動ログアウト
    useAuthStore.getState().logout()
    useKeyStore.getState().clearKey()
    window.location.href = '/login'
  },
)

// ─── React 19 createRoot ───────────────────────────────────
const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)