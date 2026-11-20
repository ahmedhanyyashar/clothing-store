import { NextResponse } from "next/server"

import {
  deleteConversation,
  getConversation,
} from "@/lib/assistant/conversations"
import { getSession } from "@/lib/auth/session"

type Context = { params: Promise<{ id: string }> }

export async function GET(
  _request: Request,
  { params }: Context
) {
  const session = await getSession()
  if (!session)
    return new NextResponse(null, { status: 401 })
  const conversation = await getConversation(
    session.user.id,
    (await params).id
  )
  return conversation
    ? NextResponse.json(conversation)
    : new NextResponse(null, { status: 404 })
}

export async function DELETE(
  _request: Request,
  { params }: Context
) {
  const session = await getSession()
  if (!session)
    return new NextResponse(null, { status: 401 })
  const deleted = await deleteConversation(
    session.user.id,
    (await params).id
  )
  return new NextResponse(null, {
    status: deleted ? 204 : 404,
  })
}
