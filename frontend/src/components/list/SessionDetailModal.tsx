// =============================================================
// ZeroSend — components/list/SessionDetailModal.tsx
//
// パス        : frontend/src/components/list/SessionDetailModal.tsx
// 作成日      : 2026-02
//
// 概要        : F-31 セッション詳細モーダル / F-32 強制削除
//               - GET /admin/sessions/:id でセッション詳細 + 監査ログを取得
//               - フォースデリートボタン → 確認ダイアログ → DELETE API
//               - 削除成功後に onDeleted() コールバックを発火
// =============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { TransferSession } from '@/types/api'
import { fetchSessionDetail, deleteSession } from '@/services/adminService'
import { CountdownTimer } from './CountdownTimer'

interface Props {
  session:    TransferSession
  onClose:    () => void
  onDeleted:  (id: string) => void
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function formatSize(bytes: number): string {
  if (bytes < 1024)       return `${bytes} B`
  if (bytes < 1024 ** 2)  return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3)  return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`
}

const EVENT_LABEL: Record<string, string> = {
  url_issued:    'URL発行',
  auth_success:  '認証成功',
  auth_fail:     '認証失敗',
  dl_success:    'DL成功',
  dl_fail:       'DL失敗',
  deleted:       '削除',
  admin_delete:  '管理者削除',
  lock:          'アカウントロック',
  unlock:        'ロック解除',
  access:        'アクセス',
}

export function SessionDetailModal({ session, onClose, onDeleted }: Props) {
  const queryClient = useQueryClient()

  // 詳細データ取得
  const { data, isLoading } = useQuery({
    queryKey:  ['session-detail', session.id],
    queryFn:   () => fetchSessionDetail(session.id),
    staleTime: 30_000,
  })

  // 強制削除 mutation
  const deleteMutation = useMutation({
    mutationFn: () => deleteSession(session.id),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sessions'] })
      onDeleted(session.id)
      onClose()
    },
  })

  function handleForceDelete() {
    if (window.confirm(
      `「${session.fileName}」を強制削除します。\nこの操作は取り消せません。続行しますか？`
    )) {
      deleteMutation.mutate()
    }
  }

  const canDelete = session.status !== 'deleted'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">

        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800 truncate max-w-md" title={session.fileName}>
              {session.fileName}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">ID: {session.id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="閉じる"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* ボディ */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">

          {/* 基本情報グリッド */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: '送信者',         value: session.senderEmail },
              { label: '受信者',         value: session.recipientEmail },
              { label: 'ファイルサイズ', value: formatSize(session.fileSizeBytes) },
              { label: 'クラウド',       value: session.cloudProvider },
              { label: '2FA種別',        value: session.twoFaType },
              { label: 'DL回数',         value: `${session.downloadCount} / ${session.maxDownloads}` },
              { label: '作成日時',       value: formatDate(session.createdAt) },
              { label: '有効期限',       value: formatDate(session.expiresAt) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-500 mb-0.5">{label}</p>
                <p className="text-sm text-slate-800 break-all">{value}</p>
              </div>
            ))}
          </div>

          {/* カウントダウン */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">残り時間:</span>
            <CountdownTimer expiresAt={session.expiresAt} />
          </div>

          {/* 監査ログ */}
          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              監査ログ
              {isLoading && <span className="text-xs text-slate-400 font-normal animate-pulse">読み込み中…</span>}
            </h3>

            {data?.auditLogs.length === 0 && !isLoading && (
              <p className="text-xs text-slate-400 italic">ログなし</p>
            )}

            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {data?.auditLogs.map((log) => (
                <div
                  key={log.id}
                  className={`flex items-center gap-3 text-xs px-3 py-2 rounded-lg
                    ${log.action === 'auth_fail' || log.action === 'dl_fail'
                      ? 'bg-red-50 text-red-700'
                      : log.action === 'deleted' || log.action === 'admin_delete'
                        ? 'bg-orange-50 text-orange-700'
                        : 'bg-slate-50 text-slate-700'
                    }`}
                >
                  <span className="font-semibold shrink-0">
                    {EVENT_LABEL[log.action] ?? log.action}
                  </span>
                  <span className="text-slate-400 shrink-0">{formatDate(log.createdAt)}</span>
                  <span className="text-slate-400 truncate">{log.ipAddress}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            閉じる
          </button>

          {canDelete && (
            <button
              onClick={handleForceDelete}
              disabled={deleteMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white
                bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-lg transition-colors"
            >
              {deleteMutation.isPending ? (
                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
              強制削除
            </button>
          )}
        </div>
      </div>
    </div>
  )
}