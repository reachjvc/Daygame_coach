"use client"

/**
 * Step 2 of /test/life-mastery — the twelve areas, and the goals in them.
 *
 * The whole screen is one gesture repeated: open an area, type a goal, press
 * enter, type the next one. Names are editable because the Blueprint name is a
 * starting point and the name you read every week should be yours. Areas you
 * are not working on get put aside rather than deleted, so the picture stays
 * twelve areas wide.
 */

import { useState, type ClipboardEvent } from "react"
import { Check, Plus, X } from "lucide-react"
import type { LifeMasteryPlan, ResolvedArea, SimpleGoal } from "@/src/goals/types"
import { goalsForArea, resolveAreas, splitGoalLines } from "@/src/goals/lifeMasteryService"

export interface AreasStepHandlers {
  onRenameArea: (areaId: string, label: string) => void
  onToggleHidden: (areaId: string) => void
  onAddCustomArea: (label: string) => void
  onRemoveCustomArea: (areaId: string) => void
  onAddGoal: (areaId: string, title: string) => void
  onUpdateGoal: (goalId: string, patch: Partial<Omit<SimpleGoal, "id">>) => void
  onRemoveGoal: (goalId: string) => void
}

export function AreasStep({ plan, handlers }: { plan: LifeMasteryPlan; handlers: AreasStepHandlers }) {
  const areas = resolveAreas(plan)
  const visible = areas.filter((a) => !a.hidden)
  const hidden = areas.filter((a) => a.hidden)
  const [newArea, setNewArea] = useState("")

  const addCustom = () => {
    if (!newArea.trim()) return
    handlers.onAddCustomArea(newArea)
    setNewArea("")
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-sm font-semibold text-zinc-200">Twelve areas. Write what you want in each one.</h2>
        <p className="text-[12px] text-zinc-500 mt-1 leading-relaxed">
          Rename any area to something that means more to you. Put aside the ones you are not working on this year.
          You do not need a goal everywhere. Two or three areas carry most years.
        </p>
        <p className="text-[11px] text-zinc-500 mt-2 tabular-nums">
          {plan.goals.length} {plan.goals.length === 1 ? "goal" : "goals"} across {new Set(plan.goals.map((g) => g.areaId)).size} of {visible.length} areas.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {visible.map((area) => (
          <AreaCard key={area.id} area={area} goals={goalsForArea(plan, area.id)} handlers={handlers} />
        ))}
      </div>

      {hidden.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-[11px] text-zinc-500 mb-2">Put aside for now. Click one to bring it back.</p>
          <div className="flex flex-wrap gap-1.5">
            {hidden.map((a) => (
              <button
                key={a.id}
                onClick={() => handlers.onToggleHidden(a.id)}
                className="text-[11px] px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.02] text-zinc-500 hover:text-white hover:border-white/25 transition-colors"
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <p className="text-[11px] text-zinc-500 mb-2">Something the twelve do not cover? Add your own area.</p>
        <div className="flex items-center gap-2">
          <input
            value={newArea}
            onChange={(e) => setNewArea(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addCustom() }}
            placeholder="Name your area"
            aria-label="Name your own area"
            className="flex-1 min-w-0 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-400/40 transition-colors"
          />
          <button
            onClick={addCustom}
            disabled={!newArea.trim()}
            className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg border border-violet-500/40 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="size-3.5" />
            Add area
          </button>
        </div>
      </div>
    </div>
  )
}

function AreaCard({ area, goals, handlers }: { area: ResolvedArea; goals: SimpleGoal[]; handlers: AreasStepHandlers }) {
  const [draft, setDraft] = useState("")
  const [pendingRemove, setPendingRemove] = useState<string | null>(null)

  const addLines = (text: string) => {
    const lines = splitGoalLines(text)
    if (lines.length === 0) return
    for (const line of lines) handlers.onAddGoal(area.id, line)
    setDraft("")
  }

  /**
   * A single-line input drops the newlines out of a pasted list before React
   * ever sees the value, so a pasted list has to be read off the clipboard
   * event itself. Anything without a newline in it falls through and types
   * normally.
   */
  const paste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text")
    if (!/\r?\n/.test(text)) return
    e.preventDefault()
    addLines(`${draft}\n${text}`)
  }

  return (
    <div className={`rounded-2xl border p-4 transition-colors ${goals.length > 0 ? "border-white/15 bg-white/[0.04]" : "border-white/10 bg-white/[0.02]"}`}>
      <div className="flex items-center gap-2">
        <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: area.color }} />
        <input
          value={area.label}
          onChange={(e) => handlers.onRenameArea(area.id, e.target.value)}
          aria-label={`Name for the ${area.label} area`}
          className="flex-1 min-w-0 bg-transparent text-sm font-medium focus:outline-none focus:border-b focus:border-white/25 py-0.5"
          style={{ color: area.textColor }}
        />
        {area.custom ? (
          <button
            onClick={() => handlers.onRemoveCustomArea(area.id)}
            title="Delete this area and its goals"
            aria-label={`Delete the ${area.label} area`}
            className="text-zinc-600 hover:text-rose-300 transition-colors shrink-0"
          >
            <X className="size-3.5" />
          </button>
        ) : (
          <button
            onClick={() => handlers.onToggleHidden(area.id)}
            title="Put this area aside for now"
            aria-label={`Put ${area.label} aside`}
            className="text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors shrink-0"
          >
            put aside
          </button>
        )}
      </div>
      {area.sublabel && <p className="text-[10px] text-zinc-600 ml-4.5 -mt-0.5">{area.sublabel}</p>}

      {goals.length > 0 && (
        <div className="mt-3 space-y-1">
          {goals.map((g) => (
            <div key={g.id} className="flex items-center gap-2 group">
              <span className="size-1 rounded-full bg-zinc-600 shrink-0" />
              <input
                value={g.title}
                onChange={(e) => handlers.onUpdateGoal(g.id, { title: e.target.value })}
                aria-label="Goal"
                className="flex-1 min-w-0 bg-transparent border-b border-transparent hover:border-white/10 focus:border-white/25 text-sm text-zinc-200 focus:outline-none py-0.5 transition-colors"
              />
              {pendingRemove === g.id ? (
                <button
                  onClick={() => { handlers.onRemoveGoal(g.id); setPendingRemove(null) }}
                  onBlur={() => setPendingRemove(null)}
                  autoFocus
                  className="text-[10px] text-rose-300 hover:text-rose-200 shrink-0"
                >
                  remove?
                </button>
              ) : (
                <button
                  onClick={() => setPendingRemove(g.id)}
                  aria-label={`Remove goal ${g.title}`}
                  className="text-zinc-700 hover:text-rose-300 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all shrink-0"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 mt-3">
        <Plus className="size-3.5 text-zinc-600 shrink-0" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLines(draft) } }}
          onPaste={paste}
          onBlur={() => addLines(draft)}
          placeholder={goals.length === 0 ? "What do you want here?" : "Add another"}
          aria-label={`Add a goal in ${area.label}`}
          className="flex-1 min-w-0 bg-transparent border-b border-white/10 focus:border-violet-400/40 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none py-0.5 transition-colors"
        />
        {goals.length > 0 && (
          <span className="text-[10px] text-zinc-600 tabular-nums shrink-0 inline-flex items-center gap-1">
            <Check className="size-3" />
            {goals.length}
          </span>
        )}
      </div>
    </div>
  )
}
