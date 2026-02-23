// =============================================================
// ZeroSend — stores/authStore.ts
//
// パス        : frontend/src/stores/authStore.ts
// 作成日      : 2026-02-23
// 更新日      : 2026-02-23
//
// 概要        : JWT アクセストークン・ユーザー情報管理 Zustand ストア
//
// セキュリティ設計:
//   [XSS対策]   access_token はメモリ保持のみ（localStorage・sessionStorage 不使用）
//   [期限管理]  tokenExpiresAt で有効期限追跡 → 自動ログアウト
//   [警告通知]  有効期限 30分前に isTokenExpiringSoon = true
//
// State:
//   accessToken        string | null    JWT Bearer トークン（メモリのみ）
//   tokenExpiresAt     number | null    有効期限 Unix ミリ秒
//   isTokenExpiringSoon boolean         有効期限まで30分以内
//   user               AuthUser | null  ログイン中ユーザー情報
//   isAuthenticated    boolean          認証状態フラグ
//
// Actions:
//   setAuth(token, user, expiresIn)  ログイン成功時に呼ぶ
//   logout()                         トークン・ユーザー情報をクリア
//   getToken()                       apiClient の beforeRequest から呼ぶ
//   checkTokenExpiry()               定期チェック用（useTokenExpiryWatch で使用）
//
// 依存関係:
//   zustand       ^5
//   @/types/api   UserRole
//   @/lib/securityLogger
// =============================================================

import { create } from 'zustand'
import type { UserRole } from '@/types/api'
import { logForcedLogout, logLogout, logSecurityEvent } from '@/lib/securityLogger'

// ─── ユーザー情報型 ───────────────────────────────────────────

export interface AuthUser {
  id: string
  email: string
  displayName: string
  role: UserRole
  totpEnabled: boolean
}

// ─── 有効期限警告しきい値 ──────────────────────────────────────

/** この時間（ミリ秒）を切ったら isTokenExpiringSoon = true */
const EXPIRY_WARN_THRESHOLD_MS = 30 * 60 * 1000  // 30分

// ─── Store 型定義 ──────────────────────────────────────────────

interface AuthState {
  // ── State ──
  accessToken: string | null
  tokenExpiresAt: number | null        // Unix ミリ秒 (null = 未設定)
  isTokenExpiringSoon: boolean         // 30分以内に期限切れ
  user: AuthUser | null
  isAuthenticated: boolean

  // ── Actions ──

  /**
   * ログイン成功時に呼ぶ
   * @param token     JWT アクセストークン
   * @param user      ユーザー情報
   * @param expiresIn トークン有効期間（秒）
   */
  setAuth: (token: string, user: AuthUser, expiresIn: number) => void

  /**
   * ログアウト処理（通常・強制共用）
   * @param reason  省略時は通常ログアウト
   */
  logout: (reason?: 'token_expired' | 'unauthorized_401') => void

  /**
   * apiClient の beforeRequest フックから呼ぶ
   * トークン期限切れ時は null を返して 401 を誘発させる
   */
  getToken: () => string | null

  /**
   * トークン有効期限チェック
   * useTokenExpiryWatch フックが定期的に呼ぶ
   * 期限切れ検出時は自動ログアウト
   */
  checkTokenExpiry: () => void
}

// ─── Store 実装 ──────────────────────────────────────────────

export const useAuthStore = create<AuthState>()((set, get) => ({
  // ── 初期 State ──
  accessToken:         null,
  tokenExpiresAt:      null,
  isTokenExpiringSoon: false,
  user:                null,
  isAuthenticated:     false,

  // ── setAuth ──
  setAuth: (token, user, expiresIn) => {
    const now = Date.now()
    const tokenExpiresAt = now + expiresIn * 1000
    const isTokenExpiringSoon = tokenExpiresAt - now < EXPIRY_WARN_THRESHOLD_MS

    if (isTokenExpiringSoon) {
      logSecurityEvent(
        'TOKEN_NEAR_EXPIRY',
        'WARN',
        { remainingMs: tokenExpiresAt - now },
        user.id,
      )
    }

    set({
      accessToken: token,
      tokenExpiresAt,
      isTokenExpiringSoon,
      user,
      isAuthenticated: true,
    })
  },

  // ── logout ──
  logout: (reason) => {
    const { user } = get()

    if (reason === 'token_expired' || reason === 'unauthorized_401') {
      logForcedLogout(reason)
    } else if (user) {
      logLogout(user.id)
    }

    set({
      accessToken:         null,
      tokenExpiresAt:      null,
      isTokenExpiringSoon: false,
      user:                null,
      isAuthenticated:     false,
    })
  },

  // ── getToken ──
  getToken: () => {
    const { accessToken, tokenExpiresAt } = get()

    if (!accessToken) return null

    // 期限切れトークンは返さない（apiClient に null を返して 401 を誘発）
    if (tokenExpiresAt !== null && Date.now() >= tokenExpiresAt) {
      logSecurityEvent('TOKEN_EXPIRED', 'WARN')
      // logout は checkTokenExpiry に任せる（ここで呼ぶとループになる可能性）
      return null
    }

    return accessToken
  },

  // ── checkTokenExpiry ──
  checkTokenExpiry: () => {
    const { accessToken, tokenExpiresAt, user, isAuthenticated } = get()

    if (!isAuthenticated || !accessToken || tokenExpiresAt === null) return

    const now = Date.now()
    const remainingMs = tokenExpiresAt - now

    if (remainingMs <= 0) {
      // 期限切れ → 強制ログアウト
      logSecurityEvent('TOKEN_EXPIRED', 'ERROR', undefined, user?.id)
      get().logout('token_expired')
      return
    }

    // 警告しきい値チェック
    const shouldWarn = remainingMs < EXPIRY_WARN_THRESHOLD_MS
    const { isTokenExpiringSoon } = get()

    if (shouldWarn && !isTokenExpiringSoon) {
      logSecurityEvent(
        'TOKEN_NEAR_EXPIRY',
        'WARN',
        { remainingMinutes: Math.floor(remainingMs / 60_000) },
        user?.id,
      )
      set({ isTokenExpiringSoon: true })
    }
  },
}))