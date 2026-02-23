// =============================================================
// ZeroSend — pages/LoginPage.tsx
//
// パス        : frontend/src/pages/LoginPage.tsx
// 作成日      : 2026-02-23
// 更新日      : 2026-02-23
//
// 概要        : F-11 ログイン画面 UI / F-12 JWT 取得・ストア管理
//               ワイヤーフレーム準拠デザイン
//               ZeroSend ロゴ + Quantum-Safe バッジ表示
//
// セキュリティ設計:
//   - 既認証済みの場合は / へリダイレクト（ログイン画面へのアクセス防止）
//   - パスワードフィールドは autocomplete="current-password"
//   - エラーメッセージはユーザーフレンドリーな表示のみ（詳細隠蔽）
//   - ログイン成功後 setAuth() にて expiresIn を渡し有効期限管理を開始
//   - トークン有効期限監視は useTokenExpiryWatch カスタムフックで実装 (F-12)
//
// 依存関係:
//   react-router-dom     ^7   useNavigate / Link / Navigate
//   @/services/authService    loginUser
//   @/stores/authStore        useAuthStore (setAuth / isAuthenticated)
// =============================================================

import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link, Navigate } from 'react-router-dom'
import { loginUser } from '@/services/authService'
import { useAuthStore } from '@/stores/authStore'

// ─── トークン有効期限監視フック (F-12) ───────────────────────

/**
 * JWT有効期限の定期チェックフック
 * ログイン状態の全画面で使用（App.tsx に配置を推奨）
 * 期限切れ検出時 → authStore.checkTokenExpiry() → 自動ログアウト
 *
 * @example
 * // App.tsx 内で呼ぶ
 * useTokenExpiryWatch()
 */
export function useTokenExpiryWatch(intervalMs: number = 60_000): void {
  const checkTokenExpiry = useAuthStore(s => s.checkTokenExpiry)
  const isAuthenticated  = useAuthStore(s => s.isAuthenticated)

  useEffect(() => {
    if (!isAuthenticated) return

    // 即時1回チェック
    checkTokenExpiry()

    const timer = setInterval(checkTokenExpiry, intervalMs)
    return () => clearInterval(timer)
  }, [isAuthenticated, checkTokenExpiry, intervalMs])
}

// ─── LoginPage コンポーネント ────────────────────────────────

export function LoginPage() {
  const navigate        = useNavigate()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const setAuth         = useAuthStore(s => s.setAuth)

  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [error,       setError]       = useState<string | null>(null)
  const [isLoading,   setIsLoading]   = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const emailRef = useRef<HTMLInputElement>(null)

  // マウント時にメールフィールドへフォーカス
  useEffect(() => {
    emailRef.current?.focus()
  }, [])

  // 既にログイン済みならトップへ
  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  // ── フォーム送信 ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // クライアントサイドバリデーション
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail || !password) {
      setError('メールアドレスとパスワードを入力してください')
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      setError('有効なメールアドレスを入力してください')
      return
    }
    if (password.length < 8) {
      setError('パスワードは8文字以上です')
      return
    }

    setIsLoading(true)

    try {
      const result = await loginUser(trimmedEmail, password)

      // F-12: setAuth に expiresIn を渡してトークン有効期限管理を開始
      setAuth(result.accessToken, result.user, result.expiresIn)

      navigate('/', { replace: true })

    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました')
      // セキュリティ: エラー時はパスワードフィールドをクリア
      setPassword('')
    } finally {
      setIsLoading(false)
    }
  }

  // ── レンダリング ──
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">

      {/* 背景グリッドパターン */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(99,102,241,0.5) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(99,102,241,0.5) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-md">

        {/* ─── ロゴ + バッジ ─── */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/50">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">ZeroSend</span>
          </div>

          <p className="text-gray-400 text-sm mb-3">量子耐性ファイル転送システム</p>

          {/* Quantum-Safe バッジ */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-950 border border-emerald-800 rounded-full">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-emerald-400 text-xs font-mono font-semibold tracking-wide">
              ML-KEM-768 / Quantum-Safe
            </span>
          </div>
        </div>

        {/* ─── ログインカード ─── */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <h1 className="text-lg font-semibold text-white mb-6">ログイン</h1>

          <form onSubmit={handleSubmit} noValidate>

            {/* メールアドレス */}
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
                メールアドレス
              </label>
              <input
                id="email"
                ref={emailRef}
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                value={email}
                onChange={e => { setEmail(e.target.value); setError(null) }}
                disabled={isLoading}
                placeholder="you@example.com"
                className={`
                  w-full px-3.5 py-2.5 bg-gray-800 border rounded-lg text-white text-sm
                  placeholder-gray-500 transition-colors duration-150 outline-none
                  focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${error ? 'border-red-700' : 'border-gray-700'}
                `}
              />
            </div>

            {/* パスワード */}
            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
                パスワード
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(null) }}
                  disabled={isLoading}
                  placeholder="••••••••"
                  className={`
                    w-full px-3.5 py-2.5 pr-10 bg-gray-800 border rounded-lg text-white text-sm
                    placeholder-gray-500 transition-colors duration-150 outline-none
                    focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${error ? 'border-red-700' : 'border-gray-700'}
                  `}
                />
                {/* パスワード表示切り替え */}
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                  aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* エラーメッセージ */}
            {error && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2.5 px-3.5 py-2.5 bg-red-950/60 border border-red-800 rounded-lg"
              >
                <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <span className="text-red-300 text-sm">{error}</span>
              </div>
            )}

            {/* ログインボタン */}
            <button
              type="submit"
              disabled={isLoading}
              className="
                w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800
                text-white font-semibold text-sm rounded-lg transition-colors duration-150
                disabled:cursor-not-allowed flex items-center justify-center gap-2
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900
              "
            >
              {isLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>認証中...</span>
                </>
              ) : 'ログイン'}
            </button>
          </form>

          {/* 登録リンク */}
          <p className="mt-6 text-center text-sm text-gray-500">
            アカウントをお持ちでない方は{' '}
            <Link
              to="/register"
              className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
            >
              新規登録
            </Link>
          </p>
        </div>

        {/* フッター注記 */}
        <p className="mt-4 text-center text-xs text-gray-600">
          ZeroSend — NIST FIPS 203 ML-KEM-768 · AES-256-GCM
        </p>
      </div>
    </div>
  )
}