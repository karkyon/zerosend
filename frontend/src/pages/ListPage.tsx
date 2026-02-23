// =============================================================
// ZeroSend — pages/ListPage.tsx
//
// パス        : frontend/src/pages/ListPage.tsx
// 作成日      : 2026-02 (Phase 3)
//
// 概要        : F-27〜F-32 送信履歴画面 (/list)
//               - F-27: カードグリッド (4カラム)
//               - F-28: ステータスフィルタータブ
//               - F-29: キーワード検索 (300ms デバウンス)
//               - F-30: 有効期限カウントダウン (SessionCard 内)
//               - F-31: セッション詳細モーダル
//               - F-32: 強制削除 (楽観的更新)
//
// API:
//   GET /api/v1/admin/sessions?status=&q=&page=&limit=
// =============================================================

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { SessionStatus, TransferSession } from '@/types/api'
import { fetchSessions } from '@/services/adminService'
import { StatusFilterTabs } from '@/components/list/StatusFilterTabs'
import { SearchInput }       from '@/components/list/SearchInput'
import { SessionCard }       from '@/components/list/SessionCard'
import { SessionDetailModal } from '@/components/list/SessionDetailModal'

const PAGE_LIMIT = 20

export function ListPage() {
  // ─── フィルター状態 ────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<SessionStatus | undefined>(undefined)
  const [keyword,      setKeyword]      = useState('')
  const [page,         setPage]         = useState(1)

  // ─── 詳細モーダル状態 ──────────────────────────────────────
  const [selectedSession, setSelectedSession] = useState<TransferSession | null>(null)

  // ─── TanStack Query でセッション一覧取得 ──────────────────
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-sessions', statusFilter, keyword, page],
    queryFn:  () => fetchSessions({
      status: statusFilter,
      q:      keyword || undefined,
      page,
      limit:  PAGE_LIMIT,
    }),
    staleTime: 30_000,
    placeholderData: (prev) => prev,   // ページ切替時のちらつき防止
  })

  // ─── フィルター変更時にページリセット ─────────────────────
  function handleStatusChange(s: SessionStatus | undefined) {
    setStatusFilter(s)
    setPage(1)
  }
  function handleKeywordChange(q: string) {
    setKeyword(q)
    setPage(1)
  }

  // ─── 強制削除後の楽観的更新 ───────────────────────────────
  // useMutation の onSuccess で queryClient.invalidateQueries を実行済み (SessionDetailModal 内)
  // ListPage 側では setSelectedSession(null) 相当は onDeleted で処理される

  const sessions     = data?.sessions ?? []
  const total        = data?.total    ?? 0
  const totalPages   = Math.ceil(total / PAGE_LIMIT)

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ページヘッダー */}
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-800">送信履歴</h1>
          <p className="text-sm text-slate-500 mt-1">
            暗号化されたファイルの送信セッション一覧
          </p>
        </div>

        {/* フィルターバー */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* ステータスタブ */}
          <StatusFilterTabs
            current={statusFilter}
            onChange={handleStatusChange}
            counts={{ all: data?.total }}
          />

          {/* 区切り */}
          <div className="flex-1" />

          {/* キーワード検索 */}
          <div className="w-full sm:w-72">
            <SearchInput value={keyword} onChange={handleKeywordChange} />
          </div>
        </div>

        {/* 件数表示 */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-500">
            {isLoading ? '読み込み中…' : `${total} 件`}
          </p>
          <button
            onClick={() => refetch()}
            className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            更新
          </button>
        </div>

        {/* エラー表示 */}
        {isError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
            データの取得に失敗しました。バックエンドの接続を確認してください。
          </div>
        )}

        {/* カードグリッド */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden animate-pulse">
                <div className="h-28 bg-slate-200" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                  <div className="h-3 bg-slate-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-slate-500 font-medium">送信履歴がありません</p>
            <p className="text-slate-400 text-sm mt-1">
              {keyword || statusFilter ? 'フィルター条件を変更してみてください' : 'ファイルを送信すると履歴が表示されます'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onSelect={setSelectedSession}
              />
            ))}
          </div>
        )}

        {/* ページネーション */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm bg-white border border-slate-200 rounded-lg
                disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              ← 前へ
            </button>

            <span className="text-sm text-slate-600 px-2">
              {page} / {totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 text-sm bg-white border border-slate-200 rounded-lg
                disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              次へ →
            </button>
          </div>
        )}
      </div>

      {/* 詳細モーダル */}
      {selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
          onDeleted={() => setSelectedSession(null)}
        />
      )}
    </div>
  )
}