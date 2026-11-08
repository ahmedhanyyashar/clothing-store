export type EmailContent = {
  subject: string
  html: string
  text: string
}

const BRAND = "Clothing Store"
const LINK_LIFETIME = "1 hour"

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function render({
  subject,
  name,
  intro,
  sections = [],
  action,
  outro,
}: {
  subject: string
  name: string
  intro: string
  /** Titled lists of plain lines, shown between the intro and the button. */
  sections?: { title: string; lines: string[] }[]
  /** The button. A notice that needs no response has none. */
  action?: { label: string; url: string }
  outro: string
}): EmailContent {
  const greeting = `Hi ${name},`

  const sectionsHtml = sections
    .map(
      ({ title, lines }) => `
      <p style="margin:24px 0 4px;font-weight:600;">${escapeHtml(title)}</p>
      <p style="margin:0;color:#333;">${lines.map(escapeHtml).join("<br>")}</p>`
    )
    .join("")

  const button = action
    ? `
      <p style="margin:32px 0;">
        <a href="${escapeHtml(action.url)}" style="padding:12px 20px;background:#111;color:#fff;border-radius:6px;text-decoration:none;">${escapeHtml(action.label)}</a>
      </p>`
    : ""
  const fallback = action
    ? `
      <p style="color:#555;font-size:14px;">If the button does not work, copy this address into your browser:<br>${escapeHtml(action.url)}</p>`
    : ""

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:system-ui,sans-serif;color:#111;">
    <div style="max-width:480px;margin:0 auto;padding:32px;background:#fff;border-radius:8px;">
      <p style="margin:0 0 24px;font-size:18px;font-weight:600;">${BRAND}</p>
      <p>${escapeHtml(greeting)}</p>
      <p>${escapeHtml(intro)}</p>${sectionsHtml}${button}
      <p style="color:#555;font-size:14px;">${escapeHtml(outro)}</p>${fallback}
    </div>
  </body>
</html>`

  const text = [
    greeting,
    "",
    intro,
    ...sections.flatMap(({ title, lines }) => [
      "",
      `${title}:`,
      ...lines,
    ]),
    ...(action
      ? ["", `${action.label}: ${action.url}`]
      : []),
    "",
    outro,
  ].join("\n")

  return { subject, html, text }
}

export function verificationEmail({
  name,
  url,
}: {
  name: string
  url: string
}) {
  return render({
    subject: `Verify your email for ${BRAND}`,
    name,
    intro: `Thanks for signing up. Confirm your email address to finish creating your account.`,
    action: { label: "Verify email", url },
    outro: `If you did not create an account, you can ignore this email. This link expires in ${LINK_LIFETIME}.`,
  })
}

export function passwordResetEmail({
  name,
  url,
}: {
  name: string
  url: string
}) {
  return render({
    subject: `Reset your ${BRAND} password`,
    name,
    intro: `We received a request to reset the password for your account.`,
    action: { label: "Reset password", url },
    outro: `If you did not request this, you can ignore this email. This link expires in ${LINK_LIFETIME}.`,
  })
}

/** Tells the owner of an account that its password changed, with a way out if it was not them. */
export function passwordChangedEmail({
  name,
  resetUrl,
}: {
  name: string
  resetUrl: string
}) {
  return render({
    subject: `Your ${BRAND} password was changed`,
    name,
    intro: `The password for your account was just changed.`,
    action: { label: "Reset password", url: resetUrl },
    outro: `If this was you, no action is needed. If it was not, reset your password now.`,
  })
}

/** What the customer ordered, where it goes, what it costs, and a link to the order. */
export function orderConfirmationEmail({
  name,
  number,
  url,
  items,
  totals,
  address,
}: {
  name: string
  number: string
  url: string
  items: string[]
  totals: string[]
  address: string[]
}) {
  return render({
    subject: `Your ${BRAND} order ${number}`,
    name,
    intro: `Thank you for your order. Your order number is ${number}.`,
    sections: [
      { title: "Items", lines: items },
      { title: "Totals", lines: totals },
      { title: "Delivery address", lines: address },
    ],
    action: { label: "View your order", url },
    outro:
      "You can cancel the order from your account until it is confirmed.",
  })
}

const STATUS_COPY = {
  SHIPPED: {
    subject: (number: string) =>
      `Your ${BRAND} order ${number} has shipped`,
    intro: (number: string) =>
      `Good news: your order ${number} is on its way.`,
  },
  DELIVERED: {
    subject: (number: string) =>
      `Your ${BRAND} order ${number} was delivered`,
    intro: (number: string) =>
      `Your order ${number} was delivered. We hope you enjoy it.`,
  },
  CANCELLED: {
    subject: (number: string) =>
      `Your ${BRAND} order ${number} was cancelled`,
    intro: (number: string) =>
      `Your order ${number} was cancelled.`,
  },
} as const

/**
 * Tells a customer that their order moved on. `refund` is the amount being
 * given back to their card, or null when no money had been taken.
 */
export function orderStatusEmail({
  name,
  number,
  status,
  url,
  refund,
}: {
  name: string
  number: string
  status: keyof typeof STATUS_COPY
  url: string
  refund: string | null
}) {
  const copy = STATUS_COPY[status]
  return render({
    subject: copy.subject(number),
    name,
    intro:
      status === "CANCELLED" && refund
        ? `${copy.intro(number)} ${refund} is being refunded to your card; it can take a few days to appear.`
        : copy.intro(number),
    action: { label: "View your order", url },
    outro: "If something looks wrong, reply to this email.",
  })
}
