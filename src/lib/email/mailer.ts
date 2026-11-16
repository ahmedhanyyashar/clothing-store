import nodemailer, { type Transporter } from "nodemailer"

import { env } from "@/env"

export type EmailMessage = {
  to: string
  subject: string
  html: string
  text: string
}

/** Builds a send function around any nodemailer-compatible transport. */
export function createMailer(
  transport: Pick<Transporter, "sendMail">,
  from: string
) {
  return async function sendEmail(message: EmailMessage) {
    await transport.sendMail({ from, ...message })
  }
}

// SMTP keeps the provider swappable: Mailpit locally, any SMTP service in
// production. The connection opens on the first send, not at import.
const send = createMailer(
  nodemailer.createTransport(env.SMTP_URL),
  `Clothing Store <${env.EMAIL_FROM}>`
)

export async function sendEmail(message: EmailMessage) {
  // `.example` is a reserved name that never reaches a real inbox, and the demo
  // accounts use it: mailing them can only bounce (or fail in the SES sandbox),
  // so nothing is sent, in any environment.
  if (message.to.toLowerCase().endsWith(".example")) return
  await send(message)
}
