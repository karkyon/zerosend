// =============================================================
// ZeroSend — lib/keyStorage.ts
//
// パス        : frontend/src/lib/keyStorage.ts
// 作成日      : 2026-02-23
// 更新日      : 2026-02-23
//
// 概要        : IndexedDB Kyber-768 秘密鍵永続化ユーティリティ
//               idb-keyval ラッパー。userId をキーに保存/取得/削除。
//               秘密鍵はサーバに一切送信しない（ブラウザ内専用）。
//
// 依存関係    :
//   idb-keyval             ^6     IndexedDB get / set / del / clear
//
// セキュリティ注意事項:
//   - secretKey (Uint8Array) は絶対にサーバに送信しない
//   - ログアウト時は deleteKyberSecretKey() を必ず呼ぶこと
//   - キープレフィックス: "zerosend:kyber_sk:{userId}"
//
// 使用箇所    :
//   @/pages/LoginPage      ログイン後に秘密鍵をロード
//   @/pages/RegisterPage   鍵ペア生成後に秘密鍵を保存
//   @/components/layout/Navbar  ログアウト時に秘密鍵を削除
//   @/pages/DownloadPage   受信者復号時に秘密鍵をロード
// =============================================================

import { get, set, del, clear } from 'idb-keyval'

const KEY_PREFIX = 'zerosend:kyber_sk:'

/**
 * Kyber-768 秘密鍵を IndexedDB に保存する
 * @param userId - ユーザーID（JWT の sub）
 * @param secretKey - @noble/post-quantum で生成した秘密鍵 (Uint8Array)
 */
export async function storeKyberSecretKey(
  userId: string,
  secretKey: Uint8Array,
): Promise<void> {
  const key = `${KEY_PREFIX}${userId}`
  await set(key, secretKey)
}

/**
 * Kyber-768 秘密鍵を IndexedDB から取得する
 * @param userId - ユーザーID
 * @returns 秘密鍵 (Uint8Array) または null（未保存の場合）
 */
export async function loadKyberSecretKey(
  userId: string,
): Promise<Uint8Array | null> {
  const key = `${KEY_PREFIX}${userId}`
  const stored = await get<Uint8Array>(key)
  return stored ?? null
}

/**
 * Kyber-768 秘密鍵を IndexedDB から削除する
 * ログアウト時・鍵更新時に呼ぶこと
 * @param userId - ユーザーID
 */
export async function deleteKyberSecretKey(userId: string): Promise<void> {
  const key = `${KEY_PREFIX}${userId}`
  await del(key)
}

/**
 * ZeroSend の全 Kyber 秘密鍵を削除する（デバッグ・リセット用）
 */
export async function clearAllKyberKeys(): Promise<void> {
  await clear()
}

/**
 * 秘密鍵が保存されているか確認する
 * @param userId - ユーザーID
 */
export async function hasKyberSecretKey(userId: string): Promise<boolean> {
  const key = await loadKyberSecretKey(userId)
  return key !== null
}