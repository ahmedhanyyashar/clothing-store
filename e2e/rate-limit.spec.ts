import { expect, test } from "./support/test"

test("repeated sign-in attempts from one client are throttled", async ({
  request,
  baseURL,
}) => {
  const statuses: number[] = []

  for (let attempt = 0; attempt < 6; attempt++) {
    const response = await request.post(
      "/api/auth/sign-in/email",
      {
        headers: { origin: baseURL! },
        data: {
          email: "nobody@example.com",
          password: "wrong-password-here",
        },
      }
    )
    statuses.push(response.status())
  }

  expect(statuses).toContain(429)
  // the first attempts are answered normally, not throttled
  expect(statuses[0]).not.toBe(429)
})
