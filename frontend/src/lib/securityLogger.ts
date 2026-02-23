// =============================================================
// ZeroSend — lib/securityLogger.ts
//
// パス        : frontend/src/lib/securityLogger.ts
// 作成日      : 2026-02-23
// 更新日      : 2026-02-23
//
// 概要        : 認証・暗号鍵操作に関するセキュリティイベントの一元ロガー
//               開発環境: カラーコード付きコンソール出力 (色分け・groupCollapsed)
//               本番環境: バックエンド監査ログ送信へ拡張可能 (コメントアウト済)
//
// セキュリティ設計原則:
//   - 全認証イベントに ISO 8601 タイムスタンプを付与
//   - 機密情報（パスワード・秘密鍵）は絶対にログ出力しない
//   - CRITICAL/ERROR レベルのイベントは console.error に昇格
//   - ユーザーエージェント情報を記録（不正アクセス追跡用）
//
// 依存関係    :
//   (外部依存なし — ブラウザ標準 API のみ使用)
//
// イベント種別:
//   認証フロー  : LOGIN_ATTEMPT / LOGIN_SUCCESS / LOGIN_FAILURE / LOGOUT / LOGOUT_FORCED
//   ユーザー登録: REGISTER_ATTEMPT / REGISTER_SUCCESS / REGISTER_FAILURE
//   TOTP 2FA   : TOTP_ATTEMPT / TOTP_SUCCESS / TOTP_FAILURE / TOTP_LOCKED
//   暗号鍵操作  : KEY_PAIR_GENERATE_START / KEY_PAIR_GENERATE_SUCCESS
//                KEY_PAIR_STORE_SUCCESS / KEY_PAIR_STORE_FAILURE / KEY_PAIR_RETRIEVE
//   トークン    : TOKEN_NEAR_EXPIRY / TOKEN_EXPIRED
//   アクセス制御: UNAUTHORIZED_ACCESS / FORBIDDEN_ACCESS
//
// 重大度レベル:
//   INFO     : 正常なイベント（ログイン成功・鍵生成完了 等）
//   WARN     : 注意が必要なイベント（ログイン失敗・TOTP失敗・期限切れ警告 等）
//   ERROR    : エラーイベント（不正アクセス試行 等）
//   CRITICAL : 即時対応が必要なイベント（TOTP URLロック・鍵保存失敗 等）
//
// 使用箇所    :
//   @/services/authService              ログイン/登録/TOTP 各処理
//   @/stores/authStore                  トークン有効期限・ログアウト
//   @/components/layout/ProtectedRoute  不正アクセス試行
// =============================================================

// ─── イベント種別定義 ─────────────────────────────────────────

export type SecurityEventType =
  // 認証フロー
  | 'LOGIN_ATTEMPT'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'LOGOUT'
  | 'LOGOUT_FORCED'           // 401 / トークン期限切れによる強制ログアウト
  // ユーザー登録
  | 'REGISTER_ATTEMPT'
  | 'REGISTER_SUCCESS'
  | 'REGISTER_FAILURE'
  // TOTP 2FA
  | 'TOTP_ATTEMPT'
  | 'TOTP_SUCCESS'
  | 'TOTP_FAILURE'
  | 'TOTP_LOCKED'             // 5回失敗によるURLロック (423)
  // 暗号鍵操作（プライバシー重要）
  | 'KEY_PAIR_GENERATE_START'
  | 'KEY_PAIR_GENERATE_SUCCESS'
  | 'KEY_PAIR_STORE_SUCCESS'  // IndexedDB 保存成功
  | 'KEY_PAIR_STORE_FAILURE'
  | 'KEY_PAIR_RETRIEVE'       // 復号時に秘密鍵取得
  // トークン管理
  | 'TOKEN_NEAR_EXPIRY'       // 有効期限まで閾値以内
  | 'TOKEN_EXPIRED'           // 期限切れ検出
  // アクセス制御
  | 'UNAUTHORIZED_ACCESS'     // 未認証でのルートアクセス試行
  | 'FORBIDDEN_ACCESS'        // admin 権限不足でのアクセス試行

export type SecurityLevel = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL'

// ─── イベントペイロード ────────────────────────────────────────

interface SecurityEventPayload {
  type: SecurityEventType
  level: SecurityLevel
  timestamp: string           // ISO 8601
  userId?: string             // ログイン済みユーザーのID
  email?: string              // 対象メールアドレス（ハッシュ化推奨だが今は平文）
  path?: string               // アクセス試行パス
  detail?: Record<string, unknown>  // 追加情報（機密情報は含めない）
  userAgent: string
}

// ─── 開発環境コンソールスタイル ───────────────────────────────

const CONSOLE_STYLES: Record<SecurityLevel, string> = {
  INFO:     'color: #6366f1; font-weight: 600',
  WARN:     'color: #f59e0b; font-weight: 700',
  ERROR:    'color: #ef4444; font-weight: 700',
  CRITICAL: 'color: #dc2626; font-weight: 700; text-decoration: underline; font-size: 13px',
}

const LEVEL_BADGE: Record<SecurityLevel, string> = {
  INFO:     '🔵 INFO',
  WARN:     '🟡 WARN',
  ERROR:    '🔴 ERROR',
  CRITICAL: '🚨 CRITICAL',
}

