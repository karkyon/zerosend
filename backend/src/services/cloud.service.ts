// =====================================
// ファイルパス  : zerosend/src/services/cloud.service.ts
//
// 説明・目的・機能概要:
//   クラウドストレージサービス。署名付きアップロード / ダウンロード URL 生成・ファイル削除を担当。
//
//   【実装状況】
//   - server   : ✅ 実装済み（ローカルスタブ。開発・テスト用）
//   - box      : 🚧 Phase 3 実装予定（Box OAuth + Upload Session API）
//   - gdrive   : 🚧 Phase 3 実装予定（Google Drive API v3）
//   - onedrive : 🚧 Phase 3 実装予定（Microsoft Graph API）
//   - dropbox  : 🚧 Phase 3 実装予定（Dropbox API v2）
//
//   【Phase 3 までの開発方針】
//   NODE_ENV=development の場合、全クラウドタイプをサーバーストレージにフォールバックする。
//   本番環境（NODE_ENV=production）で未実装クラウドを指定すると CloudStorageError になる。
//
//   【本番クラウド連携の設計概要（Phase 3）】
//   受信者が ZeroSend に OAuth 連携済みであることが前提。
//   user_cloud_tokens テーブルにアクセストークンを保存し、
//   署名付き URL 生成時に受信者のトークンを使ってクラウド API を呼び出す。
//
// 作成日時 : 2026-02-21
// 更新日時 : 2026-02-24
//
// 依存関係:
//   node:crypto, ../types/errors, ../utils/logger
// =====================================

import { randomBytes } from 'node:crypto'
import { CloudStorageError } from '../types/errors.js'
import { logger } from '../utils/logger.js'

export type CloudType = 'box' | 'gdrive' | 'onedrive' | 'dropbox' | 'server'

export type SignedUploadUrlResult = {
  uploadUrl:   string   // ブラウザが直接 PUT するクラウド署名付き URL
  cloudFileId: string   // クラウド側のファイル識別子 (後で download URL 生成に使用)
}

export type SignedDownloadUrlResult = {
  downloadUrl: string
  expiresAt:   Date
}

// 開発環境フォールバックフラグ
const IS_DEV = process.env.NODE_ENV !== 'production'

// ─── 署名付きアップロード URL 生成 ──────────────────────────────────────────

export async function createSignedUploadUrl(
  cloudType:     CloudType,
  sessionId:     string,
  fileSizeBytes: bigint,
): Promise<SignedUploadUrlResult> {
  switch (cloudType) {
    case 'server':
      return createServerUploadUrl(sessionId, fileSizeBytes)

    case 'gdrive':
    case 'box':
    case 'onedrive':
    case 'dropbox':
      if (IS_DEV) {
        // 開発環境: 全クラウドタイプをサーバーストレージにフォールバック
        logger.warn(`[CloudService] ${cloudType} not implemented. Falling back to server storage (dev mode).`, { sessionId })
        return createServerUploadUrl(sessionId, fileSizeBytes)
      }
      throw new CloudStorageError(`Cloud type '${cloudType}' is not yet implemented. Phase 3 planned.`)

    default:
      throw new CloudStorageError(`Unknown cloud type: ${cloudType}`)
  }
}

// ─── 署名付きダウンロード URL 生成 ──────────────────────────────────────────

export async function createSignedDownloadUrl(
  cloudType:   CloudType,
  cloudFileId: string,
): Promise<SignedDownloadUrlResult> {
  switch (cloudType) {
    case 'server':
      return createServerDownloadUrl(cloudFileId)

    case 'gdrive':
    case 'box':
    case 'onedrive':
    case 'dropbox':
      if (IS_DEV) {
        logger.warn(`[CloudService] ${cloudType} not implemented. Falling back to server storage (dev mode).`, { cloudFileId })
        return createServerDownloadUrl(cloudFileId)
      }
      throw new CloudStorageError(`Cloud type '${cloudType}' is not yet implemented. Phase 3 planned.`)

    default:
      throw new CloudStorageError(`Unknown cloud type: ${cloudType}`)
  }
}

// ─── ファイル削除 ─────────────────────────────────────────────────────────────

export async function deleteCloudFile(
  cloudType:   CloudType,
  cloudFileId: string,
): Promise<void> {
  switch (cloudType) {
    case 'server':
      await deleteServerFile(cloudFileId)
      break

    case 'gdrive':
    case 'box':
    case 'onedrive':
    case 'dropbox':
      if (IS_DEV) {
        logger.warn(`[CloudService] ${cloudType} delete not implemented. Skipping (dev mode).`, { cloudFileId })
        return
      }
      throw new CloudStorageError(`Cloud type '${cloudType}' is not yet implemented. Phase 3 planned.`)

    default:
      throw new CloudStorageError(`Unknown cloud type: ${cloudType}`)
  }
}

// ─── server (ローカル開発用スタブ) ──────────────────────────────────────────

const UPLOAD_SIGN_TTL_SEC = 3600
const BASE_URL = process.env.APP_BASE_URL ?? 'http://localhost:8000'

async function createServerUploadUrl(
  sessionId:     string,
  _fileSizeBytes: bigint,
): Promise<SignedUploadUrlResult> {
  const cloudFileId = `server_${sessionId}_${randomBytes(8).toString('hex')}`
  const token       = randomBytes(24).toString('base64url')
  const uploadUrl   = `${BASE_URL}/internal/upload/${cloudFileId}?token=${token}&expires=${Date.now() + UPLOAD_SIGN_TTL_SEC * 1000}`

  logger.info('[CloudService] server upload URL generated', { sessionId, cloudFileId })
  return { uploadUrl, cloudFileId }
}

async function createServerDownloadUrl(cloudFileId: string): Promise<SignedDownloadUrlResult> {
  const token    = randomBytes(24).toString('base64url')
  const expiresAt = new Date(Date.now() + 600_000)
  const downloadUrl = `${BASE_URL}/internal/download/${cloudFileId}?token=${token}`
  return { downloadUrl, expiresAt }
}

async function deleteServerFile(cloudFileId: string): Promise<void> {
  logger.info('[CloudService] server file deletion requested', { cloudFileId })
}

// ─── Phase 3: 外部クラウド実装予定 ──────────────────────────────────────────
//
// 【Box 実装計画】
//   POST https://upload.box.com/api/2.0/files/upload_sessions
//   受信者の Box OAuth トークン（user_cloud_tokens テーブルから取得）で認証
//   コミット後の file.id を cloudFileId として保存
//
// 【Google Drive 実装計画】
//   POST https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable
//   受信者の Google OAuth2 トークンで認証
//   resumable upload session URL を uploadUrl として返却
//   File ID を cloudFileId として保存
//
// 【OneDrive 実装計画】
//   POST https://graph.microsoft.com/v1.0/me/drive/root:/path:/createUploadSession
//   受信者の Microsoft OAuth2 トークン（MSAL）で認証
//   uploadUrl（有効期限付き）を返却
//
// 【Dropbox 実装計画】
//   POST https://content.dropboxapi.com/2/files/upload_session/start
//   受信者の Dropbox OAuth2 トークンで認証
//   session_id を使った append → finish の3ステップフロー