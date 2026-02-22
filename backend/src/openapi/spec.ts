// =====================================
// ファイルパス  : zerosend/backend/src/openapi/spec.ts
//
// 説明・目的・機能概要:
//   ZeroSend Backend API の OpenAPI 3.0 仕様定義。
//   全エンドポイント・スキーマ・レスポンス例を網羅し、
//   Swagger UI（GET /docs）および GET /api/openapi.json から参照される。
//
//   Swagger UI で "Try it out" を使う手順:
//     1. POST /api/v1/auth/login を実行して access_token を取得
//     2. 画面右上 [Authorize 🔒] に "Bearer <token>" を貼り付け
//     3. 送信側API / 管理者API を Try it out で実行
//     4. 受信側API は url_token 取得後、TOTP verify で auth_token を取得して再度 Authorize
//
//   API仕様書（ZeroSend_BackendAPI_Spec_v1.0）準拠。
//
// 作成日時 : 2026-02-21
// 更新日時 : 2026-02-21
//
// 依存関係:
//   (外部依存なし — 純粋なオブジェクト定義)
// =====================================

// ─── 共通レスポンス example 値 ────────────────────────────────────────────────
const EXAMPLE_UUID       = '550e8400-e29b-41d4-a716-446655440000'
const EXAMPLE_JWT        = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbWFpbCI6InlhbWFkYUBjb21wYW55LmNvLmpwIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MTcwMDAyODgwMH0.SIGNATURE'
const EXAMPLE_URL_TOKEN  = 'c2VjdXJlUmFuZG9tQmFzZTY0VVJMVG9rZW4tMjU2Yml0'
const EXAMPLE_AUTH_TOKEN = 'YXV0aFRva2VuUmFuZG9tMzJieXRlc0Jhc2U2NFVSTF9leGFtcGxl'
const EXAMPLE_PUBKEY     = 'S3liZXI3NjhQdWJsaWNLZXlCYXNlNjRFbmNvZGVkPT0='
const EXAMPLE_ENCKEY     = 'S3liZXJXcmFwcGVkQUVTS2V5QmFzZTY0RW5jb2RlZA=='
const EXAMPLE_SHA3       = 'a3f1c2d4e5b6789012345678901234567890abcdef1234567890abcdef123456'
const EXAMPLE_FINGERPRINT= 'b94f6f125179b97e236e03cdf03e6e3a5a4e7b12c3f890123456789abcdef12'
const EXAMPLE_UPLOAD_URL = 'https://storage.zerosend.local/upload/abc123?X-Amz-Signature=...'
const EXAMPLE_DL_URL     = 'https://storage.zerosend.local/files/enc_abc123?token=...'
const EXAMPLE_SHARE_URL  = 'http://localhost:3000/download/c2VjdXJlUmFuZG9tQmFzZTY0VVJMVG9rZW4'
const EXAMPLE_DATETIME   = '2026-02-24T15:00:00.000Z'

