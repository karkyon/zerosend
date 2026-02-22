# ZeroSend

**次世代ゼロ保持・量子耐性暗号ファイル転送システム**

> PPAP（パスワード付きZIP＋別送）を廃止し、Kyber-768（ML-KEM-768）+ AES-256-GCM によるゼロ保持設計で安全なファイル転送を実現する。

---

## モノレポ構造

```
zerosend/                          ← リポジトリルート
├── backend/                       ← Hono (Node.js 20 / TypeScript) REST API
│   ├── src/
│   │   ├── app.ts                 ← エントリポイント
│   │   ├── lib/                   ← Layer 1: Prisma・Redis クライアント
│   │   ├── services/              ← Layer 2: ビジネスロジック
│   │   ├── routes/                ← Layer 3: HTTP Controller
│   │   ├── middlewares/           ← 認証・エラー・レートリミット
│   │   ├── validators/            ← Zod スキーマ
│   │   ├── types/                 ← 共通型・ドメイン例外
│   │   ├── utils/                 ← crypto・hash・logger
│   │   └── openapi/spec.ts        ← OpenAPI 3.0 仕様 (Swagger UI 用)
│   ├── prisma/
│   │   └── schema.camel.prisma    ← Prisma スキーマ (camelCase + @map)
│   ├── Dockerfile.dev
│   ├── package.json               ← @zerosend/backend
│   ├── tsconfig.json
│   ├── prisma.config.ts
│   └── .env.example
│
├── frontend/                      ← Web フロントエンド (設計書策定後に実装)
│   ├── src/
│   └── package.json               ← @zerosend/frontend (skeleton)
│
├── docker/                        ← 共有インフラ定義
│   ├── postgres/init/
│   │   └── migration_0001_init.sql
│   └── redis/redis.conf
│
├── docker-compose.yml             ← 全サービス一括管理
├── .gitignore
└── README.md                      ← このファイル
```

---

## 開発環境クイックスタート

```bash
# 1. リポジトリクローン
git clone git@github.com:karkyon/zerosend.git
cd zerosend

# 2. 環境変数設定
cp backend/.env.example backend/.env
# .env を編集: JWT_SECRET と TOTP_ENCRYPTION_KEY を設定
#   openssl rand -hex 32   ← 各値の生成コマンド

# 3. Docker 起動（DB・Redis・MailHog・API 全て）
docker compose up -d

# 4. 依存インストール + Prisma Client 生成
cd backend
npm install
npx prisma generate --config prisma.config.ts

# 5. 動作確認
curl http://localhost:8000/health
# → {"status":"ok","service":"ZeroSend API","version":"0.1.0"}
```

---

## Swagger UI（API 単体テスト）

バックエンド起動後、ブラウザで以下を開く：

**http://localhost:8000/docs**

### Try it 手順

1. **`POST /api/v1/auth/login`** を実行 → `access_token` 取得
2. 右上 **[Authorize 🔒]** ボタンをクリック
3. `access_token` を入力して **[Authorize]**
4. **送信側API**（`/transfer/*`）や **管理者API**（`/admin/*`）を Try it out で実行

> **受信者フロー:** `POST /auth/totp/verify` で `auth_token` を取得 → Authorize に設定 → `/download/:token/key` を実行

---

## 主要サービス一覧

| サービス | URL | 説明 |
|---------|-----|------|
| Backend API | http://localhost:8000 | Hono REST API |
| Swagger UI | http://localhost:8000/docs | API ドキュメント・テスト |
| OpenAPI JSON | http://localhost:8000/api/openapi.json | 仕様 JSON |
| MailHog | http://localhost:8025 | 開発用メール確認 |
| PostgreSQL | localhost:5432 | DB (zerosend/zerosend_dev_pass) |
| Redis | localhost:6379 | キャッシュ (K_enc・セッション管理) |

---

## セキュリティ設計原則（ゼロ保持）

| データ | 保存場所 | 保持期間 |
|--------|----------|----------|
| 暗号化ファイル C_file | クラウドストレージ | DL完了まで（即時削除） |
| 暗号化 AES 鍵 K_enc | **Redis のみ** | TTL 3600秒 |
| 平文 AES 鍵 K_AES | **ブラウザメモリのみ** | ページ離脱まで |
| 受信者秘密鍵 | **クライアントデバイスのみ** | 永続（サーバ非保存） |

サーバが侵害されても、K_enc 単体では復号不可（受信者秘密鍵が必要）。

---

## 技術スタック

| 分類 | 技術 |
|------|------|
| Backend Runtime | Node.js 20 LTS + TypeScript |
| Backend Framework | Hono |
| ORM | Prisma 7.x |
| Database | PostgreSQL 16 |
| Cache | Redis 7 (ioredis) |
| 量子耐性暗号 | Kyber-768 (ML-KEM-768) |
| 対称暗号 | AES-256-GCM |
| 2FA | TOTP (RFC 6238) / FIDO2 (Phase 2) |
| コンテナ | Docker Compose |
| API ドキュメント | OpenAPI 3.0 + Swagger UI |

---

## 開発コマンド

```bash
# バックエンド
cd backend
npm run dev          # 開発サーバ起動 (tsx watch)
npm run typecheck    # 型チェック
npm run db:migrate   # DB マイグレーション
npm run db:studio    # Prisma Studio (GUI)

# Docker
docker compose up -d         # 全サービス起動
docker compose logs -f api   # API ログ確認
docker compose down          # 停止
docker compose down -v       # 停止 + ボリューム削除
```

---

*ZeroSend — KARKYON*
