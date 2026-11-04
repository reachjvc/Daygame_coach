"use client"

/**
 * A NAME YOU RENAME BY TYPING: THE FIELD SHOWS WHAT YOU TYPE, THE RECORD GETS IT TRIMMED.
 *
 * The rename boxes in Manage showed the stored name and wrote every keystroke back to
 * it. For a tag that write trimmed, so typing "deep focus" lost the space the moment it
 * was typed and saved "deepfocus" (heavy-user audit of 2026-11-04, D5). For a client it
 * did not trim, so clearing the box stored an empty name — a row the database refuses
 * (`*_name_not_blank`), which stops the rest of the upload behind it.
 *
 * So the box holds its own text while it has focus. Each change still reaches the
 * record at once, other screens follow as you type, but trimmed, and never blank: a
 * cleared box keeps the last real name. Leaving the box (blur or Enter) shows the
 * stored name again, which is where the trim becomes visible. Escape puts back the
 * name the box had when you came in.
 */

import { useRef, useState } from "react"

import { Input } from "@/components/ui/input"

export function NameField({
  value,
  onRename,
  ariaLabel,
  className,
}: {
  value: string
  onRename: (name: string) => void
  /** what a screen reader says for the box, e.g. "Tag name" */
  ariaLabel: string
  className?: string
}) {
  const [typed, setTyped] = useState<string | null>(null)
  const original = useRef(value)

  return (
    <Input
      value={typed ?? value}
      aria-label={ariaLabel}
      className={className}
      onFocus={() => {
        original.current = value
      }}
      onChange={(event) => {
        const raw = event.target.value
        setTyped(raw)
        const name = raw.trim()
        if (name && name !== value) onRename(name)
      }}
      onBlur={() => setTyped(null)}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur()
        if (event.key === "Escape") {
          if (original.current !== value) onRename(original.current)
          event.currentTarget.blur()
        }
      }}
    />
  )
}
