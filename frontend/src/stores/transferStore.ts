// =============================================================
// ZeroSend — stores/transferStore.ts
//
// パス        : frontend/src/stores/transferStore.ts
// 作成日      : 2026-02-23
// 更新日      : 2026-02-23
//
// 概要        : ファイル送信フロー全体の状態管理 Zustand ストア
//               Step: file → settings → confirm → uploading → done
//
// 依存関係    :
//   zustand                ^5     create
//   @/types/api            local  CloudProvider / SendStep / TwoFaType
//
// State       :
//   step                   SendStep          現在の送信ステップ
//   file / fileHashSha3    File / string     ファイル情報と整合性ハッシュ
//   recipientEmail         string            受信者メールアドレス
//   recipientPublicKeyB64  string | null     受信者 ML-KEM-768 公開鍵
//   hasKyberKey            boolean           受信者の公開鍵登録済みフラグ
//   cloudProvider          CloudProvider     クラウドストレージ選択
//   expiresInSeconds       number            有効期限 (3600/21600/43200/86400)
//   maxDownloads           number            最大DL回数 (1/2/3/5)
//   twofaType              TwoFaType         2FA種別 (totp/fido2)
//   sessionId              string | null     initiate API のセッションID
//   shareUrl / urlToken    string | null     受信者に送るURL
//   uploadProgress         UploadProgress    PUT アップロード進捗
//   error                  string | null     エラーメッセージ
//
// 使用箇所    :
//   @/pages/SendPage       送信フロー全体
// =============================================================

import { create } from 'zustand'
import type { CloudProvider, SendStep, TwoFaType } from '@/types/api'

interface UploadProgress {
  loaded: number
  total: number
  percent: number
}

interface TransferState {
  // ステップ管理
  step: SendStep

  // ファイル情報
  file: File | null
  fileHashSha3: string | null

  // 受信者
  recipientEmail: string
  recipientPublicKeyB64: string | null
  hasKyberKey: boolean

  // セキュリティ設定
  cloudProvider: CloudProvider
  expiresInSeconds: number
  maxDownloads: number
  twofaType: TwoFaType

  // 送信処理
  sessionId: string | null
  shareUrl: string | null
  urlToken: string | null
  uploadProgress: UploadProgress | null
  error: string | null

  // Actions
  setStep: (step: SendStep) => void
  setFile: (file: File | null) => void
  setFileHash: (hash: string) => void
  setRecipient: (email: string, publicKeyB64: string | null, hasKey: boolean) => void
  setSettings: (settings: {
    cloudProvider?: CloudProvider
    expiresInSeconds?: number
    maxDownloads?: number
    twofaType?: TwoFaType
  }) => void
  setSessionId: (id: string) => void
  setShareUrl: (url: string, token: string) => void
  setUploadProgress: (progress: UploadProgress | null) => void
  setError: (error: string | null) => void
  reset: () => void
}

const initialState = {
  step: 'file' as SendStep,
  file: null,
  fileHashSha3: null,
  recipientEmail: '',
  recipientPublicKeyB64: null,
  hasKyberKey: false,
  cloudProvider: 'server' as CloudProvider,
  expiresInSeconds: 86400,    // デフォルト: 24h
  maxDownloads: 1,
  twofaType: 'totp' as TwoFaType,
  sessionId: null,
  shareUrl: null,
  urlToken: null,
  uploadProgress: null,
  error: null,
}

export const useTransferStore = create<TransferState>()((set) => ({
  ...initialState,

  setStep: (step) => set({ step }),
  setFile: (file) => set({ file }),
  setFileHash: (hash) => set({ fileHashSha3: hash }),
  setRecipient: (email, publicKeyB64, hasKey) =>
    set({ recipientEmail: email, recipientPublicKeyB64: publicKeyB64, hasKyberKey: hasKey }),
  setSettings: (settings) => set((state) => ({ ...state, ...settings })),
  setSessionId: (id) => set({ sessionId: id }),
  setShareUrl: (url, token) => set({ shareUrl: url, urlToken: token }),
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}))