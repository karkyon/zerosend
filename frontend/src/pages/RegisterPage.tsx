// =============================================================
// ZeroSend — pages/RegisterPage.tsx
//
// パス        : frontend/src/pages/RegisterPage.tsx
// 作成日      : 2026-02-23
// 更新日      : 2026-02-23
//
// 概要        : F-13 ユーザー登録画面 + ML-KEM-768 鍵ペア生成
//               @noble/post-quantum の ml_kem768.keygen() を使用
//               秘密鍵は IndexedDB にのみ保存（サーバーには絶対に送らない）
//               公開鍵のみ POST /auth/register で送信
//
// セキュリティ設計（最重要）:
//   [鍵生成]   ml_kem768.keygen() は内部で crypto.getRandomValues() を使用（CSPRNG）
//   [秘密鍵]   Uint8Array のまま IndexedDB に保存。React state では一時保持のみ
//   [クリーンアップ] 登録完了後に React state から秘密鍵参照を削除
//   [公開鍵のみ送信] registerUser() は publicKeyB64 のみ受け取る（秘密鍵引数なし）
//   [フィンガープリント] Web Crypto API SHA-256 で公開鍵を表示（内容確認用）
//
// 依存関係:
//   @noble/post-quantum/ml-kem   ml_kem768.keygen()
//   react-router-dom              Navigate / useNavigate / Link
//   @/services/authService        registerUser()
//   @/lib/keyStorage              storePrivateKey()
//   @/lib/securityLogger          logKeyPairGenerated()
//   @/stores/authStore            isAuthenticated
// =============================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, Link, Navigate } from 'react-router-dom'
import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';
import { registerUser } from '@/services/authService'
import { storeKyberSecretKey } from '@/lib/keyStorage'
import { logSecurityEvent, logKeyPairGenerated } from '@/lib/securityLogger'
import { useAuthStore } from '@/stores/authStore'

// ─── ユーティリティ: Uint8Array → Base64 ──────────────────────

/**
 * Uint8Array を Base64 文字列に変換
 * btoa + String.fromCharCode を使用（ブラウザ標準 API）
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = ''
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// ─── ユーティリティ: 公開鍵フィンガープリント生成 ──────────────

/**
 * 公開鍵の SHA-256 フィンガープリントを生成
 * Web Crypto API 使用（ブラウザ標準）
 * 表示形式: "ab:cd:ef:12:34:56" (先頭6バイト)
 *
 * NOTE: SHA3-256 を使用したい場合は @noble/hashes/sha3 を追加すること
 *       現時点は Web Crypto の SHA-256 で代替（表示目的のため十分）
 */
async function computePublicKeyFingerprint(publicKey: Uint8Array): Promise<string> {
  // ArrayBuffer にコピー
  const buffer = new Uint8Array(publicKey).buffer

  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)

  const hashArray = Array.from(new Uint8Array(hashBuffer))

  return hashArray
    .slice(0, 8)
    .map(b => b.toString(16).padStart(2, '0'))
    .join(':')
}

// ─── 鍵ペア生成状態 ───────────────────────────────────────────

type KeyGenStatus = 'idle' | 'generating' | 'ready' | 'error'

interface GeneratedKeypair {
  publicKeyB64: string      // サーバー送信用（安全）
  secretKey: Uint8Array     // IndexedDB 保存用（絶対にサーバーに送らない）
  fingerprint: string       // UI 表示用フィンガープリント
}

// ─── RegisterPage コンポーネント ──────────────────────────────

