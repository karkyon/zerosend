// =====================================
// ファイルパス  : zerosend/backend/src/services/download.service.ts
//
// 説明・目的・機能概要:
//   ファイル受信（ダウンロード）サービス。
//   getInfo()     : url_token → セッション存在・有効期限・ロック確認 → 情報返却
//   getKey()      : auth_token 検証 → Redis から K_enc 取得 → 署名付き DL URL 生成
//   complete()    : K_enc 即時削除 → クラウドファイル削除 → セッション論理削除
//
//   ゼロ保持設計:
//     - K_enc は Redis にのみ存在（DB には保存されない）
//     - complete() 呼び出し後、サーバ上に復号可能なデータは残らない
//
// 作成日時 : 2026-02-22
// 更新日時 : 2026-02-22
//
// 依存関係:
//   ../lib/prisma, ./redis.service, ./cloud.service
//   ../utils/logger, ../types/errors
// =====================================

import { prisma }                              from '../lib/prisma.js'
import {
  getEncKey,
  delEncKey,
  getAuthSession,
  isLocked,
}                                              from './redis.service.js'
import { createSignedDownloadUrl, deleteCloudFile } from './cloud.service.js'
import { logger }                              from '../utils/logger.js'
import {
  NotFoundError,
  GoneError,
  AuthLockedError,
  UnauthorizedError,
}                                              from '../types/errors.js'

// ─── DownloadService.getInfo() ───────────────────────────────────────────────

export type DownloadInfoResult = {
  senderDisplayName: string
  fileSizeBytes:     bigint
  expiresAt:         Date
  remainingDownloads: number
  twofaType:         'totp' | 'fido2'
}

/**
 * DownloadService.getInfo()
 *
 * 認証不要。メールリンク経由で最初にアクセスするエンドポイント。
 * 1. url_token でセッション取得
 * 2. 有効期限・削除・ロック確認
 * 3. 送信者情報・2FA種別を返却
 * 4. audit_log(access) 記録
 */
export async function getInfo(
  urlToken: string,
  ipAddress?: string,
): Promise<DownloadInfoResult> {

  const session = await prisma.transferSession.findUnique({
    where:  { urlToken },
    select: {
      id:             true,
      status:         true,
      expiresAt:      true,
      deletedAt:      true,
      fileSizeBytes:  true,
      downloadCount:  true,
      maxDownloads:   true,
      sender: {
        select: { displayName: true },
      },
      recipientKey: {
        select: { keyType: true },
      },
    },
  })

  if (!session || session.deletedAt) {
    throw new NotFoundError(`Session not found: ${urlToken}`)
  }
  if (session.expiresAt < new Date()) {
    throw new GoneError('URL has expired')
  }
  if (session.downloadCount >= session.maxDownloads) {
    throw new GoneError('Download limit reached')
  }

  // ロック確認
  if (await isLocked(urlToken)) {
    throw new AuthLockedError(`URL is locked due to too many failed attempts`)
  }

  // 監査ログ
  await writeAuditLog({
    sessionId: session.id,
    eventType: 'access',
    result:    'success',
    ipAddress,
  })

  const twofaType = (session.recipientKey?.keyType === 'kyber768') ? 'totp' : 'totp'

  return {
    senderDisplayName:  session.sender.displayName,
    fileSizeBytes:      session.fileSizeBytes,
    expiresAt:          session.expiresAt,
    remainingDownloads: session.maxDownloads - session.downloadCount,
    twofaType,
  }
}

// ─── DownloadService.getKey() ────────────────────────────────────────────────

export type GetKeyResult = {
  encryptedKeyB64: string
  cloudFileUrl:    string
  fileHashSha3:    string
}

/**
 * DownloadService.getKey()
 *
 * 2FA 認証済み後に呼ばれる。
 * 1. Bearer auth_token → Redis session:{auth_token} から userId・urlToken 取得
 * 2. urlToken がパスパラメータと一致するか確認（セッション乗っ取り防止）
 * 3. セッション有効性再確認
 * 4. Redis から K_enc 取得
 * 5. クラウド署名付き DL URL 生成
 * 6. download_count インクリメント
 * 7. audit_log(dl_success) 記録
 */
