import nodemailer, { type Transporter } from "nodemailer"

import { env } from "@/env"
import { DEMO_DOMAIN } from "@/lib/demo/accounts"

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

/**
 * Whether a message is for a demo account. Those addresses do not exist, so a
 * real mail server would only bounce them.
 */
export const isDemoRecipient = (to: string) =>
  to.toLowerCase().endsWith(DEMO_DOMAIN)

export async function sendEmail(message: EmailMessage) {
  if (env.DEMO_MODE && isDemoRecipient(message.to)) return
  await send(message)
}
