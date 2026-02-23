import { useState } from "react";

const TASKS = [
  // ─── Phase 0: 基盤構築 ───────────────────────────────────────
  {
    id: "F-00", phase: 0, phaseName: "基盤構築",
    title: "Viteプロジェクト初期化",
    detail: "pnpm create vite@latest frontend -- --template react-ts, frontend/ディレクトリ構成確定",
    priority: "HIGH", status: "未着手", api: "-", screen: "-",
  },
  {
    id: "F-01", phase: 0, phaseName: "基盤構築",
    title: "Tailwind CSS + shadcn/ui セットアップ",
    detail: "tailwind.config, globals.css, shadcn init。ワイヤーフレームのカラー変数(brand-500=#6366f1等)を定義",
    priority: "HIGH", status: "未着手", api: "-", screen: "全画面",
  },
  {
    id: "F-02", phase: 0, phaseName: "基盤構築",
    title: "React Router v7 セットアップ",
    detail: "/login, /send, /history, /download/:token, /admin ルート定義。ProtectedRoute実装",
    priority: "HIGH", status: "未着手", api: "-", screen: "全画面",
  },
  {
    id: "F-03", phase: 0, phaseName: "基盤構築",
    title: "Zustand 認証ストア",
    detail: "useAuthStore: access_token, user情報, login/logout action。localStorage永続化(zustand/middleware persist)",
    priority: "HIGH", status: "未着手", api: "POST /auth/login", screen: "-",
  },
  {
    id: "F-04", phase: 0, phaseName: "基盤構築",
    title: "axios API クライアント設定",
    detail: "baseURL=VITE_API_BASE_URL, JWT自動付与 interceptor, 401時自動ログアウト, エラーハンドリング共通化",
    priority: "HIGH", status: "未着手", api: "全エンドポイント", screen: "-",
  },
  {
    id: "F-05", phase: 0, phaseName: "基盤構築",
    title: "TanStack Query セットアップ",
    detail: "QueryClientProvider, defaultOptions(staleTime/retry設定), devtools追加",
    priority: "HIGH", status: "未着手", api: "-", screen: "-",
  },
  {
    id: "F-06", phase: 0, phaseName: "基盤構築",
    title: "TypeScript 型定義",
    detail: "src/types/api.ts: User, TransferSession, AuditLog等 BackendAPI Specと完全対応",
    priority: "HIGH", status: "未着手", api: "-", screen: "-",
  },
  {
    id: "F-07", phase: 0, phaseName: "基盤構築",
    title: "共通レイアウト・ナビゲーション",
    detail: "Navbar(ロゴ, ML-KEM-768バッジ, ユーザーアバター), 画面切替タブ(送信/履歴/受信/管理者)。ワイヤーフレームと同デザイン",
    priority: "HIGH", status: "未着手", api: "-", screen: "全画面",
  },
  {
    id: "F-08", phase: 0, phaseName: "基盤構築",
    title: "環境変数・.env設定",
    detail: "VITE_API_BASE_URL=http://localhost:8000/api/v1。frontend/.env.local, .env.example作成",
    priority: "HIGH", status: "未着手", api: "-", screen: "-",
  },

  // ─── Phase 1: 認証機能 ───────────────────────────────────────
  {
    id: "F-10", phase: 1, phaseName: "認証",
    title: "ログイン画面",
    detail: "email/password入力, POST /auth/login, JWTをZustandに保存, /sendへリダイレクト",
    priority: "HIGH", status: "未着手", api: "POST /auth/login", screen: "ログイン",
  },
  {
    id: "F-11", phase: 1, phaseName: "認証",
    title: "TOTP 2FA画面",
    detail: "6桁OTP入力UI, POST /auth/totp/verify, auth_token取得→セッションストア保存",
    priority: "HIGH", status: "未着手", api: "POST /auth/totp/verify", screen: "2FA",
  },
  {
    id: "F-12", phase: 1, phaseName: "認証",
    title: "ユーザー登録画面",
    detail: "email/displayName/password入力 + 鍵ペア自動生成(F-13と連動), POST /auth/register",
    priority: "HIGH", status: "未着手", api: "POST /auth/register", screen: "登録",
  },
  {
    id: "F-13", phase: 1, phaseName: "認証",
    title: "【核心】Kyber768 鍵ペア生成・IndexedDB保存",
    detail: "@noble/post-quantum ml-kem-768.keygen()→秘密鍵をIndexedDB(zerosend-keys)に保存、公開鍵をAPIに登録。HMACフィンガープリント表示",
    priority: "HIGH", status: "未着手", api: "POST /auth/register", screen: "登録",
  },

  // ─── Phase 2: ファイル送信画面 ───────────────────────────────
  {
    id: "F-20", phase: 2, phaseName: "送信",
    title: "ステップインジケーター",
    detail: "Step1:ファイル選択 → Step2:受信者設定 → Step3:送信確認。アクティブ状態の視覚的遷移",
    priority: "HIGH", status: "未着手", api: "-", screen: "SCR-001~003",
  },
  {
    id: "F-21", phase: 2, phaseName: "送信",
    title: "ドラッグ&ドロップゾーン",
    detail: "react-dropzone使用。ファイル選択/D&D、ファイル名・サイズ表示、最大1GB制限、暗号化プレビューバッジ",
    priority: "HIGH", status: "未着手", api: "-", screen: "SCR-001",
  },
  {
    id: "F-22", phase: 2, phaseName: "送信",
    title: "受信者メール入力・タグUI",
    detail: "メール入力→エンター/カンマで追加、Kyber鍵有無バッジ表示、複数受信者タグ表示(×削除可)",
    priority: "HIGH", status: "未着手", api: "GET /users?email=", screen: "SCR-002",
  },
  {
    id: "F-23", phase: 2, phaseName: "送信",
    title: "クラウドストレージ選択UI",
    detail: "Box/Google Drive/OneDrive/Dropboxのグリッド選択。選択状態ハイライト(indigo border)",
    priority: "HIGH", status: "未着手", api: "-", screen: "SCR-002",
  },
  {
    id: "F-24", phase: 2, phaseName: "送信",
    title: "セキュリティ設定パネル",
    detail: "有効期限(1h/6h/12h/24h), DL回数(1/2/3/5回), FIDO2要求トグル, 分割アップロードトグル。AES-256-GCM/ML-KEM-768は常時ON表示",
    priority: "HIGH", status: "未着手", api: "-", screen: "SCR-001",
  },
  {
    id: "F-25", phase: 2, phaseName: "送信",
    title: "【核心】クライアント側暗号化処理",
    detail: "①Web Crypto API: AES-256-GCM鍵生成 ②ファイルをArrayBufferで読込→暗号化 ③受信者公開鍵(Kyber768)でAES鍵をカプセル化(encapsulate)",
    priority: "HIGH", status: "未着手", api: "-", screen: "SCR-002",
  },
  {
    id: "F-26", phase: 2, phaseName: "送信",
    title: "転送セッション開始 API連携",
    detail: "POST /transfer/initiate → sessionId, uploadUrl, recipientPublicKeyB64取得",
    priority: "HIGH", status: "未着手", api: "POST /transfer/initiate", screen: "SCR-002",
  },
  {
    id: "F-27", phase: 2, phaseName: "送信",
    title: "署名付きURLへの直接PUT (プログレスバー)",
    detail: "axios PUT uploadUrl with onUploadProgress→プログレスバー表示。暗号化済みバイナリをBody",
    priority: "HIGH", status: "未着手", api: "PUT (signedURL)", screen: "SCR-002",
  },
  {
    id: "F-28", phase: 2, phaseName: "送信",
    title: "暗号化鍵・URL登録API連携",
    detail: "POST /transfer/:id/key (encapsulated AES鍵送信), POST /transfer/:id/url (cloudFileId送信)",
    priority: "HIGH", status: "未着手", api: "POST /transfer/:id/key\nPOST /transfer/:id/url", screen: "SCR-002",
  },
  {
    id: "F-29", phase: 2, phaseName: "送信",
    title: "送信完了画面・URLシェア",
    detail: "ワンタイムURL表示、コピーボタン(Clipboard API)、QRコード(qrcode.react)、「サーバにファイルは保存されません」メッセージ",
    priority: "HIGH", status: "未着手", api: "-", screen: "SCR-003",
  },

  // ─── Phase 3: 送信履歴画面 ───────────────────────────────────
  {
    id: "F-30", phase: 3, phaseName: "送信履歴",
    title: "セッション一覧取得・表示",
    detail: "GET /admin/sessions, TanStack Queryでキャッシュ。ファイル名/受信者/有効期限/DL数/ステータス表示",
    priority: "HIGH", status: "未着手", api: "GET /admin/sessions", screen: "SCR-004",
  },
  {
    id: "F-31", phase: 3, phaseName: "送信履歴",
    title: "カード/リスト表示切替",
    detail: "グリッドView/リストViewのトグルボタン。カード: thumb-gradient + ファイルアイコン。ワイヤーフレームと同デザイン",
    priority: "MED", status: "未着手", api: "-", screen: "SCR-004",
  },
  {
    id: "F-32", phase: 3, phaseName: "送信履歴",
    title: "ステータスフィルタータブ",
    detail: "全て/有効/DL済/期限切れ/削除済 タブ。URLクエリパラメータ連動",
    priority: "MED", status: "未着手", api: "GET /admin/sessions?status=", screen: "SCR-004",
  },
  {
    id: "F-33", phase: 3, phaseName: "送信履歴",
    title: "セッション詳細モーダル・強制削除",
    detail: "詳細ボタン→モーダル表示(GET /admin/sessions/:id)。削除ボタン→確認ダイアログ→DELETE /admin/sessions/:id",
    priority: "MED", status: "未着手", api: "GET /admin/sessions/:id\nDELETE /admin/sessions/:id", screen: "SCR-004",
  },
  {
    id: "F-34", phase: 3, phaseName: "送信履歴",
    title: "有効期限カウントダウン",
    detail: "残時間リアルタイム表示(setInterval 1s更新)。「残Xh」/「期限切れ」の視覚的切替",
    priority: "LOW", status: "未着手", api: "-", screen: "SCR-004",
  },

  // ─── Phase 4: 受信ダウンロード画面 ───────────────────────────
  {
    id: "F-40", phase: 4, phaseName: "受信",
    title: "URLトークン解析・ファイル情報表示",
    detail: "/download/:token でGET /download/:token。ファイル名/サイズ/送信者/有効期限表示",
    priority: "HIGH", status: "未着手", api: "GET /download/:token", screen: "SCR-005",
  },
  {
    id: "F-41", phase: 4, phaseName: "受信",
    title: "2FA選択UI (FIDO2 / TOTP)",
    detail: "FIDO2(生体認証・推奨)とTOTP(認証アプリ)の選択カード。ワイヤーフレームと同デザイン",
    priority: "HIGH", status: "未着手", api: "-", screen: "SCR-005",
  },
  {
    id: "F-42", phase: 4, phaseName: "受信",
    title: "TOTP認証→暗号化鍵取得",
    detail: "6桁コード入力→GET /download/:token/key。encapsulatedKey取得",
    priority: "HIGH", status: "未着手", api: "GET /download/:token/key", screen: "SCR-005",
  },
  {
    id: "F-43", phase: 4, phaseName: "受信",
    title: "【核心】IndexedDB秘密鍵取得・クライアント復号",
    detail: "①IndexedDBから受信者秘密鍵取得 ②Kyber768.decapsulate(ciphertext, secretKey)→AES鍵復元 ③Web Crypto API: AES-256-GCM復号→plaintext生成",
    priority: "HIGH", status: "未着手", api: "-", screen: "SCR-005",
  },
  {
    id: "F-44", phase: 4, phaseName: "受信",
    title: "ファイルダウンロード・完了通知",
    detail: "Blob生成→<a>タグdownload属性でファイル保存。POST /download/:token/complete。「ファイルはサーバから削除されました」表示",
    priority: "HIGH", status: "未着手", api: "POST /download/:token/complete", screen: "SCR-005",
  },

  // ─── Phase 5: 管理者ダッシュボード ───────────────────────────
  {
    id: "F-50", phase: 5, phaseName: "管理者",
    title: "KPIカード (4枚)",
    detail: "本日の転送数/DL成功/認証失敗/自動削除。GET /admin/sessionsの集計値。ワイヤーフレームと同デザイン",
    priority: "MED", status: "未着手", api: "GET /admin/sessions", screen: "管理者",
  },
  {
    id: "F-51", phase: 5, phaseName: "管理者",
    title: "アクティブURL一覧テーブル",
    detail: "URLトークン/送信者/受信者/有効期限/DL残/ステータス表示。強制削除・ロック解除ボタン",
    priority: "MED", status: "未着手", api: "GET /admin/sessions\nDELETE /admin/sessions/:id\nPOST /admin/sessions/:id/unlock", screen: "管理者",
  },
  {
    id: "F-52", phase: 5, phaseName: "管理者",
    title: "監査ログ表示・CSV出力",
    detail: "GET /admin/logs. イベント種別/結果/IP/日時表示。CSVエクスポートボタン(GET /admin/logs/export)",
    priority: "MED", status: "未着手", api: "GET /admin/logs\nGET /admin/logs/export", screen: "管理者",
  },
  {
    id: "F-53", phase: 5, phaseName: "管理者",
    title: "ユーザー管理",
    detail: "GET /admin/users。ユーザー一覧表示。ロール表示・削除(DELETE /admin/users/:id)",
    priority: "LOW", status: "未着手", api: "GET /admin/users\nDELETE /admin/users/:id", screen: "管理者",
  },

  // ─── Phase 6: Phase2機能 ─────────────────────────────────────
  {
    id: "F-60", phase: 6, phaseName: "Phase2",
    title: "FIDO2 WebAuthn 登録・認証",
    detail: "navigator.credentials.create/get。POST /auth/fido2/begin, /auth/fido2/complete。受信側でも使用",
    priority: "LOW", status: "未着手", api: "POST /auth/fido2/begin\nPOST /auth/fido2/complete", screen: "登録/受信",
  },
  {
    id: "F-61", phase: 6, phaseName: "Phase2",
    title: "分割アップロード対応",
    detail: "ファイルを64MBチャンクに分割→並列暗号化・並列PUT→POST /transfer/:id/split-parts",
    priority: "LOW", status: "未着手", api: "POST /transfer/:id/split-parts", screen: "SCR-002",
  },
];

