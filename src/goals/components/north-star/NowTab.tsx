"use client"

/**
 * Tab 2 — where you are. The wheel, and nothing competing with it.
 *
 * THE WHEEL IS THE WHOLE SURFACE. It used to carry a twelve-row list of the
 * same twelve areas directly underneath, which is the wheel again as text: same
 * names, same numbers, same click, same dialog. Twelve rows of it pushed
 * everything else off the screen and made the page look like a form when the
 * point of the wheel is that your whole life is one picture.
 *
 * The routines moved to the goals tab. They are part of the plan, not part of
 * the assessment, and this screen is the assessment.
 *
 * Inside an area the order still matters and it is still the reverse of what
 * people expect: the 10 is written first, because a rating with nothing behind
 * it is a mood and somebody else's 10 in your health is not yours.
 */

import { useState } from "react"
import { Check, Pencil, Plus } from "lucide-react"
import type { NsArea, NsPlan } from "@/src/goals/types"
import {
  AREA_SUGGESTIONS,
  AREAS_INTRO,
  FLOOR_LINE,
  NOW_INTRO,
  NS_FLOOR,
  SEASON_FOCUS_COPY,
} from "@/src/goals/data/northStar"
import { areaReview, seasonFocus, wheelRatings } from "@/src/goals/northStarService"
import { AreaWheel } from "./AreaWheel"

export interface AreaHandlers {
  onUpdateArea: (areaId: string, patch: Partial<Omit<NsArea, "id" | "custom">>) => void
  onAddArea: (label: string) => void
  onRemoveArea: (areaId: string) => void
  onAddRoutine: (blueprintId: string) => void
}

export function NowTab({
  plan,
  today,
  openId,
  setOpenId,
  areaHandlers,
  onSeasonFocus,
  onNext,
}: {
  plan: NsPlan
  today: string
  /** Lifted, because the dialog it drives is rendered by the shell. */
  openId: string | null
  setOpenId: (id: string | null) => void
  areaHandlers: AreaHandlers
  onSeasonFocus: (id: string) => void
  onNext: () => void
}) {
  const [editing, setEditing] = useState(false)

  const ratings = wheelRatings(plan, today)
  const rated = plan.areas.filter((a) => areaReview(plan, a.id).fortnight != null).length
  /**
   * Only once every area has a number.
   *
   * It used to appear the moment ONE area was rated, so rating Emotions first
   * produced "Under the floor right now: Emotions. That is where the attention
   * goes this season" off a single data point and eleven blanks. You cannot know
   * what is lowest until you have looked at all of them, and choosing where the
   * season goes is the user's decision, not a line of ours.
   */
  const allRated = rated === plan.areas.length && plan.areas.length > 0
  const underFloor = plan.areas.filter((a) => ratings[a.id] != null && ratings[a.id] < NS_FLOOR)
  const focus = seasonFocus(plan)
  // The wheel is the rating picture on this tab, so it carries no goal dots.
  // Goals have their own tab and their own wheelless surface.
  const noGoalCounts = Object.fromEntries(plan.areas.map((a) => [a.id, 0]))

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-200">{NOW_INTRO.title}</h2>
          <span className="text-[11px] text-zinc-500 tabular-nums shrink-0">{rated} of {plan.areas.length} rated</span>
        </div>
        <p className="text-[12px] text-zinc-400 mt-1 leading-relaxed">{NOW_INTRO.help}</p>
        <p className="text-[11.5px] text-zinc-500 mt-1.5 leading-relaxed">{NOW_INTRO.order}</p>
      </div>

      {/* The one thing, when there is one. Above the wheel, because it is the
          answer to "what do I look at first" and the wheel is twelve answers. */}
      {focus && (
        <div className="rounded-2xl border border-violet-400/30 bg-violet-500/[0.07] px-5 py-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[13px] font-medium text-violet-100">{SEASON_FOCUS_COPY.banner(focus.label)}</span>
          <span className="text-[11px] text-zinc-400 min-w-0 flex-1">{SEASON_FOCUS_COPY.bannerNote}</span>
          <button
            onClick={() => onSeasonFocus(focus.id)}
            className="text-[10.5px] text-zinc-500 hover:text-zinc-200 transition-colors shrink-0"
          >
            {SEASON_FOCUS_COPY.clear}
          </button>
        </div>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-zinc-200">{AREAS_INTRO.title}</h2>
            <p className="text-[12px] text-zinc-500 mt-1 leading-relaxed">
              {editing ? AREAS_INTRO.help : AREAS_INTRO.resting}
            </p>
          </div>
          <button
            onClick={() => setEditing((v) => !v)}
            aria-pressed={editing}
            className={`shrink-0 inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg border transition-colors ${
              editing
                ? "border-violet-500/40 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25"
                : "border-white/15 text-zinc-300 hover:text-white hover:border-white/30"
            }`}
          >
            {editing ? <Check className="size-3.5" /> : <Pencil className="size-3.5" />}
            {editing ? "Done" : "Edit"}
          </button>
        </div>

        {/* The wheel, on its own, as big as the card allows. */}
        <div className="px-5 pt-3 pb-4">
          <div className="min-w-0">
            <AreaWheel
              areas={plan.areas}
              ratings={ratings}
              goalCounts={noGoalCounts}
              activeId={openId}
              onPick={(id) => setOpenId(id === openId ? null : id)}
            />
            <p className="mt-1 text-center text-[12px] text-zinc-400">
              Click an area to write your 10, rate it, and say why it matters.
            </p>
            {/* Nothing is claimed about which area is lowest until every area
                has a number to be lowest against. */}
            <p className="mt-1 text-center text-[11.5px] text-zinc-500">
              {!allRated ? (
                FLOOR_LINE.waiting(rated, plan.areas.length)
              ) : underFloor.length === 0 ? (
                FLOOR_LINE.none
              ) : (
                <>
                  <span className="text-amber-300/85">{FLOOR_LINE.under(underFloor.map((a) => a.label).join(", "))}</span>
                  <span className="block text-[11px] text-zinc-600 mt-0.5">{FLOOR_LINE.note}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {editing && (
          <div className="px-5 pb-4">
            <AddArea plan={plan} onAdd={areaHandlers.onAddArea} />
          </div>
        )}

      </section>

      {/* Always available, whatever is unfinished. */}
      <div className="flex justify-end">
        <button
          onClick={onNext}
          className="text-sm font-medium px-4 py-2 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-100 hover:bg-violet-500/30 transition-colors"
        >
          {NOW_INTRO.next}
        </button>
      </div>
    </div>
  )
}

function AddArea({ plan, onAdd }: { plan: NsPlan; onAdd: (label: string) => void }) {
  const [draft, setDraft] = useState("")
  const add = (label: string) => {
    if (!label.trim()) return
    onAdd(label)
    setDraft("")
  }
  return (
    <div>
      <div className="flex items-center gap-2">
        <Plus className="size-3.5 text-zinc-600 shrink-0" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") add(draft) }}
          placeholder="Name another area of your life"
          aria-label="Name another area of your life"
          className="flex-1 min-w-0 bg-transparent border-b border-white/10 focus:border-violet-400/40 text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none py-0.5 transition-colors"
        />
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {AREA_SUGGESTIONS.filter((s) => !plan.areas.some((a) => a.label.toLowerCase() === s.toLowerCase())).map((s) => (
          <button
            key={s}
            onClick={() => add(s)}
            className="text-[10.5px] px-2 py-0.5 rounded-full border border-white/10 text-zinc-500 hover:text-zinc-200 hover:border-white/25 transition-colors"
          >
            + {s}
          </button>
        ))}
      </div>
    </div>
  )
}
