// =============================================================
// ZeroSend — components/send/SecurityPanel.tsx
//
// パス        : frontend/src/components/send/SecurityPanel.tsx
// 作成日      : 2026-02-23
// 更新日      : 2026-02-23
//
// 概要        : F-20 セキュリティ設定パネル
//               有効期限(1h/6h/12h/24h)、最大DL回数(1/2/3/5)
//               FIDO2 2FA トグル、常時ON項目(AES-256-GCM/ML-KEM-768)
//               F-21 分割アップロード トグル
//
// 依存関係:
//   lucide-react   アイコン
//   @/types/api    TwoFaType
// =============================================================

import { Shield, Lock, Clock, Download, Cpu, Split } from 'lucide-react'
import type { TwoFaType } from '@/types/api'

// ─── 定数 ────────────────────────────────────────────────────────────────────

const EXPIRE_OPTIONS = [
  { label: '1h',  value: 3600  },
  { label: '6h',  value: 21600 },
  { label: '12h', value: 43200 },
  { label: '24h', value: 86400 },
] as const

const DOWNLOAD_OPTIONS = [
  { label: '1回', value: 1 },
  { label: '2回', value: 2 },
  { label: '3回', value: 3 },
  { label: '5回', value: 5 },
] as const

// ─── Toggle コンポーネント ─────────────────────────────────────────────────

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  alwaysOn?: boolean
}

function Toggle({ checked, onChange, disabled = false, alwaysOn = false }: ToggleProps) {
  if (alwaysOn) {
    return (
      <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1 text-[11px] text-emerald-700 font-semibold">
        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
        常時ON
      </div>
    )
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={[
        'relative w-10 h-5 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-1',
        checked ? 'bg-indigo-600' : 'bg-gray-200',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      <span
        className={[
          'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  )
}

// ─── 選択ボタングループ ───────────────────────────────────────────────────────

interface OptionGroupProps<T extends number> {
  options: readonly { label: string; value: T }[]
  value: T
  onChange: (v: T) => void
  disabled?: boolean
}

function OptionGroup<T extends number>({
  options, value, onChange, disabled = false
}: OptionGroupProps<T>) {
  return (
    <div className="grid grid-cols-4 gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => !disabled && onChange(opt.value)}
          disabled={disabled}
          className={[
            'py-1.5 rounded-lg text-[11px] font-mono font-semibold border transition-all duration-150',
            value === opt.value
              ? 'bg-indigo-100 text-indigo-700 border-indigo-300 shadow-sm'
              : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200',
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          ].join(' ')}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface SecurityPanelProps {
  expiresInSeconds: number
  maxDownloads: number
  twofaType: TwoFaType
  splitUpload: boolean
  onExpiresChange: (v: number) => void
  onMaxDownloadsChange: (v: number) => void
  onTwofaTypeChange: (v: TwoFaType) => void
  onSplitUploadChange: (v: boolean) => void
  disabled?: boolean
}

// ─── コンポーネント ───────────────────────────────────────────────────────────

export function SecurityPanel({
  expiresInSeconds,
  maxDownloads,
  twofaType,
  splitUpload,
  onExpiresChange,
  onMaxDownloadsChange,
  onTwofaTypeChange,
  onSplitUploadChange,
  disabled = false,
}: SecurityPanelProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* ヘッダー */}
      <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-violet-50 border-b border-gray-100 flex items-center gap-2">
        <Shield className="w-4 h-4 text-indigo-600" />
        <span className="text-sm font-bold text-gray-800">セキュリティ設定</span>
      </div>

      <div className="p-4 space-y-0 divide-y divide-gray-50">

        {/* AES-256-GCM (常時ON) */}
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2.5">
            <Lock className="w-3.5 h-3.5 text-gray-400" />
            <div>
              <p className="text-xs font-semibold text-gray-700">AES-256-GCM 暗号化</p>
              <p className="text-[10px] text-gray-400 font-mono">ブラウザ内クライアント処理</p>
            </div>
          </div>
          <Toggle checked={true} onChange={() => {}} alwaysOn />
        </div>

        {/* ML-KEM-768 (常時ON) */}
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-3.5 h-3.5 text-gray-400" />
            <div>
              <p className="text-xs font-semibold text-gray-700">ML-KEM-768 鍵交換</p>
              <p className="text-[10px] text-gray-400 font-mono">NIST FIPS 203</p>
            </div>
          </div>
          <Toggle checked={true} onChange={() => {}} alwaysOn />
        </div>

        {/* 有効期限 */}
        <div className="py-3 space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <p className="text-xs font-semibold text-gray-700">URLの有効期限</p>
          </div>
          <OptionGroup
            options={EXPIRE_OPTIONS}
            value={expiresInSeconds as typeof EXPIRE_OPTIONS[number]['value']}
            onChange={onExpiresChange}
            disabled={disabled}
          />
        </div>

        {/* 最大ダウンロード回数 */}
        <div className="py-3 space-y-2">
          <div className="flex items-center gap-2">
            <Download className="w-3.5 h-3.5 text-gray-400" />
            <p className="text-xs font-semibold text-gray-700">最大ダウンロード回数</p>
          </div>
          <OptionGroup
            options={DOWNLOAD_OPTIONS}
            value={maxDownloads as typeof DOWNLOAD_OPTIONS[number]['value']}
            onChange={onMaxDownloadsChange}
            disabled={disabled}
          />
        </div>

        {/* FIDO2 2FA トグル */}
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-xs font-semibold text-gray-700">受信時 FIDO2 認証を要求</p>
            <p className="text-[10px] text-gray-400">指紋・顔認証による二要素認証</p>
          </div>
          <Toggle
            checked={twofaType === 'fido2'}
            onChange={(v) => onTwofaTypeChange(v ? 'fido2' : 'totp')}
            disabled={disabled}
          />
        </div>

        {/* 分割アップロード (F-21) */}
        <div className="flex items-center justify-between py-3">
          <div className="flex items-start gap-2.5">
            <Split className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-gray-700">分割アップロード</p>
              <p className="text-[10px] text-gray-400">大容量ファイルを分割して送信</p>
            </div>
          </div>
          <Toggle
            checked={splitUpload}
            onChange={onSplitUploadChange}
            disabled={disabled}
          />
        </div>

      </div>
    </div>
  )
}