const PHASE_META = {
  0: { label: "Phase 0", name: "基盤構築", color: "#6366f1", bg: "#eef2ff" },
  1: { label: "Phase 1", name: "認証", color: "#7c3aed", bg: "#f5f3ff" },
  2: { label: "Phase 2", name: "ファイル送信", color: "#0891b2", bg: "#ecfeff" },
  3: { label: "Phase 3", name: "送信履歴", color: "#059669", bg: "#ecfdf5" },
  4: { label: "Phase 4", name: "受信・復号", color: "#d97706", bg: "#fffbeb" },
  5: { label: "Phase 5", name: "管理者", color: "#dc2626", bg: "#fef2f2" },
  6: { label: "Phase 6", name: "Phase2機能", color: "#9ca3af", bg: "#f9fafb" },
};

const STATUS_OPTIONS = ["未着手", "進行中", "完了", "ブロック"];
const STATUS_STYLES = {
  "未着手": { bg: "#f3f4f6", color: "#6b7280", border: "#e5e7eb" },
  "進行中": { bg: "#dbeafe", color: "#1d4ed8", border: "#93c5fd" },
  "完了":   { bg: "#d1fae5", color: "#065f46", border: "#6ee7b7" },
  "ブロック": { bg: "#fee2e2", color: "#b91c1c", border: "#fca5a5" },
};
const PRIORITY_STYLES = {
  "HIGH": { bg: "#fef2f2", color: "#b91c1c" },
  "MED":  { bg: "#fffbeb", color: "#92400e" },
  "LOW":  { bg: "#f0fdf4", color: "#166534" },
};

