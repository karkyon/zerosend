// =============================================================
// ZeroSend — lib/apiClient.ts
//
// パス        : frontend/src/lib/apiClient.ts
// 作成日      : 2026-02-23
// 更新日      : 2026-02-23
//
// 概要        : ky ベース API クライアント基盤
//               JWT Authorization ヘッダー自動付与
//               401 時自動ログアウト（setupApiClient で登録）
//               型安全エラーハンドリング (ApiError / parseApiError)
//
// 依存関係    :
//   ky                     ^1     HTTP クライアント / HTTPError
//   @/types/api            local  ProblemDetail 型
//
// 使用箇所    :
//   @/main.tsx             setupApiClient() 初期化
//   @/pages/*              api.get / api.post 等
//   @/stores/authStore     logout 連携（onUnauthorized コールバック経由）
// =============================================================

import ky, { type KyInstance, type Options, HTTPError } from 'ky'
import type { ProblemDetail } from '@/types/api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string

// ─── 認証トークン取得（Zustandストアから。循環参照回避のため動的import）

let _getToken: (() => string | null) | null = null
let _onUnauthorized: (() => void) | null = null

/**
 * APIクライアントに認証フックを登録する
 * main.tsx の初期化時に呼ぶこと
 */
export function setupApiClient(
  getToken: () => string | null,
  onUnauthorized: () => void,
) {
  _getToken = getToken
  _onUnauthorized = onUnauthorized
}

// ─── ky インスタンス生成 ──────────────────────────────────────

function createApiClient(): KyInstance {
  return ky.create({
    prefixUrl: API_BASE_URL,
    timeout: 30_000,
    retry: {
      limit: 1,
      statusCodes: [408, 429, 500, 502, 503, 504],
      methods: ['get', 'head'],
    },
    hooks: {
      beforeRequest: [
        (request) => {
          const token = _getToken?.()
          if (token) {
            request.headers.set('Authorization', `Bearer ${token}`)
          }
        },
      ],
      afterResponse: [
        async (request, _options, response) => {
          // ログインエンドポイントの401は除外（認証試行の失敗は正常なフロー）
          const isAuthEndpoint = request.url.includes('/auth/login') ||
                                request.url.includes('/auth/register') ||
                                request.url.includes('/auth/totp')
          if (response.status === 401 && !isAuthEndpoint) {
            _onUnauthorized?.()
          }
          return response
        },
      ],
    },
  })
}

export const apiClient: KyInstance = createApiClient()

// ─── 型安全エラーパーサー ─────────────────────────────────────

export class ApiError extends Error {
  status: number
  problem: ProblemDetail

  constructor(status: number, problem: ProblemDetail) {
    super(problem.detail || problem.title)
    this.name = 'ApiError'
    this.status = status
    this.problem = problem
  }
}

/**
 * ky の HTTPError を ApiError に変換する
 * usage: catch(e) { throw await parseApiError(e) }
 */
export async function parseApiError(error: unknown): Promise<ApiError> {
  if (error instanceof HTTPError) {
    try {
      const body = await error.response.json() as ProblemDetail
      return new ApiError(error.response.status, body)
    } catch {
      return new ApiError(error.response.status, {
        type: '/errors/unknown',
        title: 'Unknown Error',
        status: error.response.status,
        detail: error.message,
      })
    }
  }
  return new ApiError(0, {
    type: '/errors/network',
    title: 'Network Error',
    status: 0,
    detail: error instanceof Error ? error.message : 'ネットワークエラーが発生しました',
  })
}

// ─── レスポンス型付きヘルパー ─────────────────────────────────

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete'

async function request<T>(
  method: Method,
  url: string,
  options?: Options & { useAuthToken?: string },
): Promise<T> {
  const opts: Options = { ...options }

  // download/:token/key で auth_token を使う場合
  if (options?.useAuthToken) {
    opts.hooks = {
      beforeRequest: [
        (request) => {
          request.headers.set('Authorization', `Bearer ${options.useAuthToken}`)
        },
      ],
    }
  }

  try {
    return await apiClient[method](url, opts).json<T>()
  } catch (e) {
    throw await parseApiError(e)
  }
}

export const api = {
  get:    <T>(url: string, opts?: Options) => request<T>('get', url, opts),
  post:   <T>(url: string, opts?: Options) => request<T>('post', url, opts),
  put:    <T>(url: string, opts?: Options) => request<T>('put', url, opts),
  patch:  <T>(url: string, opts?: Options) => request<T>('patch', url, opts),
  delete: <T>(url: string, opts?: Options) => request<T>('delete', url, opts),
  /** auth_token を使ったリクエスト（受信者2FA後のダウンロード）*/
  withAuthToken: <T>(url: string, authToken: string, opts?: Options) =>
    request<T>('get', url, { ...opts, useAuthToken: authToken }),
}