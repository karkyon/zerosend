// =============================================================
// ZeroSend — pages/SendPage.tsx
//
// パス        : frontend/src/pages/SendPage.tsx
// 作成日      : 2026-02-23
// 更新日      : 2026-02-23
//
// 概要        : Phase 2 ファイル送信ページ (SCREEN 1)
//               F-16 3ステップインジケーター
//               F-17 ドラッグ&ドロップゾーン
//               F-18 受信者メール入力 + Kyber鍵バッジ
//               F-19 クラウドストレージ選択
//               F-20 セキュリティ設定パネル
//               F-21 分割アップロードトグル
//               F-22 クライアント側 AES-256-GCM 暗号化
//               F-23 ML-KEM-768 鍵カプセル化（送信側）
//               F-24 送信 API フロー (initiate → PUT → storeKey → finalizeUrl)
//               F-25 送信進捗バー & アニメーション
//               F-26 送信完了画面（ワンタイムURL + QRコード）
//
// 依存関係:
//   @/stores/transferStore         Zustand 送信フロー状態
//   @/lib/cryptoService            AES 暗号化・SHA3ハッシュ
//   @/services/transferService     API 連携
//   @/components/send/*            サブコンポーネント群
// =============================================================

import { useState, useCallback } from 'react'
import { useTransferStore } from '@/stores/transferStore'
import { StepIndicator }        from '@/components/send/StepIndicator'
import { DropZone }             from '@/components/send/DropZone'
import { RecipientInput }       from '@/components/send/RecipientInput'
import { CloudStorageSelector } from '@/components/send/CloudStorageSelector'
import { SecurityPanel }        from '@/components/send/SecurityPanel'
import { ProgressView }         from '@/components/send/ProgressView'
import { SuccessView }          from '@/components/send/SuccessView'
import { encryptFile, computeFileSha3, formatFileSize } from '@/lib/cryptoService'
import { executeSendFlow }      from '@/services/transferService'
import type { SendStage }       from '@/services/transferService'
import type { TwoFaType }       from '@/types/api'
import { Shield, ChevronRight, ChevronLeft, Send } from 'lucide-react'

// ─── 型 ──────────────────────────────────────────────────────────────────────

type UIStep = 1 | 2 | 3

interface SuccessData {
  shareUrl: string
  expiresAt: string
  sessionId: string
}

// ─── コンポーネント ───────────────────────────────────────────────────────────

