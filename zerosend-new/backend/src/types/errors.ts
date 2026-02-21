// =====================================
// ファイルパス  : zerosend/src/types/errors.ts
//
// 説明・目的・機能概要:
//   ドメイン例外クラス定義。
//   Service 層がビジネスルール違反を throw し、Controller 層（error.middleware）が
//   RFC 7807 形式の HTTP レスポンスに変換する際に使用する。
//
// 作成日時 : 2026-02-21
// 更新日時 : 2026-02-21
//
// 依存関係:
//   (node built-in のみ)
// =====================================

// ドメイン例外クラス — Service層がthrow、Controller層がcatchしてHTTPレスポンスに変換

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly detail?: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

// 認証エラー
export class UnauthorizedError extends AppError {
  constructor(d?: string) { super('unauthorized', 'Unauthorized', d) }
}
export class AuthLockedError extends AppError {
  constructor(d?: string) { super('auth-locked', 'URL is locked', d) }
}
export class AuthFailedError extends AppError {
  constructor(public readonly remaining: number) { super('auth-failed', 'OTP mismatch') }
}

// リソースエラー
export class NotFoundError extends AppError {
  constructor(d?: string) { super('not-found', 'Resource not found', d) }
}
export class GoneError extends AppError {
  constructor(d?: string) { super('gone', 'Resource is no longer available', d) }
}
export class ConflictError extends AppError {
  constructor(d?: string) { super('conflict', 'Conflict', d) }
}

// 入力エラー
export class BadRequestError extends AppError {
  constructor(d?: string) { super('bad-request', 'Bad Request', d) }
}
export class UnprocessableError extends AppError {
  constructor(d?: string) { super('unprocessable', 'Unprocessable Entity', d) }
}

// 外部サービスエラー
export class EmailFailedError extends AppError {
  constructor(d?: string) { super('email-failed', 'Email delivery failed', d) }
}
export class CloudStorageError extends AppError {
  constructor(d?: string) { super('cloud-storage-error', 'Cloud storage error', d) }
}

// 権限エラー
export class ForbiddenError extends AppError {
  constructor(d?: string) { super('forbidden', 'Forbidden', d) }
}