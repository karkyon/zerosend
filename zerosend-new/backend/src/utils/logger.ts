// =====================================
// ファイルパス  : zerosend/src/utils/logger.ts
//
// 説明・目的・機能概要:
//   構造化ロガー。
//   開発環境では人間が読みやすいフォーマット、本番環境では JSON 形式で出力する。
//   debug / info / warn / error の4レベルをサポートする。
//
// 作成日時 : 2026-02-21
// 更新日時 : 2026-02-21
//
// 依存関係:
//   (node built-in のみ)
// =====================================

// 構造化ロガー — 本番では JSON 形式、開発では人間が読みやすい形式

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta && { meta }),
  }

  if (process.env.NODE_ENV === 'production') {
    // 本番: JSON 1行 (fluentd / CloudWatch 等で受け取る)
    console[level === 'debug' ? 'log' : level](JSON.stringify(entry))
  } else {
    // 開発: 読みやすい形式
    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : ''
    console[level === 'debug' ? 'log' : level](`${prefix} ${message}${metaStr}`)
  }
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => log('debug', msg, meta),
  info:  (msg: string, meta?: Record<string, unknown>) => log('info',  msg, meta),
  warn:  (msg: string, meta?: Record<string, unknown>) => log('warn',  msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log('error', msg, meta),
}