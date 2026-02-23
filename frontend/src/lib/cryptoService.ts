// =============================================================
// ZeroSend — lib/cryptoService.ts
//
// パス        : frontend/src/lib/cryptoService.ts
// 作成日      : 2026-02-23
// 更新日      : 2026-02-23
//
// 概要        : F-22 クライアント側 AES-256-GCM 暗号化
//               F-23 ML-KEM-768 (Kyber768) AES鍵カプセル化（送信側）
//
// セキュリティ設計:
//   - 全処理はブラウザ内のみで完結（サーバに平文鍵・平文ファイルは絶対に送らない）
//   - AES鍵はサーバに送らず、ML-KEM-768でカプセル化した K_enc のみサーバへ
//   - IV (初期化ベクトル) は毎回ランダム生成 (12 bytes / 96bit)
//   - K_enc フォーマット: Base64(kyberCipherText[1088bytes] || XOR(aesKey,sharedSecret)[32bytes])
//
// 依存関係:
//   @noble/post-quantum    ^0.5.4   ml_kem768.encapsulate
//   @noble/hashes          (transitive dep) sha3_256
// =============================================================

import { ml_kem768 } from '@noble/post-quantum/ml-kem.js'
import { sha3_256 } from '@noble/hashes/sha3.js'

// ─── 定数 ────────────────────────────────────────────────────────────────────

const AES_KEY_LENGTH  = 256   // bits
const IV_LENGTH       = 12    // bytes (96bit GCM推奨)
const KYBER_CT_LENGTH = 1088  // ML-KEM-768 cipherText固定長

// ─── 型定義 ──────────────────────────────────────────────────────────────────

export interface EncryptedFile {
  encryptedData: Uint8Array   // IV(12B) + CipherText
  aesKeyRaw: Uint8Array       // 生AES鍵 (32B) — K_encカプセル化後は安全に破棄すること
  iv: Uint8Array              // GCM IV (12B)
  originalSize: number        // 元ファイルサイズ (bytes)
}

export interface EncapsulatedKey {
  encKeyB64: string           // Base64(kyberCT[1088B] + wrappedAesKey[32B]) → サーバへ送る
}

// ─── SHA3-256 ファイルハッシュ ────────────────────────────────────────────────

/**
 * ファイルの SHA3-256 ハッシュを計算する (hex string)
 * 整合性検証用: POST /transfer/initiate の file_hash_sha3 フィールドに使用
 */
export async function computeFileSha3(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBytes: Uint8Array = sha3_256(new Uint8Array(buffer))
  return Array.from(hashBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ─── AES-256-GCM ファイル暗号化 ──────────────────────────────────────────────

/**
 * F-22: ファイルを AES-256-GCM でブラウザ内暗号化する
 *
 * @param file 暗号化対象ファイル
 * @param onProgress 暗号化進捗コールバック (0〜100)
 * @returns EncryptedFile { encryptedData(IV+CT), aesKeyRaw, iv, originalSize }
 *
 * 暗号化フォーマット:
 *   [ IV (12 bytes) | Ciphertext (file.size + 16 bytes GCM tag) ]
 */
export async function encryptFile(
  file: File,
  onProgress?: (percent: number) => void
): Promise<EncryptedFile> {
  // 1. AES-256-GCM 鍵生成
  onProgress?.(5)
  const aesKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    true,    // exportable (ML-KEM-768でラップ後に破棄)
    ['encrypt', 'decrypt']
  )

  // 2. IV 生成 (96bit ランダム)
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  onProgress?.(10)

  // 3. ファイル読み込み (ArrayBuffer)
  const fileBuffer = await file.arrayBuffer()
  onProgress?.(40)

  // 4. AES-256-GCM 暗号化
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    fileBuffer
  )
  onProgress?.(80)

  // 5. AES鍵を生バイトとしてエクスポート
  const aesKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', aesKey)
  )

  // 6. 出力: IV(12B) + CipherText を結合
  const encryptedData = new Uint8Array(IV_LENGTH + cipherBuffer.byteLength)
  encryptedData.set(iv, 0)
  encryptedData.set(new Uint8Array(cipherBuffer), IV_LENGTH)

  onProgress?.(100)

  return {
    encryptedData,
    aesKeyRaw,
    iv,
    originalSize: file.size,
  }
}

// ─── ML-KEM-768 AES鍵カプセル化 ──────────────────────────────────────────────

/**
 * F-23: 受信者の ML-KEM-768 公開鍵で AES鍵をカプセル化する（送信側 KEM）
 *
 * KEM フロー:
 *   1. ml_kem768.encapsulate(recipientPublicKey) → { cipherText[1088B], sharedSecret[32B] }
 *   2. XOR(aesKeyRaw[32B], sharedSecret[32B]) → wrappedAesKey[32B]
 *   3. K_enc = Base64(cipherText[1088B] || wrappedAesKey[32B])
 *
 * 受信側復号:
 *   1. ml_kem768.decapsulate(secretKey, cipherText) → sharedSecret[32B]
 *   2. XOR(wrappedAesKey[32B], sharedSecret[32B]) → aesKeyRaw[32B]
 *   3. AES-GCM decrypt C_file → 平文
 *
 * @param recipientPublicKeyB64 受信者 ML-KEM-768 公開鍵 (Base64)
 * @param aesKeyRaw 暗号化に使用した AES鍵生バイト (32B)
 * @returns EncapsulatedKey { encKeyB64 }
 */
export async function encapsulateAesKey(
  recipientPublicKeyB64: string,
  aesKeyRaw: Uint8Array
): Promise<EncapsulatedKey> {
  // 1. Base64 → Uint8Array
  const publicKeyBytes = base64ToUint8Array(recipientPublicKeyB64)

  // 2. ML-KEM-768 カプセル化
  const { cipherText, sharedSecret } = ml_kem768.encapsulate(publicKeyBytes)

  // 3. XOR(aesKeyRaw, sharedSecret) でラッピング
  //    sharedSecretは32B固定, aesKeyRawも32B → 完全にXOR可能
  const wrappedAesKey = new Uint8Array(32)
  for (let i = 0; i < 32; i++) {
    wrappedAesKey[i] = (aesKeyRaw[i] ?? 0) ^ (sharedSecret[i] ?? 0)
  }

  // 4. K_enc = cipherText(1088B) || wrappedAesKey(32B)
  const kEnc = new Uint8Array(KYBER_CT_LENGTH + 32)
  kEnc.set(cipherText, 0)
  kEnc.set(wrappedAesKey, KYBER_CT_LENGTH)

  return {
    encKeyB64: uint8ArrayToBase64(kEnc),
  }
}

// ─── ユーティリティ ───────────────────────────────────────────────────────────

/** Uint8Array → Base64 文字列 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 8192
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

/** Base64 文字列 → Uint8Array */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/** ファイルサイズの人間可読表示 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024)       return `${bytes} B`
  if (bytes < 1024 ** 2)  return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3)  return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}