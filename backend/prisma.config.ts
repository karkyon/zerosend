/// <reference types="node" />
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.camel.prisma',
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://zerosend:zerosend_dev_pass@localhost:5432/zerosend_db',
  },
})
