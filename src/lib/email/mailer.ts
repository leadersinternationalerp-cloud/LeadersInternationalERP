import nodemailer, { type Transporter } from 'nodemailer'
import { createServiceClient } from '@/utils/supabase/service'

let transporter: Transporter | null = null

export function getTransport(): Transporter {
  if (transporter) return transporter
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error('SMTP is not configured (SMTP_HOST/SMTP_USER/SMTP_PASS)')
  }
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 465),
    secure: (SMTP_SECURE ?? 'true') === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    requireTLS: true,
    tls: { minVersion: 'TLSv1.2' },
  })
  return transporter
}

export type MailResult = { ok: true; messageId: string } | { ok: false; error: string }

export async function sendMail(opts: {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
  template?: string
  headers?: Record<string, string>
}): Promise<MailResult> {
  const mailFromEmail = process.env.MAIL_FROM_EMAIL || process.env.SMTP_USER || 'noreply@leaders.ac.tz'
  const mailFromName = process.env.MAIL_FROM_NAME ?? 'Leaders International School'
  const from = `"${mailFromName}" <${mailFromEmail}>`

  const message = {
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text ?? opts.html.replace(/<[^>]+>/g, ' '),
    replyTo: opts.replyTo ?? process.env.MAIL_REPLY_TO,
    headers: {
      'X-Entity-Ref-ID': crypto.randomUUID(),
      ...opts.headers,
    },
  }

  let lastError = 'unknown'
  let messageId = ''

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const transport = getTransport()
      const info = await transport.sendMail(message)
      messageId = info.messageId

      // Log to email_logs
      try {
        const supabase = createServiceClient()
        await supabase.from('email_logs').insert({
          to: Array.isArray(opts.to) ? opts.to.join(', ') : opts.to,
          subject: opts.subject,
          template: opts.template || null,
          status: 'sent',
          provider_message_id: messageId,
        })
      } catch (logErr) {
        console.warn('Failed to log email send:', logErr)
      }

      return { ok: true, messageId }
    } catch (e: any) {
      lastError = e instanceof Error ? e.message : String(e)
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 2 ** attempt * 500))
      }
    }
  }

  // Record failure in email_logs
  try {
    const supabase = createServiceClient()
    await supabase.from('email_logs').insert({
      to: Array.isArray(opts.to) ? opts.to.join(', ') : opts.to,
      subject: opts.subject,
      template: opts.template || null,
      status: 'failed',
      error: lastError,
    })
  } catch (logErr) {
    console.warn('Failed to log email error:', logErr)
  }

  return { ok: false, error: lastError }
}

export const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!)
  )
