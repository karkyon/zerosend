// =============================================================
// ZeroSend — services/authService.ts
//
// パス        : frontend/src/services/authService.ts
// 作成日      : 2026-02-23
// 更新日      : 2026-02-23
//
// 概要        : 認証 API 呼び出しの Service レイヤー
//               バックエンド(snake_case) ↔ フロントエンド(camelCase) 変換
//               ProblemDetail → ユーザーフレンドリーなエラーメッセージ変換
//
// セキュリティ設計原則:
//   - バックエンドのエラー詳細をそのまま UI に露出しない
//   - パスワード・秘密鍵などの機密情報は引数として一時的に保持するのみ
//   - 全 API コールは securityLogger で記録
//   - 429 / 423 レスポンスを適切にハンドリング
//
// 依存関係:
//   @/lib/apiClient        api, ApiError
//   @/lib/securityLogger   logSecurityEvent 系
// =============================================================

import { api, ApiError } from '@/lib/apiClient'
import {
  logLoginAttempt, logLoginSuccess, logLoginFailure,
  logRegisterAttempt, logRegisterSuccess, logRegisterFailure,
  logSecurityEvent,
} from '@/lib/securityLogger'
import type { UserRole } from '@/types/api'

// ─── バックエンド実際レスポンス型（snake_case） ────────────────
// NOTE: types/api.ts の LoginResponse とは別に定義
//       バックエンド src/routes/auth.route.ts の実装に完全準拠

interface BackendLoginResponse {
  access_token: string
  expires_in: number          // 秒数
  user: {
    id: string
    display_name: string      // バックエンドは snake_case
    role: UserRole
    // NOTE: email / totpEnabled はバックエンドが返さないため省略
  }
}

interface BackendRegisterResponse {
  user_id: string             // バックエンドは user_id のみ返す
  key_fingerprint: string     // SHA3-256 フィンガープリント
}

interface BackendTotpVerifyResponse {
  auth_token: string
  expires_in: number          // 秒数 (デフォルト 600)
}

// ─── フロントエンド用正規化型 ──────────────────────────────────

export interface NormalizedLoginResult {
  accessToken: string
  expiresIn: number           // 秒数
  user: {
    id: string
    displayName: string
    email: string             // ログイン時に入力されたメールを保持
    role: UserRole
    totpEnabled: boolean      // バックエンドが未返却のため初期値 false
  }
}

export interface NormalizedRegisterResult {
  userId: string
  keyFingerprint: string
}

export interface NormalizedTotpResult {
  authToken: string
  expiresIn: number
}

// ─── エラーメッセージ変換 ─────────────────────────────────────
//
// バックエンドのエラー詳細をそのまま露出しない
// type フィールドで分岐して UI 向けメッセージに変換

function toUserFacingMessage(error: ApiError): string {
  const { status, problem } = error

  switch (status) {
    case 400:
      return 'メールアドレスまたはパスワードの形式が正しくありません'
    case 401:
      return 'メールアドレスまたはパスワードが正しくありません'
    case 409:
      return 'このメールアドレスはすでに登録されています'
    case 422:
      return '入力内容に不備があります。もう一度確認してください'
    case 423: {
      // URLロック (TOTP 5回失敗)
const remaining =
  typeof problem === 'object' &&
  problem !== null &&
  'remaining_attempts' in problem &&
  typeof (problem as any).remaining_attempts === 'number'
    ? (problem as any).remaining_attempts
    : undefined
      return remaining !== undefined
        ? `認証に失敗しました。残り試行回数: ${remaining}回`
        : '認証試行回数の上限に達しました。管理者にお問い合わせください'
    }
    case 429:
      return 'リクエストが多すぎます。しばらく待ってから再試行してください'
    case 500:
    case 502:
    case 503:
      return 'サーバーエラーが発生しました。しばらく待ってから再試行してください'
    case 0:
      return 'ネットワークに接続できません。接続を確認してください'
    default:
      return '予期しないエラーが発生しました'
  }
}

// ─── API 呼び出し関数 ─────────────────────────────────────────

/**
 * ログイン処理
 * POST /api/v1/auth/login
 *
 * @param email    - ログイン用メールアドレス
 * @param password - パスワード（この関数スコープ内のみで保持）
 * @returns        NormalizedLoginResult
 * @throws         Error（userFacingMessage付き）
 */
