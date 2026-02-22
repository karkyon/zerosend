// =====================================
// ファイルパス  : zerosend/src/utils/hash.ts
//
// 説明・目的・機能概要:
//   ハッシュ・パスワードユーティリティ。
//   SHA-256（email_hash）・SHA3-256（公開鍵フィンガープリント / ファイルハッシュ）・
//   bcrypt によるパスワードハッシュ化・検証・ランダムトークン生成を提供する。
//
// 作成日時 : 2026-02-21
// 更新日時 : 2026-02-21
//
// 依存関係:
//   node:crypto, bcryptjs
// =====================================

import { createHash, randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'

// ─── SHA-256 ─────────────────────────────────────────────────────────────────

/**
 * SHA-256( lower(email) ) → hex 64chars
 * users.email_hash / transfer_sessions.recipient_email_hash に使用
 */
export function hashEmail(email: string): string {
  return createHash('sha256')
    .update(email.toLowerCase().trim())
    .digest('hex')
}

/**
 * SHA-256( string ) → hex 64chars  (汎用)
 */
export function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

/**
 * SHA-256( Buffer ) → hex 64chars  (汎用)
 */
export function sha256HexBuf(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex')
}

// ─── SHA3-256 ────────────────────────────────────────────────────────────────

/**
 * SHA3-256( Buffer ) → hex 64chars
 * user_public_keys.fingerprint / transfer_sessions.file_hash_sha3 に使用
 */
export function sha3_256Hex(buf: Buffer): string {
  return createHash('sha3-256').update(buf).digest('hex')
}

/**
 * SHA3-256( Base64文字列 ) → hex 64chars
 * 公開鍵のフィンガープリント計算用
 */
export function publicKeyFingerprint(publicKeyB64: string): string {
  const buf = Buffer.from(publicKeyB64, 'base64')
  return sha3_256Hex(buf)
}

// ─── bcrypt ──────────────────────────────────────────────────────────────────

const BCRYPT_COST = 12

/**
 * パスワードを bcrypt $2b$ でハッシュ化
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST)
}

/**
 * bcrypt 検証
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

// ─── Random token ────────────────────────────────────────────────────────────

/**
 * 指定バイト数のランダムトークンを Base64URL 形式で生成
 * デフォルト 32bytes = 256bit エントロピー
 */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes)
    .toString('base64url')
    .replace(/[^A-Za-z0-9_-]/g, '')
    .slice(0, bytes * 4 / 3 + 1) // Base64URLは約4/3倍
}

/**
 * UUID v4 風のランダム ID (デバッグ用途)
 */
export function generateId(): string {
  return randomBytes(16).toString('hex')
}