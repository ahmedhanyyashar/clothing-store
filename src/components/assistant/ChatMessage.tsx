import type { UIMessage } from "ai"
import Image from "next/image"
import Link from "next/link"

import { cn } from "@/lib/utils"

type Card = {
  id: string
  name: string
  price: string
  inStock: boolean
  imageUrl: string | null
}

type OrderLine = {
  number: string
  status: string
  total: string
  items: string[]
}

type Part = UIMessage["parts"][number]

function ProductList({ products }: { products: Card[] }) {
  if (products.length === 0) {
    return <p>Nothing matched.</p>
  }
  return (
    <ul className="space-y-2">
      {products.map((product) => (
        <li
          key={product.id}
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-2"
        >
          <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-muted">
            {product.imageUrl && (
              <Image
                src={product.imageUrl}
                alt=""
                fill
                sizes="48px"
                className="object-cover"
              />
            )}
          </div>
          <div className="min-w-0">
            <Link
              href={`/products/${product.id}`}
              className="line-clamp-1 font-medium underline-offset-4 hover:underline"
            >
              {product.name}
            </Link>
            <p className="text-xs text-muted-foreground">
              {product.price}
              {!product.inStock && " · Sold out"}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}

function OrderList({ orders }: { orders: OrderLine[] }) {
  if (orders.length === 0) return <p>No orders yet.</p>
  return (
    <ul className="space-y-2">
      {orders.map((order) => (
        <li
          key={order.number}
          className="rounded-lg border border-border bg-card p-2"
        >
          <Link
            href={`/account/orders/${order.number}`}
            className="font-medium underline-offset-4 hover:underline"
          >
            {order.number}
          </Link>
          <p className="text-xs text-muted-foreground">
            {order.status} · {order.total}
          </p>
          <p className="text-xs">
            {order.items.join(", ")}
          </p>
        </li>
      ))}
    </ul>
  )
}

/** What a finished tool call looks like in the chat: cards, or nothing. */
function ToolResult({
  name,
  output,
}: {
  name: string
  output: unknown
}) {
  switch (name) {
    case "searchProducts":
    case "getBestSellers":
    case "getLatestProducts":
      return <ProductList products={output as Card[]} />
    case "getProductDetails": {
      const details = output as
        { found: false } | ({ found: true } & Card)
      return details.found ? (
        <ProductList products={[details]} />
      ) : (
        <p>That product does not exist.</p>
      )
    }
    case "listMyOrders":
      return <OrderList orders={output as OrderLine[]} />
    default:
      // order status and the cart tools are explained in the model's own words
      return null
  }
}

function MessagePart({ part }: { part: Part }) {
  if (part.type === "text") {
    return (
      <p className="whitespace-pre-wrap">{part.text}</p>
    )
  }
  if (!part.type.startsWith("tool-")) return null

  const tool = part as {
    state: string
    output?: unknown
    errorText?: string
  }
  const name = part.type.slice("tool-".length)

  if (tool.state === "output-error") {
    return (
      <p role="alert" className="text-destructive">
        {tool.errorText ?? "That did not work."}
      </p>
    )
  }
  if (tool.state !== "output-available") {
    return <p className="text-muted-foreground">Working…</p>
  }
  return <ToolResult name={name} output={tool.output} />
}

export function ChatMessage({
  message,
}: {
  message: UIMessage
}) {
  const mine = message.role === "user"
  return (
    <div
      className={cn(
        "flex flex-col gap-2 text-sm",
        mine && "items-end"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] space-y-2 rounded-2xl px-3 py-2",
          mine
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        )}
      >
        {message.parts.map((part, index) => (
          <MessagePart key={index} part={part} />
        ))}
      </div>
    </div>
  )
}