// ─── 本番環境バックエンド送信（拡張点） ─────────────────────────
//
// 将来的には GET /admin/logs と連携する監査イベントを送信する
// 現時点はフロントエンドログのみ（サーバーサイドは backend の audit_logs テーブルで記録）
//
// async function sendToAuditBackend(event: SecurityEventPayload): Promise<void> {
//   try {
//     await fetch(`${import.meta.env.VITE_API_BASE_URL}/audit/frontend`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify(event),
//       keepalive: true,  // ページ離脱時も送信完了させる
//     })
//   } catch {
//     // 監査ログ送信失敗はサイレントに（本来の処理を止めない）
//   }
// }

// ─── メインロガー関数 ─────────────────────────────────────────

/**
 * セキュリティイベントを記録する
 *
 * @param type    - イベント種別
 * @param level   - 重大度レベル
 * @param detail  - 追加コンテキスト（パスワード・秘密鍵などを含めないこと）
 * @param userId  - 対象ユーザーID（認証済みの場合）
 * @param email   - 対象メールアドレス（任意）
 *
 * @example
 * logSecurityEvent('LOGIN_ATTEMPT', 'INFO', { email: 'user@example.com' })
 * logSecurityEvent('TOTP_FAILURE', 'WARN', { remainingAttempts: 3 }, userId)
 * logSecurityEvent('UNAUTHORIZED_ACCESS', 'ERROR', { path: '/admin' })
 */
export function logSecurityEvent(
  type: SecurityEventType,
  level: SecurityLevel = 'INFO',
  detail?: Record<string, unknown>,
  userId?: string,
  email?: string,
): void {
  const event: SecurityEventPayload = {
    type,
    level,
    timestamp: new Date().toISOString(),
    userId,
    email,
    path: window.location.pathname,
    detail,
    userAgent: navigator.userAgent,
  }

  if (import.meta.env.DEV) {
    const style = CONSOLE_STYLES[level]
    const badge = LEVEL_BADGE[level]

    if (level === 'CRITICAL' || level === 'ERROR') {
      console.error(
        `%c[ZeroSend Security] ${badge} — ${event.type}`,
        style,
        '\n',
        { timestamp: event.timestamp, userId, email, path: event.path, detail },
      )
    } else {
      console.groupCollapsed(
        `%c[ZeroSend Security] ${badge} — ${event.type}`,
        style,
      )
      console.log('⏱  Timestamp:', event.timestamp)
      console.log('📍 Path:', event.path)
      if (userId) console.log('👤 UserID:', userId)
      if (email)  console.log('📧 Email:', email)
      if (detail) console.log('📋 Detail:', detail)
      console.log('🖥  UserAgent:', event.userAgent.substring(0, 80) + '...')
      console.groupEnd()
    }
  }

  // 本番環境バックエンド送信（必要時にコメントアウト解除）
  // if (import.meta.env.PROD && (level === 'ERROR' || level === 'CRITICAL' || level === 'WARN')) {
  //   sendToAuditBackend(event)
  // }
}

// ─── 便利ラッパー ─────────────────────────────────────────────

/** ログイン試行 */
export const logLoginAttempt = (email: string) =>
  logSecurityEvent('LOGIN_ATTEMPT', 'INFO', undefined, undefined, email)

/** ログイン成功 */
export const logLoginSuccess = (userId: string, email: string) =>
  logSecurityEvent('LOGIN_SUCCESS', 'INFO', undefined, userId, email)

/** ログイン失敗 */
export const logLoginFailure = (email: string, reason: string) =>
  logSecurityEvent('LOGIN_FAILURE', 'WARN', { reason }, undefined, email)

/** ログアウト（通常） */
export const logLogout = (userId: string) =>
  logSecurityEvent('LOGOUT', 'INFO', undefined, userId)

/** ログアウト（強制） */
export const logForcedLogout = (reason: 'token_expired' | 'unauthorized_401') =>
  logSecurityEvent('LOGOUT_FORCED', 'WARN', { reason })

/** ユーザー登録試行 */
export const logRegisterAttempt = (email: string) =>
  logSecurityEvent('REGISTER_ATTEMPT', 'INFO', undefined, undefined, email)

/** ユーザー登録成功 */
export const logRegisterSuccess = (userId: string, email: string) =>
  logSecurityEvent('REGISTER_SUCCESS', 'INFO', undefined, userId, email)

/** ユーザー登録失敗 */
export const logRegisterFailure = (email: string, reason: string) =>
  logSecurityEvent('REGISTER_FAILURE', 'WARN', { reason }, undefined, email)

/** TOTP 検証失敗 */
export const logTotpFailure = (remainingAttempts: number) =>
  logSecurityEvent('TOTP_FAILURE', 'WARN', { remainingAttempts })

/** TOTP URLロック */
export const logTotpLocked = () =>
  logSecurityEvent('TOTP_LOCKED', 'CRITICAL', undefined)

/** 鍵ペア生成完了 */
export const logKeyPairGenerated = (userId: string, fingerprintPrefix: string) =>
  logSecurityEvent('KEY_PAIR_GENERATE_SUCCESS', 'INFO', { fingerprintPrefix }, userId)

/** 不正アクセス試行 */
export const logUnauthorizedAccess = (path: string) =>
  logSecurityEvent('UNAUTHORIZED_ACCESS', 'ERROR', { path })

/** 権限不足アクセス試行 */
export const logForbiddenAccess = (path: string, role: string) =>
  logSecurityEvent('FORBIDDEN_ACCESS', 'ERROR', { path, role })