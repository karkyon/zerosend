import { defineConfig } from 'prisma/config'

// コンテナ内: DATABASE_URL は docker-compose.yml の environment で注入済み
// ホスト CLI: .env から読み込む場合は --env-file .env オプションを使う
export default defineConfig({
  schema: 'prisma/schema.camel.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
})