export default function ZeroSendTasks() {
  const [tasks, setTasks] = useState(TASKS);
  const [filterPhase, setFilterPhase] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedId, setExpandedId] = useState(null);

  const updateStatus = (id, newStatus) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  const filtered = tasks.filter(t => {
    if (filterPhase !== "all" && t.phase !== Number(filterPhase)) return false;
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    return true;
  });

  const stats = {
    total: tasks.length,
    done: tasks.filter(t => t.status === "完了").length,
    inProgress: tasks.filter(t => t.status === "進行中").length,
    blocked: tasks.filter(t => t.status === "ブロック").length,
  };
  const pct = Math.round((stats.done / stats.total) * 100);

  return (
    <div style={{ fontFamily: "'Noto Sans JP', sans-serif", background: "#f4f4f8", minHeight: "100vh", padding: "24px" }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontSize: 16 }}>⚡</span>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#111827" }}>ZeroSend Frontend — 作業項目管理</h1>
            <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>React + Vite + TypeScript + Tailwind + @noble/post-quantum</p>
          </div>
          <div style={{ marginLeft: "auto", fontSize: 11, color: "#9ca3af", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "4px 10px" }}>
            最終更新: {new Date().toLocaleDateString("ja-JP")}
          </div>
        </div>

        {/* 進捗バー */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "16px 20px", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>全体進捗</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#6366f1" }}>{stats.done}/{stats.total} タスク ({pct}%)</span>
            </div>
            <div style={{ height: 8, background: "#e5e7eb", borderRadius: 99 }}>
              <div style={{ height: 8, background: "linear-gradient(90deg,#6366f1,#8b5cf6)", borderRadius: 99, width: `${pct}%`, transition: "width 0.5s" }} />
            </div>
          </div>
          {[["未着手", "#6b7280", tasks.filter(t=>t.status==="未着手").length],
            ["進行中", "#1d4ed8", stats.inProgress],
            ["完了", "#065f46", stats.done],
            ["ブロック", "#b91c1c", stats.blocked]].map(([label, color, cnt]) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: "monospace" }}>{cnt}</div>
              <div style={{ fontSize: 10, color: "#9ca3af" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* フィルター */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4, background: "#fff", padding: 4, borderRadius: 10, border: "1px solid #e5e7eb" }}>
          {[["all", "全フェーズ"], ...Object.entries(PHASE_META).map(([k, v]) => [k, v.label])].map(([val, label]) => (
            <button key={val} onClick={() => setFilterPhase(val)}
              style={{ padding: "4px 10px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600,
                background: filterPhase === val ? "#6366f1" : "transparent",
                color: filterPhase === val ? "#fff" : "#6b7280" }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 4, background: "#fff", padding: 4, borderRadius: 10, border: "1px solid #e5e7eb" }}>
          {[["all", "全ステータス"], ...STATUS_OPTIONS.map(s => [s, s])].map(([val, label]) => (
            <button key={val} onClick={() => setFilterStatus(val)}
              style={{ padding: "4px 10px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600,
                background: filterStatus === val ? "#374151" : "transparent",
                color: filterStatus === val ? "#fff" : "#6b7280" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* フェーズ別 Phase凡例 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {Object.entries(PHASE_META).map(([k, v]) => {
          const cnt = tasks.filter(t => t.phase === Number(k) && t.status === "完了").length;
          const total = tasks.filter(t => t.phase === Number(k)).length;
          return (
            <div key={k} style={{ background: "#fff", border: `1px solid ${v.color}30`, borderRadius: 10, padding: "6px 12px", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: 99, background: v.color }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: v.color }}>{v.label}</span>
              <span style={{ fontSize: 11, color: "#9ca3af" }}>{v.name}</span>
              <span style={{ fontSize: 11, fontFamily: "monospace", color: cnt === total ? "#065f46" : "#6b7280" }}>{cnt}/{total}</span>
            </div>
          );
        })}
      </div>

      {/* テーブル */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
              {["ID", "フェーズ", "タスク名", "API連携", "画面", "優先度", "ステータス"].map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#374151", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((task, i) => {
              const phase = PHASE_META[task.phase];
              const sSt = STATUS_STYLES[task.status];
              const pSt = PRIORITY_STYLES[task.priority];
              const isExp = expandedId === task.id;
              return (
                <>
                  <tr key={task.id}
                    onClick={() => setExpandedId(isExp ? null : task.id)}
                    style={{ borderBottom: "1px solid #f3f4f6", cursor: "pointer",
                      background: isExp ? "#fafafa" : i % 2 === 0 ? "#fff" : "#fafeff",
                      transition: "background 0.15s" }}>
                    <td style={{ padding: "10px 12px", fontFamily: "monospace", fontWeight: 700, color: phase.color }}>{task.id}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ background: phase.bg, color: phase.color, border: `1px solid ${phase.color}40`,
                        borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 600, whiteSpace: "nowrap" }}>
                        {phase.label}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", fontWeight: 600, color: "#111827", maxWidth: 260 }}>
                      {task.title.includes("核心") && (
                        <span style={{ background: "#fef3c7", color: "#92400e", borderRadius: 4, padding: "1px 5px", fontSize: 9, marginRight: 5, border: "1px solid #fcd34d" }}>核心</span>
                      )}
                      {task.title.replace("【核心】", "")}
                    </td>
                    <td style={{ padding: "10px 12px", color: "#6b7280", fontFamily: "monospace", fontSize: 10, maxWidth: 160 }}>
                      {task.api.split("\n").map((a, j) => (
                        <div key={j} style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a}</div>
                      ))}
                    </td>
                    <td style={{ padding: "10px 12px", color: "#6b7280", fontSize: 11, whiteSpace: "nowrap" }}>{task.screen}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ background: pSt.bg, color: pSt.color, borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>
                        {task.priority}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px" }} onClick={e => e.stopPropagation()}>
                      <select value={task.status} onChange={e => updateStatus(task.id, e.target.value)}
                        style={{ background: sSt.bg, color: sSt.color, border: `1px solid ${sSt.border}`,
                          borderRadius: 7, padding: "3px 8px", fontSize: 11, fontWeight: 600, cursor: "pointer", outline: "none" }}>
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                  {isExp && (
                    <tr key={task.id + "-detail"} style={{ background: "#f0f4ff" }}>
                      <td colSpan={7} style={{ padding: "10px 20px 12px 48px", borderBottom: "1px solid #e0e7ff" }}>
                        <span style={{ fontSize: 11, color: "#374151", lineHeight: 1.7 }}>
                          <strong style={{ color: "#4f46e5" }}>詳細: </strong>{task.detail}
                        </span>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "#9ca3af", fontSize: 14 }}>該当タスクなし</div>
        )}
      </div>
      <div style={{ marginTop: 12, fontSize: 11, color: "#9ca3af", textAlign: "center" }}>
        ※ 行クリックで詳細表示 / ステータス列のプルダウンで進捗更新
      </div>
    </div>
  );
}
