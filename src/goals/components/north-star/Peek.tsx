"use client"

/**
 * A long list, shown short: the first screenful, a fade, and a way to open it.
 *
 * THIS REPLACES DISCLOSURES ON BROWSING SURFACES. A closed dropdown labelled
 * "Browse all 131 values" tells you a number and nothing else. You cannot see
 * that the values come in groups, that one of the groups is Body, or that any
 * of it is the sort of thing you were about to type. Every one of those is a
 * reason to open it, and none of them survives being folded away. Worse, the
 * page ends up a column of closed rows: the flow had a disclosure inside a
 * disclosure inside a dialog before this.
 *
 * So the content is always on the page, clipped to a couple of rows with the
 * cut-off faded rather than sliced, which is the Strava move and reads the same
 * way here: there is more of this, it carries on like what you can see, open it
 * if you want it.
 *
 * The fade only appears when something is actually hidden. Measured, not
 * guessed, because the same panel holds nine chips in one area and ninety in
 * another, and a fade over nothing showing is a lie about there being more.
 *
 * Built from what the project already does: the gradient is `V11ViewD`'s column
 * overflow fade, and the pill is `RecentSessionsCard`'s "N more".
 */

import { useEffect, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"

export function Peek({
  children,
  collapsedHeight = 168,
  more,
  less = "Show less",
  /**
   * The colour the fade runs into. Defaults to the page, which is right for the
   * cards on it, since they are two percent white over the same zinc.
   */
  fadeFrom = "from-zinc-950",
}: {
  children: React.ReactNode
  collapsedHeight?: number
  /** The open control's label, e.g. "Show all 131 values". */
  more: string
  less?: string
  fadeFrom?: string
}) {
  const inner = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)

  useEffect(() => {
    const el = inner.current
    if (!el) return
    // A few pixels of slack: a list one line over the limit is not worth a
    // control, and sub-pixel layout makes an exact comparison flicker.
    const check = () => setOverflows(el.scrollHeight > collapsedHeight + 12)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [collapsedHeight])

  const clipped = overflows && !expanded

  return (
    <div>
      <div className="relative" style={clipped ? { maxHeight: collapsedHeight, overflow: "hidden" } : undefined}>
        <div ref={inner}>{children}</div>
        {clipped && (
          <div className={`pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t ${fadeFrom} via-zinc-950/70 to-transparent`} />
        )}
      </div>

      {overflows && (
        <PeekButton
          expanded={expanded}
          more={more}
          less={less}
          onToggle={() => setExpanded((v) => !v)}
          overlap={clipped}
        />
      )}
    </div>
  )
}

/**
 * The control on its own, for surfaces that clip by COUNT rather than height.
 *
 * The value list is one: it shows every category from the top with the first
 * few words under each, which is a per-cell truncation and not something a
 * height clip can express. Same pill either way, because it is the same promise.
 */
export function PeekButton({ expanded, more, less = "Show less", onToggle, overlap = false }: {
  expanded: boolean
  more: string
  less?: string
  onToggle: () => void
  /** Pull it up over a fade, the way the height-clipped version sits. */
  overlap?: boolean
}) {
  return (
    <div className="flex justify-center">
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/15 bg-zinc-900 text-[11px] text-zinc-300 hover:text-white hover:border-white/30 transition-colors ${
          overlap ? "-mt-3 relative z-10" : "mt-2"
        }`}
      >
        {expanded ? less : more}
        <ChevronDown className={`size-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
    </div>
  )
}
