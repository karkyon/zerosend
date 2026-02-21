// =====================================
// ファイルパス  : zerosend/src/utils/crypto.ts
//
// 説明・目的・機能概要:
//   AES-256-GCM 暗号化・復号ユーティリティ。
//   TOTP シークレット等、サーバサイドで保護が必要なデータの暗号化に使用する。
//   暗号鍵は環境変数 TOTP_ENCRYPTION_KEY（256bit hex）から取得する。
//
// 作成日時 : 2026-02-21
// 更新日時 : 2026-02-21
//
// 依存関係:
//   node:crypto
// =====================================

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

// TOTP シークレット等サーバサイド保護データに使用する AES-256-GCM
// 暗号化キーは環境変数 TOTP_ENCRYPTION_KEY (hex 64chars = 256bit) から取得

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES   = 12  // GCM 推奨 96bit
const TAG_BYTES  = 16  // GCM 認証タグ 128bit

function getEncKey(): Buffer {
  const hex = process.env.TOTP_ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error('TOTP_ENCRYPTION_KEY must be a 64-char hex string (256bit)')
  }
  return Buffer.from(hex, 'hex')
}

/**
 * AES-256-GCM 暗号化
 * @returns "iv_hex:tag_hex:ciphertext_hex" の形式
 */
export function aesEncrypt(plaintext: string): string {
  const key = getEncKey()
  const iv  = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  return [
    iv.toString('hex'),
    tag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':')
}

/**
 * AES-256-GCM 復号
 * @param encryptedStr "iv_hex:tag_hex:ciphertext_hex" の形式
 */
export function aesDecrypt(encryptedStr: string): string {
  const key = getEncKey()
  const parts = encryptedStr.split(':')

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format: expected iv:tag:ciphertext')
  }

  const [ivHex, tagHex, ctHex] = parts
  const iv         = Buffer.from(ivHex,  'hex')
  const tag        = Buffer.from(tagHex, 'hex')
  const ciphertext = Buffer.from(ctHex,  'hex')

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}