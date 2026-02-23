// =============================================================
// ZeroSend — components/list/SearchInput.tsx
//
// パス        : frontend/src/components/list/SearchInput.tsx
// 作成日      : 2026-02
//
// 概要        : F-29 キーワード検索
//               - 300ms デバウンスで onChange コールバック発火
//               - 受信者メール・ファイル名 検索
//               - ✕ クリアボタン
// =============================================================

import { useEffect, useRef, useState } from 'react'

interface Props {
  value:     string
  onChange:  (value: string) => void
  placeholder?: string
}

export function SearchInput({
  value,
  onChange,
  placeholder = '受信者メール・ファイル名で検索…',
}: Props) {
  const [local, setLocal] = useState(value)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 外部 value が変わったときに内部状態を同期（クリア操作など）
  useEffect(() => { setLocal(value) }, [value])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setLocal(v)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onChange(v), 300)
  }

  function handleClear() {
    setLocal('')
    onChange('')
  }

  return (
    <div className="relative">
      {/* 検索アイコン */}
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
        fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
      </svg>

      <input
        type="text"
        value={local}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full pl-9 pr-9 py-2 text-sm bg-white border border-slate-200 rounded-lg
          focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent
          placeholder:text-slate-400"
      />

      {/* クリアボタン */}
      {local && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          aria-label="クリア"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  )
}