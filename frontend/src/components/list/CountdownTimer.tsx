// =============================================================
// ZeroSend — components/list/CountdownTimer.tsx
//
// パス        : frontend/src/components/list/CountdownTimer.tsx
// 作成日      : 2026-02
//
// 概要        : F-30 有効期限カウントダウンタイマー
//               - 1秒ごとに残り時間を更新 (setInterval)
//               - 残り < 1h → 橙色、期限切れ → 赤色
//               - アンマウント時は clearInterval でリーク防止
// =============================================================

import { useEffect, useState } from 'react'

interface Props {
  expiresAt: string   // ISO 8601 文字列
}

function calcRemaining(expiresAt: string): number {
  return Math.max(0, new Date(expiresAt).getTime() - Date.now())
}

function formatDuration(ms: number): string {
  if (ms <= 0) return '期限切れ'
  const totalSeconds = Math.floor(ms / 1000)
  const hours        = Math.floor(totalSeconds / 3600)
  const minutes      = Math.floor((totalSeconds % 3600) / 60)
  const seconds      = totalSeconds % 60

  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    return `残 ${days}日`
  }
  if (hours >= 1) return `残 ${hours}h ${minutes}m`
  if (minutes >= 1) return `残 ${minutes}m ${seconds}s`
  return `残 ${seconds}s`
}

export function CountdownTimer({ expiresAt }: Props) {
  const [remaining, setRemaining] = useState(() => calcRemaining(expiresAt))

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(calcRemaining(expiresAt))
    }, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  const isExpired  = remaining <= 0
  const isUrgent   = remaining > 0 && remaining < 3600_000   // 1時間未満

  const colorClass = isExpired ? 'text-red-500 font-semibold'
                   : isUrgent  ? 'text-orange-500 font-semibold'
                   : 'text-slate-500'

  return (
    <span className={`text-xs ${colorClass} flex items-center gap-1`}>
      {isExpired ? (
        <>
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          期限切れ
        </>
      ) : (
        <>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {formatDuration(remaining)}
        </>
      )}
    </span>
  )
}