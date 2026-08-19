"use client"

/**
 * Everything already said to matter, ranked by how much of your life it runs
 * through, and where each of it was said.
 *
 * THE PROBLEM THIS SOLVES. The values step used to open on two empty boxes and
 * ask "what matters to you", which by then is the sixth time of asking. The
 * five earlier times all left something behind — a word tapped off the menu on
 * the first list, a chip clicked inside Health, a value hung on one goal, a
 * paragraph that says "my kids" twice — and every one of them was thrown away
 * the moment its box closed. So people retyped half of it from memory and lost
 * the other half.
 *
 * BREADTH IS THE WEIGHT, NOT VOLUME. A value named in Health, Relationship and
 * Money runs through three parts of a life. One named three times inside Health
 * runs through one part loudly. Both are three mentions and only the first is
 * load-bearing, so the row leads with a dot per area in that area's own colour
 * — the wheel's colours, so the dots mean the same thing here as they do there
 * — and the count says "3 areas" before it says anything about times. Three
 * coloured dots is a comparison you make without reading; "named 3 times,
 * across 3 places" is a sentence you have to parse eleven of.
 *
 * There is no score. A computed number deciding which of somebody's values
 * outranks which is exactly the authorship this flow does not take: the dots
 * report what they wrote and the ordering downstairs is still theirs.
 *
 * FIVE, THEN THE REST. The heaviest handful is the comparison worth making. A
 * twelve-area plan makes thirty of these, and thirty rows above the exercise is
 * a wall, not a head start.
 *
 * WHAT IT WILL NOT DO. It never adds anything for you, and it never lets a word
 * read out of prose pass as a word somebody chose: cued values are drawn
 * dashed, say so, and sort below everything clicked however loudly they cued.
 *
 * Aggregation is `valueEvidence` in northStarService.
 */

import { useState } from "react"
import type { NsPlan, NsValueEvidence, NsValueMention } from "@/src/goals/types"
import { VALUES_EVIDENCE } from "@/src/goals/data/northStar"
import { valueEvidence } from "@/src/goals/northStarService"
import { PeekButton } from "./Peek"

/** How many rows stand before the clip. */
const PREVIEW = 5

/**
 * The areas a value runs through, one dot each, in the wheel's own colours.
 *
 * Titled and labelled with the area names, because a colour nobody has
 * memorised is decoration until it is also readable.
 */
function AreaDots({ plan, areaIds }: { plan: NsPlan; areaIds: string[] }) {
  if (areaIds.length === 0) return null
  const labels = areaIds.map((id) => plan.areas.find((a) => a.id === id)?.label ?? id)
  return (
    <span className="flex items-center gap-1 shrink-0" title={VALUES_EVIDENCE.areasIn(labels)} aria-label={VALUES_EVIDENCE.areasIn(labels)}>
      {areaIds.map((id, i) => (
        <span
          key={id}
          className="size-1.5 rounded-full shrink-0"
          style={{ backgroundColor: plan.areas.find((a) => a.id === id)?.color ?? "#a1a1aa" }}
          // The names are on the wrapper already; the dots are one picture.
          aria-hidden
          data-area={labels[i]}
        />
      ))}
    </span>
  )
}

/** One "where it came from" chip. Clicking it opens that box. */
function WhereChip({ mention, onGoTo }: { mention: NsValueMention; onGoTo: (m: NsValueMention) => void }) {
  const cued = mention.kind === "writing"
  return (
    <button
      onClick={() => onGoTo(mention)}
      title={cued ? VALUES_EVIDENCE.cuedNote : VALUES_EVIDENCE.jump(mention.where)}
      aria-label={VALUES_EVIDENCE.jump(mention.where)}
      className={`text-[10.5px] px-2 py-0.5 rounded-full border transition-colors ${
        cued
          ? "border-dashed border-white/10 text-zinc-500 hover:text-zinc-300 hover:border-white/25"
          : "border-white/15 text-zinc-300 hover:text-white hover:border-white/35"
      }`}
    >
      {mention.where}
      {mention.hits > 1 && <span className="text-zinc-600 tabular-nums"> ×{mention.hits}</span>}
    </button>
  )
}

