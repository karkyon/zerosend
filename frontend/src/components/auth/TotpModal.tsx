// =============================================================
// ZeroSend — components/auth/TotpModal.tsx
//
// パス        : frontend/src/components/auth/TotpModal.tsx
// 作成日      : 2026-02-23
// 更新日      : 2026-02-23
//
// 概要        : F-14 TOTP 二要素認証モーダル（ダウンロードフロー用）
//               6桁 OTP 入力 UI。失敗時エラー・ロック残回数表示。
//               Phase 4 (DownloadPage) から使用する再利用可能コンポーネント。
//
// セキュリティ設計:
//   - 認証失敗時の remaining_attempts を正確に表示
//   - 423 ロック状態を視覚的に明確に表示（再試行ボタン非表示）
//   - OTP は入力値のみを保持（送信後すぐに参照を破棄）
//   - 6回失敗前に WARN ログ、ロック時に CRITICAL ログ
//   - モーダル外クリックや Esc キーでの閉鎖を防止（認証完了まで）
//
// Props:
//   urlToken         string               ワンタイムURLトークン
//   recipientEmail   string               受信者メールアドレス（本人確認用）
//   onSuccess        (authToken) => void  認証成功時コールバック
//   onClose          () => void           閉鎖コールバック（isLocked 時のみ許可）
//
// 使用箇所:
//   @/pages/DownloadPage  (Phase 4 F-35)
// =============================================================

import {
  useState,
  useRef,
  useCallback,
  useEffect
} from 'react'

import type {
  KeyboardEvent,
  ClipboardEvent
} from 'react'

import { verifyTotp, type TotpError } from '@/services/authService'
import { logSecurityEvent } from '@/lib/securityLogger'

// ─── OTP 入力桁数 ──────────────────────────────────────────────
const OTP_LENGTH = 6

// ─── Props 型定義 ──────────────────────────────────────────────

export interface TotpModalProps {
  /** ワンタイムURLトークン（/download/:token の token 部分） */
  urlToken: string
  /** 受信者メールアドレス（TOTP verify の本人確認用） */
  recipientEmail: string
  /** 認証成功時に auth_token を渡すコールバック */
  onSuccess: (authToken: string, expiresIn: number) => void
  /** 閉鎖コールバック（ロック状態・エラー時のみ有効） */
  onClose: () => void
}

// ─── TotpModal コンポーネント ─────────────────────────────────

