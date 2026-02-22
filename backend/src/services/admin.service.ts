// =====================================
// ファイルパス  : zerosend/backend/src/services/admin.service.ts
//
// 説明・目的・機能概要:
//   管理者向けサービス。
//   getSessions()  : 転送セッション一覧（フィルタ・ページネーション）
//   getSession()   : セッション詳細
//   deleteSession(): セッション強制削除（K_enc + クラウドファイル + 論理削除）
//   unlockSession(): TOTP ロック解除
//   getLogs()      : 監査ログ一覧（フィルタ・ページネーション）
//   exportLogs()   : 監査ログ CSV エクスポート
//   getUsers()     : ユーザー一覧
//   deleteUser()   : ユーザー削除（CASCADE）
//
// 作成日時 : 2026-02-22
// 更新日時 : 2026-02-22
//
// 依存関係:
//   ../lib/prisma, ./redis.service, ./cloud.service
//   ../utils/logger, ../types/errors
// =====================================

import { prisma }                       from '../lib/prisma.js'
import { delEncKey, delLock }           from './redis.service.js'
import { deleteCloudFile }              from './cloud.service.js'
import { logger }                       from '../utils/logger.js'
import { NotFoundError }                from '../types/errors.js'
import type { Paginated }               from '../types/index.js'

// ─── 型定義 ───────────────────────────────────────────────────────────────────

export type SessionRow = {
  id:              string
  urlToken:        string
  status:          string
  senderName:      string
  recipientEmail:  string
  fileSizeBytes:   string   // bigint → string
  cloudType:       string
  downloadCount:   number
  maxDownloads:    number
  expiresAt:       string
  createdAt:       string
}

export type AuditLogRow = {
  id:           string
  sessionId:    string | null
  actorId:      string | null
  eventType:    string
  result:       string
  ipAddress:    string | null
  createdAt:    string
}

export type UserRow = {
  id:          string
  displayName: string
  role:        string
  isActive:    boolean
  createdAt:   string
  lastLoginAt: string | null
}

export type GetSessionsInput = {
  status?:         string
  senderEmail?:    string
  recipientEmail?: string
  from?:           string
  to?:             string
  page?:           number
  perPage?:        number
}

export type GetLogsInput = {
  eventType?: string
  result?:    string
  from?:      string
  to?:        string
  page?:      number
  perPage?:   number
}

export type GetUsersInput = {
  search?:  string
  page?:    number
  perPage?: number
}

// ─── AdminService.getSessions() ──────────────────────────────────────────────

export async function getSessions(
  input: GetSessionsInput,
): Promise<Paginated<SessionRow>> {
  const page    = Math.max(1, input.page    ?? 1)
  const perPage = Math.min(200, input.perPage ?? 50)
  const skip    = (page - 1) * perPage

  const where: any = {}

  if (input.status && input.status !== 'all') {
    if (input.status === 'active') {
      where.status    = { in: ['initiated', 'ready'] }
      where.deletedAt = null
      where.expiresAt = { gt: new Date() }
    } else if (input.status === 'expired') {
      where.expiresAt = { lt: new Date() }
    } else if (input.status === 'deleted') {
      where.deletedAt = { not: null }
    }
  }

  if (input.from || input.to) {
    where.createdAt = {}
    if (input.from) where.createdAt.gte = new Date(input.from)
    if (input.to)   where.createdAt.lte = new Date(input.to)
  }

  // recipientEmail フィルタ（平文検索）
  if (input.recipientEmail) {
    where.recipientEmail = { contains: input.recipientEmail }
  }

  const [rows, total] = await Promise.all([
    prisma.transferSession.findMany({
      where,
      skip,
      take: perPage,
      orderBy: { createdAt: 'desc' },
      select: {
        id:             true,
        urlToken:       true,
        status:         true,
        recipientEmail: true,
        fileSizeBytes:  true,
        cloudType:      true,
        downloadCount:  true,
        maxDownloads:   true,
        expiresAt:      true,
        createdAt:      true,
        sender:         { select: { displayName: true } },
      },
    }),
    prisma.transferSession.count({ where }),
  ])

  const data: SessionRow[] = rows.map(r => ({
    id:             r.id,
    urlToken:       r.urlToken,
    status:         r.status,
    senderName:     r.sender.displayName,
    recipientEmail: r.recipientEmail,
    fileSizeBytes:  r.fileSizeBytes.toString(),
    cloudType:      r.cloudType,
    downloadCount:  r.downloadCount,
    maxDownloads:   r.maxDownloads,
    expiresAt:      r.expiresAt.toISOString(),
    createdAt:      r.createdAt.toISOString(),
  }))

  return { data, total, page, perPage, totalPages: Math.ceil(total / perPage) }
}

