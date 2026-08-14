"use client"

/**
 * The value list, under any values box: groups, chips, and a way in for a word
 * we never thought of.
 *
 * IT IS NOT A DROPDOWN. It was, and a closed row saying "Browse all 131 values"
 * is the worst version of this: it tells you a count and hides the two things
 * that would make you open it, which are that the values come in groups and
 * that the groups are the sort of thing you were trying to think of. Now the
 * first few groups are simply on the page, cut off with a fade, and the control
 * underneath opens the rest.
 *
 * The lead group is whatever the surface above knows: on the first list it is
 * the menu he reads out loud, on the second it is the words read back out of
 * the user's own paragraph. That is why it is a prop rather than a constant.
 *
 * The search box adds as well as filters. Anything typed that is not already a
 * word becomes a button that adds it, because a list of 131 will always be
 * missing somebody's, and "enjoyment is not here, now what" is the moment the
 * exercise stops.
 */

import { useState } from "react"
import { Plus } from "lucide-react"
import { NS_VALUE_GROUPS, NS_VALUE_LIBRARY, VALUES_BROWSE } from "@/src/goals/data/northStar"
import { PeekButton } from "./Peek"

/** Words shown per category before the fade. Four fits four categories wide. */
const PREVIEW = 4

export function ValueBrowser({ items, onAdd, label, lead }: {
  /** What is already on the list this adds to, so those words are not offered. */
  items: string[]
  onAdd: (value: string) => void
  /** The list's own name, so each chip says what it adds to. */
  label: string
  /** The surface's own prompt, shown first and named in its own words. */
  lead?: { label: string; values: string[]; color?: string }
}) {
  const [query, setQuery] = useState("")
  const [expanded, setExpanded] = useState(false)

  const used = new Set(items.map((i) => i.trim().toLowerCase()))
  const typed = query.trim()
  const q = typed.toLowerCase()

  const match = (v: string) => !used.has(v.toLowerCase()) && (!q || v.toLowerCase().includes(q))
  const leadGroup = lead
    ? { label: lead.label, color: lead.color ?? "#a1a1aa", values: lead.values.filter(match) }
    : null
  // Nothing is offered twice on one panel: a word in the lead group is dropped
  // from its home group underneath.
  const inLead = new Set((lead?.values ?? []).map((v) => v.toLowerCase()))
  const groups = NS_VALUE_GROUPS
    .map((g) => ({ ...g, values: g.values.filter((v) => match(v) && !inLead.has(v.toLowerCase())) }))
    .filter((g) => g.values.length > 0)

  const all = leadGroup && leadGroup.values.length > 0 ? [leadGroup, ...groups] : groups
  /** A search is already a filter, so nothing is held back behind the control. */
  const showAll = expanded || q.length > 0
  const more = all.reduce((n, g) => n + Math.max(0, g.values.length - PREVIEW), 0)

  /**
   * The typed word, when it is not already a word on either list. This is the
   * whole point of the box.
   */
  const exact = NS_VALUE_LIBRARY.some((v) => v.toLowerCase() === q) || inLead.has(q) || used.has(q)
  const own = typed && !exact ? typed : null

  const addOwn = () => {
    if (!own) return
    onAdd(own)
    setQuery("")
  }

  return (
    <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOwn() } }}
        placeholder={VALUES_BROWSE.search}
        aria-label={`${VALUES_BROWSE.search}, adding to “${label}”`}
        className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-1 text-[12px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/30 transition-colors"
      />

      {/* The word they typed, addable as it stands. Above the matches, because
          if they typed it they already know what they mean. */}
      {own ? (
        <div className="mt-2">
          <button
            onClick={addOwn}
            className="inline-flex items-center gap-1.5 text-[11.5px] px-2.5 py-1 rounded-lg border border-violet-500/40 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25 transition-colors"
          >
            <Plus className="size-3" />
            {VALUES_BROWSE.add(typed)}
          </button>
          <p className="text-[10px] text-zinc-600 mt-1">{VALUES_BROWSE.addNote}</p>
        </div>
      ) : (
        <p className="text-[10px] text-zinc-600 mt-1.5">{VALUES_BROWSE.note}</p>
      )}

      {all.length === 0 ? (
        !own && <p className="text-[11px] text-zinc-500 mt-2 leading-relaxed">{VALUES_BROWSE.none}</p>
      ) : (
        <div className="mt-2">
          {/* EVERY CATEGORY IS VISIBLE FROM THE TOP, each showing its first few
              words, each fading into the rest.
              Two earlier passes both lost that. Wrapped rows put Health beside
              Vitality beside Energy with the headings a whole row apart, so the
              groups stopped reading as groups. CSS columns fixed the direction
              and broke the same thing a different way: balancing eleven groups
              across three columns and then clipping the height showed three
              headings and hid the other eight, which is the disclosure problem
              again with extra steps.
              So the clip is per category, not per panel: one cell each, words
              running down inside it, four of them and a fade. What is on screen
              is the shape of the whole list. */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-3">
            {all.map((g) => {
              const shown = showAll ? g.values : g.values.slice(0, PREVIEW)
              const hidden = g.values.length - shown.length
              return (
                <div key={g.label} className="min-w-0">
                  {/* The heading carries its group's colour, and so does every
                      chip under it. Eleven groups of identical grey chips is a
                      wall of text you have to read; colour makes the block you
                      are looking for findable before you have read a word. */}
                  <p
                    className="text-[9.5px] font-semibold uppercase tracking-[0.14em] truncate flex items-center gap-1.5"
                    style={{ color: g.color }}
                    title={g.label}
                  >
                    <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                    {g.label}
                  </p>
                  <div className="relative">
                    <div className="flex flex-col items-start gap-1 mt-1">
                      {shown.map((v) => (
                        <button
                          key={v}
                          onClick={() => onAdd(v)}
                          aria-label={`Add ${v} to “${label}”`}
                          style={{ borderColor: `${g.color}44`, backgroundColor: `${g.color}0f`, color: "#d4d4d8" }}
                          className="max-w-full text-[10.5px] px-2 py-0.5 rounded-full border hover:brightness-125 transition-all truncate"
                        >
                          + {v}
                        </button>
                      ))}
                    </div>
                    {hidden > 0 && (
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-7 bg-gradient-to-t from-zinc-950 to-transparent" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {more > 0 && (
            <PeekButton
              expanded={showAll}
              more={VALUES_BROWSE.more(NS_VALUE_LIBRARY.length)}
              onToggle={() => setExpanded((v) => !v)}
            />
          )}
        </div>
      )}
    </div>
  )
}
