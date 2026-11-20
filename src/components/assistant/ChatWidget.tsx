"use client"

import { MessageCircle, X } from "lucide-react"
import { useState } from "react"

import { ChatPanel } from "@/components/assistant/ChatPanel"
import { Button } from "@/components/ui/button"

/**
 * The launcher and the chat panel. The panel stays mounted while closed, so
 * closing it does not end the conversation. Rendered only when the assistant
 * is on.
 */
export function ChatWidget() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {!open && (
        <div className="fixed right-4 bottom-4 z-40">
          <Button
            size="icon-lg"
            title="Open the shopping assistant"
            aria-label="Open the shopping assistant"
            onClick={() => setOpen(true)}
          >
            <MessageCircle />
          </Button>
        </div>
      )}
      <section
        aria-label="Shopping assistant"
        hidden={!open}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false)
        }}
        className="fixed inset-x-0 bottom-0 z-40 flex h-[min(36rem,100dvh)] flex-col border border-border bg-background shadow-lg sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-96 sm:rounded-2xl"
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-2">
          <h2 className="font-semibold">
            Shopping assistant
          </h2>
          <Button
            variant="ghost"
            size="icon"
            title="Close the assistant"
            aria-label="Close the assistant"
            onClick={() => setOpen(false)}
          >
            <X />
          </Button>
        </header>
        <ChatPanel />
      </section>
    </>
  )
}
