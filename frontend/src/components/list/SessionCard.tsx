// =============================================================
// ZeroSend — components/list/SessionCard.tsx
//
// パス        : frontend/src/components/list/SessionCard.tsx
// 作成日      : 2026-02
//
// 概要        : F-27 送信ファイル管理ページ のカードコンポーネント
//               - thumb-gradient サムネイル
//               - 🔒 暗号化済みバッジ (常時表示)
//               - CountdownTimer (F-30)
//               - クリック → 詳細モーダルを開く
// =============================================================

import type { TransferSession } from '@/types/api'
import { CountdownTimer } from './CountdownTimer'

interface Props {
  session:  TransferSession
  onSelect: (session: TransferSession) => void
}

// ファイル拡張子からグラデーション色を決定
function getThumbGradient(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    pdf:  'from-red-500 to-orange-400',
    doc:  'from-blue-600 to-blue-400',
    docx: 'from-blue-600 to-blue-400',
    xls:  'from-green-600 to-emerald-400',
    xlsx: 'from-green-600 to-emerald-400',
    ppt:  'from-orange-500 to-amber-400',
    pptx: 'from-orange-500 to-amber-400',
    zip:  'from-purple-600 to-violet-400',
    png:  'from-pink-500 to-rose-400',
    jpg:  'from-pink-500 to-rose-400',
    jpeg: 'from-pink-500 to-rose-400',
    mp4:  'from-indigo-600 to-purple-400',
    mp3:  'from-teal-600 to-cyan-400',
  }
  return map[ext] ?? 'from-slate-600 to-slate-400'
}

// ファイル拡張子ラベル
function getExtLabel(fileName: string): string {
  return (fileName.split('.').pop()?.toUpperCase() ?? 'FILE').slice(0, 4)
}

// ファイルサイズを人間が読みやすい形式に
function formatSize(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 ** 2)   return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3)   return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`
}

// ステータスバッジ
const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  initiated: { label: '処理中',   cls: 'bg-yellow-100 text-yellow-700' },
  ready:     { label: '有効',     cls: 'bg-green-100  text-green-700'  },
  expired:   { label: '期限切れ', cls: 'bg-red-100    text-red-600'    },
  deleted:   { label: '削除済み', cls: 'bg-slate-100  text-slate-500'  },
}

// クラウドプロバイダーアイコン (テキスト)
const CLOUD_LABEL: Record<string, string> = {
  box:       '📦 Box',
  google:    '📁 Drive',
  onedrive:  '☁️ OneDrive',
  dropbox:   '💧 Dropbox',
}

export function SessionCard({ session, onSelect }: Props) {
  const gradient  = getThumbGradient(session.fileName)
  const extLabel  = getExtLabel(session.fileName)
  const statusCfg = STATUS_MAP[session.status] ?? { label: session.status, cls: 'bg-slate-100 text-slate-500' }
  const isDeleted = session.status === 'deleted'

  return (
    <button
      onClick={() => onSelect(session)}
      className={`group relative w-full text-left bg-white rounded-xl border border-slate-200 overflow-hidden
        shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200
        ${isDeleted ? 'opacity-60' : ''}`}
    >
      {/* サムネイル */}
      <div className={`h-28 bg-gradient-to-br ${gradient} flex items-center justify-center relative`}>
        <span className="text-white font-extrabold text-3xl opacity-80">{extLabel}</span>

        {/* 暗号化済みバッジ (常時表示) */}
        <span className="absolute top-2 left-2 flex items-center gap-1 bg-black/40 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          🔒 暗号化済み
        </span>

        {/* ステータスバッジ */}
        <span className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${statusCfg.cls}`}>
          {statusCfg.label}
        </span>
      </div>

      {/* カード本体 */}
      <div className="p-3">
        {/* ファイル名 */}
        <p className="text-sm font-semibold text-slate-800 truncate mb-0.5" title={session.fileName}>
          {session.fileName}
        </p>

        {/* ファイルサイズ */}
        <p className="text-xs text-slate-400 mb-2">{formatSize(session.fileSizeBytes)}</p>

        {/* 受信者メール */}
        <p className="text-xs text-slate-600 truncate mb-2" title={session.recipientEmail}>
          ✉ {session.recipientEmail}
        </p>

        {/* フッター */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {CLOUD_LABEL[session.cloudProvider] ?? session.cloudProvider}
          </span>
          <span className="text-xs text-slate-400">
            DL {session.downloadCount}/{session.maxDownloads}
          </span>
        </div>

        {/* カウントダウン */}
        <div className="mt-2 pt-2 border-t border-slate-100">
          <CountdownTimer expiresAt={session.expiresAt} />
        </div>
      </div>
    </button>
  )
}