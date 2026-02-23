// =============================================================
// ZeroSend — types/api.ts
//
// パス        : frontend/src/types/api.ts
// 作成日      : 2026-02-23
// 更新日      : 2026-02-23
//
// 概要        : バックエンド API 完全対応 TypeScript 型定義
//               ZeroSend_BackendAPI_Spec_v1.0 / Prisma スキーマ整合
//               フロントエンド内部型（SendFormState 等）も含む
//
// 依存関係    :
//   (外部依存なし — 純粋な型定義ファイル)
//
// 参照仕様    :
//   ZeroSend_BackendAPI_Spec_v1.0.docx
//   ZeroSend_DB_Spec_v1.0.docx (Prisma スキーマ)
//   ZeroSend_Architecture_v1.0.html (Redis キャッシュ設計)
// =============================================================

// ─── 共通 ─────────────────────────────────────────────────────

/** RFC 7807 Problem Detail */
export interface ProblemDetail {
  type: string
  title: string
  status: number
  detail: string
  instance?: string
}

/** ユーザーロール */
export type UserRole = 'admin' | 'sender' | 'recipient'

/** セッションステータス */
export type SessionStatus =
  | 'initiated'
  | 'key_stored'
  | 'ready'
  | 'downloaded'
  | 'deleted'
  | 'expired'

/** クラウドプロバイダー */
export type CloudProvider = 'server' | 'box' | 'gdrive' | 'onedrive' | 'dropbox'

/** 2FAタイプ */
export type TwoFaType = 'totp' | 'fido2'

/** 監査ログアクション */
export type AuditAction =
  | 'login'
  | 'login_failed'
  | 'totp_setup'
  | 'totp_verify'
  | 'fido2_register'
  | 'fido2_verify'
  | 'transfer_initiated'
  | 'key_stored'
  | 'url_finalized'
  | 'download_accessed'
  | 'download_completed'
  | 'session_deleted'
  | 'session_expired'
  | 'admin_session_delete'
  | 'admin_url_unlock'

// ─── ユーザー ─────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  displayName: string
  role: UserRole
  publicKeyKyberB64: string | null
  totpEnabled: boolean
  fido2Enabled: boolean
  createdAt: string
  updatedAt: string
}

// ─── 認証 API ─────────────────────────────────────────────────

/** POST /api/v1/auth/register リクエスト */
export interface RegisterRequest {
  email: string
  password: string
  displayName: string
  publicKeyKyberB64: string   // ML-KEM-768 公開鍵 (Base64)
}

/** POST /api/v1/auth/register レスポンス */
export interface RegisterResponse {
  user: User
  message: string
}

/** POST /api/v1/auth/login リクエスト */
export interface LoginRequest {
  email: string
  password: string
}

/** POST /api/v1/auth/login レスポンス */
export interface LoginResponse {
  access_token: string
  token_type: 'Bearer'
  expires_in: number
  user: {
    id: string
    email: string
    displayName: string
    role: UserRole
    totpEnabled: boolean
  }
}

/** POST /api/v1/auth/totp/setup レスポンス */
export interface TotpSetupResponse {
  otpauth_url: string
  secret: string
  qr_code_data_url: string
}

/** POST /api/v1/auth/totp/verify リクエスト */
export interface TotpVerifyRequest {
  url_token: string   // ダウンロードURLトークン
  totp_code: string   // 6桁OTP
}

/** POST /api/v1/auth/totp/verify レスポンス */
export interface TotpVerifyResponse {
  auth_token: string   // Redis保存済み一時認証トークン (TTL: 600s)
  expires_in: number
}

// ─── 転送 API ─────────────────────────────────────────────────

/** POST /api/v1/transfer/initiate リクエスト */
export interface InitiateTransferRequest {
  recipient_email: string
  file_name: string
  file_size_bytes: number
  file_hash_sha3: string        // SHA3-256 of plaintext file
  cloud_provider: CloudProvider
  expires_in_seconds: number    // 3600 / 21600 / 43200 / 86400
  max_downloads: number         // 1 / 2 / 3 / 5
  twofa_type: TwoFaType
}

