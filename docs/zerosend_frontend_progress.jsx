import { useState } from "react";

// ============================================================
// ZeroSend Frontend 開発作業項目 & 進捗管理
// ワイヤーフレーム / バックエンドAPI / 総合設計仕様書 準拠
// ============================================================

const PHASES = [
  {
    id: "P0",
    label: "Phase 0",
    name: "基盤構築",
    color: "bg-slate-500",
    light: "bg-slate-50 border-slate-200",
    text: "text-slate-700",
    tasks: [
      {
        id: "F-01",
        title: "Vite + React 19 + TypeScript プロジェクト初期化",
        detail: "frontend/ ディレクトリに pnpm create vite@latest。tsconfig strict、path alias (@/) 設定。",
        api: "—",
        screen: "—",
      },
      {
        id: "F-02",
        title: "Tailwind CSS v4 + shadcn/ui セットアップ",
        detail: "ワイヤーフレームの brand カラー・font (Noto Sans JP / DM Mono) をテーマに反映。",
        api: "—",
        screen: "全画面",
      },
      {
        id: "F-03",
        title: "環境変数 (.env.local) 設定",
        detail: "VITE_API_BASE_URL=http://localhost:8000/api/v1。本番用 .env.production。",
        api: "—",
        screen: "—",
      },
      {
        id: "F-04",
        title: "APIクライアント基盤 (ky / axios)",
        detail: "baseURL・JWT Authorization ヘッダー自動付与・401 自動ログアウト・レスポンス型定義。",
        api: "全エンドポイント",
        screen: "—",
      },
      {
        id: "F-05",
        title: "TypeScript 型定義ファイル",
        detail: "バックエンド API レスポンスに対応する型を src/types/ に集約。Prisma スキーマと整合。",
        api: "—",
        screen: "—",
      },
      {
        id: "F-06",
        title: "Zustand ストア 雛形",
        detail: "authStore (JWT / user)・transferStore (送信フロー state)・keyStore (Kyber keypair)。",
        api: "—",
        screen: "—",
      },
      {
        id: "F-07",
        title: "React Router v7 ルーティング設定",
        detail: "/ (送信) / /list / /admin / /download/:token / /login の5ルート。ProtectedRoute HOC。",
        api: "—",
        screen: "全画面",
      },
      {
        id: "F-08",
        title: "共通ナビゲーションバー",
        detail: "ワイヤーフレーム準拠: ロゴ・Quantum-Safe バッジ・画面タブ・ML-KEM-768 インジケーター・ユーザーアバター。",
        api: "—",
        screen: "全画面",
      },
      {
        id: "F-09",
        title: "IndexedDB ユーティリティ (暗号鍵永続化)",
        detail: "idb-keyval またはカスタム wrapper。Kyber 秘密鍵を userId をキーに保存/取得/削除。",
        api: "—",
        screen: "—",
      },
      {
        id: "F-10",
        title: "TanStack Query セットアップ & QueryClient",
        detail: "staleTime・retry・onError グローバル設定。Devtools は開発環境のみ有効化。",
        api: "—",
        screen: "—",
      },
    ],
  },
  {
    id: "P1",
    label: "Phase 1",
    name: "認証・鍵管理",
    color: "bg-violet-600",
    light: "bg-violet-50 border-violet-200",
    text: "text-violet-700",
    tasks: [
      {
        id: "F-11",
        title: "ログイン画面 UI",
        detail: "メールアドレス・パスワード入力。ZeroSend ロゴ・Quantum-Safe バッジ表示。",
        api: "POST /auth/login",
        screen: "/login",
      },
      {
        id: "F-12",
        title: "JWT 取得・ストア管理・自動リフレッシュ",
        detail: "access_token を Zustand に保存。有効期限 8h 前にリフレッシュ or 再ログイン誘導。",
        api: "POST /auth/login",
        screen: "/login",
      },
      {
        id: "F-13",
        title: "ユーザー登録画面 + ML-KEM-768 鍵ペア生成",
        detail: "@noble/post-quantum で kyber768.keygen()。公開鍵をサーバ送信。秘密鍵を IndexedDB に保存。",
        api: "POST /auth/register",
        screen: "/register",
      },
      {
        id: "F-14",
        title: "TOTP 2FA 入力画面",
        detail: "6桁 OTP 入力 UI。失敗時エラー・ロック残回数表示。verifyTotp → auth_token 取得。",
        api: "POST /auth/totp/verify",
        screen: "モーダル",
      },
      {
        id: "F-15",
        title: "Protected Route ガード",
        detail: "JWT なし → /login リダイレクト。role: admin でのみ /admin アクセス許可。",
        api: "—",
        screen: "全画面",
      },
    ],
  },
  {
    id: "P2",
    label: "Phase 2",
    name: "ファイル送信画面 (SCREEN 1)",
    color: "bg-indigo-600",
    light: "bg-indigo-50 border-indigo-200",
    text: "text-indigo-700",
    tasks: [
      {
        id: "F-16",
        title: "3ステップ進捗インジケーター",
        detail: "ワイヤーフレーム準拠: ①ファイル選択 → ②受信者設定 → ③送信確認。step state 管理。",
        api: "—",
        screen: "/",
      },
      {
        id: "F-17",
        title: "ドラッグ & ドロップ ゾーン",
        detail: "react-dropzone。最大 1GB バリデーション。ファイル選択後サムネイル・サイズ・種別表示。",
        api: "—",
        screen: "/",
      },
      {
        id: "F-18",
        title: "受信者メールアドレス入力 + Kyber 鍵バッジ",
        detail: "メール入力 → API で受信者公開鍵検索。「🔑 Kyber鍵あり」バッジ表示。タグ形式入力 UI。",
        api: "GET /transfer/recipient-key (拡張)",
        screen: "/",
      },
      {
        id: "F-19",
        title: "クラウドストレージ選択 UI",
        detail: "ワイヤーフレーム準拠: Box / Google Drive / OneDrive / Dropbox のグリッド選択。",
        api: "—",
        screen: "/",
      },
      {
        id: "F-20",
        title: "セキュリティ設定パネル",
        detail: "URL有効期限 (1h/6h/12h/24h)・最大DL回数 (1/2/3/5)・FIDO2 2FA トグル。常時ON項目の表示。",
        api: "—",
        screen: "/",
      },
      {
        id: "F-21",
        title: "分割アップロード トグル (Phase 2)",
        detail: "ワイヤーフレーム準拠のトグル UI。ON時は split-parts API フローへ切り替え。",
        api: "POST /transfer/:id/split-parts",
        screen: "/",
      },
      {
        id: "F-22",
        title: "クライアント側 AES-256-GCM 暗号化",
        detail: "Web Crypto API: crypto.subtle.generateKey(AES-GCM) → ファイルをブラウザ内で暗号化。",
        api: "—",
        screen: "/",
      },
      {
        id: "F-23",
        title: "ML-KEM-768 鍵カプセル化 (送信者側)",
        detail: "@noble/post-quantum: kyber768.encapsulate(recipientPublicKey) → AES鍵を Kyber でカプセル化。",
        api: "—",
        screen: "/",
      },
      {
        id: "F-24",
        title: "送信APIフロー (3ステップ)",
        detail: "① POST /transfer/initiate → ② PUT 暗号化ファイル to SignedURL → ③ POST /transfer/:id/key。",
        api: "POST /transfer/initiate, POST /transfer/:id/key",
        screen: "/",
      },
      {
        id: "F-25",
        title: "送信進捗バー & アニメーション",
        detail: "暗号化中・アップロード中の進捗を progress-bar で表示。ワイヤーフレームのグラデーション再現。",
        api: "—",
        screen: "/",
      },
      {
        id: "F-26",
        title: "送信完了画面 (ワンタイムURL + QRコード)",
        detail: "生成された URL 表示・コピーボタン・qrcode.react で QR 生成。「サーバにファイルは保持されません」表示。",
        api: "—",
        screen: "/",
      },
    ],
  },
  {
    id: "P3",
    label: "Phase 3",
    name: "送信履歴画面 (SCREEN 2)",
    color: "bg-blue-600",
    light: "bg-blue-50 border-blue-200",
    text: "text-blue-700",
    tasks: [
      {
        id: "F-27",
        title: "送信ファイル管理ページ (カードグリッド)",
        detail: "ワイヤーフレーム準拠: 4カラムグリッド。thumb-gradient サムネイル・暗号化済みバッジ。",
        api: "GET /admin/sessions",
        screen: "/list",
      },
      {
        id: "F-28",
        title: "ステータスフィルタータブ",
        detail: "すべて・有効・期限切れ・削除済み の4タブ。TanStack Query でステータス別取得。",
        api: "GET /admin/sessions?status=",
        screen: "/list",
      },
      {
        id: "F-29",
        title: "キーワード検索",
        detail: "受信者メールアドレス・ファイル名でデバウンス検索 (300ms)。",
        api: "GET /admin/sessions?q=",
        screen: "/list",
      },
      {
        id: "F-30",
        title: "有効期限カウントダウンタイマー",
        detail: "各カードに「残 Xh」リアルタイム更新。期限切れは赤色に変化。",
        api: "—",
        screen: "/list",
      },
      {
        id: "F-31",
        title: "セッション詳細モーダル",
        detail: "ファイル情報・DL回数・監査ログ表示。フォースデリートボタン付き。",
        api: "GET /admin/sessions/:id",
        screen: "/list モーダル",
      },
      {
        id: "F-32",
        title: "強制削除 (フォースデリート)",
        detail: "確認ダイアログ → DELETE /admin/sessions/:id → 楽観的更新でリスト除去。",
        api: "DELETE /admin/sessions/:id",
        screen: "/list",
      },
    ],
  },
  {
    id: "P4",
    label: "Phase 4",
    name: "受信者ダウンロード画面 (SCREEN 3)",
    color: "bg-emerald-600",
    light: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-700",
    tasks: [
      {
        id: "F-33",
        title: "ダウンロードページ (URLトークン解析)",
        detail: "/download/:token → GET /download/:token でファイル情報取得・表示。有効期限・DL残回数。",
        api: "GET /download/:token",
        screen: "/download/:token",
      },
      {
        id: "F-34",
        title: "2FA 認証 UI (TOTP / FIDO2 選択)",
        detail: "ワイヤーフレーム準拠: 生体認証/FIDO2 と TOTP の2択。メールアドレス表示。",
        api: "—",
        screen: "/download/:token",
      },
      {
        id: "F-35",
        title: "TOTP 検証 → auth_token 取得",
        detail: "6桁入力 → POST /auth/totp/verify → auth_token を一時保存。失敗カウント表示。",
        api: "POST /auth/totp/verify",
        screen: "/download/:token",
      },
      {
        id: "F-36",
        title: "暗号化 AES 鍵取得",
        detail: "GET /download/:token/key (Authorization: Bearer auth_token) → encapsulated_key_b64 取得。",
        api: "GET /download/:token/key",
        screen: "/download/:token",
      },
      {
        id: "F-37",
        title: "IndexedDB から Kyber 秘密鍵取得",
        detail: "ログイン中ユーザーの userId をキーに IndexedDB から秘密鍵を取得。鍵なし時エラー表示。",
        api: "—",
        screen: "/download/:token",
      },
      {
        id: "F-38",
        title: "クライアント側 ML-KEM-768 脱カプセル化 + AES 復号",
        detail: "kyber768.decapsulate(encapsulatedKey, privateKey) → AES鍵復元 → crypto.subtle.decrypt() でファイル復号。",
        api: "—",
        screen: "/download/:token",
      },
      {
        id: "F-39",
        title: "復号ファイルのダウンロード + 完了通知",
        detail: "Blob URL でブラウザダウンロード開始 → POST /download/:token/complete → 自動削除確認表示。",
        api: "POST /download/:token/complete",
        screen: "/download/:token",
      },
    ],
  },
  {
    id: "P5",
    label: "Phase 5",
    name: "管理者ダッシュボード (SCREEN 4)",
    color: "bg-orange-600",
    light: "bg-orange-50 border-orange-200",
    text: "text-orange-700",
    tasks: [
      {
        id: "F-40",
        title: "管理者ダッシュボード レイアウト",
        detail: "サイドバー付きレイアウト: セッション管理・ユーザー管理・監査ログの3セクション。",
        api: "—",
        screen: "/admin",
      },
      {
        id: "F-41",
        title: "セッション一覧 (管理者)",
        detail: "ページネーション付きテーブル: セッションID・受信者・ステータス・送信日時・操作。",
        api: "GET /admin/sessions",
        screen: "/admin",
      },
      {
        id: "F-42",
        title: "ユーザー管理テーブル",
        detail: "ユーザー一覧 (表示名・ロール・作成日・最終ログイン)。削除ボタン付き。",
        api: "GET /admin/users, DELETE /admin/users/:id",
        screen: "/admin",
      },
      {
        id: "F-43",
        title: "監査ログビューワー",
        detail: "イベント種別・結果・IPアドレス・日時フィルター。CSVエクスポートボタン。",
        api: "GET /admin/logs, GET /admin/logs/export",
        screen: "/admin",
      },
    ],
  },
  {
    id: "P6",
    label: "Phase 6",
    name: "品質・仕上げ",
    color: "bg-pink-600",
    light: "bg-pink-50 border-pink-200",
    text: "text-pink-700",
    tasks: [
      {
        id: "F-44",
        title: "エラーハンドリング統一",
        detail: "API エラー・暗号化エラー・鍵なしエラーを toast 通知で統一表示。Sentry 等連携任意。",
        api: "—",
        screen: "全画面",
      },
      {
        id: "F-45",
        title: "ローディング・スケルトン UI",
        detail: "全 API 呼び出しに Suspense / スケルトンカード適用。ワイヤーフレームの fade-in-up 再現。",
        api: "—",
        screen: "全画面",
      },
      {
        id: "F-46",
        title: "レスポンシブ対応",
        detail: "モバイル (sm:) / タブレット (md:) / デスクトップ (lg:) 3ブレークポイント対応。",
        api: "—",
        screen: "全画面",
      },
      {
        id: "F-47",
        title: "E2E 動作確認 (全フロー通し)",
        detail: "register → login → send → receive の全フローを Playwright または手動で確認。",
        api: "全エンドポイント",
        screen: "全画面",
      },
      {
        id: "F-48",
        title: "docker-compose に frontend サービス追加",
        detail: "Vite dev server を docker-compose.yml に追加。本番は nginx コンテナでビルド成果物を配信。",
        api: "—",
        screen: "—",
      },
    ],
  },
];