function EvidenceRow({ plan, row, onAdd, onGoTo }: {
  plan: NsPlan
  row: NsValueEvidence
  /** Null on rows already on the order — those show their place instead. */
  onAdd: ((value: string) => void) | null
  onGoTo: (m: NsValueMention) => void
}) {
  return (
    <li className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
      <div className="flex items-center gap-2">
        {row.rank !== null && (
          <span className="text-[11px] tabular-nums text-zinc-500 w-4 shrink-0">{row.rank}.</span>
        )}
        <span className="text-[13px] text-zinc-100 min-w-0 truncate">{row.value}</span>
        {/* The weight, right-aligned in a fixed column so eleven rows can be
            ranked down the edge without reading a word of any of them. */}
        <span className="ml-auto flex items-center gap-2 shrink-0">
          <AreaDots plan={plan} areaIds={row.areas} />
          <span className={`text-[10.5px] tabular-nums text-right ${row.chosen ? "text-zinc-400" : "text-zinc-600"} w-[104px]`}>
            {VALUES_EVIDENCE.count(row.areas.length, row.hits)}
          </span>
          {onAdd && (
            <button
              onClick={() => onAdd(row.value)}
              className="text-[10.5px] px-2 py-0.5 rounded-full border border-violet-400/30 text-violet-200/90 hover:bg-violet-500/10 transition-colors"
            >
              + {VALUES_EVIDENCE.add}
            </button>
          )}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {row.mentions.map((m) => (
          <WhereChip key={`${m.kind}-${m.where}`} mention={m} onGoTo={onGoTo} />
        ))}
      </div>
    </li>
  )
}

/**
 * One bucket, clipped to the first five.
 *
 * Clipped by COUNT rather than height: a height clip cuts through the middle of
 * a row, and half a value with its evidence sliced off is worse than five whole
 * ones. `PeekButton` is the project's control for exactly this — the value
 * library clips by count too, for the same reason.
 */
function Bucket({ plan, rows, onAdd, onGoTo }: {
  plan: NsPlan
  rows: NsValueEvidence[]
  onAdd: ((value: string) => void) | null
  onGoTo: (m: NsValueMention) => void
}) {
  const [showAll, setShowAll] = useState(false)
  const shown = showAll ? rows : rows.slice(0, PREVIEW)
  return (
    <>
      <ul className="space-y-1.5 mt-2.5">
        {shown.map((row) => (
          <EvidenceRow key={row.value} plan={plan} row={row} onAdd={onAdd} onGoTo={onGoTo} />
        ))}
      </ul>
      {rows.length > PREVIEW && (
        <PeekButton
          expanded={showAll}
          more={VALUES_EVIDENCE.showAll(rows.length)}
          less={VALUES_EVIDENCE.showFewer}
          onToggle={() => setShowAll((v) => !v)}
        />
      )}
    </>
  )
}

export function ValuesSoFar({ plan, onAdd, onAddAll, onGoTo }: {
  plan: NsPlan
  onAdd: (value: string) => void
  /** Everything in the "not on your order yet" bucket, in one go. */
  onAddAll: (values: string[]) => void
  onGoTo: (mention: NsValueMention) => void
}) {
  const rows = valueEvidence(plan)
  const missing = rows.filter((r) => r.rank === null)
  const listed = rows.filter((r) => r.rank !== null).sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <h2 className="text-sm font-semibold text-zinc-200">{VALUES_EVIDENCE.title}</h2>
      <p className="text-[12px] text-zinc-500 mt-1 leading-relaxed">{VALUES_EVIDENCE.help}</p>

      {rows.length === 0 ? (
        <p className="mt-4 text-[11.5px] text-zinc-500 leading-relaxed">{VALUES_EVIDENCE.empty}</p>
      ) : (
        <>
          {missing.length > 0 && (
            <div className="mt-4">
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[12.5px] text-zinc-200">
                    {VALUES_EVIDENCE.missing}
                    <span className="text-zinc-600 tabular-nums"> {missing.length}</span>
                  </p>
                  <p className="text-[10.5px] text-zinc-500 mt-0.5 leading-relaxed">{VALUES_EVIDENCE.missingHelp}</p>
                </div>
                {missing.length > 1 && (
                  <button
                    onClick={() => onAddAll(missing.map((r) => r.value))}
                    className="text-[10.5px] text-zinc-500 hover:text-zinc-200 shrink-0 underline decoration-dotted underline-offset-2 transition-colors"
                  >
                    {VALUES_EVIDENCE.addAll}
                  </button>
                )}
              </div>
              <Bucket plan={plan} rows={missing} onAdd={onAdd} onGoTo={onGoTo} />
            </div>
          )}

          {listed.length > 0 && (
            <div className={missing.length > 0 ? "mt-5 pt-4 border-t border-white/10" : "mt-4"}>
              <p className="text-[12.5px] text-zinc-200">
                {VALUES_EVIDENCE.listed}
                <span className="text-zinc-600 tabular-nums"> {listed.length}</span>
              </p>
              <p className="text-[10.5px] text-zinc-500 mt-0.5 leading-relaxed">{VALUES_EVIDENCE.listedHelp}</p>
              <Bucket plan={plan} rows={listed} onAdd={null} onGoTo={onGoTo} />
            </div>
          )}

          <p className="text-[10.5px] text-zinc-600 mt-4 pt-3 border-t border-white/10 leading-relaxed">
            <span className="inline-block px-1.5 rounded-full border border-dashed border-white/15 mr-1.5">{VALUES_EVIDENCE.cued}</span>
            {VALUES_EVIDENCE.cuedNote}
          </p>
        </>
      )}
    </div>
  )
}
