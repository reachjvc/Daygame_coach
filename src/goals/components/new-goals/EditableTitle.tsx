"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"

/**
 * Click-to-edit title used for pillars, objectives, and targets in the
 * new-goals flow. Renders `value` with a pencil affordance; clicking (or the
 * pencil) swaps to an input that commits on blur / Enter.
 */
export function EditableTitle({
  value,
  onCommit,
  className = "",
  inputClassName = "",
  ariaLabel = "Rename",
  style,
}: {
  value: string
  onCommit: (next: string) => void
  className?: string
  inputClassName?: string
  ariaLabel?: string
  style?: React.CSSProperties
}) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <input
        type="text"
        autoFocus
        defaultValue={value}
        aria-label={ariaLabel}
        onClick={(e) => e.stopPropagation()}
        onBlur={(e) => {
          const next = e.target.value.trim()
          if (next) onCommit(next)
          setEditing(false)
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur()
          if (e.key === "Escape") setEditing(false)
        }}
        className={`bg-white/10 border border-white/25 rounded px-1.5 py-0.5 text-white focus:outline-none focus:border-white/40 ${inputClassName}`}
      />
    )
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); setEditing(true) }}
      title="Click to rename"
      aria-label={ariaLabel}
      style={style}
      className={`group inline-flex items-center gap-1.5 text-left hover:opacity-80 transition-opacity ${className}`}
    >
      <span>{value}</span>
      <Pencil className="size-3 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </button>
  )
}
