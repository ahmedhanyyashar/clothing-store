import { expect } from "@playwright/test"

const MAILPIT_URL =
  process.env.MAILPIT_URL ?? "http://localhost:8025"

type Summary = { ID: string; Subject: string }

async function messagesTo(
  address: string
): Promise<Summary[]> {
  const query = encodeURIComponent(`to:"${address}"`)
  const response = await fetch(
    `${MAILPIT_URL}/api/v1/search?query=${query}`
  )
  const { messages } = (await response.json()) as {
    messages: Summary[]
  }
  return messages
}

/** How many emails Mailpit holds for this address. */
export async function countEmails(address: string) {
  return (await messagesTo(address)).length
}

/**
 * Waits for the newest email to `address` whose subject matches, and returns
 * the first link in it, exactly as the recipient would click it.
 */
export async function waitForLink(
  address: string,
  subject: RegExp
) {
  let link: string | undefined

  await expect
    .poll(
      async () => {
        const match = (await messagesTo(address)).find(
          (message) => subject.test(message.Subject)
        )
        if (!match) return undefined

        const response = await fetch(
          `${MAILPIT_URL}/api/v1/message/${match.ID}`
        )
        const { Text } = (await response.json()) as {
          Text: string
        }
        link = Text.match(/https?:\/\/\S+/)?.[0]
        return link
      },
      {
        message: `no "${subject}" email arrived for ${address}`,
        timeout: 15_000,
      }
    )
    .toBeTruthy()

  return link!
}
