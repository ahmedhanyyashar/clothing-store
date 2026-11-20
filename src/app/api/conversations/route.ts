import { NextResponse } from "next/server"

import { listConversations } from "@/lib/assistant/conversations"
import { getSession } from "@/lib/auth/session"

/** The signed-in shopper's chats, newest first. */
export async function GET() {
  const session = await getSession()
  if (!session)
    return new NextResponse(null, { status: 401 })
  return NextResponse.json(
    await listConversations(session.user.id)
  )
}