const STATUS_OPTIONS = ["未着手", "進行中", "完了", "保留"];
const STATUS_STYLE = {
  未着手: "bg-gray-100 text-gray-500",
  進行中: "bg-yellow-100 text-yellow-700",
  完了: "bg-emerald-100 text-emerald-700",
  保留: "bg-red-100 text-red-600",
};

function initStatuses() {
  const s = {};
  PHASES.forEach((p) => p.tasks.forEach((t) => (s[t.id] = "未着手")));
  return s;
}

export default function App() {
  const [statuses, setStatuses] = useState(initStatuses);
  const [expandedPhase, setExpandedPhase] = useState(null);
  const [filterStatus, setFilterStatus] = useState("すべて");

  const setStatus = (id, val) => setStatuses((prev) => ({ ...prev, [id]: val }));

  const totalTasks = PHASES.reduce((a, p) => a + p.tasks.length, 0);
  const doneTasks = Object.values(statuses).filter((s) => s === "完了").length;
  const inProgressTasks = Object.values(statuses).filter((s) => s === "進行中").length;
  const pct = Math.round((doneTasks / totalTasks) * 100);

  const allStatuses = ["すべて", ...STATUS_OPTIONS];

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* ヘッダー */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                🚀 ZeroSend Frontend 開発進捗
              </h1>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                ワイヤーフレーム / バックエンドAPI / 総合設計仕様書 準拠
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-indigo-600">{pct}%</p>
              <p className="text-xs text-slate-400">
                {doneTasks}/{totalTasks} 完了 · 進行中 {inProgressTasks}
              </p>
            </div>
          </div>
          {/* プログレスバー */}
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          {/* フィルター */}
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {allStatuses.map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  filterStatus === s
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* フェーズ一覧 */}
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {PHASES.map((phase) => {
          const phaseTasks = filterStatus === "すべて"
            ? phase.tasks
            : phase.tasks.filter((t) => statuses[t.id] === filterStatus);
          if (phaseTasks.length === 0) return null;

          const phaseDone = phase.tasks.filter((t) => statuses[t.id] === "完了").length;
          const phaseTotal = phase.tasks.length;
          const isExpanded = expandedPhase === phase.id || filterStatus !== "すべて";

          return (
            <div key={phase.id} className={`border rounded-xl overflow-hidden ${phase.light}`}>
              {/* フェーズヘッダー */}
              <button
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/50 transition-all"
                onClick={() =>
                  setExpandedPhase(isExpanded && filterStatus === "すべて" ? null : phase.id)
                }
              >
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold text-white ${phase.color} px-2.5 py-0.5 rounded-full`}>
                    {phase.label}
                  </span>
                  <span className={`font-bold text-sm ${phase.text}`}>{phase.name}</span>
                  <span className="text-xs text-slate-400 font-mono">
                    {phaseDone}/{phaseTotal}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-white/60 rounded-full h-1.5">
                    <div
                      className={`${phase.color} h-1.5 rounded-full`}
                      style={{ width: `${(phaseDone / phaseTotal) * 100}%` }}
                    />
                  </div>
                  <span className="text-slate-400 text-sm">{isExpanded ? "▲" : "▼"}</span>
                </div>
              </button>

              {/* タスク一覧 */}
              {isExpanded && (
                <div className="divide-y divide-white/60">
                  {/* テーブルヘッダー */}
                  <div className="grid grid-cols-12 gap-2 px-5 py-2 bg-white/40 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    <div className="col-span-1">ID</div>
                    <div className="col-span-4">タスク名</div>
                    <div className="col-span-3">詳細・実装ポイント</div>
                    <div className="col-span-2">対応API</div>
                    <div className="col-span-1">画面</div>
                    <div className="col-span-1">ステータス</div>
                  </div>
                  {phaseTasks.map((task) => (
                    <div
                      key={task.id}
                      className="grid grid-cols-12 gap-2 px-5 py-3 bg-white/30 hover:bg-white/60 transition-all items-start"
                    >
                      <div className="col-span-1">
                        <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {task.id}
                        </span>
                      </div>
                      <div className="col-span-4">
                        <p className="text-xs font-semibold text-slate-800 leading-snug">
                          {task.title}
                        </p>
                      </div>
                      <div className="col-span-3">
                        <p className="text-[11px] text-slate-500 leading-snug">{task.detail}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] font-mono text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded leading-snug">
                          {task.api}
                        </p>
                      </div>
                      <div className="col-span-1">
                        <p className="text-[10px] text-slate-400 font-mono leading-snug">
                          {task.screen}
                        </p>
                      </div>
                      <div className="col-span-1">
                        <select
                          value={statuses[task.id]}
                          onChange={(e) => setStatus(task.id, e.target.value)}
                          className={`text-[10px] font-semibold rounded-full px-2 py-0.5 border-0 cursor-pointer w-full ${
                            STATUS_STYLE[statuses[task.id]]
                          }`}
                        >
                          {STATUS_OPTIONS.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* 技術スタック凡例 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 mt-6">
          <h2 className="text-sm font-bold text-slate-700 mb-3">📦 技術スタック</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs text-slate-600">
            {[
              ["フレームワーク", "React 19 + Vite + TypeScript"],
              ["ルーティング", "React Router v7"],
              ["状態管理", "Zustand"],
              ["サーバー状態", "TanStack Query v5"],
              ["UI コンポーネント", "shadcn/ui + Tailwind CSS v4"],
              ["ファイルアップロード", "react-dropzone"],
              ["量子耐性暗号 (ML-KEM-768)", "@noble/post-quantum"],
              ["対称暗号 (AES-256-GCM)", "Web Crypto API (native)"],
              ["鍵永続化", "IndexedDB (idb-keyval)"],
              ["HTTP クライアント", "ky"],
              ["QR コード生成", "qrcode.react"],
              ["パッケージマネージャー", "pnpm"],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <span className="text-slate-400 shrink-0">{k}:</span>
                <span className="font-mono font-medium text-indigo-600">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 注意事項 */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
          <p className="font-bold mb-1">⚠️ セキュリティ設計上の重要事項</p>
          <ul className="space-y-0.5 text-[11px] leading-relaxed">
            <li>• Kyber 秘密鍵は <strong>IndexedDB のみ</strong>に保存。サーバには一切送信しない。</li>
            <li>• AES 鍵の生成・暗号化・復号は <strong>全てブラウザ内</strong>で完結する。</li>
            <li>• サーバーはカプセル化済み AES 鍵のみ保持。平文鍵・ファイル内容は保持しない。</li>
            <li>• F-22〜F-23 (送信) と F-37〜F-38 (受信) はゼロ保持設計の<strong>最重要実装</strong>箇所。</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
