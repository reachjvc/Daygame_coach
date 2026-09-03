"use client"

/**
 * YOUR ONE THING, SHOWN SOMEWHERE THAT IS NOT THE STEP THAT OWNS IT.
 *
 * The Focus step used to echo the local draft — the text sitting in the box on
 * step 3, saved or not. That is the same mistake the tracking header made, one
 * layer down: a second screen reading a second value. Type a change on step 3
 * without saving and the two screens disagreed about what your one thing was.
 *
 * So this shows the account, like every other display of it. Renders nothing at
 * all when there is nothing saved — an empty violet box saying "your one thing"
 * over a blank is worse than no box.
 *
 * IT NO LONGER FETCHES. It used to make its own request for the same sentence
 * the step and the rail were already asking for — three requests, three
 * hand-written shapes for the reply. The flow reads it once and passes it down.
 */

export function OneThingEcho({
  body,
  label,
  editLabel,
  onEdit,
}: {
  body: string | null
  label: string
  editLabel: string
  onEdit: () => void
}) {
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
