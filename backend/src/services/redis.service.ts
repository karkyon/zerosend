// =====================================
// ファイルパス  : zerosend/src/services/redis.service.ts
//
// 説明・目的・機能概要:
//   Redis CRUD ラッパー・TTL 管理サービス。
//   アーキテクチャ設計書 Section 6 に定義された全 Redis キー
//   （enc_key / session / rate / lock / challenge）の操作を集約する。
//
// 作成日時 : 2026-02-21
// 更新日時 : 2026-02-21
//
// 依存関係:
//   ../lib/redis, ../utils/logger
// =====================================

import { redis } from '../lib/redis.js'
import { logger } from '../utils/logger.js'

// Redis キー定義 — アーキテクチャ設計書 Section 6 準拠
// enc_key:{url_token}    TTL: 3600s  — 暗号化 AES 鍵
// session:{auth_token}   TTL:  600s  — 2FA 後認証セッション
// rate:{ip}              TTL:   60s  — レートリミットカウンタ
// lock:{url_token}       TTL: 86400s — TOTP 失敗ロックカウンタ
// challenge:{url_token}  TTL:  120s  — FIDO2 チャレンジ

export const RedisKeys = {
  encKey:    (urlToken: string) => `enc_key:${urlToken}`,
  session:   (authToken: string) => `session:${authToken}`,
  rate:      (ip: string) => `rate:${ip}`,
  lock:      (urlToken: string) => `lock:${urlToken}`,
  challenge: (urlToken: string) => `challenge:${urlToken}`,
} as const

// ─── 汎用 SET / GET / DEL ────────────────────────────────────────────────────

export async function redisSet(key: string, value: string, ttlSec: number): Promise<void> {
  await redis.set(key, value, 'EX', ttlSec)
  logger.debug('[Redis] SET', { key, ttlSec })
}

export async function redisGet(key: string): Promise<string | null> {
  const val = await redis.get(key)
  logger.debug('[Redis] GET', { key, found: val !== null })
  return val
}

export async function redisDel(key: string): Promise<void> {
  await redis.del(key)
  logger.debug('[Redis] DEL', { key })
}

// ─── enc_key:{url_token} — 暗号化 AES 鍵 ───────────────────────────────────

const ENC_KEY_TTL = 3600  // 1時間

export async function setEncKey(urlToken: string, encKeyB64: string): Promise<void> {
  await redisSet(RedisKeys.encKey(urlToken), encKeyB64, ENC_KEY_TTL)
}

export async function getEncKey(urlToken: string): Promise<string | null> {
  return redisGet(RedisKeys.encKey(urlToken))
}

export async function delEncKey(urlToken: string): Promise<void> {
  return redisDel(RedisKeys.encKey(urlToken))
}

// ─── session:{auth_token} — 2FA 後認証セッション ────────────────────────────

const AUTH_SESSION_TTL = 600  // 10分

export type AuthSessionValue = {
  userId: string
  urlToken: string
}

export async function setAuthSession(authToken: string, value: AuthSessionValue): Promise<void> {
  await redisSet(RedisKeys.session(authToken), JSON.stringify(value), AUTH_SESSION_TTL)
}

export async function getAuthSession(authToken: string): Promise<AuthSessionValue | null> {
  const raw = await redisGet(RedisKeys.session(authToken))
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthSessionValue
  } catch {
    logger.warn('[Redis] Failed to parse auth session', { authToken })
    return null
  }
}

// ─── lock:{url_token} — TOTP 失敗ロックカウンタ ────────────────────────────

const LOCK_TTL   = 86400  // 24時間
const LOCK_LIMIT = Number(process.env.TOTP_LOCK_THRESHOLD ?? 5)

/**
 * 失敗回数をインクリメントし、現在のカウントを返す
 */
export async function incrementLock(urlToken: string): Promise<number> {
  const key   = RedisKeys.lock(urlToken)
  const count = await redis.incr(key)
  // 初回インクリメント時のみ TTL を設定
  if (count === 1) {
    await redis.expire(key, LOCK_TTL)
  }
  return count
}

/**
 * 現在のロックカウントを取得
 */
export async function getLockCount(urlToken: string): Promise<number> {
  const val = await redis.get(RedisKeys.lock(urlToken))
  return val ? parseInt(val, 10) : 0
}

/**
 * ロックがかかっているか確認 (count >= LOCK_LIMIT)
 */
export async function isLocked(urlToken: string): Promise<boolean> {
  const count = await getLockCount(urlToken)
  return count >= LOCK_LIMIT
}

/**
 * ロックカウンタを削除（管理者によるアンロック用）
 */
export async function delLock(urlToken: string): Promise<void> {
  return redisDel(RedisKeys.lock(urlToken))
}

export { LOCK_LIMIT }

// ─── challenge:{url_token} — FIDO2 チャレンジ ───────────────────────────────

const CHALLENGE_TTL = 120  // 2分

export async function setChallenge(urlToken: string, challenge: string): Promise<void> {
  await redisSet(RedisKeys.challenge(urlToken), challenge, CHALLENGE_TTL)
}

export async function getAndDelChallenge(urlToken: string): Promise<string | null> {
  const key = RedisKeys.challenge(urlToken)
  const val = await redis.getdel(key)
  return val
}