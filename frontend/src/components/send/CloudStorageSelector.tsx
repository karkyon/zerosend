// =============================================================
// ZeroSend — components/send/CloudStorageSelector.tsx
//
// パス        : frontend/src/components/send/CloudStorageSelector.tsx
// 作成日      : 2026-02-23
// 更新日      : 2026-02-23
//
// 概要        : F-19 クラウドストレージ選択 UI
//               Box / Google Drive / OneDrive / Dropbox グリッド選択
//               選択状態: indigo border + shadow ハイライト
//
// 依存関係:
//   @/types/api  CloudProvider
// =============================================================

import type { CloudProvider } from '@/types/api'

// ─── クラウドストレージ定義 ───────────────────────────────────────────────────

interface CloudOption {
  id: CloudProvider
  name: string
  color: string
  bg: string
  description: string
  icon: React.ReactNode
}

// SVG アイコン（ロゴ相当の色付き記号）
const BoxIcon = () => (
  <svg viewBox="0 0 40 40" className="w-8 h-8">
    <rect width="40" height="40" rx="8" fill="#0061D5" />
    <text x="20" y="27" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold" fontFamily="Arial">B</text>
  </svg>
)

const GoogleDriveIcon = () => (
  <svg viewBox="0 0 40 40" className="w-8 h-8">
    <rect width="40" height="40" rx="8" fill="white" />
    <polygon points="20,8 32,28 8,28" fill="#FBBC04" />
    <polygon points="8,28 20,8 14,28" fill="#EA4335" />
    <polygon points="20,28 32,28 26,8" fill="#4285F4" />
    <polygon points="14,28 26,28 20,28" fill="#34A853" />
  </svg>
)

const OneDriveIcon = () => (
  <svg viewBox="0 0 40 40" className="w-8 h-8">
    <rect width="40" height="40" rx="8" fill="#0078D4" />
    <ellipse cx="14" cy="24" rx="10" ry="7" fill="white" opacity="0.9" />
    <ellipse cx="26" cy="22" rx="12" ry="8" fill="white" />
  </svg>
)

const DropboxIcon = () => (
  <svg viewBox="0 0 40 40" className="w-8 h-8">
    <rect width="40" height="40" rx="8" fill="#0061FF" />
    <polygon points="20,10 12,16 20,22 12,28 20,34 28,28 20,22 28,16" fill="white" />
    <polygon points="12,16 4,22 12,28" fill="white" opacity="0.7" />
    <polygon points="28,16 36,22 28,28" fill="white" opacity="0.7" />
  </svg>
)

const CLOUD_OPTIONS: CloudOption[] = [
  {
    id: 'box',
    name: 'Box',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    description: '企業向け',
    icon: <BoxIcon />,
  },
  {
    id: 'gdrive',
    name: 'Google Drive',
    color: 'text-gray-700',
    bg: 'bg-gray-50',
    description: '個人・法人',
    icon: <GoogleDriveIcon />,
  },
  {
    id: 'onedrive',
    name: 'OneDrive',
    color: 'text-blue-800',
    bg: 'bg-sky-50',
    description: 'Microsoft 365',
    icon: <OneDriveIcon />,
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    description: '個人向け',
    icon: <DropboxIcon />,
  },
]

// ─── Props ───────────────────────────────────────────────────────────────────

interface CloudStorageSelectorProps {
  value: CloudProvider
  onChange: (provider: CloudProvider) => void
  disabled?: boolean
}

// ─── コンポーネント ───────────────────────────────────────────────────────────

export function CloudStorageSelector({
  value,
  onChange,
  disabled = false,
}: CloudStorageSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
        受信者のクラウドストレージ
      </label>

      <div className="grid grid-cols-2 gap-2.5">
        {CLOUD_OPTIONS.map((opt) => {
          const isSelected = value === opt.id

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => !disabled && onChange(opt.id)}
              disabled={disabled}
              className={[
                'relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 text-center transition-all duration-200',
                isSelected
                  ? 'border-indigo-400 bg-indigo-50 shadow-sm shadow-indigo-100'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
              ].join(' ')}
            >
              {/* チェックマーク */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}

              {/* アイコン */}
              <div className="flex items-center justify-center">
                {opt.icon}
              </div>

              {/* 名前 */}
              <div>
                <p className={['text-xs font-bold', isSelected ? 'text-indigo-700' : 'text-gray-700'].join(' ')}>
                  {opt.name}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">{opt.description}</p>
              </div>
            </button>
          )
        })}
      </div>

      <p className="text-[11px] text-gray-400">
        暗号化ファイルは受信者のクラウドストレージに直接保存されます
      </p>
    </div>
  )
}