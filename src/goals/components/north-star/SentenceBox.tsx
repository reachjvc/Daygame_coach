"use client"

/**
 * A box that holds one sentence, and knows what Enter means.
 *
 * Every short answer in this flow was a bare `<textarea rows={2}>`: the one
 * thing, where you are right now in an area, why it matters, what it costs you
 * to skip. Pressing Enter in any of them inserted a blank line into a two-line
 * box — the text scrolled out of sight and nothing said the answer had been
 * taken. It saves as you type, so it WAS taken, but "I pressed Enter and the
 * page did nothing" is what it looked like, nine times over.
 *
 * Enter keeps it: the box commits and blurs, and says so. Shift+Enter is still
 * a new line for the rare short answer that wants two. Prose boxes — a north
 * star, an ideal day, a list of experiences — keep the plain textarea, because
 * there Enter genuinely is a new line.
 *
 * This exists so the behaviour is decided once. `northStarKeys.test.tsx` fails
 * the build on any new one- or two-row textarea in this folder that goes
 * around it.
 */

import { useEffect, useRef, useState } from "react"
import { Check } from "lucide-react"

export const SENTENCE_HINT = "Enter to keep it · Shift+Enter for a new line"
export const SENTENCE_KEPT = "kept"

export function SentenceBox({
  value,
  onChange,
  onCommit,
  label,
  placeholder,
  rows = 2,
  id,
  className,
}: {
  value: string
  onChange: (text: string) => void
  /** Run when the sentence is committed with Enter, if there is more to do. */
  onCommit?: (text: string) => void
  label: string
  placeholder?: string
  rows?: number
  id?: string
  className?: string
}) {
  const [focused, setFocused] = useState(false)
  const [kept, setKept] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  return (
    <>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter" || e.shiftKey) return
          e.preventDefault()
          const text = value.trim()
          // Trim on commit, so Enter is also how a stray trailing space leaves.
          if (text !== value) onChange(text)
          onCommit?.(text)
          if (text) {
            setKept(true)
            if (timer.current) clearTimeout(timer.current)
            timer.current = setTimeout(() => setKept(false), 2500)
          }
          e.currentTarget.blur()
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        rows={rows}
        placeholder={placeholder}
        aria-label={label}
        className={className ?? "w-full rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-[13px] text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-white/30 transition-colors leading-relaxed resize-y"}
      />
      {/* The hint appears while typing and the confirmation after, so the box
          is never silent about what the key did. */}
      {(focused || kept) && (
        <p className="mt-1 text-[10px] text-zinc-600 flex items-center gap-1">
          {kept && !focused ? (
            <>
              <Check className="size-3 text-emerald-400/80" />
              <span className="text-emerald-300/80">{SENTENCE_KEPT}</span>
            </>
          ) : (
            SENTENCE_HINT
          )}
        </p>
      )}
    </>
  )
}