// ─── 共通 Problem Detail examples ────────────────────────────────────────────
const problemExamples = {
  unauthorized: {
    value: { type: '/errors/unauthorized', title: 'Unauthorized', status: 401, detail: 'JWT token is invalid or expired', instance: '/api/v1/transfer/initiate' }
  },
  forbidden: {
    value: { type: '/errors/forbidden', title: 'Forbidden', status: 403, detail: 'Admin role required', instance: '/api/v1/admin/sessions' }
  },
  notFound: {
    value: { type: '/errors/not-found', title: 'Not Found', status: 404, detail: 'Transfer session not found', instance: '/api/v1/transfer/550e8400/key' }
  },
  gone: {
    value: { type: '/errors/gone', title: 'Gone', status: 410, detail: 'URL has expired or download limit reached', instance: '/api/v1/download/xxx' }
  },
  locked: {
    value: { type: '/errors/locked', title: 'Locked', status: 423, detail: 'Too many failed attempts. URL is locked.', instance: '/api/v1/auth/totp/verify' }
  },
  tooMany: {
    value: { type: '/errors/rate-limited', title: 'Too Many Requests', status: 429, detail: 'Rate limit exceeded. Retry after 60 seconds.', instance: '/api/v1/auth/login' }
  },
}

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'ZeroSend Backend API',
    version: '1.0.0',
    description: `
## ZeroSend — 量子耐性暗号ゼロ保持ファイル転送 API

### 🔐 Swagger UI での認証手順

**送信者として操作する場合:**
\`\`\`
1. POST /api/v1/auth/register でアカウント作成
2. POST /api/v1/auth/login で access_token を取得
3. 画面右上の [Authorize 🔒] ボタンをクリック
4. "Bearer eyJhbGci..." を入力して [Authorize]
5. 送信側API・管理者API が Try it 可能になる
\`\`\`

**受信者として操作する場合:**
\`\`\`
1. POST /api/v1/auth/totp/verify で auth_token を取得
   (url_token はメール or 送信者から受け取る)
2. [Authorize 🔒] に auth_token を Bearer として入力
3. 受信側API (GET /download/:token/key 等) が Try it 可能
\`\`\`

### 📦 ゼロ保持設計の原則

| データ | 保存場所 | 保持期間 |
|--------|----------|----------|
| 暗号化ファイル C_file | クラウドストレージ | DL完了まで |
| 暗号化AES鍵 K_enc | Redis のみ | TTL 3600秒 |
| 平文AES鍵 K_AES | **ブラウザメモリのみ** | ページ離脱まで |
| 受信者秘密鍵 | **クライアントデバイスのみ** | 永続 |

### 🔢 エラーコード一覧

| type | HTTP | 発生条件 |
|------|------|---------|
| /errors/invalid-request | 400 | バリデーションエラー |
| /errors/unauthorized | 401 | JWT未提供・期限切れ |
| /errors/forbidden | 403 | 権限不足 |
| /errors/not-found | 404 | リソース存在しない |
| /errors/gone | 410 | URL期限切れ・DL上限到達 |
| /errors/auth-failed | 401 | 2FA認証失敗 |
| /errors/locked | 423 | 5回失敗によるURLロック |
| /errors/rate-limited | 429 | レートリミット超過 |
| /errors/internal | 500 | サーバ内部エラー |
    `.trim(),
    contact: { name: 'KARKYON' },
  },

  servers: [
    { url: 'http://localhost:8000', description: '🛠️  開発環境 (Docker Compose)' },
    { url: 'https://api.zerosend.app', description: '🚀 本番環境' },
  ],

  tags: [
    { name: '認証・鍵管理', description: '**認証不要** ユーザー登録・ログイン・2FA認証。ここで取得した access_token を Authorize に設定する。' },
    { name: '送信側API',    description: '**JWT必須** ファイル転送セッション管理。Authorize に access_token を設定してから実行。' },
    { name: '受信側API',    description: '**認証不要（info）/ auth_token必須（key・complete）** ファイルダウンロード。' },
    { name: '管理者API',    description: '**JWT必須 + role=admin** セッション管理・監査ログ。管理者アカウントの JWT が必要。' },
    { name: 'システム',     description: 'ヘルスチェック・メタ情報' },
  ],

  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: [
          '**送信者・管理者**: POST /auth/login のレスポンス `access_token` を入力',
          '**受信者**: POST /auth/totp/verify のレスポンス `auth_token` を入力',
          '',
          '入力形式: `Bearer eyJhbGci...` または JWT 部分のみ（Swagger が Bearer を自動付与）',
        ].join('\n'),
      },
    },

    schemas: {
      // ─── 共通エラー ─────────────────────────────────────────────────────────
      ProblemDetail: {
        type: 'object',
        required: ['type', 'title', 'status'],
        properties: {
          type:     { type: 'string', description: 'エラー種別URI', example: '/errors/unauthorized' },
          title:    { type: 'string', description: '人間が読めるタイトル', example: 'Unauthorized' },
          status:   { type: 'integer', description: 'HTTP ステータスコード', example: 401 },
          detail:   { type: 'string', description: '詳細メッセージ', example: 'JWT token is invalid or expired' },
          instance: { type: 'string', description: 'リクエストパス', example: '/api/v1/transfer/initiate' },
        },
        example: { type: '/errors/unauthorized', title: 'Unauthorized', status: 401, detail: 'JWT token is invalid or expired', instance: '/api/v1/transfer/initiate' },
      },

      // ─── 認証系スキーマ ──────────────────────────────────────────────────────
      RegisterRequest: {
        type: 'object',
        required: ['email', 'display_name', 'password', 'public_key_b64', 'key_type'],
        properties: {
          email:          { type: 'string', format: 'email',    description: 'ログインID（一意）', example: 'yamada@company.co.jp' },
          display_name:   { type: 'string', maxLength: 100,     description: '表示名', example: '山田太郎' },
          password:       { type: 'string', minLength: 8,       description: 'パスワード（bcrypt で保存）', example: 'SecurePass123!' },
          public_key_b64: { type: 'string',                     description: 'Base64エンコードされた Kyber-768 公開鍵。クライアント側で生成し公開鍵のみ送信する。秘密鍵は絶対に送信しない。', example: EXAMPLE_PUBKEY },
          key_type:       { type: 'string', enum: ['kyber768'], description: '鍵アルゴリズム識別子。現行は kyber768 固定。', example: 'kyber768' },
          totp_secret_enc:{ type: 'string', nullable: true,     description: 'AES-256-GCM 暗号化済み TOTP シークレット（TOTP 登録時のみ）。形式: iv_hex:tag_hex:ciphertext_hex', example: null },
        },
        example: {
          email: 'yamada@company.co.jp',
          display_name: '山田太郎',
          password: 'SecurePass123!',
          public_key_b64: EXAMPLE_PUBKEY,
          key_type: 'kyber768',
        },
      },

      RegisterResponse: {
        type: 'object',
        properties: {
          user_id:         { type: 'string', format: 'uuid',    description: '発行されたユーザーID', example: EXAMPLE_UUID },
          key_fingerprint: { type: 'string',                     description: 'SHA3-256(public_key_bytes) hex 64chars — 公開鍵の指紋', example: EXAMPLE_FINGERPRINT },
        },
        example: { user_id: EXAMPLE_UUID, key_fingerprint: EXAMPLE_FINGERPRINT },
      },

      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email:    { type: 'string', format: 'email', description: 'ログイン用メールアドレス', example: 'yamada@company.co.jp' },
          password: { type: 'string',                  description: 'パスワード', example: 'SecurePass123!' },
        },
        example: { email: 'yamada@company.co.jp', password: 'SecurePass123!' },
      },

      LoginResponse: {
        type: 'object',
        properties: {
          access_token: { type: 'string', description: 'JWT Bearer Token。以降の送信者API で Authorization: Bearer <token> として使用する。', example: EXAMPLE_JWT },
          expires_in:   { type: 'string', description: 'トークン有効期限', example: '8h' },
          user: {
            type: 'object',
            properties: {
              id:           { type: 'string', format: 'uuid', example: EXAMPLE_UUID },
              display_name: { type: 'string', example: '山田太郎' },
              role:         { type: 'string', enum: ['user', 'admin'], example: 'user' },
            },
          },
        },
        example: {
          access_token: EXAMPLE_JWT,
          expires_in: '8h',
          user: { id: EXAMPLE_UUID, display_name: '山田太郎', role: 'user' },
        },
      },

      VerifyTotpRequest: {
        type: 'object',
        required: ['url_token', 'email', 'otp'],
        properties: {
          url_token: { type: 'string', description: '256bit Base64URL ワンタイムトークン（メール or 送信者から受け取る）', example: EXAMPLE_URL_TOKEN },
          email:     { type: 'string', format: 'email', description: '受信者メールアドレス（本人確認）', example: 'recipient@company.co.jp' },
          otp:       { type: 'string', pattern: '^\\d{6}$', description: '6桁 TOTP コード（RFC 6238）。±1 ウィンドウ (90秒) 許容。', example: '123456' },
        },
        example: { url_token: EXAMPLE_URL_TOKEN, email: 'recipient@company.co.jp', otp: '123456' },
      },

      VerifyTotpResponse: {
        type: 'object',
        properties: {
          auth_token: { type: 'string', description: 'ダウンロード用 Bearer トークン。GET /download/:token/key で使用する。TTL: 600秒。', example: EXAMPLE_AUTH_TOKEN },
          expires_in: { type: 'integer', description: 'auth_token の有効秒数', example: 600 },
        },
        example: { auth_token: EXAMPLE_AUTH_TOKEN, expires_in: 600 },
      },

      // ─── 転送系スキーマ ──────────────────────────────────────────────────────
      InitiateTransferRequest: {
        type: 'object',
        required: ['recipient_email', 'file_hash_sha3', 'file_size_bytes'],
        properties: {
          recipient_email:    { type: 'string', format: 'email', description: '受信者メールアドレス（登録済みユーザーである必要がある）', example: 'recipient@company.co.jp' },
          file_hash_sha3:     { type: 'string', pattern: '^[0-9a-f]{64}$', description: 'SHA3-256(平文ファイル) hex 64chars。クライアント側で計算して送信する。DL後の整合性確認に使用。', example: EXAMPLE_SHA3 },
          encrypted_filename: { type: 'string', nullable: true, description: '暗号化済みファイル名（任意）', example: null },
          file_size_bytes:    { type: 'integer', minimum: 1, description: '暗号化後ファイルサイズ (bytes)', example: 1048576 },
          cloud_type:         { type: 'string', enum: ['server', 'box', 'gdrive', 'onedrive', 'dropbox'], default: 'server', description: 'ストレージ先。server = ローカル (開発用)、他はクラウドサービス (Phase 2)', example: 'server' },
          max_downloads:      { type: 'integer', minimum: 1, maximum: 5, default: 1, description: '最大ダウンロード回数 (1〜5)', example: 1 },
          expires_in_hours:   { type: 'integer', minimum: 1, maximum: 168, default: 72, description: 'URL有効時間（時間単位、最大7日=168時間）', example: 72 },
        },
        example: {
          recipient_email: 'recipient@company.co.jp',
          file_hash_sha3: EXAMPLE_SHA3,
          file_size_bytes: 1048576,
          cloud_type: 'server',
          max_downloads: 1,
          expires_in_hours: 72,
        },
      },

      InitiateTransferResponse: {
        type: 'object',
        properties: {
          session_id:               { type: 'string', format: 'uuid', description: 'セッションID。以降の /key /url リクエストで使用する。', example: EXAMPLE_UUID },
          upload_url:               { type: 'string', description: 'クラウドストレージへの直接 PUT アップロード URL（署名付き）。このURLに対してブラウザから直接 PUT する。バックエンドを経由しない。', example: EXAMPLE_UPLOAD_URL },
          recipient_public_key_b64: { type: 'string', description: '受信者の Kyber-768 公開鍵（Base64）。クライアント側でこの公開鍵を使い AES 鍵を Kyber ラップして K_enc を生成する。', example: EXAMPLE_PUBKEY },
          url_token:                { type: 'string', description: '受信者共有用ワンタイムトークン。POST /transfer/:id/url 後にメール送信される。', example: EXAMPLE_URL_TOKEN },
          expires_at:               { type: 'string', format: 'date-time', description: 'URLの有効期限', example: EXAMPLE_DATETIME },
        },
        example: {
          session_id: EXAMPLE_UUID,
          upload_url: EXAMPLE_UPLOAD_URL,
          recipient_public_key_b64: EXAMPLE_PUBKEY,
          url_token: EXAMPLE_URL_TOKEN,
          expires_at: EXAMPLE_DATETIME,
        },
      },

      StoreKeyRequest: {
        type: 'object',
        required: ['enc_key_b64', 'cloud_file_id'],
        properties: {
          enc_key_b64:   { type: 'string', description: 'Kyber-768 で受信者公開鍵にラップした AES 鍵 (K_enc) の Base64。DB には保存されず Redis に TTL 3600秒 で保存される。', example: EXAMPLE_ENCKEY },
          cloud_file_id: { type: 'string', description: 'クラウドへの PUT 完了後に確定したファイル識別子', example: 'server_abc123_def456' },
        },
        example: { enc_key_b64: EXAMPLE_ENCKEY, cloud_file_id: 'server_abc123_def456' },
      },

      FinalizeUrlResponse: {
        type: 'object',
        properties: {
          share_url:  { type: 'string', description: '受信者に共有するダウンロード URL', example: EXAMPLE_SHARE_URL },
          email_sent: { type: 'boolean', description: '受信者へのメール送信成否', example: true },
        },
        example: { share_url: EXAMPLE_SHARE_URL, email_sent: true },
      },

      // ─── 受信系スキーマ ──────────────────────────────────────────────────────
      DownloadInfoResponse: {
        type: 'object',
        properties: {
          sender_display_name:  { type: 'string', description: '送信者の表示名', example: '山田太郎' },
          file_size_bytes:      { type: 'integer', description: '暗号化ファイルサイズ', example: 1048576 },
          expires_at:           { type: 'string', format: 'date-time', description: 'URL有効期限', example: EXAMPLE_DATETIME },
          remaining_downloads:  { type: 'integer', description: '残ダウンロード可能回数', example: 1 },
          twofa_type:           { type: 'string', enum: ['totp', 'fido2'], description: '2FA 種別', example: 'totp' },
        },
        example: {
          sender_display_name: '山田太郎',
          file_size_bytes: 1048576,
          expires_at: EXAMPLE_DATETIME,
          remaining_downloads: 1,
          twofa_type: 'totp',
        },
      },

      DownloadKeyResponse: {
        type: 'object',
        properties: {
          encrypted_key_b64: { type: 'string', description: 'K_enc（Kyber-768 でラップされた AES 鍵）Base64。クライアント側で自分の秘密鍵で復号して K_AES を取得する。', example: EXAMPLE_ENCKEY },
          cloud_file_url:    { type: 'string', description: '暗号化ファイルへの署名付きダウンロード URL', example: EXAMPLE_DL_URL },
          file_hash_sha3:    { type: 'string', description: 'SHA3-256(平文ファイル) hex 64chars。復号後にこのハッシュと照合して整合性を確認する。', example: EXAMPLE_SHA3 },
        },
        example: {
          encrypted_key_b64: EXAMPLE_ENCKEY,
          cloud_file_url: EXAMPLE_DL_URL,
          file_hash_sha3: EXAMPLE_SHA3,
        },
      },

      // ─── 管理者系スキーマ ────────────────────────────────────────────────────
      SessionListResponse: {
        type: 'object',
        properties: {
          total:       { type: 'integer', example: 142 },
          page:        { type: 'integer', example: 1 },
          per_page:    { type: 'integer', example: 50 },
          total_pages: { type: 'integer', example: 3 },
          data: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id:                { type: 'string', format: 'uuid', example: EXAMPLE_UUID },
                url_token:         { type: 'string', example: EXAMPLE_URL_TOKEN },
                status:            { type: 'string', enum: ['initiated', 'ready', 'downloaded', 'deleted', 'expired'], example: 'ready' },
                sender_name:       { type: 'string', example: '山田太郎' },
                recipient_email:   { type: 'string', example: 'recipient@company.co.jp' },
                file_size_bytes:   { type: 'integer', example: 1048576 },
                cloud_type:        { type: 'string', example: 'server' },
                download_count:    { type: 'integer', example: 0 },
                max_downloads:     { type: 'integer', example: 1 },
                expires_at:        { type: 'string', format: 'date-time', example: EXAMPLE_DATETIME },
                created_at:        { type: 'string', format: 'date-time', example: '2026-02-21T10:00:00.000Z' },
              },
            },
          },
        },
        example: {
          total: 1, page: 1, per_page: 50, total_pages: 1,
          data: [{
            id: EXAMPLE_UUID, url_token: EXAMPLE_URL_TOKEN, status: 'ready',
            sender_name: '山田太郎', recipient_email: 'recipient@company.co.jp',
            file_size_bytes: 1048576, cloud_type: 'server',
            download_count: 0, max_downloads: 1,
            expires_at: EXAMPLE_DATETIME, created_at: '2026-02-21T10:00:00.000Z',
          }],
        },
      },

      AuditLogListResponse: {
        type: 'object',
        properties: {
          total: { type: 'integer', example: 5 },
          page:  { type: 'integer', example: 1 },
          per_page: { type: 'integer', example: 50 },
          data: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id:         { type: 'string', format: 'uuid' },
                session_id: { type: 'string', format: 'uuid', nullable: true },
                actor_id:   { type: 'string', format: 'uuid', nullable: true },
                event_type: { type: 'string', enum: ['url_issued','access','auth_success','auth_fail','dl_success','dl_fail','deleted','admin_delete','lock','unlock'] },
                result:     { type: 'string', enum: ['success', 'failure'] },
                ip_address: { type: 'string', example: '192.168.1.1' },
                created_at: { type: 'string', format: 'date-time', example: '2026-02-21T10:00:00.000Z' },
              },
            },
          },
        },
        example: {
          total: 2, page: 1, per_page: 50,
          data: [
            { id: EXAMPLE_UUID, session_id: EXAMPLE_UUID, actor_id: EXAMPLE_UUID, event_type: 'url_issued', result: 'success', ip_address: '192.168.1.1', created_at: '2026-02-21T10:00:00.000Z' },
            { id: EXAMPLE_UUID, session_id: EXAMPLE_UUID, actor_id: null, event_type: 'auth_success', result: 'success', ip_address: '192.168.1.100', created_at: '2026-02-21T10:05:00.000Z' },
          ],
        },
      },

      UserListResponse: {
        type: 'object',
        properties: {
          total: { type: 'integer', example: 3 },
          page:  { type: 'integer', example: 1 },
          per_page: { type: 'integer', example: 50 },
          data: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id:            { type: 'string', format: 'uuid' },
                display_name:  { type: 'string', example: '山田太郎' },
                role:          { type: 'string', enum: ['user', 'admin'] },
                is_active:     { type: 'boolean', example: true },
                created_at:    { type: 'string', format: 'date-time' },
                last_login_at: { type: 'string', format: 'date-time', nullable: true },
              },
            },
          },
        },
        example: {
          total: 1, page: 1, per_page: 50,
          data: [{ id: EXAMPLE_UUID, display_name: '山田太郎', role: 'user', is_active: true, created_at: '2026-02-21T09:00:00.000Z', last_login_at: '2026-02-21T10:00:00.000Z' }],
        },
      },
    },

    // ─── 共通レスポンス ──────────────────────────────────────────────────────
    responses: {
      Unauthorized: {
        description: '認証エラー (401) — JWT 未提供・期限切れ・無効',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ProblemDetail' }, examples: { unauthorized: problemExamples.unauthorized } } },
      },
      Forbidden: {
        description: '権限不足 (403) — 管理者専用エンドポイントへの一般ユーザーアクセス',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ProblemDetail' }, examples: { forbidden: problemExamples.forbidden } } },
      },
      NotFound: {
        description: 'リソース不存在 (404)',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ProblemDetail' }, examples: { notFound: problemExamples.notFound } } },
      },
      Gone: {
        description: 'URL期限切れ or DL上限到達 (410)',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ProblemDetail' }, examples: { gone: problemExamples.gone } } },
      },
      Locked: {
        description: 'URLロック (423) — 5回認証失敗',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ProblemDetail' }, examples: { locked: problemExamples.locked } } },
      },
      TooManyRequests: {
        description: 'レートリミット超過 (429)',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ProblemDetail' }, examples: { tooMany: problemExamples.tooMany } } },
      },
      InternalServerError: {
        description: 'サーバ内部エラー (500)',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ProblemDetail' } } },
      },
    },
  },

  // ─── パス定義 ────────────────────────────────────────────────────────────────
  paths: {

    // ═══ 認証・鍵管理 ════════════════════════════════════════════════════════════

    '/api/v1/auth/register': {
      post: {
        tags: ['認証・鍵管理'],
        summary: 'ユーザー登録・Kyber-768 公開鍵登録',
        description: [
          '受信者が初回利用時に登録する。',
          '',
          '**クライアント側の事前準備:**',
          '1. Kyber-768 鍵ペアを生成（`liboqs` など）',
          '2. 公開鍵を Base64 エンコード → `public_key_b64` に設定',
          '3. **秘密鍵はデバイスに保存する。絶対にサーバに送信しない。**',
          '',
          '**サーバ処理:**',
          '1. email を SHA-256 でハッシュ化 → `email_hash` として保存（平文メールは保存しない）',
          '2. `public_key_b64` の SHA3-256 フィンガープリントを計算',
          '3. `users` テーブルに INSERT',
          '4. `user_public_keys` テーブルに INSERT（is_primary = true）',
        ].join('\n'),
        operationId: 'register',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } },
        },
        responses: {
          '201': { description: '登録成功', content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterResponse' } } } },
          '400': { description: 'バリデーションエラー', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProblemDetail' }, examples: { invalid: { value: { type: '/errors/invalid-request', title: 'Bad Request', status: 400, detail: 'email: Invalid email format', instance: '/api/v1/auth/register' } } } } } },
          '409': { description: 'メールアドレス重複', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProblemDetail' }, examples: { conflict: { value: { type: '/errors/conflict', title: 'Conflict', status: 409, detail: 'Email already registered', instance: '/api/v1/auth/register' } } } } } },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },

    '/api/v1/auth/login': {
      post: {
        tags: ['認証・鍵管理'],
        summary: 'ログイン・JWT アクセストークン発行',
        description: [
          '送信者がログインし JWT を取得する。',
          '',
          '取得した `access_token` を Swagger UI の **[Authorize 🔒]** ボタンに入力すると、',
          '送信側API・管理者API が Try it 可能になる。',
          '',
          '**セキュリティ:** email は SHA-256 でハッシュ化してDB検索するため平文メールは保存されない。',
          '認証失敗時も常に一定時間（bcrypt比較）かけてタイミング攻撃を防ぐ。',
        ].join('\n'),
        operationId: 'login',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
        },
        responses: {
          '200': { description: 'ログイン成功 — access_token を取得して Authorize に設定する', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } } },
          '400': { description: 'バリデーションエラー', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProblemDetail' } } } },
          '401': { description: '認証失敗', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProblemDetail' }, examples: { authFail: { value: { type: '/errors/auth-failed', title: 'Unauthorized', status: 401, detail: 'Invalid email or password', instance: '/api/v1/auth/login' } } } } } },
          '429': { $ref: '#/components/responses/TooManyRequests' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },

    '/api/v1/auth/totp/verify': {
      post: {
        tags: ['認証・鍵管理'],
        summary: 'TOTP 2FA 認証・auth_token 発行',
        description: [
          '受信者がワンタイム URL 経由でアクセスした後の 2FA 認証。',
          '',
          '**認証成功後:**',
          '- `auth_token` (TTL: 600秒) を Redis に保存',
          '- この `auth_token` を Bearer として GET /download/:token/key を呼び出す',
          '',
          '**ロック制御:**',
          '- 5回連続失敗 → URL をロック (423)',
          '- ロック解除は管理者のみ可能 (POST /admin/sessions/:id/unlock)',
          '',
          '**TOTP 仕様:** RFC 6238 準拠、±1 ウィンドウ (90秒) 許容',
        ].join('\n'),
        operationId: 'verifyTotp',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/VerifyTotpRequest' } } },
        },
        responses: {
          '200': { description: '認証成功 — auth_token を取得して Authorize に設定する', content: { 'application/json': { schema: { $ref: '#/components/schemas/VerifyTotpResponse' } } } },
          '401': { description: 'OTP 不一致（残試行回数を含む）', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProblemDetail' }, examples: { authFail: { value: { type: '/errors/auth-failed', title: 'Unauthorized', status: 401, detail: 'Invalid OTP code', remaining_attempts: 3, instance: '/api/v1/auth/totp/verify' } } } } } },
          '404': { $ref: '#/components/responses/NotFound' },
          '410': { $ref: '#/components/responses/Gone' },
          '423': { $ref: '#/components/responses/Locked' },
          '429': { $ref: '#/components/responses/TooManyRequests' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },

    '/api/v1/auth/fido2/begin': {
      post: {
        tags: ['認証・鍵管理'],
        summary: 'FIDO2 チャレンジ生成 ⚠️ Phase 2',
        description: 'WebAuthn/FIDO2 認証のチャレンジを生成し Redis に保存 (TTL: 120秒)。**Phase 2 実装予定 — 現在 501 を返す。**',
        operationId: 'fido2Begin',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['url_token', 'email'], properties: { url_token: { type: 'string', example: EXAMPLE_URL_TOKEN }, email: { type: 'string', format: 'email', example: 'recipient@company.co.jp' } }, example: { url_token: EXAMPLE_URL_TOKEN, email: 'recipient@company.co.jp' } } } },
        },
        responses: {
          '200': { description: 'チャレンジ生成成功', content: { 'application/json': { schema: { type: 'object', properties: { challenge: { type: 'string', description: 'Base64URL チャレンジ', example: 'randomBase64URLchallenge128bit==' }, expires_in: { type: 'integer', example: 120 } } }, example: { challenge: 'randomBase64URLchallenge128bit==', expires_in: 120 } } } },
          '501': { description: 'Not Implemented (Phase 2)', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProblemDetail' } } } },
        },
      },
    },

    '/api/v1/auth/fido2/complete': {
      post: {
        tags: ['認証・鍵管理'],
        summary: 'FIDO2 認証完了・auth_token 発行 ⚠️ Phase 2',
        description: 'WebAuthn 認証アサーションを検証し auth_token を発行する。**Phase 2 実装予定。**',
        operationId: 'fido2Complete',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['url_token', 'credential'], properties: { url_token: { type: 'string', example: EXAMPLE_URL_TOKEN }, credential: { type: 'object', description: 'WebAuthn PublicKeyCredential JSON' } } } } },
        },
        responses: {
          '200': { description: '認証成功', content: { 'application/json': { schema: { $ref: '#/components/schemas/VerifyTotpResponse' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '423': { $ref: '#/components/responses/Locked' },
          '501': { description: 'Not Implemented (Phase 2)', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProblemDetail' } } } },
        },
      },
    },

    // ═══ 送信側 API ══════════════════════════════════════════════════════════════

    '/api/v1/transfer/initiate': {
      post: {
        tags: ['送信側API'],
        summary: '転送セッション作成・署名付きアップロード URL 取得',
        description: [
          '**事前に Authorize に JWT を設定してください。**',
          '',
          '**完全なファイル送信フロー:**',
          '```',
          '1. POST /auth/login → access_token 取得',
          '2. [クライアント] AES-256 鍵 K_AES を生成',
          '3. [クライアント] ファイルを K_AES で AES-256-GCM 暗号化 → C_file',
          '4. [クライアント] SHA3-256(平文ファイル) 計算 → file_hash_sha3',
          '5. POST /transfer/initiate → upload_url + recipient_public_key_b64 取得',
          '6. [クライアント] upload_url に C_file を直接 PUT (バックエンド非経由)',
          '7. [クライアント] recipient_public_key_b64 で K_AES を Kyber-768 ラップ → K_enc',
          '8. POST /transfer/:id/key → K_enc + cloud_file_id を送信',
          '9. POST /transfer/:id/url → メール送信・URL確定',
          '```',
        ].join('\n'),
        operationId: 'initiateTransfer',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/InitiateTransferRequest' } } },
        },
        responses: {
          '201': { description: 'セッション作成成功', content: { 'application/json': { schema: { $ref: '#/components/schemas/InitiateTransferResponse' } } } },
          '400': { description: 'バリデーションエラー', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProblemDetail' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { description: '受信者未登録 or 有効な公開鍵なし', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProblemDetail' }, examples: { noKey: { value: { type: '/errors/not-found', title: 'Not Found', status: 404, detail: 'Recipient has no active public key registered', instance: '/api/v1/transfer/initiate' } } } } } },
          '429': { $ref: '#/components/responses/TooManyRequests' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },

    '/api/v1/transfer/{session_id}/key': {
      post: {
        tags: ['送信側API'],
        summary: 'K_enc (Kyber ラップ済み AES 鍵) を Redis へ保存',
        description: [
          '**事前に Authorize に JWT を設定してください。**',
          '',
          'クライアントがファイル PUT 完了後に K_enc と cloud_file_id を送信する。',
          '',
          '**ゼロ保持の核心:**',
          '- K_enc は **Redis のみ** に TTL 3600秒 で保存',
          '- DB（PostgreSQL）には K_enc を保存しない',
          '- サーバは K_enc を復号できない（受信者の秘密鍵が必要）',
        ].join('\n'),
        operationId: 'storeKey',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'session_id', in: 'path', required: true, schema: { type: 'string', format: 'uuid', example: EXAMPLE_UUID }, description: 'POST /transfer/initiate で取得した session_id' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/StoreKeyRequest' } } },
        },
        responses: {
          '200': { description: 'K_enc 保存成功', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string', example: 'Encrypted key stored successfully' } } }, example: { message: 'Encrypted key stored successfully' } } } },
          '400': { description: 'バリデーションエラー or セッションステータス不正', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProblemDetail' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
          '429': { $ref: '#/components/responses/TooManyRequests' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },

    '/api/v1/transfer/{session_id}/url': {
      post: {
        tags: ['送信側API'],
        summary: 'URL 確定・受信者へメール送信',
        description: [
          '**事前に Authorize に JWT を設定してください。**',
          '',
          'セッションを `ready` 状態に更新し、受信者にダウンロードリンクをメール送信する。',
          '',
          '**開発環境では:** MailHog (http://localhost:8025) でメール確認可能',
        ].join('\n'),
        operationId: 'finalizeUrl',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'session_id', in: 'path', required: true, schema: { type: 'string', format: 'uuid', example: EXAMPLE_UUID } }],
        responses: {
          '200': { description: 'URL 確定・メール送信成功', content: { 'application/json': { schema: { $ref: '#/components/schemas/FinalizeUrlResponse' } } } },
          '400': { description: 'K_enc 未保存 or セッションステータス不正', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProblemDetail' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
          '429': { $ref: '#/components/responses/TooManyRequests' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },

    // ═══ 受信側 API ══════════════════════════════════════════════════════════════

    '/api/v1/download/{url_token}': {
      get: {
        tags: ['受信側API'],
        summary: 'ダウンロード URL アクセス・セッション情報取得',
        description: [
          '認証不要。メール内の URL からアクセスする最初のエンドポイント。',
          '',
          '**確認項目:**',
          '- URL 有効期限',
          '- DL 残回数',
          '- ロック状態',
          '- 2FA 種別（totp / fido2）',
          '',
          'このレスポンスの `twofa_type` に応じて次の認証エンドポイントを選択する。',
        ].join('\n'),
        operationId: 'getDownloadInfo',
        parameters: [{ name: 'url_token', in: 'path', required: true, schema: { type: 'string', example: EXAMPLE_URL_TOKEN }, description: 'メール内リンクに含まれる 256bit Base64URL トークン' }],
        responses: {
          '200': { description: 'セッション情報取得成功', content: { 'application/json': { schema: { $ref: '#/components/schemas/DownloadInfoResponse' } } } },
          '404': { $ref: '#/components/responses/NotFound' },
          '410': { $ref: '#/components/responses/Gone' },
          '423': { $ref: '#/components/responses/Locked' },
          '429': { $ref: '#/components/responses/TooManyRequests' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },

    '/api/v1/download/{url_token}/key': {
      get: {
        tags: ['受信側API'],
        summary: 'K_enc 取得・クラウド DL URL 生成 (2FA 後)',
        description: [
          '**Authorize に auth_token を設定してください** (POST /auth/totp/verify で取得)。',
          '',
          '**サーバ処理:**',
          '1. Bearer auth_token → Redis `session:{auth_token}` で url_token 一致確認',
          '2. Redis `enc_key:{url_token}` から K_enc 取得',
          '3. DL カウントをインクリメント',
          '4. クラウドの署名付き DL URL を生成して返却',
          '',
          '**クライアント側の後続処理:**',
          '1. `encrypted_key_b64`（K_enc）を自分の Kyber-768 秘密鍵で復号 → K_AES',
          '2. `cloud_file_url` から C_file をダウンロード',
          '3. K_AES で C_file を AES-256-GCM 復号 → 平文ファイル',
          '4. SHA3-256(平文) と `file_hash_sha3` を比較して整合性確認',
          '5. POST /download/:token/complete を呼んでサーバデータを削除',
        ].join('\n'),
        operationId: 'getDownloadKey',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'url_token', in: 'path', required: true, schema: { type: 'string', example: EXAMPLE_URL_TOKEN } }],
        responses: {
          '200': { description: 'K_enc・DL URL 取得成功', content: { 'application/json': { schema: { $ref: '#/components/schemas/DownloadKeyResponse' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
          '410': { $ref: '#/components/responses/Gone' },
          '429': { $ref: '#/components/responses/TooManyRequests' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },

    '/api/v1/download/{url_token}/complete': {
      post: {
        tags: ['受信側API'],
        summary: 'DL 完了通知・K_enc 即時削除・クラウドファイル削除',
        description: [
          '**Authorize に auth_token を設定してください。**',
          '',
          '**ゼロ保持設計の最終ステップ。** DL 完了後に必ず呼び出すこと。',
          '',
          '**サーバ処理:**',
          '- Redis から `enc_key:{url_token}` を DEL',
          '- クラウドストレージから cloud_file_id のファイルを削除',
          '- `transfer_sessions.deleted_at` を UPDATE（論理削除）',
          '- `audit_logs` に deleted イベントを INSERT',
          '',
          '⚠️ この操作は**取り消し不可**。',
        ].join('\n'),
        operationId: 'completeDownload',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'url_token', in: 'path', required: true, schema: { type: 'string', example: EXAMPLE_URL_TOKEN } }],
        responses: {
          '200': { description: '削除完了', content: { 'application/json': { schema: { type: 'object', properties: { deleted: { type: 'boolean', example: true }, message: { type: 'string', example: 'File and encryption key permanently deleted' } } }, example: { deleted: true, message: 'File and encryption key permanently deleted' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },

    // ═══ 管理者 API ══════════════════════════════════════════════════════════════

    '/api/v1/admin/sessions': {
      get: {
        tags: ['管理者API'],
        summary: '転送セッション一覧取得',
        description: '**Authorize に管理者 JWT を設定してください。** フィルタ・ページネーション対応。',
        operationId: 'adminGetSessions',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'status',          in: 'query', schema: { type: 'string', enum: ['active', 'expired', 'deleted', 'all'], default: 'all' }, description: 'セッション状態フィルタ' },
          { name: 'sender_email',    in: 'query', schema: { type: 'string', example: 'yamada@company.co.jp' }, description: '送信者メール（部分一致）' },
          { name: 'recipient_email', in: 'query', schema: { type: 'string', example: 'recipient@company.co.jp' }, description: '受信者メール（部分一致）' },
          { name: 'from',            in: 'query', schema: { type: 'string', format: 'date-time', example: '2026-02-01T00:00:00Z' } },
          { name: 'to',              in: 'query', schema: { type: 'string', format: 'date-time', example: '2026-02-28T23:59:59Z' } },
          { name: 'page',            in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
          { name: 'per_page',        in: 'query', schema: { type: 'integer', default: 50, maximum: 200 } },
        ],
        responses: {
          '200': { description: 'セッション一覧', content: { 'application/json': { schema: { $ref: '#/components/schemas/SessionListResponse' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },

    '/api/v1/admin/sessions/{id}': {
      get: {
        tags: ['管理者API'],
        summary: 'セッション詳細取得',
        operationId: 'adminGetSession',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid', example: EXAMPLE_UUID } }],
        responses: {
          '200': { description: 'セッション詳細', content: { 'application/json': { schema: { $ref: '#/components/schemas/SessionListResponse/properties/data/items' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
      delete: {
        tags: ['管理者API'],
        summary: 'セッション強制削除',
        description: '**K_enc（Redis）・クラウドファイルも含めて完全削除する。取り消し不可。**',
        operationId: 'adminDeleteSession',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid', example: EXAMPLE_UUID } }],
        responses: {
          '200': { description: '削除成功', content: { 'application/json': { schema: { type: 'object', properties: { deleted: { type: 'boolean', example: true } } }, example: { deleted: true } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },

    '/api/v1/admin/sessions/{id}/unlock': {
      post: {
        tags: ['管理者API'],
        summary: 'URL ロック解除（5回 TOTP 失敗後）',
        description: 'Redis の `lock:{url_token}` カウンタをリセットする。',
        operationId: 'adminUnlockSession',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid', example: EXAMPLE_UUID } }],
        responses: {
          '200': { description: 'ロック解除成功', content: { 'application/json': { schema: { type: 'object', properties: { unlocked: { type: 'boolean', example: true } } }, example: { unlocked: true } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },

    '/api/v1/admin/logs': {
      get: {
        tags: ['管理者API'],
        summary: '監査ログ取得',
        operationId: 'adminGetLogs',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'event_type', in: 'query', schema: { type: 'string', enum: ['url_issued','access','auth_success','auth_fail','dl_success','dl_fail','deleted','admin_delete','lock','unlock'] } },
          { name: 'result',     in: 'query', schema: { type: 'string', enum: ['success', 'failure'] } },
          { name: 'from',       in: 'query', schema: { type: 'string', format: 'date-time', example: '2026-02-01T00:00:00Z' } },
          { name: 'to',        in: 'query', schema: { type: 'string', format: 'date-time', example: '2026-02-28T23:59:59Z' } },
          { name: 'page',      in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'per_page',  in: 'query', schema: { type: 'integer', default: 50, maximum: 200 } },
        ],
        responses: {
          '200': { description: '監査ログ一覧', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuditLogListResponse' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },

    '/api/v1/admin/logs/export': {
      get: {
        tags: ['管理者API'],
        summary: '監査ログ CSV エクスポート（コンプライアンス対応）',
        operationId: 'adminExportLogs',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'CSV ダウンロード', content: { 'text/csv': { schema: { type: 'string', example: 'id,session_id,event_type,result,ip_address,created_at\n...' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },

    '/api/v1/admin/users': {
      get: {
        tags: ['管理者API'],
        summary: 'ユーザー一覧取得',
        operationId: 'adminGetUsers',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page',     in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'per_page', in: 'query', schema: { type: 'integer', default: 50 } },
          { name: 'search',   in: 'query', schema: { type: 'string', example: '山田' }, description: '名前の部分一致検索' },
        ],
        responses: {
          '200': { description: 'ユーザー一覧', content: { 'application/json': { schema: { $ref: '#/components/schemas/UserListResponse' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },

    '/api/v1/admin/users/{id}': {
      delete: {
        tags: ['管理者API'],
        summary: 'ユーザー削除（関連データ含む CASCADE 削除）',
        operationId: 'adminDeleteUser',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid', example: EXAMPLE_UUID } }],
        responses: {
          '200': { description: '削除成功', content: { 'application/json': { schema: { type: 'object', properties: { deleted: { type: 'boolean', example: true } } }, example: { deleted: true } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },

    // ═══ システム ════════════════════════════════════════════════════════════════

    '/health': {
      get: {
        tags: ['システム'],
        summary: 'ヘルスチェック',
        description: '認証不要。Docker ヘルスチェックやモニタリングから使用する。',
        operationId: 'health',
        responses: {
          '200': {
            description: 'サーバ稼働中',
            content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'ok' }, service: { type: 'string', example: 'ZeroSend API' }, version: { type: 'string', example: '0.1.0' }, time: { type: 'string', format: 'date-time' } } }, example: { status: 'ok', service: 'ZeroSend API', version: '0.1.0', time: '2026-02-21T10:00:00.000Z' } } },
          },
        },
      },
    },
  },
} as const