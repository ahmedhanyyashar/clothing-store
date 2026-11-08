"use client"

import Script from "next/script"

import { useConsent } from "@/lib/consent"

/** Google Analytics, loaded only after the visitor allowed it. */
export function Analytics({
  id,
  nonce,
}: {
  id?: string
  nonce?: string
}) {
  const consent = useConsent()
  if (!id || consent !== "granted") return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
        nonce={nonce}
      />
      <Script
        id="ga-init"
        strategy="afterInteractive"
        nonce={nonce}
      >
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${id}', { anonymize_ip: true });`}
      </Script>
    </>
  )
}