export function RegisterPage() {
  const navigate        = useNavigate()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)

  // フォーム状態
  const [email,          setEmail]          = useState('')
  const [displayName,    setDisplayName]    = useState('')
  const [password,       setPassword]       = useState('')
  const [confirmPw,      setConfirmPw]      = useState('')
  const [showPassword,   setShowPassword]   = useState(false)

  // 鍵ペア状態
  const [keyGenStatus,   setKeyGenStatus]   = useState<KeyGenStatus>('idle')
  const [keypair,        setKeypair]        = useState<GeneratedKeypair | null>(null)

  // 送信状態
  const [isSubmitting,   setIsSubmitting]   = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [success,        setSuccess]        = useState(false)

  // 登録完了後に一時保持した秘密鍵をクリアするための ref
  const secretKeyRef = useRef<Uint8Array | null>(null)

  // 既認証済みならトップへ
  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  // ── 鍵ペア生成 ──
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const generateKeypair = useCallback(async () => {
    setKeyGenStatus('generating')
    setKeypair(null)

    try {
      logSecurityEvent('KEY_PAIR_GENERATE_START', 'INFO')

      // ML-KEM-768 鍵ペア生成
      // @noble/post-quantum は内部で crypto.getRandomValues() を使用（CSPRNG準拠）
      const { publicKey, secretKey } = ml_kem768.keygen()

      const publicKeyB64  = uint8ArrayToBase64(publicKey)
      const fingerprint   = await computePublicKeyFingerprint(publicKey)

      // 秘密鍵は ref にも保持（submit 時の IndexedDB 保存用）
      secretKeyRef.current = secretKey

      setKeypair({ publicKeyB64, secretKey, fingerprint })
      setKeyGenStatus('ready')

      logSecurityEvent('KEY_PAIR_GENERATE_SUCCESS', 'INFO', {
        fingerprintPrefix: fingerprint.split(':').slice(0, 3).join(':'),
        publicKeyLengthBytes: publicKey.byteLength,
      })

    } catch (err) {
      setKeyGenStatus('error')
      logSecurityEvent('KEY_PAIR_GENERATE_START', 'ERROR', {
        error: err instanceof Error ? err.message : 'unknown',
      })
    }
  }, [])

  // マウント時に鍵ペア生成開始
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    generateKeypair()

    // クリーンアップ: アンマウント時に秘密鍵参照をクリア
    return () => {
      secretKeyRef.current = null
    }
  }, [generateKeypair])

  // ── パスワード強度チェック ──
  const passwordStrength = getPasswordStrength(password)

  // ── フォーム送信 ──
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // バリデーション
    const trimmedEmail = email.trim().toLowerCase()
    const trimmedName  = displayName.trim()

    if (!trimmedEmail || !trimmedName || !password || !confirmPw) {
      setError('すべての項目を入力してください')
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      setError('有効なメールアドレスを入力してください')
      return
    }
    if (password !== confirmPw) {
      setError('パスワードが一致しません')
      return
    }
    if (passwordStrength.score < 2) {
      setError('パスワードをより強固にしてください（8文字以上、数字・記号を含む）')
      return
    }
    if (!keypair || keyGenStatus !== 'ready') {
      setError('鍵ペアの生成が完了していません。しばらく待つか再生成してください')
      return
    }

    setIsSubmitting(true)

    try {
      // 1. ユーザー登録 API 呼び出し（公開鍵のみ送信）
      const result = await registerUser(
        trimmedEmail,
        trimmedName,
        password,
        keypair.publicKeyB64,  // 公開鍵のみ！秘密鍵は送らない
      )

      // 2. 秘密鍵を IndexedDB に保存（userId をキーとして使用）
      //    NOTE: result.userId 取得後に即座に保存する
      try {
        logSecurityEvent('KEY_PAIR_STORE_SUCCESS', 'INFO', undefined, result.userId)
        await storeKyberSecretKey(result.userId, keypair.secretKey)
        logKeyPairGenerated(result.userId, keypair.fingerprint.split(':').slice(0, 3).join(':'))
      } catch (storeErr) {
        // IndexedDB 保存失敗は致命的エラー（復号不能になる）
        logSecurityEvent('KEY_PAIR_STORE_FAILURE', 'CRITICAL', {
          userId: result.userId,
          error: storeErr instanceof Error ? storeErr.message : 'unknown',
        })
        throw new Error(
          '暗号鍵の保存に失敗しました。このデバイスでファイルを受信できなくなります。' +
          '再登録するか、ブラウザの IndexedDB 設定を確認してください。'
        )
      }

      // 3. React state から秘密鍵参照をクリア（GC に任せる）
      secretKeyRef.current = null
      setKeypair(prev => prev ? { ...prev, secretKey: new Uint8Array(0) } : null)

      setSuccess(true)

      // 3秒後にログイン画面へ
      setTimeout(() => navigate('/login', { replace: true }), 3000)

    } catch (err) {
      setError(err instanceof Error ? err.message : '登録中にエラーが発生しました')
    } finally {
      setIsSubmitting(false)
    }
  }, [email, displayName, password, confirmPw, keypair, keyGenStatus,
      passwordStrength.score, navigate])

  // ── 登録成功画面 ──
  if (success) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-emerald-900 border border-emerald-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">登録完了</h2>
          <p className="text-gray-400 text-sm mb-2">量子耐性鍵ペアがこのデバイスに保存されました</p>
          <p className="text-gray-500 text-xs">ログイン画面へ移動します...</p>
        </div>
      </div>
    )
  }

  // ── メイン登録フォーム ──
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-10">

      {/* 背景グリッド */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(99,102,241,0.5) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(99,102,241,0.5) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-md">

        {/* ヘッダー */}
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

          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-950 border border-emerald-800 rounded-full">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-emerald-400 text-xs font-mono font-semibold tracking-wide">
              ML-KEM-768 / Quantum-Safe
            </span>
          </div>
        </div>

        {/* 登録カード */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <h1 className="text-lg font-semibold text-white mb-1">新規アカウント登録</h1>
          <p className="text-gray-500 text-xs mb-6">量子耐性暗号鍵ペアを自動生成してこのデバイスに保存します</p>

          {/* 鍵生成ステータスバナー */}
          <KeyGenStatusBanner
            status={keyGenStatus}
            fingerprint={keypair?.fingerprint ?? null}
            onRetry={generateKeypair}
          />

          <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">

            {/* メールアドレス */}
            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium text-gray-300 mb-1.5">
                メールアドレス
              </label>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => { setEmail(e.target.value); setError(null) }}
                disabled={isSubmitting}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm
                  placeholder-gray-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50
                  disabled:opacity-50 transition-colors"
              />
            </div>

            {/* 表示名 */}
            <div>
              <label htmlFor="reg-name" className="block text-sm font-medium text-gray-300 mb-1.5">
                表示名
              </label>
              <input
                id="reg-name"
                type="text"
                autoComplete="name"
                required
                value={displayName}
                onChange={e => { setDisplayName(e.target.value); setError(null) }}
                disabled={isSubmitting}
                placeholder="田中 太郎"
                className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm
                  placeholder-gray-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50
                  disabled:opacity-50 transition-colors"
              />
            </div>

            {/* パスワード */}
            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium text-gray-300 mb-1.5">
                パスワード
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(null) }}
                  disabled={isSubmitting}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-10 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm
                    placeholder-gray-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50
                    disabled:opacity-50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                  aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d={showPassword
                        ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        : "M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      }
                    />
                  </svg>
                </button>
              </div>

              {/* パスワード強度バー */}
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[0, 1, 2, 3].map(i => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          i < passwordStrength.score
                            ? passwordStrength.score <= 1 ? 'bg-red-500'
                              : passwordStrength.score <= 2 ? 'bg-yellow-500'
                              : passwordStrength.score <= 3 ? 'bg-blue-500'
                              : 'bg-emerald-500'
                            : 'bg-gray-700'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs ${
                    passwordStrength.score <= 1 ? 'text-red-400'
                      : passwordStrength.score <= 2 ? 'text-yellow-400'
                      : passwordStrength.score <= 3 ? 'text-blue-400'
                      : 'text-emerald-400'
                  }`}>
                    {passwordStrength.label}
                  </p>
                </div>
              )}
            </div>

            {/* パスワード確認 */}
            <div>
              <label htmlFor="reg-confirm" className="block text-sm font-medium text-gray-300 mb-1.5">
                パスワード確認
              </label>
              <input
                id="reg-confirm"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={confirmPw}
                onChange={e => { setConfirmPw(e.target.value); setError(null) }}
                disabled={isSubmitting}
                placeholder="••••••••"
                className={`w-full px-3.5 py-2.5 bg-gray-800 border rounded-lg text-white text-sm
                  placeholder-gray-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50
                  disabled:opacity-50 transition-colors ${
                    confirmPw && confirmPw !== password ? 'border-red-700' : 'border-gray-700'
                  }`}
              />
              {confirmPw && confirmPw !== password && (
                <p className="mt-1 text-xs text-red-400">パスワードが一致しません</p>
              )}
            </div>

            {/* エラーメッセージ */}
            {error && (
              <div role="alert" className="flex items-start gap-2.5 px-3.5 py-2.5 bg-red-950/60 border border-red-800 rounded-lg">
                <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <span className="text-red-300 text-sm">{error}</span>
              </div>
            )}

            {/* 登録ボタン */}
            <button
              type="submit"
              disabled={isSubmitting || keyGenStatus !== 'ready'}
              className="
                w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900
                text-white font-semibold text-sm rounded-lg transition-colors duration-150
                disabled:cursor-not-allowed flex items-center justify-center gap-2
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900
              "
            >
              {isSubmitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>登録中...</span>
                </>
              ) : 'アカウントを作成'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500">
            既にアカウントをお持ちの方は{' '}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
              ログイン
            </Link>
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-gray-600">
          秘密鍵はこのデバイスにのみ保存されます。サーバーには送信されません。
        </p>
      </div>
    </div>
  )
}

// ─── サブコンポーネント: 鍵生成ステータスバナー ────────────────

interface KeyGenStatusBannerProps {
  status: KeyGenStatus
  fingerprint: string | null
  onRetry: () => void
}

function KeyGenStatusBanner({ status, fingerprint, onRetry }: KeyGenStatusBannerProps) {
  if (status === 'generating') {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-indigo-950/50 border border-indigo-800 rounded-xl">
        <svg className="w-4 h-4 text-indigo-400 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <div>
          <p className="text-indigo-300 text-xs font-semibold">ML-KEM-768 鍵ペア生成中...</p>
          <p className="text-indigo-500 text-xs mt-0.5">暗号学的乱数 (CSPRNG) を使用しています</p>
        </div>
      </div>
    )
  }

  if (status === 'ready' && fingerprint) {
    return (
      <div className="px-4 py-3 bg-emerald-950/40 border border-emerald-800 rounded-xl">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-emerald-400 text-xs font-semibold">量子耐性鍵ペア生成完了</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-xs">公開鍵フィンガープリント:</span>
          <code className="text-emerald-300 text-xs font-mono tracking-wider">{fingerprint}</code>
        </div>
        <p className="text-gray-600 text-xs mt-1.5">
          秘密鍵はこのデバイスの IndexedDB にのみ保存されます
        </p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-red-950/40 border border-red-800 rounded-xl">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <span className="text-red-300 text-xs">鍵生成に失敗しました</span>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors underline"
        >
          再生成
        </button>
      </div>
    )
  }

  return null
}

// ─── パスワード強度計算 ───────────────────────────────────────

interface PasswordStrength {
  score: number   // 0〜4
  label: string
}

function getPasswordStrength(password: string): PasswordStrength {
  if (password.length === 0) return { score: 0, label: '' }

  let score = 0
  if (password.length >= 8)  score++
  if (password.length >= 12) score++
  if (/[0-9]/.test(password))            score++
  if (/[!@#$%^&*()_+\-=\[\]{}|;':",.<>?\/\\`~]/.test(password)) score++

  const labels = ['非常に弱い', '弱い', '普通', '強い', '非常に強い']
  return { score, label: labels[score] ?? '非常に強い' }
}