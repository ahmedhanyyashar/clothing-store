"use client"

import Image from "next/image"
import { useState } from "react"

import { cn } from "@/lib/utils"

export function ProductGallery({
  images,
  name,
}: {
  images: { url: string }[]
  name: string
}) {
  const [selected, setSelected] = useState(0)
  const current = images[selected] ?? images[0]

  if (!current) {
    return (
      <div
        role="img"
        aria-label="No image available"
        className="aspect-4/5 w-full rounded-2xl bg-muted"
      />
    )
  }

  return (
    <div className="flex flex-col-reverse gap-4 md:flex-row">
      {images.length > 1 && (
        <ul className="flex gap-3 md:flex-col">
          {images.map((image, index) => (
            <li key={image.url}>
              <button
                type="button"
                aria-label={`Show image ${index + 1} of ${images.length}`}
                aria-pressed={index === selected}
                onClick={() => setSelected(index)}
                className={cn(
                  "relative block h-24 w-20 overflow-hidden rounded-xl border-2 transition",
                  index === selected
                    ? "border-primary"
                    : "border-border"
                )}
              >
                <Image
                  src={image.url}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative aspect-4/5 w-full overflow-hidden rounded-2xl bg-muted">
        <Image
          src={current.url}
          alt={name}
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
    </div>
  )
}
