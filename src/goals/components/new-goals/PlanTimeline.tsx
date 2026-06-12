"use client"

/**
 * Timeline figure for the Plan page — a clean Gantt-style view of how each life AREA builds
 * toward the overall goal. X axis = time (today → the "achieve by" / furthest goal). Each area
 * is a lane: a solid bar runs to its furthest dated goal; areas with no date yet show a faded
 * "ongoing" bar. A flagged line marks the end-goal date.
 */

const DAY = 86_400_000

function parseISO(d?: string | null): number | null {
  if (!d) return null
  const t = Date.parse(d + "T00:00:00")
  return Number.isNaN(t) ? null : t
}
function fmtMs(ms: number): string {
  const d = new Date(ms)
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${d.getDate()} ${months[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`
}

export interface TimelineArea {
  id: string
  label: string
  color: string
  /** The area's furthest goal date (YYYY-MM-DD), or null if it has no dated goals yet. */
  endDate: string | null
}

export function PlanTimeline({
  areas,
  startDate,
  endGoalDate,
}: {
  areas: TimelineArea[]
  startDate: string
  endGoalDate: string | null
}) {
  if (areas.length === 0) return null

  const start = parseISO(startDate) ?? Date.now()
  const endGoal = parseISO(endGoalDate)
  const areaEnds = areas.map((a) => parseISO(a.endDate)).filter((t): t is number => t != null)

  // Range: today → furthest of (area ends, end goal); pad ~6% on the right so labels/flag fit.
  const rawMax = Math.max(start + 60 * DAY, ...areaEnds, endGoal ?? 0)
  const max = rawMax + (rawMax - start) * 0.06
  const span = Math.max(1, max - start)
  const pct = (t: number) => Math.max(0, Math.min(100, ((t - start) / span) * 100))

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 mb-6">
      <p className="text-xs font-medium text-zinc-300 mb-4">Timeline — how your areas build toward the goal</p>

      <div className="flex gap-3">
        {/* Left: area name gutter (bars align from here) */}
        <div className="w-24 shrink-0 pt-3">
          {areas.map((a) => (
            <div key={a.id} className="h-7 flex items-center gap-1.5">
              <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
              <span className="text-[11px] truncate" style={{ color: a.color }}>{a.label}</span>
            </div>
          ))}
        </div>

        {/* Right: plot area */}
        <div className="flex-1 min-w-0 relative pt-3">
          {/* End-goal flag line */}
          {endGoal != null && (
            <div className="absolute top-0 bottom-6 w-px bg-amber-400/70 z-20" style={{ left: `${pct(endGoal)}%` }}>
              <span className="absolute top-0 -translate-y-full -translate-x-1/2 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-[9px] text-amber-200 whitespace-nowrap font-medium">
                ★ Goal · {fmtMs(endGoal)}
              </span>
            </div>
          )}

          {/* Lanes */}
          <div className="space-y-1">
            {areas.map((a) => {
              const e = parseISO(a.endDate)
              if (e != null) {
                const w = Math.max(pct(e), 6)
                return (
                  <div key={a.id} className="relative h-7 rounded-md bg-white/[0.03]">
                    <div
                      className="absolute left-0 top-0.5 bottom-0.5 rounded"
                      style={{ width: `${w}%`, background: `linear-gradient(90deg, ${a.color}66, ${a.color}33)`, borderRight: `2px solid ${a.color}` }}
                    />
                    <span className="absolute top-0 h-full flex items-center text-[10px] text-zinc-300 pl-1.5 whitespace-nowrap" style={{ left: `${w}%` }}>
                      {fmtMs(e)}
                    </span>
                  </div>
                )
              }
              // Undated → faded "ongoing" bar to the end of the range.
              return (
                <div key={a.id} className="relative h-7 rounded-md bg-white/[0.03]">
                  <div
                    className="absolute left-0 top-0.5 bottom-0.5 right-0 rounded opacity-30"
                    style={{ background: `repeating-linear-gradient(45deg, ${a.color}33, ${a.color}33 6px, transparent 6px, transparent 12px)` }}
                  />
                  <span className="absolute right-1.5 top-0 h-full flex items-center text-[9px] text-zinc-500 italic">ongoing</span>
                </div>
              )
            })}
          </div>

          {/* Axis: start (today) → end */}
          <div className="relative mt-1.5 pt-1.5 border-t border-white/10 h-4 text-[9px] text-zinc-500">
            <span className="absolute left-0">{fmtMs(start)}</span>
            <span className="absolute left-1/2 -translate-x-1/2">{fmtMs(start + span / 2)}</span>
            <span className="absolute right-0">{fmtMs(max)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
