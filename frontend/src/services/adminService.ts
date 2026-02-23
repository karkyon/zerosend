// =============================================================
// ZeroSend — services/adminService.ts
//
// パス        : frontend/src/services/adminService.ts
// 作成日      : 2026-02
//
// 概要        : F-27〜F-32 Admin API クライアント
//
// API:
//   GET  /admin/sessions              → AdminSessionsResponse
//   GET  /admin/sessions/:id          → TransferSession (詳細 + 監査ログ)
//   DELETE /admin/sessions/:id        → { success: true }
//
// 依存関係:
//   @/lib/apiClient   ky ベース API クライアント (JWT 自動付与)
//   @/types/api       AdminSessionsQuery / AdminSessionsResponse / TransferSession
// =============================================================

import { apiClient } from '@/lib/apiClient'
import type {
  AdminSessionsQuery,
  AdminSessionsResponse,
  TransferSession,
  AuditLog,
} from '@/types/api'

// ─── セッション一覧取得 ──────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/sessions
 * ステータスフィルター・キーワード検索・ページネーション対応
 */
export async function fetchSessions(
  query: AdminSessionsQuery & { q?: string }
): Promise<AdminSessionsResponse> {
  const searchParams: Record<string, string> = {}

  if (query.status)  searchParams.status = query.status
  if (query.q)       searchParams.q      = query.q
  if (query.page)    searchParams.page   = String(query.page)
  if (query.limit)   searchParams.limit  = String(query.limit)

  return apiClient
    .get('admin/sessions', Object.keys(searchParams).length ? { searchParams } : undefined)
    .json<AdminSessionsResponse>()
}

// ─── セッション詳細取得 ──────────────────────────────────────────────────────

/** セッション詳細レスポンス（監査ログ付き） */
export interface SessionDetailResponse {
  session:   TransferSession
  auditLogs: AuditLog[]
}

/**
 * GET /api/v1/admin/sessions/:id
 * 詳細情報 + 監査ログを取得する
 */
export async function fetchSessionDetail(id: string): Promise<SessionDetailResponse> {
  return apiClient
    .get(`admin/sessions/${id}`)
    .json<SessionDetailResponse>()
}

// ─── セッション強制削除 ──────────────────────────────────────────────────────

/**
 * DELETE /api/v1/admin/sessions/:id
 * 管理者による強制削除（確認ダイアログは呼び出し元で表示）
 */
export async function deleteSession(id: string): Promise<{ success: boolean }> {
  return apiClient
    .delete(`admin/sessions/${id}`)
    .json<{ success: boolean }>()
}