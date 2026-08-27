"use client"

import { useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Check, ChevronDown, ChevronRight, Search, X } from "lucide-react"
import { LIFE_AREAS } from "@/src/goals/data/lifeAreas"
import { METRIC_CATALOG, METRIC_AREA_ORDER } from "../../data/metricCatalog"
import { isTrackableGoal, metricsForGoal } from "../../metricsService"
import type { MetricDef } from "../../types"
import type { UserGoalRow } from "@/src/db/goalTypes"

interface MetricPickerDialogProps {
  open: boolean
  onClose: () => void
  onPick: (metricId: string) => void
  goals: UserGoalRow[]
  /** Already on the dashboard — shown ticked and not pickable twice. */
  usedIds: string[]
}

const AREA_NAME: Record<string, string> = Object.fromEntries(LIFE_AREAS.map((a) => [a.id, a.name]))

/**
 * Browse everything the app can count, by life area.
 *
 * WHY GOALS ARE COLLAPSED: every goal offers five readings, and a real user here
 * had 82 goals — 410 rows before the first catalogue metric. So a goal is one
 * row showing the reading you almost always want (the metric that advances it,
 * or its current period), with the other four behind an expander.
 *
 * WHY AREAS ARE COLLAPSED: the same problem one level up. Dating opens by
 * default because it is where the app has the most to offer; the rest announce
 * how much they hold and open on click.
 */
