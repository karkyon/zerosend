// =============================================================
// ZeroSend — stores/keyStore.ts
//
// パス        : frontend/src/stores/keyStore.ts
// 作成日      : 2026-02-23
// 更新日      : 2026-02-23
//
// 概要        : ML-KEM-768 鍵ペアのメモリ内キャッシュ Zustand ストア
//               秘密鍵の永続化は lib/keyStorage.ts (IndexedDB) が担当。
//               このストアはセッション中の高速アクセス用キャッシュのみ。
//               ページリロードで消える → ログイン後に IndexedDB から再取得。
//
// 依存関係    :
//   zustand                ^5     create
//
// State       :
//   secretKey      Uint8Array | null  Kyber-768 秘密鍵（メモリのみ）
//   publicKeyB64   string | null      Base64 公開鍵（登録時 API 送信済み）
//   isKeyStored    boolean            IndexedDB 保存済みフラグ
//
// セキュリティ注意事項:
//   - secretKey はこのストアから外部（API・localStorage 等）に送出禁止
//   - logout 時は clearKey() を必ず呼ぶこと
//
// 使用箇所    :
//   @/main.tsx             ログアウト時 clearKey() 連携
//   @/pages/RegisterPage   setKeypair() で鍵ペアをキャッシュ
//   @/pages/LoginPage      setSecretKey() で IndexedDB から復元
//   @/pages/DownloadPage   secretKey を使って AES 鍵を decapsulate
//   @/components/layout/Navbar  ログアウト時 clearKey()
// =============================================================

import { create } from 'zustand'

interface KeyState {
  /** 現在ログイン中ユーザーの Kyber-768 秘密鍵（Uint8Array） 
   *  セッション中のみメモリ保持。ページリロードで消える → IndexedDB から再取得 */
  secretKey: Uint8Array | null

  /** 登録時に生成した公開鍵（Base64）*/
  publicKeyB64: string | null

  /** 秘密鍵がIndexedDBに保存済みかどうか */
  isKeyStored: boolean

  // Actions
  setKeypair: (secretKey: Uint8Array, publicKeyB64: string) => void
  setSecretKey: (secretKey: Uint8Array) => void
  markKeyStored: () => void
  clearKey: () => void
}

export const useKeyStore = create<KeyState>()((set) => ({
  secretKey: null,
  publicKeyB64: null,
  isKeyStored: false,

  setKeypair: (secretKey, publicKeyB64) =>
    set({ secretKey, publicKeyB64 }),

  setSecretKey: (secretKey) =>
    set({ secretKey }),

  markKeyStored: () =>
    set({ isKeyStored: true }),

  clearKey: () =>
    set({ secretKey: null, publicKeyB64: null, isKeyStored: false }),
}))