export async function getKey(
  urlToken:  string,
  authToken: string,
  ipAddress?: string,
): Promise<GetKeyResult> {

  // 1. auth_token 検証
  const authSession = await getAuthSession(authToken)
  if (!authSession) {
    throw new UnauthorizedError('auth_token is invalid or expired')
  }

  // 2. urlToken 一致確認
  if (authSession.urlToken !== urlToken) {
    throw new UnauthorizedError('auth_token does not match this URL')
  }

  // 3. セッション有効性確認
  const session = await prisma.transferSession.findUnique({
    where:  { urlToken },
    select: {
      id:            true,
      status:        true,
      expiresAt:     true,
      deletedAt:     true,
      cloudFileId:   true,
      cloudType:     true,
      fileHashSha3:  true,
      downloadCount: true,
      maxDownloads:  true,
    },
  })

  if (!session || session.deletedAt) {
    throw new NotFoundError(`Session not found: ${urlToken}`)
  }
  if (session.expiresAt < new Date()) {
    throw new GoneError('URL has expired')
  }
  if (session.downloadCount >= session.maxDownloads) {
    throw new GoneError('Download limit reached')
  }
  if (!session.cloudFileId) {
    throw new NotFoundError('File has not been uploaded yet')
  }

  // 4. Redis から K_enc 取得
  const encKeyB64 = await getEncKey(urlToken)
  if (!encKeyB64) {
    logger.error('[DownloadService] K_enc not found in Redis', { urlToken })
    throw new NotFoundError('Encryption key not found or expired')
  }

  // 5. 署名付き DL URL 生成
  const dlResult = await createSignedDownloadUrl(
    session.cloudType as any,
    session.cloudFileId,
  )

  // 6. download_count インクリメント
  await prisma.transferSession.update({
    where: { id: session.id },
    data:  {
      downloadCount: { increment: 1 },
      status:        session.downloadCount + 1 >= session.maxDownloads ? 'downloaded' : 'ready',
    },
  })

  // 7. 監査ログ
  await writeAuditLog({
    sessionId: session.id,
    actorId:   authSession.userId,
    eventType: 'dl_success',
    result:    'success',
    ipAddress,
  })

  return {
    encryptedKeyB64: encKeyB64,
    cloudFileUrl: dlResult.downloadUrl,
    fileHashSha3:    session.fileHashSha3,
  }
}

// ─── DownloadService.complete() ──────────────────────────────────────────────

/**
 * DownloadService.complete()
 *
 * ゼロ保持の最終ステップ。取り消し不可。
 * 1. auth_token 検証・urlToken 一致確認
 * 2. Redis から K_enc 即時削除（DEL enc_key:{url_token}）
 * 3. クラウドストレージからファイル削除
 * 4. transfer_sessions.deleted_at を UPDATE（論理削除）
 * 5. audit_log(deleted) 記録
 */
export async function complete(
  urlToken:  string,
  authToken: string,
  ipAddress?: string,
): Promise<void> {

  // 1. auth_token 検証
  const authSession = await getAuthSession(authToken)
  if (!authSession) {
    throw new UnauthorizedError('auth_token is invalid or expired')
  }
  if (authSession.urlToken !== urlToken) {
    throw new UnauthorizedError('auth_token does not match this URL')
  }

  const session = await prisma.transferSession.findUnique({
    where:  { urlToken },
    select: {
      id:          true,
      cloudFileId: true,
      cloudType:   true,
      deletedAt:   true,
    },
  })

  if (!session || session.deletedAt) {
    throw new NotFoundError(`Session not found: ${urlToken}`)
  }

  // 2. K_enc 即時削除
  await delEncKey(urlToken)

  // 3. クラウドファイル削除
  if (session.cloudFileId) {
    try {
      await deleteCloudFile(session.cloudType as any, session.cloudFileId)
    } catch (err) {
      logger.error('[DownloadService] Failed to delete cloud file', {
        err,
        sessionId:   session.id,
        cloudFileId: session.cloudFileId,
      })
      // ファイル削除失敗でも処理継続（管理者が後から削除）
    }
  }

  // 4. 論理削除
  await prisma.transferSession.update({
    where: { id: session.id },
    data:  {
      deletedAt: new Date(),
      status:    'deleted',
    },
  })

  // 5. 監査ログ
  await writeAuditLog({
    sessionId: session.id,
    actorId:   authSession.userId,
    eventType: 'deleted',
    result:    'success',
    ipAddress,
    metadata:  { trigger: 'recipient_complete' },
  })

  logger.info('[DownloadService] Session completed and deleted', {
    sessionId: session.id,
    urlToken,
  })
}

// ─── Private helpers ──────────────────────────────────────────────────────────

type AuditLogInput = {
  sessionId?: string
  actorId?:   string
  eventType:  'access' | 'dl_success' | 'dl_fail' | 'deleted' | 'auth_fail'
  result:     'success' | 'failure'
  ipAddress?: string
  metadata?:  Record<string, unknown>
}

async function writeAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        sessionId: input.sessionId,
        actorId:   input.actorId,
        eventType: input.eventType as any,
        result:    input.result    as any,
        ipAddress: input.ipAddress ?? '',
        metadata:  input.metadata as any ?? null,
      },
    })
  } catch (err) {
    logger.error('[DownloadService] Failed to write audit log', { err })
  }
}