import { defineConfig } from 'prisma/config'
import { config } from 'dotenv'

// prisma CLI 実行時に .env を明示的に読み込む
// （prisma.config.ts は Node.js で直接実行されるため自動読み込みされない）
config()

export default defineConfig({
  schema: 'prisma/schema.camel.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
})
