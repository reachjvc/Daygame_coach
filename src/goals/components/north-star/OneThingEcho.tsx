"use client"

/**
 * YOUR ONE THING, SHOWN SOMEWHERE THAT IS NOT THE STEP THAT OWNS IT.
 *
 * The Focus step used to echo the local draft — the text sitting in the box on
 * step 3, saved or not. That is the same mistake the tracking header made, one
 * layer down: a second screen reading a second value. Type a change on step 3
 * without saving and the two screens disagreed about what your one thing was.
 *
 * So this reads the account, like every other display of it. Renders nothing at
 * all when there is nothing saved — an empty violet box saying "your one thing"
 * over a blank is worse than no box.
 */

import { useEffect, useState } from "react"

export function OneThingEcho({
  label,
  editLabel,
  onEdit,
}: {
  label: string
  editLabel: string
  onEdit: () => void
}) {
  const [body, setBody] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    fetch("/api/life-answers?key=one_thing")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => live && setBody(d?.current?.body ?? null))
      .catch(() => live && setBody(null))
    return () => {
      live = false
    }
  }, [])

  if (!body) return null

  return (
    <section className="rounded-2xl border border-violet-400/25 bg-violet-500/[0.05] px-5 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-200/70">{label}</p>
      <p className="text-[13px] text-zinc-100 mt-1 leading-relaxed">{body}</p>
      <button
        onClick={onEdit}
        className="mt-2 text-[11px] text-zinc-500 hover:text-zinc-200 transition-colors"
      >
        {editLabel}
      </button>
    </section>
  )
}
