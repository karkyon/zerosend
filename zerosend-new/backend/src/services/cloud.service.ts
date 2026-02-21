// =====================================
// ファイルパス  : zerosend/src/services/cloud.service.ts
//
// 説明・目的・機能概要:
//   クラウドストレージサービス。署名付きアップロード / ダウンロード URL 生成・ファイル削除を担当。
//   Phase 1 では cloud_type='server'（ローカルスタブ）を実装。
//   Box / GDrive / OneDrive / Dropbox は Phase 2 で追加予定。
//
// 作成日時 : 2026-02-21
// 更新日時 : 2026-02-21
//
// 依存関係:
//   node:crypto, ../types/errors, ../utils/logger
// =====================================

import { randomBytes } from 'node:crypto'
import { CloudStorageError } from '../types/errors.js'
import { logger } from '../utils/logger.js'

// クラウドストレージサービス
// Phase 1 では CloudType='server' (ローカル署名付き URL スタブ) を実装
// Box / GDrive / OneDrive / Dropbox は Phase 2 で追加

export type CloudType = 'box' | 'gdrive' | 'onedrive' | 'dropbox' | 'server'

export type SignedUploadUrlResult = {
  uploadUrl: string     // ブラウザが直接 PUT するクラウド署名付き URL
  cloudFileId: string   // クラウド側のファイル識別子 (後で download URL 生成に使用)
}

export type SignedDownloadUrlResult = {
  downloadUrl: string   // 一時的なダウンロード URL
  expiresAt: Date
}

// ─── 署名付きアップロード URL 生成 ──────────────────────────────────────────

export async function createSignedUploadUrl(
  cloudType: CloudType,
  sessionId: string,
  fileSizeBytes: bigint,
): Promise<SignedUploadUrlResult> {
  switch (cloudType) {
    case 'server':
      return createServerUploadUrl(sessionId, fileSizeBytes)
    case 'box':
      return createBoxUploadUrl(sessionId, fileSizeBytes)
    default:
      throw new CloudStorageError(`Unsupported cloud type: ${cloudType}`)
  }
}

// ─── 署名付きダウンロード URL 生成 ──────────────────────────────────────────

export async function createSignedDownloadUrl(
  cloudType: CloudType,
  cloudFileId: string,
): Promise<SignedDownloadUrlResult> {
  switch (cloudType) {
    case 'server':
      return createServerDownloadUrl(cloudFileId)
    case 'box':
      return createBoxDownloadUrl(cloudFileId)
    default:
      throw new CloudStorageError(`Unsupported cloud type: ${cloudType}`)
  }
}

// ─── ファイル削除 ─────────────────────────────────────────────────────────────

export async function deleteCloudFile(
  cloudType: CloudType,
  cloudFileId: string,
): Promise<void> {
  switch (cloudType) {
    case 'server':
      await deleteServerFile(cloudFileId)
      break
    case 'box':
      await deleteBoxFile(cloudFileId)
      break
    default:
      throw new CloudStorageError(`Unsupported cloud type: ${cloudType}`)
  }
}

// ─── server (ローカル開発用スタブ) ──────────────────────────────────────────

const UPLOAD_SIGN_TTL_SEC = 3600  // 1時間
const BASE_URL = process.env.APP_BASE_URL ?? 'http://localhost:8000'

async function createServerUploadUrl(
  sessionId: string,
  _fileSizeBytes: bigint,
): Promise<SignedUploadUrlResult> {
  // ランダムなファイル ID を生成
  const cloudFileId = `server_${sessionId}_${randomBytes(8).toString('hex')}`
  // 署名付き URL (開発環境では API サーバ自身のエンドポイント)
  const token = randomBytes(24).toString('base64url')
  const uploadUrl = `${BASE_URL}/internal/upload/${cloudFileId}?token=${token}&expires=${Date.now() + UPLOAD_SIGN_TTL_SEC * 1000}`

  logger.info('[CloudService] server upload URL generated', { sessionId, cloudFileId })
  return { uploadUrl, cloudFileId }
}

async function createServerDownloadUrl(cloudFileId: string): Promise<SignedDownloadUrlResult> {
  const token = randomBytes(24).toString('base64url')
  const expiresAt = new Date(Date.now() + 600_000) // 10分
  const downloadUrl = `${BASE_URL}/internal/download/${cloudFileId}?token=${token}`
  return { downloadUrl, expiresAt }
}

async function deleteServerFile(cloudFileId: string): Promise<void> {
  // Phase 1: ローカルファイルシステムの削除は /internal エンドポイントが担当
  logger.info('[CloudService] server file deletion requested', { cloudFileId })
}

// ─── Box (Phase 2 実装予定) ──────────────────────────────────────────────────

async function createBoxUploadUrl(
  sessionId: string,
  _fileSizeBytes: bigint,
): Promise<SignedUploadUrlResult> {
  // TODO: Box Platform API — Upload Session 作成
  // POST https://upload.box.com/api/2.0/files/upload_sessions
  throw new CloudStorageError('Box cloud storage not yet implemented')
}

async function createBoxDownloadUrl(_cloudFileId: string): Promise<SignedDownloadUrlResult> {
  // TODO: Box Platform API — 一時 URL 生成
  throw new CloudStorageError('Box cloud storage not yet implemented')
}

async function deleteBoxFile(_cloudFileId: string): Promise<void> {
  // TODO: Box Platform API — DELETE /files/{file_id}
  throw new CloudStorageError('Box cloud storage not yet implemented')
}