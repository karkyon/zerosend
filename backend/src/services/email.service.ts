// =====================================
// ファイルパス  : zerosend/src/services/email.service.ts
//
// 説明・目的・機能概要:
//   メール送信サービス（Nodemailer ラッパー）。
//   開発環境では MailHog（localhost:1025）、本番環境では SMTP サーバを使用する。
//   受信者へのダウンロードリンク通知メールの送信を担当する。
//
// 作成日時 : 2026-02-21
// 更新日時 : 2026-02-21
//
// 依存関係:
//   nodemailer, ../utils/logger, ../types/errors
// =====================================

import nodemailer from 'nodemailer'
import { logger } from '../utils/logger.js'
import { EmailFailedError } from '../types/errors.js'

// Nodemailer トランスポート (開発: MailHog, 本番: SMTP)
function createTransport() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST   ?? 'localhost',
    port:   Number(process.env.SMTP_PORT ?? 1025),
    secure: process.env.SMTP_SECURE === 'true',
    auth:   process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  })
}

export type SendDownloadLinkInput = {
  to:        string
  shareUrl:  string
  expiresAt: Date
}

export async function sendDownloadLink(input: SendDownloadLinkInput): Promise<void> {
  const transporter = createTransport()
  const expiresStr  = input.expiresAt.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })

  try {
    await transporter.sendMail({
      from:    process.env.EMAIL_FROM ?? 'noreply@zerosend.example.com',
      to:      input.to,
      subject: '【ZeroSend】ファイルが届いています',
      text: [
        '安全なファイルが届いています。',
        '',
        `ダウンロードリンク: ${input.shareUrl}`,
        `有効期限: ${expiresStr}`,
        '',
        '※ このリンクは一度きりの使用となります。',
        '※ 二要素認証が必要です。',
      ].join('\n'),
      html: `
        <p>安全なファイルが届いています。</p>
        <p><a href="${input.shareUrl}" style="background:#2563EB;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">ファイルをダウンロード</a></p>
        <p>有効期限: ${expiresStr}</p>
        <p><small>このリンクは一度きりの使用です。二要素認証が必要です。</small></p>
      `,
    })
    logger.info('[EmailService] Download link sent', { to: input.to })
  } catch (err) {
    logger.error('[EmailService] Failed to send email', { err, to: input.to })
    throw new EmailFailedError(`Failed to send email to ${input.to}`)
  }
}