export function SendPage() {
  // ── Zustand ストア ──────────────────────────────────────────────────────────
  const {
    file, setFile,
    recipientEmail, recipientPublicKeyB64, hasKyberKey,
    setRecipient,
    cloudProvider, expiresInSeconds, maxDownloads, twofaType,
    setSettings,
    reset,
  } = useTransferStore()

  // ── ローカル状態 ────────────────────────────────────────────────────────────
  const [uiStep, setUiStep]           = useState<UIStep>(1)
  const [splitUpload, setSplitUpload] = useState(false)

  // 暗号化・送信処理
  const [encryptProgress, setEncryptProgress] = useState(0)
  const [uploadProgress, setUploadProgress]   = useState(0)
  const [sendStage, setSendStage]             = useState<SendStage | null>(null)
  const [error, setError]                     = useState<string | null>(null)
  const [successData, setSuccessData]         = useState<SuccessData | null>(null)

  const isSending = sendStage !== null && sendStage !== 'done'

  // ── バリデーション ──────────────────────────────────────────────────────────

  const canProceedStep1 = !!file
  const canProceedStep2 = !!recipientEmail && hasKyberKey
  const canSend         = canProceedStep1 && canProceedStep2

  // ── ハンドラ ────────────────────────────────────────────────────────────────

  const handleFileSelect = useCallback((f: File) => {
    setFile(f)
  }, [setFile])

  const handleFileClear = useCallback(() => {
    setFile(null)
  }, [setFile])

  const handleRecipientChange = useCallback((
    email: string,
    publicKeyB64: string | null,
    hasKey: boolean
  ) => {
    setRecipient(email, publicKeyB64, hasKey)
  }, [setRecipient])

  // ── 送信実行 ────────────────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    if (!file || !recipientEmail || !recipientPublicKeyB64) {
      setError('ファイルと受信者を設定してください')
      return
    }

    setError(null)
    setEncryptProgress(0)
    setUploadProgress(0)

    try {
      // Step A: SHA3-256 ハッシュ計算
      setSendStage('initiating')
      const fileHashSha3 = await computeFileSha3(file)

      // Step B: AES-256-GCM 暗号化 (F-22)
      const encrypted = await encryptFile(file, (p) => setEncryptProgress(p))

      // Step C: 送信フロー実行 (F-24: initiate → upload → storeKey → finalizeUrl)
      const result = await executeSendFlow({
        file,
        fileHashSha3,
        encryptedData:         encrypted.encryptedData,
        aesKeyRaw:             encrypted.aesKeyRaw,   // ML-KEM-768カプセル化 (F-23) は内部で実行
        recipientEmail,
        recipientPublicKeyB64,
        cloudProvider,
        expiresInSeconds,
        maxDownloads,
        twofaType,
        onStageChange:    (stage) => setSendStage(stage),
        onUploadProgress: (p) => setUploadProgress(p),
      })

      setSuccessData({
        shareUrl:  result.shareUrl,
        expiresAt: result.expiresAt,
        sessionId: result.sessionId,
      })
      setSendStage('done')

    } catch (err) {
      const msg = err instanceof Error ? err.message : '送信中にエラーが発生しました'
      setError(msg)
      setSendStage(null)
    }
  }, [
    file, recipientEmail, recipientPublicKeyB64,
    cloudProvider, expiresInSeconds, maxDownloads, twofaType,
  ])

  const handleSendAnother = useCallback(() => {
    reset()
    setSuccessData(null)
    setSendStage(null)
    setError(null)
    setEncryptProgress(0)
    setUploadProgress(0)
    setUiStep(1)
  }, [reset])

  // ── 送信完了画面 ────────────────────────────────────────────────────────────

  if (successData) {
    return (
      <SuccessView
        shareUrl={successData.shareUrl}
        expiresAt={successData.expiresAt}
        recipientEmail={recipientEmail}
        fileName={file?.name ?? ''}
        onSendAnother={handleSendAnother}
      />
    )
  }

  // ── 送信中画面 ──────────────────────────────────────────────────────────────

  if (isSending && sendStage) {
    return (
      <ProgressView
        stage={sendStage}
        encryptProgress={encryptProgress}
        uploadProgress={uploadProgress}
        fileName={file?.name ?? ''}
      />
    )
  }

  // ── 通常フォーム ────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* ステップインジケーター */}
      <StepIndicator currentStep={uiStep} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* メインエリア (左 2列) */}
        <div className="lg:col-span-2 space-y-6">

          {/* ── STEP 1: ファイル選択 ── */}
          {uiStep === 1 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-indigo-600 text-white rounded-full text-xs font-bold flex items-center justify-center">1</div>
                <h2 className="text-base font-bold text-gray-800">ファイルを選択</h2>
              </div>

              <DropZone
                file={file}
                onFileSelect={handleFileSelect}
                onFileClear={handleFileClear}
                disabled={isSending}
              />

              {/* ファイル詳細（選択後） */}
              {file && (
                <div className="pt-2 flex items-center justify-between text-xs text-gray-500">
                  <span>ファイルサイズ: <span className="font-mono font-semibold text-gray-700">{formatFileSize(file.size)}</span></span>
                  <span className="font-mono">送信前にブラウザ内で暗号化されます</span>
                </div>
              )}

              {/* 次へボタン */}
              <button
                onClick={() => setUiStep(2)}
                disabled={!canProceedStep1 || isSending}
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold text-sm rounded-xl transition-colors"
              >
                受信者を設定する
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── STEP 2: 受信者設定 ── */}
          {uiStep === 2 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-indigo-600 text-white rounded-full text-xs font-bold flex items-center justify-center">2</div>
                <h2 className="text-base font-bold text-gray-800">受信者の設定</h2>
              </div>

              {/* 受信者メール入力 */}
              <RecipientInput
                value={recipientEmail}
                publicKeyB64={recipientPublicKeyB64}
                onRecipientChange={handleRecipientChange}
                disabled={isSending}
              />

              {/* クラウドストレージ選択 */}
              <CloudStorageSelector
                value={cloudProvider}
                onChange={(p) => setSettings({ cloudProvider: p })}
                disabled={isSending}
              />

              {/* ナビゲーション */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setUiStep(1)}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  戻る
                </button>
                <button
                  onClick={() => setUiStep(3)}
                  disabled={!canProceedStep2 || isSending}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold text-sm rounded-xl transition-colors"
                >
                  送信内容を確認
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: 確認 ── */}
          {uiStep === 3 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-indigo-600 text-white rounded-full text-xs font-bold flex items-center justify-center">3</div>
                <h2 className="text-base font-bold text-gray-800">送信内容の確認</h2>
              </div>

              {/* サマリー */}
              <div className="space-y-3 bg-gray-50 rounded-xl p-4">
                <SummaryRow label="ファイル"       value={file?.name ?? '—'} />
                <SummaryRow label="ファイルサイズ"  value={file ? formatFileSize(file.size) : '—'} mono />
                <SummaryRow label="受信者"         value={recipientEmail} />
                <SummaryRow label="クラウド"       value={cloudProvider.toUpperCase()} mono />
                <SummaryRow label="有効期限"       value={expiresInSeconds / 3600 + '時間'} mono />
                <SummaryRow label="最大DL回数"     value={maxDownloads + '回'} mono />
                <SummaryRow label="暗号化"         value="AES-256-GCM + ML-KEM-768" mono highlight />
              </div>

              {/* エラー表示 */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                  ⚠️ {error}
                </div>
              )}

              {/* ナビゲーション */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setUiStep(2)}
                  disabled={isSending}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                  戻る
                </button>
                <button
                  onClick={handleSend}
                  disabled={!canSend || isSending}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:from-gray-300 disabled:to-gray-300 disabled:text-gray-400 text-white font-bold text-sm rounded-xl transition-all shadow-sm shadow-indigo-200 disabled:shadow-none"
                >
                  <Send className="w-4 h-4" />
                  安全に送信する
                </button>
              </div>
            </div>
          )}
        </div>

        {/* サイドパネル (右 1列) - 常時表示 */}
        <div className="space-y-4">
          <SecurityPanel
            expiresInSeconds={expiresInSeconds}
            maxDownloads={maxDownloads}
            twofaType={twofaType}
            splitUpload={splitUpload}
            onExpiresChange={(v) => setSettings({ expiresInSeconds: v })}
            onMaxDownloadsChange={(v) => setSettings({ maxDownloads: v })}
            onTwofaTypeChange={(v) => setSettings({ twofaType: v as TwoFaType })}
            onSplitUploadChange={setSplitUpload}
            disabled={isSending}
          />

          {/* 量子耐性バッジ */}
          <div className="bg-gradient-to-br from-indigo-900 to-violet-900 rounded-2xl p-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-indigo-300" />
              <span className="text-xs font-bold text-indigo-200 uppercase tracking-wide">量子耐性暗号</span>
            </div>
            <p className="text-[11px] text-indigo-300 leading-relaxed">
              ML-KEM-768 (NIST FIPS 203) により、量子コンピュータによる解読から保護されます。
              AES鍵はサーバに届く前にブラウザ内で保護されます。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── サマリー行 ───────────────────────────────────────────────────────────────

function SummaryRow({
  label, value, mono = false, highlight = false,
}: {
  label: string
  value: string
  mono?: boolean
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-gray-500 flex-shrink-0">{label}</span>
      <span
        className={[
          'text-xs truncate',
          mono ? 'font-mono' : '',
          highlight ? 'text-indigo-700 font-bold' : 'text-gray-700 font-semibold',
        ].join(' ')}
        title={value}
      >
        {value}
      </span>
    </div>
  )
}