// ─── AdminService.getSession() ───────────────────────────────────────────────

export async function getSession(id: string): Promise<SessionRow> {
  const r = await prisma.transferSession.findUnique({
    where:  { id },
    select: {
      id:             true,
      urlToken:       true,
      status:         true,
      recipientEmail: true,
      fileSizeBytes:  true,
      cloudType:      true,
      downloadCount:  true,
      maxDownloads:   true,
      expiresAt:      true,
      createdAt:      true,
      sender:         { select: { displayName: true } },
    },
  })

  if (!r) throw new NotFoundError(`Session not found: ${id}`)

  return {
    id:             r.id,
    urlToken:       r.urlToken,
    status:         r.status,
    senderName:     r.sender.displayName,
    recipientEmail: r.recipientEmail,
    fileSizeBytes:  r.fileSizeBytes.toString(),
    cloudType:      r.cloudType,
    downloadCount:  r.downloadCount,
    maxDownloads:   r.maxDownloads,
    expiresAt:      r.expiresAt.toISOString(),
    createdAt:      r.createdAt.toISOString(),
  }
}

// ─── AdminService.deleteSession() ────────────────────────────────────────────

export async function deleteSession(id: string, adminId: string): Promise<void> {
  const session = await prisma.transferSession.findUnique({
    where:  { id },
    select: { id: true, urlToken: true, cloudFileId: true, cloudType: true, deletedAt: true },
  })

  if (!session) throw new NotFoundError(`Session not found: ${id}`)

  // K_enc 削除
  await delEncKey(session.urlToken).catch(err =>
    logger.warn('[AdminService] Failed to delete enc_key', { err, id })
  )

  // クラウドファイル削除
  if (session.cloudFileId) {
    await deleteCloudFile(session.cloudType as any, session.cloudFileId).catch(err =>
      logger.warn('[AdminService] Failed to delete cloud file', { err, id })
    )
  }

  // 論理削除
  await prisma.transferSession.update({
    where: { id },
    data:  { deletedAt: new Date(), status: 'deleted' },
  })

  // 監査ログ
  await prisma.auditLog.create({
    data: {
      sessionId: id,
      actorId:   adminId,
      eventType: 'admin_delete' as any,
        ipAddress:   '',
      result:    'success' as any,
      metadata:  { trigger: 'admin_force_delete' } as any,
    },
  }).catch(err => logger.error('[AdminService] Failed to write audit log', { err }))

  logger.info('[AdminService] Session force-deleted', { id, adminId })
}

// ─── AdminService.unlockSession() ────────────────────────────────────────────

export async function unlockSession(id: string, adminId: string): Promise<void> {
  const session = await prisma.transferSession.findUnique({
    where:  { id },
    select: { id: true, urlToken: true },
  })

  if (!session) throw new NotFoundError(`Session not found: ${id}`)

  await delLock(session.urlToken)

  await prisma.auditLog.create({
    data: {
      sessionId: id,
      actorId:   adminId,
      eventType: 'unlock' as any,
        ipAddress:   '',
      result:    'success' as any,
      metadata:  { trigger: 'admin_unlock' } as any,
    },
  }).catch(err => logger.error('[AdminService] Failed to write audit log', { err }))

  logger.info('[AdminService] Session unlocked', { id, adminId })
}

