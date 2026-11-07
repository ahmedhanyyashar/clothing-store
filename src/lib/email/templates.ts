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
  action,
  url,
  outro,
}: {
  subject: string
  name: string
  intro: string
  action: string
  url: string
  outro: string
}): EmailContent {
  const greeting = `Hi ${name},`

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:system-ui,sans-serif;color:#111;">
    <div style="max-width:480px;margin:0 auto;padding:32px;background:#fff;border-radius:8px;">
      <p style="margin:0 0 24px;font-size:18px;font-weight:600;">${BRAND}</p>
      <p>${escapeHtml(greeting)}</p>
      <p>${escapeHtml(intro)}</p>
      <p style="margin:32px 0;">
        <a href="${escapeHtml(url)}" style="padding:12px 20px;background:#111;color:#fff;border-radius:6px;text-decoration:none;">${escapeHtml(action)}</a>
      </p>
      <p style="color:#555;font-size:14px;">${escapeHtml(outro)} This link expires in ${LINK_LIFETIME}.</p>
      <p style="color:#555;font-size:14px;">If the button does not work, copy this address into your browser:<br>${escapeHtml(url)}</p>
    </div>
  </body>
</html>`

  const text = [
    greeting,
    "",
    intro,
    "",
    `${action}: ${url}`,
    "",
    `${outro} This link expires in ${LINK_LIFETIME}.`,
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
    action: "Verify email",
    url,
    outro:
      "If you did not create an account, you can ignore this email.",
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
    action: "Reset password",
    url,
    outro:
      "If you did not request this, you can ignore this email.",
  })
}
