"use client"

/**
 * M1 — the door for a goal list somebody already wrote.
 *
 * Until this existed the only way in was: pick a room, type one line, repeat.
 * Most people arrive with a list in Notes or a journal, and retyping it a line
 * at a time is the reason it never gets in.
 *
 * Two rules this screen exists to keep:
 *  1. NOTHING is created until Accept. Every row is a proposal.
 *  2. Nothing is filed in a room we guessed. A heading we cannot map leaves
 *     its rows unresolved, and Accept stays disabled until they are resolved.
 */

import { useMemo, useState } from "react"
// No Undo2 here on purpose: it already carries a meaning in EliminatePhase,
// and reusing an icon in a new context needs sign-off. Plain text is fine.
import { Check, ChevronRight, X } from "lucide-react"
import type { GoalListRow, GoalReading, GoalRoute, VisionGoalType } from "@/src/goals/types"
import { parseGoalList, mergeEscalations, ladderSteps, measureDirection, paretoKeepCount, readGoalVehicle, REASON_PROMPTS, type GoalListMerge } from "@/src/goals/visionPlanService"
import { LIFE_MASTERY_AREAS, areaTextColor } from "@/src/goals/data/lifeMasteryAreas"

/** What the caller has to write away, already sorted by destination. */
export interface GoalListAccept {
  goals: Array<{ rowId: string; parentRowId: string | null; areaId: string; reading: GoalReading }>
  identities: Array<{ areaId: string | null; text: string }>
  rules: string[]
  horizonWants: string[]
  /** M3 — a monthly rhythm is not a weekly habit. These become monthly ritual
   * entries; putting them in the weekly balancer would either overstate the
   * load fourfold or quietly drop three weeks in four. */
  monthlyRituals: Array<{ areaId: string | null; title: string }>
}

type Row = GoalListRow & { skip?: boolean }

const SHAPE_LABEL: Record<VisionGoalType, string> = {
  habit_ramp: "Practice",
  milestone_ladder: "Target",
  achievement: "Finish line",
}
const ROUTE_LABEL: Record<GoalRoute, string> = {
  goal: "Goal",
  identity: "Identity",
  rule: "Rule",
  "horizon-want": "Long-term want",
}
const ROUTE_HINT: Record<GoalRoute, string> = {
  goal: "",
  identity: "Who you are — goes with your identity statements, not on the wheel.",
  rule: "A standing rule you read back, not something to track weekly.",
  "horizon-want": "Nobody controls this on a one-year timeline. It belongs at 5-10 years, as the thing your goals point at.",
}

const PLACEHOLDER = `Paste your list — headings and all. For example:

Training
  Bench 80 kg, 3x6-8
  10 pull-ups, from 6
  Gym 4 days a week

Money
  Pay off $18,000 of debt
  Track every expense weekly`

/**
 * The beat that has to follow intake. His order is goal → why, written
 * directly underneath it, because "the reasons are the fuel" and the daily
 * loop's whole job is re-reading them: *anytime you're not motivated, all you
 * got to do is remind yourself — why do I want this?*
 *
 * Two things make this work rather than being a wall of twelve blank boxes:
 *  - It asks a QUESTION, not "why?". Nobody answers a blank box; they answer
 *    "what does another three years exactly like this one take from you?"
 *  - It is 80/20. It asks for the few that matter now and says so; the rest
 *    keep an honest "no reason yet" and the header badge keeps asking.
 */