export async function loginUser(
  email: string,
  password: string,
): Promise<NormalizedLoginResult> {
  logLoginAttempt(email)

  try {
    const raw = await api.post<BackendLoginResponse>('auth/login', {
      json: { email, password },
    })

    const result: NormalizedLoginResult = {
      accessToken: raw.access_token,
      expiresIn:   raw.expires_in,
      user: {
        id:          raw.user.id,
        displayName: raw.user.display_name,
        email,                        // バックエンド未返却のため入力値を使用
        role:        raw.user.role,
        totpEnabled: false,           // バックエンド未返却のため初期値
      },
    }

    logLoginSuccess(result.user.id, email)
    return result

  } catch (error) {
    const message = error instanceof ApiError
      ? toUserFacingMessage(error)
      : 'ログイン中にエラーが発生しました'

    logLoginFailure(email, error instanceof ApiError ? error.problem.type : 'unknown')

    throw new Error(message)
  }
}

/**
 * ユーザー登録処理
 * POST /api/v1/auth/register
 *
 * NOTE: パスワードはこの関数スコープ内のみで保持し、完了後に参照を破棄する
 *       公開鍵 (publicKeyB64) のみサーバーに送信する（秘密鍵は絶対に送らない）
 *
 * @param email        - 登録メールアドレス
 * @param displayName  - 表示名
 * @param password     - パスワード（この関数スコープ内のみ）
 * @param publicKeyB64 - ML-KEM-768 公開鍵 (Base64) ← 秘密鍵ではない
 * @returns            NormalizedRegisterResult
 * @throws             Error（userFacingMessage付き）
 */
export async function registerUser(
  email: string,
  displayName: string,
  password: string,
  publicKeyB64: string,     // 公開鍵のみ！秘密鍵は渡さないこと
): Promise<NormalizedRegisterResult> {
  logRegisterAttempt(email)

  try {
    // バックエンドが期待するフィールド名（snake_case）に変換
    const raw = await api.post<BackendRegisterResponse>('auth/register', {
      json: {
        email,
        display_name:   displayName,  // camelCase → snake_case
        password,
        public_key_b64: publicKeyB64, // フロントの publicKeyKyberB64 → backend の public_key_b64
        key_type:       'kyber768',   // 固定値: ML-KEM-768
      },
    })

    const result: NormalizedRegisterResult = {
      userId:         raw.user_id,
      keyFingerprint: raw.key_fingerprint,
    }

    logRegisterSuccess(result.userId, email)
    return result

  } catch (error) {
    const message = error instanceof ApiError
      ? toUserFacingMessage(error)
      : '登録中にエラーが発生しました'

    logRegisterFailure(email, error instanceof ApiError ? error.problem.type : 'unknown')

    throw new Error(message)
  }
}

/**
 * TOTP 二要素認証（ダウンロードフロー用）
 * POST /api/v1/auth/totp/verify
 *
 * @param urlToken  - ワンタイムURLトークン
 * @param email     - 受信者メールアドレス（本人確認用）
 * @param otp       - 6桁 TOTP コード
 * @returns         NormalizedTotpResult
 * @throws          TotpError（remainingAttempts / isLocked 付き）
 */

export interface TotpError extends Error {
  remainingAttempts?: number
  isLocked: boolean
  statusCode: number
}

export async function verifyTotp(
  urlToken: string,
  email: string,
  otp: string,
): Promise<NormalizedTotpResult> {
  logSecurityEvent('TOTP_ATTEMPT', 'INFO', undefined, undefined, email)

  try {
    // NOTE: バックエンドのフィールド名は `otp`（types/api.ts の totp_code とは異なる）
    const raw = await api.post<BackendTotpVerifyResponse>('auth/totp/verify', {
      json: {
        url_token: urlToken,
        email,
        otp,          // backend validator: otp (not otp_code, not totp_code)
      },
    })

    logSecurityEvent('TOTP_SUCCESS', 'INFO', undefined, undefined, email)

    return {
      authToken: raw.auth_token,
      expiresIn: raw.expires_in,
    }

  } catch (error) {
    if (error instanceof ApiError) {
      const p = error.problem

      const remaining =
        typeof p === 'object' &&
        p !== null &&
        'remaining_attempts' in p &&
        typeof (p as any).remaining_attempts === 'number'
          ? (p as any).remaining_attempts
          : undefined
      const isLocked  = error.status === 423

      if (isLocked) {
        logSecurityEvent('TOTP_LOCKED', 'CRITICAL')
      } else {
        logSecurityEvent('TOTP_FAILURE', 'WARN', { remainingAttempts: remaining })
      }

      const totpError = Object.assign(
        new Error(toUserFacingMessage(error)),
        {
          remainingAttempts: remaining,
          isLocked,
          statusCode: error.status,
        },
      ) as TotpError

      throw totpError
    }

    throw new Error('TOTP 認証中にエラーが発生しました')
  }
}