export function TotpModal({
  urlToken,
  recipientEmail,
  onSuccess,
  onClose,
}: TotpModalProps) {
  const [digits,           setDigits]           = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [isSubmitting,     setIsSubmitting]      = useState(false)
  const [error,            setError]             = useState<string | null>(null)
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null)
  const [isLocked,         setIsLocked]          = useState(false)

  // 各桁の input ref
  const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(OTP_LENGTH).fill(null))

  // マウント時に最初の入力欄にフォーカス
  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  // ロック状態になったら CRITICAL ログ
  useEffect(() => {
    if (isLocked) {
      logSecurityEvent('TOTP_LOCKED', 'CRITICAL', undefined, undefined, recipientEmail)
    }
  }, [isLocked, recipientEmail])

  // ── OTP 送信 ──
  const submitOtp = useCallback(async (otpDigits: string[]) => {
    const otp = otpDigits.join('')
    if (otp.length !== OTP_LENGTH) return

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await verifyTotp(urlToken, recipientEmail, otp)
      onSuccess(result.authToken, result.expiresIn)
    } catch (err) {
      const totpErr = err as TotpError

      if (totpErr.isLocked) {
        setIsLocked(true)
        setError('認証試行回数の上限に達しました。このURLはロックされています。管理者にお問い合わせください。')
      } else {
        setRemainingAttempts(totpErr.remainingAttempts ?? null)
        setError(totpErr.message ?? '認証コードが正しくありません')
        // エラー時: 全桁クリアして最初の桁に戻す
        setDigits(Array(OTP_LENGTH).fill(''))
        setTimeout(() => inputRefs.current[0]?.focus(), 50)
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [urlToken, recipientEmail, onSuccess])

  // ── 入力変更ハンドラ ──
  const handleChange = useCallback((index: number, value: string) => {
    // 数字のみ許可
    const digit = value.replace(/\D/g, '').slice(-1)

    setDigits(prev => {
      const next = [...prev]
      next[index] = digit
      return next
    })

    setError(null)

    if (digit) {
      // 次の桁へ移動
      if (index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus()
      } else {
        // 最後の桁入力完了 → 自動送信
        const newDigits = [...digits]
        newDigits[index] = digit
        submitOtp(newDigits)
      }
    }
  }, [digits, submitOtp])

  // ── キーボードハンドラ ──
  const handleKeyDown = useCallback((index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        // 現在の桁をクリア
        setDigits(prev => {
          const next = [...prev]
          next[index] = ''
          return next
        })
      } else if (index > 0) {
        // 前の桁に戻る
        inputRefs.current[index - 1]?.focus()
        setDigits(prev => {
          const next = [...prev]
          next[index - 1] = ''
          return next
        })
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    } else if (e.key === 'Enter') {
      submitOtp(digits)
    }
  }, [digits, submitOtp])

  // ── ペースト対応（6桁一括入力） ──
  const handlePaste = useCallback((e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pasted) return

    const newDigits = Array(OTP_LENGTH).fill('')
    pasted.split('').forEach((char, i) => {
      newDigits[i] = char
    })
    setDigits(newDigits)
    setError(null)

    // ペーストで全桁揃った場合は自動送信
    if (pasted.length === OTP_LENGTH) {
      // フォーカスを最後の桁に
      inputRefs.current[OTP_LENGTH - 1]?.focus()
      submitOtp(newDigits)
    } else {
      inputRefs.current[pasted.length]?.focus()
    }
  }, [submitOtp])

  // ── モーダルオーバーレイ ──
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="totp-modal-title"
      // ロック状態のみ外クリックで閉じられる
      onClick={isLocked ? onClose : undefined}
    >
      <div
        className="relative w-full max-w-sm mx-4 bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >

        {/* ロック状態の閉じるボタン */}
        {isLocked && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition-colors"
            aria-label="閉じる"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* ヘッダー */}
        <div className="text-center mb-6">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 ${
            isLocked ? 'bg-red-950 border border-red-800' : 'bg-indigo-950 border border-indigo-800'
          }`}>
            {isLocked ? (
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 8.25h3m-3 3h3m-3 3h3" />
              </svg>
            )}
          </div>

          <h2
            id="totp-modal-title"
            className="text-lg font-semibold text-white"
          >
            {isLocked ? 'アクセスがロックされました' : '2段階認証'}
          </h2>

          {!isLocked && (
            <p className="text-gray-400 text-sm mt-1">
              認証アプリの6桁コードを入力してください
            </p>
          )}

          {/* 受信者メール表示 */}
          {recipientEmail && !isLocked && (
            <p className="text-indigo-400 text-xs font-mono mt-2 truncate">
              {recipientEmail}
            </p>
          )}
        </div>

        {/* OTP 入力エリア */}
        {!isLocked && (
          <div
            className="flex justify-center gap-2.5 mb-5"
            role="group"
            aria-label="6桁認証コード入力"
          >
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={el => { inputRefs.current[index] = el }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(index, e.target.value)}
                onKeyDown={e => handleKeyDown(index, e)}
                onPaste={handlePaste}
                onFocus={e => e.target.select()}
                disabled={isSubmitting || isLocked}
                aria-label={`${index + 1}桁目`}
                className={`
                  w-10 h-12 text-center text-lg font-bold font-mono rounded-xl border
                  text-white bg-gray-800 caret-transparent
                  transition-all duration-150 outline-none
                  disabled:opacity-40 disabled:cursor-not-allowed
                  focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50
                  ${error && !isLocked ? 'border-red-700 bg-red-950/20' : 'border-gray-700'}
                  ${digit ? 'border-indigo-600/70' : ''}
                `}
              />
            ))}
          </div>
        )}

        {/* エラー表示 */}
        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className={`mb-4 px-3.5 py-2.5 rounded-lg text-sm flex items-start gap-2 ${
              isLocked
                ? 'bg-red-950/60 border border-red-800 text-red-300'
                : 'bg-yellow-950/40 border border-yellow-800 text-yellow-300'
            }`}
          >
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* 残り試行回数 */}
        {remainingAttempts !== null && !isLocked && (
          <p className="text-center text-xs text-yellow-500 mb-3">
            残り試行回数: <span className="font-bold">{remainingAttempts}</span>回
          </p>
        )}

        {/* ローディング */}
        {isSubmitting && (
          <div className="flex justify-center items-center gap-2 text-indigo-400 text-sm">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>検証中...</span>
          </div>
        )}

        {/* ヘルプテキスト */}
        {!isLocked && !isSubmitting && (
          <p className="text-center text-xs text-gray-600 mt-4">
            Google Authenticator / Authy などの認証アプリをご利用ください
          </p>
        )}
      </div>
    </div>
  )
}