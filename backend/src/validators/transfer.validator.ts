// =====================================
// ファイルパス  : zerosend/src/validators/transfer.validator.ts
//
// 説明・目的・機能概要:
//   ファイル転送エンドポイント用 Zod バリデーションスキーマ。
//   initiateTransferSchema : POST /transfer/initiate のリクエストボディ検証
//   storeKeySchema         : POST /transfer/:id/key のリクエストボディ検証
//   finalizeUrlSchema      : POST /transfer/:id/url のリクエストボディ検証（将来拡張用）
//
// 作成日時 : 2026-02-21
// 更新日時 : 2026-02-21
//
// 依存関係:
//   zod
// =====================================

import { z } from 'zod'

// POST /api/v1/transfer/initiate
export const initiateTransferSchema = z.object({
  recipient_email:    z.string().email('Invalid recipient email'),
  file_hash_sha3:     z.string().length(64, 'file_hash_sha3 must be 64-char hex (SHA3-256)')
                        .regex(/^[0-9a-f]{64}$/, 'file_hash_sha3 must be lowercase hex'),
  encrypted_filename: z.string().optional(),
  file_size_bytes:    z.number().int().positive('file_size_bytes must be a positive integer'),
  cloud_type:         z.enum(['box', 'gdrive', 'onedrive', 'dropbox', 'server'])
                        .default('server'),
  max_downloads:      z.number().int().min(1).max(5).default(1),
  expires_in_hours:   z.number().int().min(1).max(168).default(72), // 最大7日
})

export type InitiateTransferBody = z.infer<typeof initiateTransferSchema>

// POST /api/v1/transfer/:id/key
export const storeKeySchema = z.object({
  enc_key_b64:   z.string().min(1, 'enc_key_b64 is required'),
  cloud_file_id: z.string().min(1, 'cloud_file_id is required'),
})

export type StoreKeyBody = z.infer<typeof storeKeySchema>

// POST /api/v1/transfer/:id/url  (body なし or 将来拡張用)
export const finalizeUrlSchema = z.object({}).passthrough()