/** POST /api/v1/transfer/initiate レスポンス */
export interface InitiateTransferResponse {
  session_id:               string
  url_token:                string
  upload_url:               string
  recipient_public_key_b64: string
  expires_at:               string
}

/** POST /api/v1/transfer/:id/key リクエスト */
export interface StoreKeyRequest {
  encrypted_key_b64: string    // K_enc: Kyberカプセル化済みAES-256鍵
  cloud_file_id: string        // クラウドストレージ側のファイルID
}

/** POST /api/v1/transfer/:id/key レスポンス */
export interface StoreKeyResponse {
  message: string
  session_id: string
}

/** POST /api/v1/transfer/:id/url リクエスト */
export interface FinalizeUrlRequest {
  recipient_email?: string
}

/** POST /api/v1/transfer/:id/url レスポンス */
export interface FinalizeUrlResponse {
  share_url: string   // 受信者に送るワンタイムURL
  url_token: string
  expires_at: string
}

// ─── ダウンロード API ─────────────────────────────────────────

/** GET /api/v1/download/:token レスポンス */
export interface DownloadInfoResponse {
  session_id: string
  sender_display_name: string
  file_name: string
  file_size_bytes: number
  expires_at: string
  max_downloads: number
  download_count: number
  twofa_type: TwoFaType
  is_locked: boolean
}

/** GET /api/v1/download/:token/key レスポンス */
export interface DownloadKeyResponse {
  encrypted_key_b64: string    // K_enc (Kyberカプセル化済みAES鍵)
  cloud_file_url: string       // 署名付きDL URL
  file_hash_sha3: string       // 整合性検証用 SHA3-256
  file_name: string
}

// ─── 管理者 API ───────────────────────────────────────────────

/** GET /api/v1/admin/sessions クエリパラメータ */
export interface AdminSessionsQuery {
  status?: SessionStatus
  page?: number
  limit?: number
}

/** 転送セッション（管理者向け詳細） */
export interface TransferSession {
  id: string
  senderEmail: string
  recipientEmail: string
  fileName: string
  fileSizeBytes: number
  cloudProvider: CloudProvider
  status: SessionStatus
  twoFaType: TwoFaType
  maxDownloads: number
  downloadCount: number
  expiresAt: string
  createdAt: string
  deletedAt: string | null
}

/** GET /api/v1/admin/sessions レスポンス */
export interface AdminSessionsResponse {
  sessions: TransferSession[]
  total: number
  page: number
  limit: number
}

/** 監査ログ */
export interface AuditLog {
  id: string
  sessionId: string | null
  userId: string | null
  action: AuditAction
  ipAddress: string
  userAgent: string
  detail: Record<string, unknown> | null
  createdAt: string
}

/** GET /api/v1/admin/logs レスポンス */
export interface AuditLogsResponse {
  logs: AuditLog[]
  total: number
  page: number
  limit: number
}

// ─── 受信者公開鍵検索 API ─────────────────────────────────────

/** GET /api/v1/transfer/recipient-key?email=... レスポンス */
export interface RecipientKeyResponse {
  email: string
  hasKyberKey: boolean
  publicKeyKyberB64?: string
}

// ─── フロントエンド内部型 ──────────────────────────────────────

/** 送信フロー ステップ */
export type SendStep = 'file' | 'settings' | 'confirm' | 'uploading' | 'done'

/** 送信フォームの状態 */
export interface SendFormState {
  file: File | null
  recipientEmail: string
  recipientPublicKey: string | null
  cloudProvider: CloudProvider
  expiresInSeconds: number
  maxDownloads: number
  twofaType: TwoFaType
  step: SendStep
}

/** Kyber 鍵ペア（ブラウザ内のみ — サーバには送らない） */
export interface KyberKeypair {
  publicKeyB64: string    // Base64エンコード公開鍵（登録時APIに送信）
  secretKeyRaw: Uint8Array  // IndexedDB保存用秘密鍵（絶対にサーバに送らない）
}