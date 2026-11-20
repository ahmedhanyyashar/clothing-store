"use client"

import { useChat } from "@ai-sdk/react"
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from "ai"
import { Loader2, Trash2 } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import {
  CART_TOOLS,
  CartToolError,
  runCartTool,
  type CartToolName,
} from "@/components/assistant/cart-tools"
import { ChatMessage } from "@/components/assistant/ChatMessage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth/client"

type Saved = { id: string; title: string | null }

const isCartTool = (name: string): name is CartToolName =>
  (CART_TOOLS as readonly string[]).includes(name)

function Session({
  initialId,
  initialMessages,
}: {
  initialId?: string
  initialMessages?: UIMessage[]
}) {
  const [text, setText] = useState("")
  // the server names a conversation on its first reply; later requests reuse it
  const conversationId = useRef(initialId)

  // the callbacks run on send and on reply, never while rendering
  /* eslint-disable react-hooks/refs */
  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        fetch: async (input, init) => {
          const response = await fetch(input, init)
          const id = response.headers.get(
            "x-conversation-id"
          )
          if (id) conversationId.current = id
          return response
        },
        prepareSendMessagesRequest: ({ messages }) => ({
          body: { id: conversationId.current, messages },
        }),
      })
  )
  /* eslint-enable react-hooks/refs */

  const { messages, sendMessage, status, addToolOutput } =
    useChat({
      messages: initialMessages,
      transport,
      sendAutomaticallyWhen:
        lastAssistantMessageIsCompleteWithToolCalls,
      async onToolCall({ toolCall }) {
        if (
          toolCall.dynamic ||
          !isCartTool(toolCall.toolName)
        )
          return
        const { toolName, toolCallId, input } = toolCall
        try {
          const output = await runCartTool(toolName, input)
          if (toolName === "addToCart") {
            toast.success("Added to your cart.")
          }
          addToolOutput({
            tool: toolName,
            toolCallId,
            output,
          })
        } catch (error) {
          addToolOutput({
            tool: toolName,
            toolCallId,
            state: "output-error",
            errorText:
              error instanceof CartToolError
                ? error.message
                : "That did not work.",
          })
        }
      },
    })

  const busy =
    status === "submitted" || status === "streaming"

  return (
    <>
      <div
        className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
        aria-live="polite"
      >
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Ask me to find products, put something in your
            cart, or look up an order.
          </p>
        )}
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {status === "submitted" && (
          <Loader2
            className="size-4 animate-spin text-muted-foreground"
            aria-label="Waiting for a reply"
          />
        )}
        {status === "error" && (
          <p
            role="alert"
            className="text-sm text-destructive"
          >
            Something went wrong. Please try again in a
            moment.
          </p>
        )}
      </div>
      <form
        className="flex gap-2 border-t border-border p-4"
        onSubmit={(event) => {
          event.preventDefault()
          if (!text.trim() || busy) return
          void sendMessage({ text })
          setText("")
        }}
      >
        <Input
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={1000}
          placeholder="Ask about the shop"
          aria-label="Your message"
        />
        <Button type="submit" disabled={busy}>
          Send
        </Button>
      </form>
    </>
  )
}

function History({
  onOpen,
}: {
  onOpen: (id: string) => void
}) {
  const [chats, setChats] = useState<Saved[] | null>(null)

  useEffect(() => {
    let stale = false
    fetch("/api/conversations")
      .then((response) =>
        response.ok ? response.json() : []
      )
      .then((rows: Saved[]) => {
        if (!stale) setChats(rows)
      })
      .catch(() => {
        if (!stale) setChats([])
      })
    return () => {
      stale = true
    }
  }, [])

  async function remove(id: string) {
    const response = await fetch(
      `/api/conversations/${id}`,
      {
        method: "DELETE",
      }
    )
    if (response.ok) {
      setChats(
        (rows) =>
          rows?.filter((row) => row.id !== id) ?? null
      )
      toast.success("Conversation deleted.")
    }
  }

  if (!chats) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        Loading…
      </p>
    )
  }
  if (chats.length === 0) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        No saved conversations yet.
      </p>
    )
  }
  return (
    <ul className="flex-1 space-y-1 overflow-y-auto p-4">
      {chats.map((chat) => (
        <li
          key={chat.id}
          className="flex items-center gap-2"
        >
          <Button
            variant="ghost"
            className="min-w-0 flex-1 justify-start"
            onClick={() => onOpen(chat.id)}
          >
            <span className="truncate">
              {chat.title ?? "New chat"}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Delete conversation"
            aria-label={`Delete conversation ${chat.title ?? "New chat"}`}
            onClick={() => void remove(chat.id)}
          >
            <Trash2 />
          </Button>
        </li>
      ))}
    </ul>
  )
}

type Open = {
  key: number
  id?: string
  messages?: UIMessage[]
}

export function ChatPanel() {
  const { data } = authClient.useSession()
  const signedIn = Boolean(data)
  const [view, setView] = useState<"chat" | "history">(
    "chat"
  )
  const [open, setOpen] = useState<Open>({ key: 0 })

  async function openChat(id: string) {
    const response = await fetch(`/api/conversations/${id}`)
    if (!response.ok) {
      toast.error("That conversation could not be opened.")
      return
    }
    const chat = (await response.json()) as {
      messages: UIMessage[]
    }
    setOpen((current) => ({
      key: current.key + 1,
      id,
      messages: chat.messages,
    }))
    setView("chat")
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {signedIn && (
        <div className="flex gap-2 border-b border-border px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setOpen((current) => ({
                key: current.key + 1,
              }))
              setView("chat")
            }}
          >
            New chat
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={view === "history"}
            onClick={() =>
              setView(
                view === "history" ? "chat" : "history"
              )
            }
          >
            History
          </Button>
        </div>
      )}
      {view === "history" ? (
        <History onOpen={(id) => void openChat(id)} />
      ) : (
        <Session
          key={open.key}
          initialId={open.id}
          initialMessages={open.messages}
        />
      )}
      <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
        Messages go to Google&apos;s Gemini.
        {signedIn
          ? " Your conversations are saved to your account."
          : " Sign in to keep your conversations."}{" "}
        <Link href="/privacy" className="underline">
          Privacy
        </Link>
      </p>
    </div>
  )
}
