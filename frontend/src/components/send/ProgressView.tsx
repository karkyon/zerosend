// =============================================================
// ZeroSend — components/send/ProgressView.tsx
//
// パス        : frontend/src/components/send/ProgressView.tsx
// 作成日      : 2026-02-23
// 更新日      : 2026-02-23
//
// 概要        : F-25 送信進捗バー & アニメーション
//               暗号化中・アップロード中の進捗表示
//               ワイヤーフレームのグラデーション progress-bar 再現
// =============================================================

import { Shield, Upload, Key, CheckCircle, Loader2 } from 'lucide-react'
import type { SendStage } from '@/services/transferService'

// ─── 型 ──────────────────────────────────────────────────────────────────────

interface ProgressViewProps {
  stage: SendStage
  encryptProgress: number   // 0〜100 (暗号化進捗)
  uploadProgress: number    // 0〜100 (アップロード進捗)
  fileName: string
}

// ─── ステージ定義 ─────────────────────────────────────────────────────────────

interface StageItem {
  id: string
  label: string
  sublabel: string
  icon: React.ReactNode
  activeStages: SendStage[]
  doneStages: SendStage[]
}

const STAGES: StageItem[] = [
  {
    id: 'encrypt',
    label: 'ブラウザ内暗号化',
    sublabel: 'AES-256-GCM で処理中',
    icon: <Shield className="w-5 h-5" />,
    activeStages: [],   // 呼び出し元で制御
    doneStages: ['initiating', 'uploading', 'storing-key', 'finalizing', 'done'],
  },
  {
    id: 'initiate',
    label: 'セッション開始',
    sublabel: 'サーバとセッション確立',
    icon: <Key className="w-5 h-5" />,
    activeStages: ['initiating'],
    doneStages: ['uploading', 'storing-key', 'finalizing', 'done'],
  },
  {
    id: 'upload',
    label: 'クラウドへアップロード',
    sublabel: '暗号化済みファイルを転送',
    icon: <Upload className="w-5 h-5" />,
    activeStages: ['uploading'],
    doneStages: ['storing-key', 'finalizing', 'done'],
  },
  {
    id: 'key',
    label: '鍵の保護・URL発行',
    sublabel: 'ML-KEM-768 でラップ済み',
    icon: <CheckCircle className="w-5 h-5" />,
    activeStages: ['storing-key', 'finalizing'],
    doneStages: ['done'],
  },
]

// ─── 全体進捗計算 ─────────────────────────────────────────────────────────────

function getTotalProgress(
  stage: SendStage,
  encryptProgress: number,
  uploadProgress: number
): number {
  switch (stage) {
    case 'initiating':   return 30 + (encryptProgress * 0.3)
    case 'uploading':    return 45 + (uploadProgress * 0.4)
    case 'storing-key':  return 87
    case 'finalizing':   return 94
    case 'done':         return 100
    default:             return encryptProgress * 0.3
  }
}

function getStageLabel(stage: SendStage): string {
  switch (stage) {
    case 'initiating':   return 'セッション開始中...'
    case 'uploading':    return 'クラウドへアップロード中...'
    case 'storing-key':  return '暗号化鍵を保存中...'
    case 'finalizing':   return 'URLを確定中...'
    case 'done':         return '送信完了！'
    default:             return '処理中...'
  }
}

// ─── コンポーネント ───────────────────────────────────────────────────────────

export function ProgressView({
  stage,
  encryptProgress,
  uploadProgress,
  fileName,
}: ProgressViewProps) {
  const totalProgress = getTotalProgress(stage, encryptProgress, uploadProgress)
  const stageLabel = getStageLabel(stage)

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 space-y-8">

      {/* タイトル */}
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-gray-800">ファイルを送信中</h2>
        <p className="text-sm text-gray-500 truncate max-w-xs" title={fileName}>
          {fileName}
        </p>
      </div>

      {/* メインプログレスバー */}
      <div className="w-full max-w-md space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-indigo-700">
            {stageLabel}
          </span>
          <span className="text-sm font-mono font-bold text-indigo-600">
            {Math.round(totalProgress)}%
          </span>
        </div>

        {/* グラデーションバー */}
        <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600 transition-all duration-700 ease-out"
            style={{ width: `${totalProgress}%` }}
          />
          {/* キラキラ効果 */}
          <div
            className="absolute inset-y-0 rounded-full opacity-30"
            style={{
              left: `${Math.max(0, totalProgress - 15)}%`,
              width: '15%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)',
              transition: 'left 0.7s ease-out',
            }}
          />
        </div>
      </div>

      {/* ステージリスト */}
      <div className="w-full max-w-md space-y-2">
        {STAGES.map((s) => {
          const isDone   = s.doneStages.includes(stage)
          const isActive = stage === 'initiating' && s.id === 'encrypt'
            ? false
            : s.activeStages.includes(stage)
          const isEncryptDone = ['initiating', 'uploading', 'storing-key', 'finalizing', 'done'].includes(stage)

          const reallyDone = s.id === 'encrypt' ? isEncryptDone : isDone
          const reallyActive = s.id === 'encrypt'
            ? (!isEncryptDone && encryptProgress > 0)
            : isActive

          return (
            <div
              key={s.id}
              className={[
                'flex items-center gap-3 p-3 rounded-xl transition-all duration-300',
                reallyDone
                  ? 'bg-emerald-50'
                  : reallyActive
                  ? 'bg-indigo-50 border border-indigo-100'
                  : 'bg-gray-50 opacity-50',
              ].join(' ')}
            >
              {/* アイコン */}
              <div
                className={[
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                  reallyDone
                    ? 'bg-emerald-100 text-emerald-600'
                    : reallyActive
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'bg-gray-200 text-gray-400',
                ].join(' ')}
              >
                {reallyActive ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : reallyDone ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  s.icon
                )}
              </div>

              {/* テキスト */}
              <div className="flex-1">
                <p className={[
                  'text-xs font-semibold',
                  reallyDone ? 'text-emerald-700' : reallyActive ? 'text-indigo-700' : 'text-gray-500',
                ].join(' ')}>
                  {s.label}
                </p>
                <p className="text-[10px] text-gray-400">{s.sublabel}</p>
              </div>

              {/* アップロード進捗（アップロード中のみ） */}
              {s.id === 'upload' && stage === 'uploading' && (
                <span className="text-[11px] font-mono font-bold text-indigo-600">
                  {uploadProgress}%
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* セキュリティ注記 */}
      <p className="text-[11px] text-gray-400 text-center">
        🔐 ファイルはサーバを経由せず、ブラウザ内で暗号化してクラウドへ直接送信されます
      </p>
    </div>
  )
}