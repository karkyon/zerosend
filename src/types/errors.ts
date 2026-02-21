// ドメイン例外クラス
// Service 層が throw → error.middleware.ts が catch して HTTP レスポンスに変換

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

// ─── 認証系 ─────────────────────────────────────────────────────
export class UnauthorizedError extends AppError {
  constructor(d?: string) { super('unauthorized', 'Unauthorized', d) }
}

export class AuthLockedError extends AppError {
  constructor(d?: string) { super('auth-locked', 'URL is locked due to too many failures', d) }
}

export class AuthFailedError extends AppError {
  constructor(public readonly remaining: number) {
    super('auth-failed', 'OTP mismatch')
  }
}

// ─── リソース系 ──────────────────────────────────────────────────
export class NotFoundError extends AppError {
  constructor(d?: string) { super('not-found', 'Resource not found', d) }
}

export class GoneError extends AppError {
  constructor(d?: string) { super('gone', 'Resource is no longer available', d) }
}

export class ConflictError extends AppError {
  constructor(d?: string) { super('conflict', 'Conflict', d) }
}

// ─── 入力系 ─────────────────────────────────────────────────────
export class BadRequestError extends AppError {
  constructor(d?: string) { super('bad-request', 'Bad Request', d) }
}

// ─── 権限系 ─────────────────────────────────────────────────────
export class ForbiddenError extends AppError {
  constructor(d?: string) { super('forbidden', 'Forbidden', d) }
}

// ─── 外部サービス系 ─────────────────────────────────────────────
export class EmailFailedError extends AppError {
  constructor(d?: string) { super('email-failed', 'Email delivery failed', d) }
}

export class CloudStorageError extends AppError {
  constructor(d?: string) { super('cloud-storage-error', 'Cloud storage error', d) }
}
