// =============================================================
// ZeroSend — components/send/RecipientInput.tsx
//
// パス        : frontend/src/components/send/RecipientInput.tsx
// 作成日      : 2026-02-23
// 更新日      : 2026-02-23
//
// 概要        : F-18 受信者メールアドレス入力 + Kyber鍵バッジ
//               メール入力 → API で受信者公開鍵確認
//               「🔑 Kyber鍵あり」バッジ表示
//               単一受信者の入力 UI（タグ形式）
//
// 依存関係:
//   @/services/transferService   checkRecipientKey
//   lucide-react                  アイコン
// =============================================================

import { useState, useCallback, useRef } from 'react'
import { Key, CheckCircle, AlertCircle, Loader2, X, Mail } from 'lucide-react'
import { checkRecipientKey } from '@/services/transferService'
import type { RecipientKeyResponse } from '@/types/api'

// ─── 型定義 ──────────────────────────────────────────────────────────────────

interface RecipientState {
  email: string
  hasKyberKey: boolean
  publicKeyB64: string | null
  isChecking: boolean
  error: string | null
}

interface RecipientInputProps {
  value: string                    // 確定した受信者メール
  publicKeyB64: string | null      // 確定した公開鍵
  onRecipientChange: (email: string, publicKeyB64: string | null, hasKey: boolean) => void
  disabled?: boolean
}

// ─── メールアドレスバリデーション ────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim())
}

// ─── コンポーネント ───────────────────────────────────────────────────────────

export function RecipientInput({
  value,
  publicKeyB64,
  onRecipientChange,
  disabled = false,
}: RecipientInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [recipient, setRecipient] = useState<RecipientState | null>(
    value ? {
      email: value,
      hasKyberKey: !!publicKeyB64,
      publicKeyB64: publicKeyB64,
      isChecking: false,
      error: null,
    } : null
  )
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // メール入力変更ハンドラ
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInputValue(val)

    // タイムアウトクリア
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current)
    }
  }, [])

  // 受信者確定 (Enter / Tab / blur)
  const handleConfirm = useCallback(async () => {
    const email = inputValue.trim()
    if (!email || !isValidEmail(email)) {
      if (email) {
        setRecipient(prev => prev ? { ...prev, error: '正しいメールアドレスを入力してください' } : null)
      }
      return
    }

    // 鍵確認中
    setRecipient({
      email,
      hasKyberKey: false,
      publicKeyB64: null,
      isChecking: true,
      error: null,
    })

    try {
      const result: RecipientKeyResponse = await checkRecipientKey(email)

      const newRecipient: RecipientState = {
        email,
        hasKyberKey: result.hasKyberKey,
        publicKeyB64: result.publicKeyKyberB64 ?? null,
        isChecking: false,
        error: result.hasKyberKey ? null : 'この受信者はまだ ZeroSend に登録していません',
      }
      setRecipient(newRecipient)

      // 親コンポーネントへ通知
      onRecipientChange(email, result.publicKeyKyberB64 ?? null, result.hasKyberKey)
      setInputValue('')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '受信者の確認に失敗しました'
      setRecipient(prev => prev ? { ...prev, isChecking: false, error: errorMessage } : null)
    }
  }, [inputValue, onRecipientChange])

  // キーボードイベント
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        handleConfirm()
      }
    },
    [handleConfirm]
  )

  // 受信者削除
  const handleRemove = useCallback(() => {
    setRecipient(null)
    setInputValue('')
    onRecipientChange('', null, false)
  }, [onRecipientChange])

  return (
    <div className="space-y-3">
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
        受信者メールアドレス
      </label>

      {/* 確定済み受信者タグ */}
      {recipient && !recipient.isChecking && (
        <div className="flex flex-wrap gap-2">
          <div
            className={[
              'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm border transition-all',
              recipient.hasKyberKey
                ? 'bg-indigo-50 border-indigo-200 text-indigo-800'
                : recipient.error
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-gray-100 border-gray-200 text-gray-700',
            ].join(' ')}
          >
            {/* アバター */}
            <div
              className={[
                'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                recipient.hasKyberKey ? 'bg-indigo-200 text-indigo-700' : 'bg-gray-200 text-gray-600',
              ].join(' ')}
            >
              {recipient.email[0]?.toUpperCase() ?? '?'}
            </div>

            {/* メール */}
            <span className="font-medium">{recipient.email}</span>

            {/* Kyber 鍵バッジ */}
            {recipient.hasKyberKey ? (
              <div className="flex items-center gap-1 bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 text-[10px] font-bold">
                <Key className="w-3 h-3" />
                Kyber鍵あり
              </div>
            ) : recipient.error ? (
              <div className="flex items-center gap-1 bg-red-100 text-red-600 rounded-full px-2 py-0.5 text-[10px] font-semibold">
                <AlertCircle className="w-3 h-3" />
                未登録
              </div>
            ) : null}

            {/* 削除ボタン */}
            {!disabled && (
              <button
                onClick={handleRemove}
                className="text-gray-400 hover:text-gray-700 transition-colors ml-0.5"
                aria-label="受信者を削除"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 確認中インジケーター */}
      {recipient?.isChecking && (
        <div className="flex items-center gap-2 text-sm text-indigo-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Kyber鍵を確認中...</span>
        </div>
      )}

      {/* 入力フィールド（受信者未設定時のみ表示） */}
      {!recipient && (
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Mail className="w-4 h-4 text-gray-400" />
          </div>
          <input
            type="email"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (inputValue.trim()) handleConfirm()
            }}
            placeholder="受信者のメールアドレス"
            disabled={disabled}
            className="w-full pl-10 pr-4 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all placeholder:text-gray-400 disabled:opacity-50 disabled:bg-gray-50"
          />
          {inputValue && (
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
              <span className="text-[10px] text-gray-400 font-mono">Enter で確定</span>
            </div>
          )}
        </div>
      )}

      {/* エラーメッセージ（未登録ユーザー） */}
      {recipient && !recipient.isChecking && !recipient.hasKyberKey && recipient.error && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-800">受信者が未登録です</p>
            <p className="text-[11px] text-amber-600 mt-0.5">
              受信者が ZeroSend に登録してML-KEM-768鍵を作成する必要があります。
            </p>
          </div>
        </div>
      )}

      {/* 成功メッセージ */}
      {recipient?.hasKyberKey && (
        <div className="flex items-center gap-2 text-[11px] text-emerald-600">
          <CheckCircle className="w-3.5 h-3.5" />
          <span>量子耐性暗号で安全に送信できます</span>
        </div>
      )}
    </div>
  )
}