export function MetricPickerDialog({ open, onClose, onPick, goals, usedIds }: MetricPickerDialogProps) {
  const [query, setQuery] = useState("")
  const [openAreas, setOpenAreas] = useState<Set<string>>(new Set(["daygame"]))
  const [openGoals, setOpenGoals] = useState<Set<string>>(new Set())

  // Only goals the user actually logs against. L1/L2 outcomes ("Get a
  // girlfriend", "Approach Legend") are containers whose progress comes from
  // the goals beneath them — a tile on one would read 0 forever.
  const activeGoals = useMemo(() => goals.filter(isTrackableGoal), [goals])

  /** Areas the picker renders: the known five, plus any area a goal lives in. */
  const areas = useMemo(() => {
    const extra = activeGoals
      .map((g) => g.life_area)
      .filter((a) => a && !(METRIC_AREA_ORDER as readonly string[]).includes(a))
    return [...METRIC_AREA_ORDER, ...new Set(extra)]
  }, [activeGoals])

  const q = query.trim().toLowerCase()
  const matchesDef = (d: MetricDef) =>
    !q ||
    d.label.toLowerCase().includes(q) ||
    d.description.toLowerCase().includes(q) ||
    d.group.toLowerCase().includes(q)

  if (!open) return null

  const used = new Set(usedIds)
  const toggle = (set: Set<string>, key: string, update: (s: Set<string>) => void) => {
    const next = new Set(set)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    update(next)
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 pt-safe pb-safe">
      <Card
        className="w-full max-w-3xl max-h-[calc(var(--app-vh)*90)] overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="metric-picker-title"
        data-testid="metric-picker"
      >
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 id="metric-picker-title" className="text-xl font-bold">Add a tile</h2>
            <p className="text-sm text-muted-foreground">Pick something to show on your dashboard</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="size-5" />
          </button>
        </div>

        <div className="p-4 border-b">
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search metrics and goals…"
              data-testid="metric-search"
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-muted/50 border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        <div className="overflow-y-auto p-4 space-y-2">
          {areas.map((areaId) => {
            const areaGoals = activeGoals.filter((g) => g.life_area === areaId)
            const areaMetrics = METRIC_CATALOG.filter((d) => d.area === areaId && matchesDef(d))

            // With a search active, a goal counts as a match on its title or on
            // any of its readings, so searching "streak" finds goal streaks too.
            const goalHits = areaGoals.filter((g) => {
              if (!q) return true
              if (g.title.toLowerCase().includes(q)) return true
              return metricsForGoal(g).some(matchesDef)
            })

            if (goalHits.length === 0 && areaMetrics.length === 0) return null

            // A search opens whatever it found; otherwise the user's clicks decide.
            const isOpen = q.length > 0 || openAreas.has(areaId)
            const groups = [...new Set(areaMetrics.map((d) => d.group))]

            return (
              <section key={areaId} data-testid={`picker-area-${areaId}`} className="border border-border rounded-lg">
                <button
                  type="button"
                  onClick={() => toggle(openAreas, areaId, setOpenAreas)}
                  aria-expanded={isOpen}
                  data-testid={`picker-area-toggle-${areaId}`}
                  className="w-full flex items-center gap-2 p-3 text-left hover:bg-muted/50 transition-colors rounded-lg"
                >
                  {isOpen ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
                  <span className="text-sm font-semibold flex-1">{AREA_NAME[areaId] ?? areaId}</span>
                  <span className="text-xs text-muted-foreground">
                    {countLabel(goalHits.length, areaMetrics.length)}
                  </span>
                </button>

                {isOpen && (
                  <div className="px-3 pb-3 space-y-4">
                    {goalHits.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1.5">
                          Your goals — tracked by what you log against them
                        </div>
                        <p className="text-xs text-muted-foreground/70 mb-2">
                          Higher-level goals are not listed: they are reached through the goals below them.
                        </p>
                        <div className="space-y-1.5">
                          {goalHits.map((g) => (
                            <GoalPickerRow
                              key={g.id}
                              goal={g}
                              used={used}
                              expanded={openGoals.has(g.id)}
                              onToggle={() => toggle(openGoals, g.id, setOpenGoals)}
                              onPick={onPick}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {groups.map((group) => (
                      <div key={group}>
                        <div className="text-xs font-medium text-muted-foreground mb-1.5">{group}</div>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {areaMetrics
                            .filter((d) => d.group === group)
                            .map((d) => (
                              <MetricRow key={d.id} def={d} used={used.has(d.id)} onPick={onPick} />
                            ))}
                        </div>
                      </div>
                    ))}

                    {areaMetrics.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        The app has no automatic data source for this area yet — these goals are tracked
                        by what you log against them.
                      </p>
                    )}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

/**
 * One goal, one row. Clicking the row adds the reading that best represents it;
 * the chevron reveals the other ways to read the same goal.
 */
function GoalPickerRow({
  goal,
  used,
  expanded,
  onToggle,
  onPick,
}: {
  goal: UserGoalRow
  used: Set<string>
  expanded: boolean
  onToggle: () => void
  onPick: (id: string) => void
}) {
  const defs = metricsForGoal(goal)
  if (defs.length === 0) return null
  const [primary, ...rest] = defs
  const Icon = primary.icon

  return (
    <div className="rounded-lg border border-border" data-testid={`picker-goal-${goal.id}`}>
      <div className="flex items-stretch">
        <button
          type="button"
          disabled={used.has(primary.id)}
          onClick={() => onPick(primary.id)}
          data-testid={`metric-option-${primary.id}`}
          className={`flex-1 min-w-0 text-left flex items-start gap-3 p-3 rounded-l-lg transition-colors ${
            used.has(primary.id) ? "opacity-60 cursor-default" : "hover:bg-muted/50"
          }`}
        >
          <Icon className={`size-4 mt-0.5 shrink-0 ${primary.accent}`} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium truncate">{goal.title}</span>
            <span className="block text-xs text-muted-foreground truncate">{primary.description}</span>
          </span>
          {used.has(primary.id) && <Check className="size-4 shrink-0 text-muted-foreground" aria-label="Already added" />}
        </button>
        {rest.length > 0 && (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={`More ways to track ${goal.title}`}
            data-testid={`expand-goal-${goal.id}`}
            className="px-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border-l border-border transition-colors"
          >
            {rest.length} more
            {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </button>
        )}
      </div>

      {expanded && (
        <div className="grid sm:grid-cols-2 gap-2 p-2 pt-0">
          {rest.map((d) => (
            <MetricRow key={d.id} def={d} used={used.has(d.id)} onPick={onPick} />
          ))}
        </div>
      )}
    </div>
  )
}

function MetricRow({ def, used, onPick }: { def: MetricDef; used: boolean; onPick: (id: string) => void }) {
  const Icon = def.icon
  return (
    <button
      type="button"
      disabled={used}
      onClick={() => onPick(def.id)}
      data-testid={`metric-option-${def.id}`}
      className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border transition-colors ${
        used
          ? "border-border bg-muted/40 opacity-60 cursor-default"
          : "border-border hover:border-primary/50 hover:bg-muted/50"
      }`}
    >
      <Icon className={`size-4 mt-0.5 shrink-0 ${def.accent}`} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium truncate">{def.label}</span>
        <span className="block text-xs text-muted-foreground line-clamp-2">{def.description}</span>
      </span>
      {used && <Check className="size-4 shrink-0 text-muted-foreground" aria-label="Already added" />}
    </button>
  )
}

function countLabel(goalCount: number, metricCount: number): string {
  const parts: string[] = []
  if (goalCount > 0) parts.push(`${goalCount} goal${goalCount === 1 ? "" : "s"}`)
  if (metricCount > 0) parts.push(`${metricCount} metric${metricCount === 1 ? "" : "s"}`)
  return parts.join(" · ")
}