// ─── AdminService.getLogs() ──────────────────────────────────────────────────

export async function getLogs(
  input: GetLogsInput,
): Promise<Paginated<AuditLogRow>> {
  const page    = Math.max(1, input.page    ?? 1)
  const perPage = Math.min(200, input.perPage ?? 50)
  const skip    = (page - 1) * perPage

  const where: any = {}
  if (input.eventType) where.eventType = input.eventType
  if (input.result)    where.result    = input.result
  if (input.from || input.to) {
    where.createdAt = {}
    if (input.from) where.createdAt.gte = new Date(input.from)
    if (input.to)   where.createdAt.lte = new Date(input.to)
  }

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take:    perPage,
      orderBy: { createdAt: 'desc' },
      select:  {
        id:        true,
        sessionId: true,
        actorId:   true,
        eventType: true,
        result:    true,
        ipAddress: true,
        createdAt: true,
      },
    }),
    prisma.auditLog.count({ where }),
  ])

  const data: AuditLogRow[] = rows.map(r => ({
    id:        r.id.toString(),
    sessionId: r.sessionId,
    actorId:   r.actorId,
    eventType: r.eventType,
    result:    r.result,
    ipAddress: r.ipAddress,
    createdAt: r.createdAt.toISOString(),
  }))

  return { data, total, page, perPage, totalPages: Math.ceil(total / perPage) }
}

// ─── AdminService.exportLogs() ───────────────────────────────────────────────

export async function exportLogs(): Promise<string> {
  const rows = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take:    50000,
    select:  {
      id:        true,
      sessionId: true,
      actorId:   true,
      eventType: true,
      result:    true,
      ipAddress: true,
      createdAt: true,
    },
  })

  const header = 'id,session_id,actor_id,event_type,result,ip_address,created_at'
  const body   = rows.map(r =>
    [r.id, r.sessionId ?? '', r.actorId ?? '', r.eventType, r.result,
     r.ipAddress ?? '', r.createdAt.toISOString()].join(',')
  ).join('\n')

  return `${header}\n${body}`
}

// ─── AdminService.getUsers() ─────────────────────────────────────────────────

export async function getUsers(
  input: GetUsersInput,
): Promise<Paginated<UserRow>> {
  const page    = Math.max(1, input.page    ?? 1)
  const perPage = Math.min(200, input.perPage ?? 50)
  const skip    = (page - 1) * perPage

  const where: any = {}
  if (input.search) {
    where.displayName = { contains: input.search }
  }

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take:    perPage,
      orderBy: { createdAt: 'desc' },
      select:  {
        id:          true,
        displayName: true,
        role:        true,
        isActive:    true,
        createdAt:   true,
        lastLoginAt: true,
      },
    }),
    prisma.user.count({ where }),
  ])

  const data: UserRow[] = rows.map(r => ({
    id:          r.id,
    displayName: r.displayName,
    role:        r.role,
    isActive:    r.isActive,
    createdAt:   r.createdAt.toISOString(),
    lastLoginAt: r.lastLoginAt?.toISOString() ?? null,
  }))

  return { data, total, page, perPage, totalPages: Math.ceil(total / perPage) }
}

// ─── AdminService.deleteUser() ───────────────────────────────────────────────

export async function deleteUser(id: string, adminId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where:  { id },
    select: { id: true },
  })

  if (!user) throw new NotFoundError(`User not found: ${id}`)
  if (id === adminId) throw new NotFoundError('Cannot delete yourself')

  // CASCADE で関連データも削除（スキーマの onDelete: Cascade に依存）
  await prisma.user.delete({ where: { id } })

  logger.info('[AdminService] User deleted', { id, adminId })
}