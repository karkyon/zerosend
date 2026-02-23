// =============================================================
// ZeroSend — components/send/SuccessView.tsx
//
// パス        : frontend/src/components/send/SuccessView.tsx
// 作成日      : 2026-02-23
// 更新日      : 2026-02-23
//
// 概要        : F-26 送信完了画面
//               生成されたワンタイムURLの表示 + コピーボタン
//               qrcode.react による QRコード生成
//               「サーバにファイルは保持されません」注記
//
// 依存関係:
//   qrcode.react   QRコード生成
//   lucide-react   アイコン
// =============================================================

import { useState, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { CheckCircle, Copy, Check, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react'

// ─── Props ───────────────────────────────────────────────────────────────────

interface SuccessViewProps {
  shareUrl: string
  expiresAt: string
  recipientEmail: string
  fileName: string
  onSendAnother: () => void
}

// ─── ユーティリティ ───────────────────────────────────────────────────────────

function formatExpiresAt(isoString: string): string {
  try {
    const date = new Date(isoString)
    return date.toLocaleString('ja-JP', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Asia/Tokyo',
    }) + ' JST'
  } catch {
    return isoString
  }
}

// ─── コンポーネント ───────────────────────────────────────────────────────────

export function SuccessView({
  shareUrl,
  expiresAt,
  recipientEmail,
  fileName,
  onSendAnother,
}: SuccessViewProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // フォールバック: input select
      const input = document.createElement('input')
      input.value = shareUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }, [shareUrl])

  return (
    <div className="flex flex-col items-center py-8 px-4 space-y-7 max-w-md mx-auto">

      {/* 成功アニメーション */}
      <div className="relative">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center animate-[scale-in_0.4s_ease-out]">
          <CheckCircle className="w-10 h-10 text-emerald-500" />
        </div>
        {/* リング */}
        <div className="absolute inset-0 rounded-full border-4 border-emerald-200 animate-ping opacity-30" />
      </div>

      {/* タイトル */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-800">送信完了！</h2>
        <p className="text-sm text-gray-500">
          <span className="font-semibold text-gray-700">{recipientEmail}</span> へのリンクが発行されました
        </p>
        <p className="text-xs text-gray-400 truncate max-w-xs" title={fileName}>
          📄 {fileName}
        </p>
      </div>

      {/* QRコード */}
      <div className="flex flex-col items-center gap-3">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <QRCodeSVG
            value={shareUrl}
            size={160}
            level="M"
            includeMargin={false}
            fgColor="#1e1b4b"
          />
        </div>
        <p className="text-[11px] text-gray-400">QRコードをスキャンしてアクセス</p>
      </div>

      {/* URL表示 + コピー */}
      <div className="w-full space-y-2">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">ワンタイムURL</p>
        <div className="flex items-stretch gap-2">
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 overflow-hidden">
            <p className="text-xs font-mono text-gray-700 truncate" title={shareUrl}>
              {shareUrl}
            </p>
          </div>
          <button
            onClick={handleCopy}
            className={[
              'flex items-center justify-center w-10 rounded-xl border transition-all duration-200 flex-shrink-0',
              copied
                ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                : 'bg-white border-gray-200 text-gray-500 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600',
            ].join(' ')}
            title="URLをコピー"
            aria-label="URLをコピー"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-10 bg-white border border-gray-200 text-gray-500 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 rounded-xl transition-all duration-200 flex-shrink-0"
            title="URLを開く"
            aria-label="URLを新しいタブで開く"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
        {copied && (
          <p className="text-[11px] text-emerald-600 flex items-center gap-1">
            <Check className="w-3 h-3" /> URLをクリップボードにコピーしました
          </p>
        )}
      </div>

      {/* 有効期限 */}
      <div className="w-full bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
        <div className="text-amber-500 mt-0.5 flex-shrink-0">⏰</div>
        <div>
          <p className="text-xs font-semibold text-amber-800">有効期限</p>
          <p className="text-[11px] text-amber-600">{formatExpiresAt(expiresAt)}</p>
          <p className="text-[10px] text-amber-500 mt-0.5">期限後はURLとファイルが自動削除されます</p>
        </div>
      </div>

      {/* セキュリティ注記 */}
      <div className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-emerald-800">ゼロ保持設計</p>
          <p className="text-[11px] text-emerald-600">
            サーバにはファイル本体も平文鍵も保持されません。
            ファイルは受信者のクラウドストレージに暗号化済みで保存されています。
          </p>
        </div>
      </div>

      {/* 別のファイルを送るボタン */}
      <button
        onClick={onSendAnother}
        className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm shadow-indigo-200"
      >
        <RefreshCw className="w-4 h-4" />
        別のファイルを送る
      </button>
    </div>
  )
}