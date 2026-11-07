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
export const sendEmail = createMailer(
  nodemailer.createTransport(env.SMTP_URL),
  `Clothing Store <${env.EMAIL_FROM}>`
)
