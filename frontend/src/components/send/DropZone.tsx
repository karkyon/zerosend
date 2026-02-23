// =============================================================
// ZeroSend — components/send/DropZone.tsx
//
// パス        : frontend/src/components/send/DropZone.tsx
// 作成日      : 2026-02-23
// 更新日      : 2026-02-23
//
// 概要        : F-17 ドラッグ&ドロップ ゾーン
//               react-dropzone 使用。最大 1GB バリデーション。
//               ファイル選択後: サムネイル(アイコン)・ファイル名・サイズ・種別表示。
//               暗号化プレビューバッジ表示。
//
// 依存関係:
//   react-dropzone   ドラッグ&ドロップ対応
//   lucide-react     アイコン
//   @/lib/cryptoService  formatFileSize
// =============================================================

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import type { FileRejection } from 'react-dropzone'
import { Upload, File, FileText, Image, Music, Video, Archive, Code, X, Shield } from 'lucide-react'
import { formatFileSize } from '@/lib/cryptoService'

// ─── 定数 ────────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 1 * 1024 * 1024 * 1024  // 1GB

// ─── ファイルタイプアイコン ───────────────────────────────────────────────────

function getFileIcon(type: string): React.ReactNode {
  if (type.startsWith('image/'))       return <Image className="w-8 h-8"  />
  if (type.startsWith('audio/'))       return <Music className="w-8 h-8"  />
  if (type.startsWith('video/'))       return <Video className="w-8 h-8"  />
  if (type.startsWith('text/'))        return <FileText className="w-8 h-8" />
  if (type.includes('zip') || type.includes('tar') || type.includes('gz'))
                                       return <Archive className="w-8 h-8" />
  if (type.includes('javascript') || type.includes('json') || type.includes('xml'))
                                       return <Code className="w-8 h-8"   />
  return <File className="w-8 h-8" />
}

function getFileTypeLabel(type: string): string {
  if (!type) return 'ファイル'
  const parts = type.split('/')
  return parts[parts.length - 1]?.toUpperCase() ?? type.toUpperCase()
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface DropZoneProps {
  file: File | null
  onFileSelect: (file: File) => void
  onFileClear: () => void
  disabled?: boolean
}

// ─── コンポーネント ───────────────────────────────────────────────────────────

export function DropZone({ file, onFileSelect, onFileClear, disabled = false }: DropZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      if (rejectedFiles.length > 0) {
        const first = rejectedFiles[0]
        const errorCode = first?.errors?.[0]?.code
        if (errorCode === 'file-too-large') {
          alert('ファイルサイズが上限（1GB）を超えています。')
        } else {
          alert('ファイルを選択できませんでした。')
        }
        return
      }
      if (acceptedFiles[0]) {
        onFileSelect(acceptedFiles[0])
      }
    },
    [onFileSelect]
  )

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
    disabled,
    multiple: false,
  })

  // ファイル選択済み状態
  if (file) {
    return (
      <div className="relative group">
        {/* 選択済みファイル表示 */}
        <div className="border-2 border-indigo-200 bg-indigo-50/50 rounded-2xl p-6">
          {/* 暗号化バッジ */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 text-[11px] font-semibold text-emerald-700">
              <Shield className="w-3 h-3" />
              AES-256-GCM 暗号化予定
            </div>
            <div className="flex items-center gap-1.5 bg-violet-50 border border-violet-200 rounded-full px-3 py-1 text-[11px] font-semibold text-violet-700">
              <span className="w-1.5 h-1.5 bg-violet-500 rounded-full" />
              ML-KEM-768 鍵交換
            </div>
          </div>

          {/* ファイル情報 */}
          <div className="flex items-center gap-4">
            {/* アイコン */}
            <div className="w-16 h-16 bg-white rounded-xl shadow-sm border border-indigo-100 flex items-center justify-center text-indigo-400 flex-shrink-0">
              {getFileIcon(file.type)}
            </div>

            {/* 詳細 */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate" title={file.name}>
                {file.name}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                {file.type && (
                  <>
                    <span className="text-gray-300">·</span>
                    <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {getFileTypeLabel(file.type)}
                    </span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-indigo-500 mt-1.5 font-mono">
                ブラウザ内で暗号化されます（サーバには届きません）
              </p>
            </div>
          </div>

          {/* 変更ボタン */}
          <button
            onClick={onFileClear}
            disabled={disabled}
            className="mt-4 w-full py-2 text-xs font-semibold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 transition-colors disabled:opacity-50"
          >
            別のファイルを選択
          </button>
        </div>

        {/* 削除ボタン */}
        <button
          onClick={onFileClear}
          disabled={disabled}
          className="absolute -top-2 -right-2 w-6 h-6 bg-gray-500 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-colors shadow-md opacity-0 group-hover:opacity-100"
          aria-label="ファイルを削除"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  // ファイル未選択状態（ドロップゾーン）
  return (
    <div
      {...getRootProps()}
      className={[
        'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 select-none',
        isDragReject
          ? 'border-red-300 bg-red-50/50'
          : isDragActive
          ? 'border-indigo-400 bg-indigo-50/80 scale-[1.01]'
          : 'border-gray-200 bg-gray-50/50 hover:border-indigo-300 hover:bg-indigo-50/30',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
      ].join(' ')}
    >
      <input {...getInputProps()} />

      {/* アイコン */}
      <div
        className={[
          'w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors duration-200',
          isDragActive
            ? 'bg-indigo-100 text-indigo-500'
            : isDragReject
            ? 'bg-red-100 text-red-400'
            : 'bg-gray-100 text-gray-400',
        ].join(' ')}
      >
        <Upload className="w-6 h-6" />
      </div>

      {/* メッセージ */}
      {isDragReject ? (
        <p className="text-sm font-semibold text-red-500">
          このファイルは選択できません
        </p>
      ) : isDragActive ? (
        <p className="text-sm font-semibold text-indigo-600">
          ドロップしてファイルを選択
        </p>
      ) : (
        <>
          <p className="text-sm font-semibold text-gray-700 mb-1">
            ここにファイルをドロップ
          </p>
          <p className="text-xs text-gray-400">
            または <span className="text-indigo-500 font-semibold underline underline-offset-2">クリックしてファイルを選択</span>
          </p>
        </>
      )}

      <p className="text-[11px] text-gray-400 mt-3">最大 1GB · 全形式対応</p>
    </div>
  )
}