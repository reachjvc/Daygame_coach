"use client"

/**
 * Test-only edit modal for milestone goals — a focused FORK that brings the new
 * flow's best editing (the real MilestoneCurveEditor + interior value pins) plus
 * adaptive RE-PACING to a tracked goal, without touching the shared production
 * GoalFormModal. Saves the reshaped/re-paced ladder via PUT /api/goals/{id}.
 *
 * Re-pace = re-baseline the ladder's start to your current progress so the
 * remaining milestones spread from where you actually are to the target.
 */

import { useState } from "react"
import { MilestoneCurveEditor } from "../MilestoneCurveEditor"
import type { GoalWithProgress, MilestoneLadderConfig, MilestonePin } from "../../types"
import { X, Gauge } from "lucide-react"

type Mc = { start?: number; steps?: number; curveTension?: number; milestoneEdits?: Record<string, { value?: number; date?: string }> }

export function LabGoalEditor({ goal, onClose, onSaved }: { goal: GoalWithProgress; onClose: () => void; onSaved: () => void }) {
  const mc = (goal.milestone_config ?? {}) as Mc
  const initialPins: MilestonePin[] = mc.milestoneEdits
    ? Object.entries(mc.milestoneEdits).filter(([, e]) => e.value != null).map(([s, e]) => ({ step: Number(s), value: e.value! }))
    : []

  const [config, setConfig] = useState<MilestoneLadderConfig>({
    start: typeof mc.start === "number" ? mc.start : 0,
    target: goal.target_value,
    steps: typeof mc.steps === "number" && mc.steps > 0 ? mc.steps : 5,
    curveTension: typeof mc.curveTension === "number" ? mc.curveTension : 0,
    pins: initialPins,
  })
  const [saving, setSaving] = useState(false)
  const [rePaced, setRePaced] = useState(false)

  // Re-baseline the start to current progress (and drop stale interior pins).
  const rePace = () => {
    setConfig((c) => ({ ...c, start: goal.current_value, pins: [] }))
    setRePaced(true)
  }

  const save = async () => {
    setSaving(true)
    const milestone_config: Record<string, unknown> = {
      start: config.start,
      target: config.target,
      steps: config.steps,
      curveTension: config.curveTension,
    }
    if (config.pins && config.pins.length > 0) {
      milestone_config.milestoneEdits = Object.fromEntries(config.pins.map((p) => [p.step, { value: p.value }]))
    }
    await fetch(`/api/goals/${goal.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ milestone_config, target_value: Math.max(1, Math.round(config.target)) }),
    }).catch(() => {})
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose} data-testid="lab-goal-editor">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">{goal.title}</h3>
          <button onClick={onClose} aria-label="Close"><X className="size-5 text-zinc-400 hover:text-white" /></button>
        </div>

        <MilestoneCurveEditor
          config={config}
          onChange={setConfig}
          allowDirectEdit
          targetDate={goal.target_date ?? undefined}
        />

        <div className="flex items-center gap-2 mt-5">
          <button
            onClick={rePace}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/15 text-zinc-300 hover:bg-white/5 transition-colors"
            title="Re-baseline the ladder from where you are now"
          >
            <Gauge className="size-3.5" /> Re-pace from current ({goal.current_value})
          </button>
          {rePaced && <span className="text-[10px] text-emerald-300">Re-paced — start now {config.start}</span>}
          <button
            onClick={save}
            disabled={saving}
            className="ml-auto px-4 py-2 rounded-lg bg-white text-zinc-950 text-sm font-semibold hover:bg-zinc-200 disabled:opacity-50 transition-all"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}