export function ReasonsPass({ goals, onWhy, onPainWhy, onReasons, onDone }: {
  goals: Array<{ id: string; title: string; why: string; painWhy?: string | null; reasonsList?: string[] }>
  onWhy: (goalId: string, why: string) => void
  onPainWhy: (goalId: string, painWhy: string) => void
  onReasons: (goalId: string, reasons: string[]) => void
  onDone: () => void
}) {
  const [idx, setIdx] = useState(0)
  const [angle, setAngle] = useState(0)
  const [draft, setDraft] = useState("")
  const [pain, setPain] = useState("")
  const [tray, setTray] = useState<string[]>([])
  const [phase, setPhase] = useState<"idle" | "loading" | "error">("idle")
  const [err, setErr] = useState("")
  const goal = goals[idx]
  if (!goal) return null
  const reasons = goal.reasonsList ?? []
  const prompt = REASON_PROMPTS[angle % REASON_PROMPTS.length]
  const vehicle = readGoalVehicle(goal.title)

  const add = (text: string) => {
    const t = text.trim()
    if (!t || reasons.includes(t)) return
    onReasons(goal.id, [...reasons, t])
    // The first reason is also the headline why, so the goal stops reading as
    // unexplained the moment one real sentence exists.
    if (!goal.why.trim()) onWhy(goal.id, t)
    // A new question after every reason. Nobody produces thirty from one angle;
    // they produce four and dry up.
    setAngle((a) => a + 1)
    setDraft("")
  }
  const expand = async () => {
    setPhase("loading"); setErr("")
    try {
      const res = await fetch("/api/goals/vision-plan/reasons", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalTitle: goal.title, why: goal.why, existing: reasons, want: 20 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Could not write more reasons")
      setTray(data.reasons ?? []); setPhase("idle")
    } catch (e) { setErr(e instanceof Error ? e.message : "failed"); setPhase("error") }
  }
  const next = () => {
    if (pain.trim()) onPainWhy(goal.id, pain.trim())
    setDraft(""); setPain(""); setTray([]); setAngle(0); setPhase("idle"); setErr("")
    if (idx + 1 < goals.length) setIdx(idx + 1)
    else onDone()
  }

  // His own calibration of the drill, used as the nudge rather than a target.
  const depth = reasons.length >= 30 ? "This is the part most people never reach. Keep going while it's flowing."
    : reasons.length >= 10 ? "Past the surface. The ones that move you are usually still ahead."
    : reasons.length >= 1 ? "The first ten are the surface. Keep going."
    : null

  return (
    <div className="rounded-xl border border-violet-400/25 bg-violet-500/[0.06] p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm text-zinc-100">Now the reasons</h3>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Not one reason — as many as you can write. The reasons are the fuel, and this is the page you re-read on the days you don&apos;t feel like it.
          </p>
        </div>
        <span className="text-[10px] text-zinc-500 tabular-nums shrink-0">goal {idx + 1} of {goals.length}</span>
      </div>

      {goals.length > paretoKeepCount(goals.length) && idx === 0 && (
        <p className="text-[10px] text-zinc-500">
          {goals.length} goals with no reasons yet. You don&apos;t have to do them all now — the {paretoKeepCount(goals.length) === 1 ? "one" : paretoKeepCount(goals.length)} you care about most is where the fuel is. Skip the rest and they&apos;ll keep asking.
        </p>
      )}

      <p className="text-sm text-zinc-100">{goal.title}</p>

      {vehicle && (
        <p className="text-[11px] text-zinc-400 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5">
          This is a <span className="text-zinc-200">{vehicle.label.toLowerCase()}</span> — what it&apos;s actually for:{" "}
          <span className="text-zinc-300">{vehicle.ends.join(" · ")}</span>
        </p>
      )}

      <div>
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[11px] text-violet-100/90">{prompt.question}</p>
          <button onClick={() => setAngle((a) => a + 1)} className="text-[10px] text-zinc-500 hover:text-zinc-300 shrink-0">another angle →</button>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(draft) } }}
            aria-label={`A reason you want ${goal.title}`}
            placeholder="One reason. Enter for the next question. Nothing left out because it sounds bad written down."
            className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
          />
          <button onClick={() => add(draft)} disabled={!draft.trim()}
            className="shrink-0 text-[11px] px-2.5 py-1.5 rounded-md border border-white/15 text-zinc-300 hover:bg-white/10 disabled:opacity-30 transition-colors">Add</button>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-zinc-500 tabular-nums">{reasons.length} reason{reasons.length === 1 ? "" : "s"}</span>
          {depth && <span className="text-[10px] text-zinc-600">{depth}</span>}
          {reasons.length >= 2 && (
            <button onClick={expand} disabled={phase === "loading"}
              className="ml-auto text-[10px] text-violet-200/80 hover:text-violet-100 disabled:opacity-40 shrink-0">
              {phase === "loading" ? "writing…" : "write 20 more in my voice →"}
            </button>
          )}
        </div>
        {phase === "error" && <p className="text-[10px] text-red-300/90 mt-1">{err}</p>}
      </div>

      {reasons.length > 0 && (
        <ul className="space-y-0.5 max-h-40 overflow-y-auto pr-1">
          {reasons.map((r) => (
            <li key={r} className="group flex items-baseline gap-2 text-[11px] text-zinc-300">
              <span className="text-zinc-600 shrink-0">·</span>
              <span className="min-w-0">{r}</span>
              <button onClick={() => onReasons(goal.id, reasons.filter((x) => x !== r))}
                aria-label={`Remove reason: ${r}`}
                className="ml-auto opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-300 transition-opacity shrink-0">×</button>
            </li>
          ))}
        </ul>
      )}

      {tray.length > 0 && (
        <div className="rounded-md border border-violet-400/20 bg-violet-500/[0.05] p-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-wide text-violet-200/90">Keep the ones that are true</span>
            <button onClick={() => { onReasons(goal.id, [...reasons, ...tray.filter((t) => !reasons.includes(t))]); setTray([]) }}
              className="ml-auto text-[10px] text-violet-200 hover:text-white">keep all</button>
            <button onClick={() => setTray([])} className="text-[10px] text-zinc-600 hover:text-zinc-300">clear</button>
          </div>
          <ul className="space-y-0.5 max-h-44 overflow-y-auto pr-1">
            {tray.map((r) => (
              <li key={r} className="group flex items-baseline gap-2 text-[11px] text-zinc-300">
                <button onClick={() => { add(r); setTray((p) => p.filter((x) => x !== r)) }}
                  className="text-emerald-300/80 hover:text-emerald-200 shrink-0" aria-label={`Keep: ${r}`}>+</button>
                <span className="min-w-0">{r}</span>
                <button onClick={() => setTray((p) => p.filter((x) => x !== r))} aria-label={`Discard: ${r}`}
                  className="ml-auto opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-300 transition-opacity shrink-0">×</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="text-[11px] text-amber-100/80">And what does it cost you if this never happens?</p>
        <input
          value={pain}
          onChange={(e) => setPain(e.target.value)}
          aria-label={`What it costs if ${goal.title} never happens`}
          placeholder="The other half of the fuel — most people only write the nice one."
          className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
        />
      </div>

      <div className="flex items-center gap-2 justify-end">
        <button onClick={onDone} className="text-[11px] text-zinc-600 hover:text-zinc-400">later — keep asking me</button>
        <button onClick={next}
          className="text-[11px] px-3 py-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 transition-colors">
          {idx + 1 < goals.length ? "Next goal →" : "Done"}
        </button>
      </div>
    </div>
  )
}

export function GoalListReview({ today, onAccept, onClose, defaultAreaId, canAddRituals }: {
  today: string
  onAccept: (accepted: GoalListAccept) => void
  onClose: () => void
  /** Area to file rows under when the list has no headings at all. */
  defaultAreaId?: string | null
  /**
   * Whether a morning ritual exists to hang monthly items on. Weekly/monthly
   * rituals attach to an existing ritual only, so without one a monthly line
   * would be accepted and then silently vanish. When false it comes in as a
   * once-a-week practice instead, and the row says so.
   */
  canAddRituals: boolean
}) {
  const [raw, setRaw] = useState("")
  const [rows, setRows] = useState<Row[] | null>(null)
  const [merges, setMerges] = useState<GoalListMerge[]>([])
  const [unresolved, setUnresolved] = useState<string[]>([])

  /**
   * The room you opened from is a sensible home for a list that names no
   * sections at all. It is NOT a home for lines sitting under a heading we
   * failed to map: the user told us where those belong and we didn't
   * understand — filing them under whatever room happened to be open is the
   * guess this screen exists to avoid, and it silently contradicted the
   * "pick a room for those lines" banner.
   */
  const fallbackArea = (r: GoalListRow) => (r.heading ? null : defaultAreaId ?? null)

  const read = () => {
    const parsed = parseGoalList(raw, today)
    const merged = mergeEscalations(parsed.rows)
    setRows(merged.rows.map((r) => ({ ...r, areaId: r.areaId ?? fallbackArea(r) })))
    setMerges(merged.merges)
    setUnresolved(parsed.unresolvedHeadings)
  }

  /** Re-read from the original text, dropping every merge. The user asked for
   * their lines back; giving them a partially-merged list would be worse than
   * not offering the merge at all. */
  const undoMerges = () => {
    const parsed = parseGoalList(raw, today)
    setRows(parsed.rows.map((r) => ({ ...r, areaId: r.areaId ?? defaultAreaId ?? null })))
    setMerges([])
  }

  const patch = (id: string, fn: (r: Row) => Row) =>
    setRows((prev) => (prev ? prev.map((r) => (r.id === id ? fn(r) : r)) : prev))

  const setReading = (id: string, p: Partial<GoalReading>) =>
    patch(id, (r) => ({ ...r, reading: { ...r.reading, ...p } }))

  const setMeasure = (id: string, p: Partial<NonNullable<GoalReading["measure"]>>) =>
    patch(id, (r) => {
      if (!r.reading.measure) return r
      const measure = { ...r.reading.measure, ...p }
      if (p.start !== undefined || p.target !== undefined) measure.steps = ladderSteps(measure.start, measure.target)
      return { ...r, reading: { ...r.reading, measure } }
    })

  /**
   * Changing shape must not destroy what we read. Nulling the measure on the
   * way out meant flipping a row to Practice and back handed you a blank unit
   * and 0 → 0 — the parsed numbers gone, and Accept disabled until you retyped
   * them. The row keeps its measure whatever shape it is wearing; `accept()`
   * strips it for the shapes that must not carry one.
   */
  const setType = (id: string, type: VisionGoalType) =>
    patch(id, (r) => {
      if (r.reading.type === type) return r
      const measure = r.reading.measure ?? (type === "milestone_ladder" ? { unit: "", start: 0, target: 0, steps: 2 } : null)
      return { ...r, reading: { ...r.reading, type, measure } }
    })

  const live = useMemo(() => (rows ?? []).filter((r) => !r.skip), [rows])
  const monthlyRows = live.filter((r) => r.reading.route === "goal" && r.reading.monthly && canAddRituals)
  const monthlyIds = new Set(monthlyRows.map((r) => r.id))
  const goalRows = live.filter((r) => r.reading.route === "goal" && !monthlyIds.has(r.id))
  const needsArea = goalRows.filter((r) => !r.areaId)
  const badMeasure = goalRows.filter(
    (r) => r.reading.type === "milestone_ladder" &&
      (!r.reading.measure || !r.reading.measure.unit.trim() || r.reading.measure.start === r.reading.measure.target),
  )
  const canAccept = live.length > 0 && needsArea.length === 0 && badMeasure.length === 0

  const accept = () => {
    if (!canAccept) return
    onAccept({
      goals: goalRows.map((r) => ({
        rowId: r.id, parentRowId: r.parentRowId, areaId: r.areaId!,
        // Only a target carries a measure — `createAreaGoal` rejects an
        // achievement that has one, and a practice has nothing to do with it.
        // The row kept it so a shape flip is reversible; the goal must not.
        reading: r.reading.type === "milestone_ladder" ? r.reading : { ...r.reading, measure: null },
      })),
      identities: live.filter((r) => r.reading.route === "identity").map((r) => ({ areaId: r.areaId, text: r.raw })),
      rules: live.filter((r) => r.reading.route === "rule").map((r) => r.raw),
      horizonWants: live.filter((r) => r.reading.route === "horizon-want").map((r) => r.raw),
      monthlyRituals: monthlyRows.map((r) => ({ areaId: r.areaId, title: r.reading.title })),
    })
  }

  if (!rows) {
    return (
      <div className="rounded-xl border border-white/15 bg-white/[0.03] p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm text-zinc-100">Paste the list you already wrote</h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Headings become rooms. Every line comes back for you to check before anything is created.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-zinc-600 hover:text-zinc-300 shrink-0"><X className="size-4" /></button>
        </div>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={12}
          aria-label="Your goal list"
          placeholder={PLACEHOLDER}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/25 font-mono leading-relaxed"
        />
        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className="text-[11px] text-zinc-600 hover:text-zinc-400">cancel</button>
          <button
            onClick={read}
            disabled={!raw.trim()}
            className="text-[11px] px-3 py-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-30 transition-colors inline-flex items-center gap-1.5"
          >
            Read the list <ChevronRight className="size-3" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/15 bg-white/[0.03] p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm text-zinc-100">{live.length} line{live.length === 1 ? "" : "s"} read</h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">Change anything that is wrong. Nothing exists yet.</p>
        </div>
        <button onClick={() => setRows(null)} className="text-[11px] text-zinc-600 hover:text-zinc-300 shrink-0">← back to the text</button>
      </div>

      {unresolved.length > 0 && (
        <p className="text-[11px] text-amber-300/90 rounded-lg border border-amber-400/25 bg-amber-500/[0.06] px-2.5 py-2">
          {unresolved.length === 1 ? "This heading doesn't" : "These headings don't"} match a room: {unresolved.join(", ")}. Pick a room for those lines below.
        </p>
      )}

      {merges.length > 0 && (
        <div className="rounded-lg border border-violet-400/25 bg-violet-500/[0.06] px-2.5 py-2 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-violet-100/90">
              {merges.length} set{merges.length === 1 ? "" : "s"} of lines describe one goal that grows. Collapsed into a single {merges[0].kind === "ramp" ? "ramp" : "ladder"}.
            </p>
            <button onClick={undoMerges} className="text-[10px] text-violet-200/80 hover:text-violet-100 underline underline-offset-2 shrink-0">
              keep them separate
            </button>
          </div>
          {merges.map((m) => (
            <p key={m.keptRowId} className="text-[10px] text-violet-200/70 tabular-nums">{m.summary}</p>
          ))}
        </div>
      )}

      <div className="space-y-1 max-h-[28rem] overflow-y-auto pr-1">
        {rows.map((r) => {
          const area = LIFE_MASTERY_AREAS.find((a) => a.id === r.areaId)
          const isGoal = r.reading.route === "goal"
          return (
            <div
              key={r.id}
              className={`rounded-lg border px-2.5 py-2 transition-colors ${r.skip ? "border-white/5 bg-transparent opacity-40" : "border-white/10 bg-white/[0.02]"}`}
              style={r.parentRowId ? { marginLeft: "1.25rem" } : undefined}
            >
              <div className="flex items-start gap-2">
                <span className="min-w-0 flex-1">
                  <span className={`text-xs ${r.skip ? "line-through text-zinc-600" : "text-zinc-100"}`}>{r.raw}</span>
                  {r.parentRowId && <span className="ml-1.5 text-[9px] text-zinc-600 align-middle">sub-goal</span>}
                  {r.reading.monthly && r.reading.route === "goal" && (
                    <span className="ml-1.5 text-[9px] text-sky-300/80 align-middle">
                      {canAddRituals
                        ? "monthly — becomes a ritual, not a weekly habit"
                        : "monthly — no ritual to attach it to yet, so it comes in weekly"}
                    </span>
                  )}
                </span>
                <button
                  onClick={() => patch(r.id, (x) => ({ ...x, skip: !x.skip }))}
                  aria-label={r.skip ? `Include ${r.raw}` : `Skip ${r.raw}`}
                  className="text-[10px] text-zinc-600 hover:text-zinc-300 shrink-0"
                >
                  {r.skip ? "include" : "skip"}
                </button>
              </div>

              {!r.skip && (
                <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                  {/* Route. Always defaults to Goal; the alternative is offered,
                      never pre-selected — a mis-route is worse than no route. */}
                  <select
                    value={r.reading.route}
                    onChange={(e) => setReading(r.id, { route: e.target.value as GoalRoute })}
                    aria-label={`What kind of line is "${r.raw}"`}
                    className={`bg-white/5 border rounded-md px-1.5 py-1 text-[10px] focus:outline-none ${r.reading.route === "goal" ? "border-white/10 text-zinc-400" : "border-violet-400/40 text-violet-200"}`}
                  >
                    {(Object.keys(ROUTE_LABEL) as GoalRoute[]).map((k) => (
                      <option key={k} value={k} className="bg-zinc-900">{ROUTE_LABEL[k]}</option>
                    ))}
                  </select>

                  {isGoal && (
                    <>
                      <select
                        value={r.reading.type}
                        onChange={(e) => setType(r.id, e.target.value as VisionGoalType)}
                        aria-label={`Shape of "${r.raw}"`}
                        className="bg-white/5 border border-white/10 rounded-md px-1.5 py-1 text-[10px] text-zinc-300 focus:outline-none"
                      >
                        {(Object.keys(SHAPE_LABEL) as VisionGoalType[]).map((k) => (
                          <option key={k} value={k} className="bg-zinc-900">{SHAPE_LABEL[k]}</option>
                        ))}
                      </select>

                      <select
                        value={r.areaId ?? ""}
                        onChange={(e) => patch(r.id, (x) => ({ ...x, areaId: e.target.value || null }))}
                        aria-label={`Room for "${r.raw}"`}
                        className={`bg-white/5 border rounded-md px-1.5 py-1 text-[10px] focus:outline-none ${r.areaId ? "border-white/10" : "border-amber-400/50 text-amber-200"}`}
                        style={area ? { color: areaTextColor(area) } : undefined}
                      >
                        <option value="" className="bg-zinc-900">pick a room…</option>
                        {LIFE_MASTERY_AREAS.map((a) => (
                          <option key={a.id} value={a.id} className="bg-zinc-900">{a.label}</option>
                        ))}
                      </select>

                      {r.reading.type === "habit_ramp" && (
                        <select
                          value={r.reading.daysPerWeek}
                          onChange={(e) => setReading(r.id, { daysPerWeek: Number(e.target.value) })}
                          aria-label={`Days per week for "${r.raw}"`}
                          className="bg-white/5 border border-white/10 rounded-md px-1.5 py-1 text-[10px] text-zinc-300 focus:outline-none"
                        >
                          {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n} className="bg-zinc-900">{n}×/wk</option>)}
                        </select>
                      )}

                      {r.reading.type === "milestone_ladder" && r.reading.measure && (
                        <>
                          <input
                            type="number" value={r.reading.measure.start}
                            onChange={(e) => setMeasure(r.id, { start: Number(e.target.value) })}
                            aria-label={`Starting number for "${r.raw}"`} placeholder="from"
                            className="w-14 bg-white/5 border border-white/10 rounded-md px-1.5 py-1 text-[10px] text-zinc-200 focus:outline-none tabular-nums"
                          />
                          <span className="text-[10px] text-zinc-600">→</span>
                          <input
                            type="number" value={r.reading.measure.target}
                            onChange={(e) => setMeasure(r.id, { target: Number(e.target.value) })}
                            aria-label={`Target number for "${r.raw}"`} placeholder="to"
                            className="w-14 bg-white/5 border border-white/10 rounded-md px-1.5 py-1 text-[10px] text-zinc-200 focus:outline-none tabular-nums"
                          />
                          <input
                            value={r.reading.measure.unit}
                            onChange={(e) => setMeasure(r.id, { unit: e.target.value })}
                            aria-label={`Unit for "${r.raw}"`} placeholder="unit"
                            className={`w-20 bg-white/5 border rounded-md px-1.5 py-1 text-[10px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none ${r.reading.measure.unit.trim() ? "border-white/10" : "border-amber-400/50"}`}
                          />
                          {measureDirection(r.reading.measure) === "down" && (
                            <span className="text-[10px] text-sky-300/80">counts down ↓</span>
                          )}
                          {r.reading.measure.protocol && (
                            <span className="text-[10px] text-zinc-500">{r.reading.measure.protocol}</span>
                          )}
                        </>
                      )}
                    </>
                  )}

                  {!isGoal && (
                    <span className="text-[10px] text-violet-200/70">
                      {ROUTE_HINT[r.reading.route]}
                      {r.reading.routeCue && <span className="text-zinc-600"> (matched “{r.reading.routeCue}”)</span>}
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {(needsArea.length > 0 || badMeasure.length > 0) && (
        <p className="text-[11px] text-amber-300/90">
          {needsArea.length > 0 && `${needsArea.length} line${needsArea.length === 1 ? "" : "s"} still need a room. `}
          {badMeasure.length > 0 && `${badMeasure.length} target${badMeasure.length === 1 ? "" : "s"} need a unit and two different numbers.`}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <button onClick={onClose} className="text-[11px] text-zinc-600 hover:text-zinc-400">cancel</button>
        <button
          onClick={accept}
          disabled={!canAccept}
          className="text-[11px] px-3 py-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-30 transition-colors inline-flex items-center gap-1.5"
        >
          <Check className="size-3" /> Add {goalRows.length} goal{goalRows.length === 1 ? "" : "s"}
          {live.length > goalRows.length && ` + ${live.length - goalRows.length} other`}
        </button>
      </div>
    </div>
  )
}
