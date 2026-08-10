"use client"

/**
 * The life wheel, with as many sectors as the user has areas.
 *
 * The sectors carry real colour rather than a hint of it. An earlier pass drew
 * them at 8% opacity, which read as a grey donut with a tint, and the wheel is
 * the one thing on this page that is supposed to be looked at rather than read.
 * Unrated sectors are a solid wash of their own colour; a rating paints the
 * inner part at full strength, so the fill line is the score and the wash is
 * still unmistakably that area.
 *
 * Identity is never colour alone. Every sector is direct-labelled and separated
 * by a gap, so the wheel still reads for someone who cannot tell the fills
 * apart. The dashed ring is the floor at 7.
 *
 * The sectors are always buttons. This wheel is the navigator for the whole
 * tab: clicking one opens that area, which is where goals get written. An
 * earlier pass made them interactive only in edit mode, so the most obviously
 * clickable thing on the page did nothing.
 */

import type { NsArea } from "@/src/goals/types"
import { NS_FLOOR } from "@/src/goals/data/northStar"

const C = 195
const R = 108
const GAP = 2.5

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
}

function wedge(startDeg: number, endDeg: number, r: number): string {
  const [x1, y1] = polar(C, C, r, startDeg)
  const [x2, y2] = polar(C, C, r, endDeg)
  const large = endDeg - startDeg > 180 ? 1 : 0
  return `M ${C} ${C} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`
}

export function AreaWheel({
  areas,
  ratings,
  goalCounts,
  activeId,
  onPick,
  centreLabel,
}: {
  areas: NsArea[]
  /** Area id to 0-10. Missing means not rated yet. */
  ratings: Record<string, number>
  /** Area id to how many goals sit in it. */
  goalCounts: Record<string, number>
  activeId: string | null
  onPick: (id: string) => void
  centreLabel?: string
}) {
  const n = Math.max(1, areas.length)
  const seg = 360 / n
  const rated = areas.filter((a) => ratings[a.id] != null)
  const avg = rated.length ? Math.round((rated.reduce((s, a) => s + ratings[a.id], 0) / rated.length) * 10) / 10 : null

  /**
   * The box, measured from what is actually drawn.
   *
   * A fixed square box has to assume a label sits at every compass point. With
   * four areas the labels land on the diagonals, so the top and bottom of that
   * box are empty, and on a surface where the routine stack hangs off the
   * bottom of the wheel that empty strip reads as a gap between two unrelated
   * things. Measuring instead means the box is tight for four areas and still
   * correct for nine.
   */
  const box = (() => {
    const PAD = 6
    let minX = C - R
    let maxX = C + R
    let minY = C - R
    let maxY = C + R
    areas.forEach((a, i) => {
      const mid = i * seg + seg / 2
      const [lx, ly] = polar(C, C, R + 17, mid)
      const cos = Math.cos(((mid - 90) * Math.PI) / 180)
      const anchor = cos > 0.25 ? "start" : cos < -0.25 ? "end" : "middle"
      const label = a.label.length > 16 ? 16 : a.label.length
      // ~5.4px per character at the 9.5px label size. An estimate is fine: it
      // only ever adds slack, and slack here is a few pixels of margin.
      const w = Math.max(label, 10) * 5.4
      const x0 = anchor === "start" ? lx : anchor === "end" ? lx - w : lx - w / 2
      minX = Math.min(minX, x0)
      maxX = Math.max(maxX, x0 + w)
      minY = Math.min(minY, ly - 7)
      maxY = Math.max(maxY, ly + 16)
    })
    return `${(minX - PAD).toFixed(1)} ${(minY - PAD).toFixed(1)} ${(maxX - minX + PAD * 2).toFixed(1)} ${(maxY - minY + PAD * 2).toFixed(1)}`
  })()

  return (
    <svg
      viewBox={box}
      className="w-full max-w-[380px] h-auto mx-auto block"
      role="group"
      aria-label={avg != null ? `Your life wheel. Average ${avg} out of 10 across ${areas.length} areas` : `Your life wheel. ${areas.length} areas, none rated yet`}
    >
      <defs>
        {/* A soft bloom under the rated part, so a filled sector reads as lit
            rather than merely darker than its neighbour. */}
        <filter id="ns-wheel-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {[0.25, 0.5, 0.75, 1].map((f) => (
        <circle key={f} cx={C} cy={C} r={R * f} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      ))}

      {areas.map((a, i) => {
        const start = i * seg + GAP / 2
        const end = (i + 1) * seg - GAP / 2
        const mid = i * seg + seg / 2
        const rating = ratings[a.id] ?? null
        const goals = goalCounts[a.id] ?? 0
        const active = a.id === activeId
        const [lx, ly] = polar(C, C, R + 17, mid)
        const cos = Math.cos(((mid - 90) * Math.PI) / 180)
        const anchor = cos > 0.25 ? "start" : cos < -0.25 ? "end" : "middle"
        const label = a.label.length > 16 ? `${a.label.slice(0, 15)}…` : a.label
        const sub = rating != null ? `${rating}/10` : goals > 0 ? `${goals} ${goals === 1 ? "goal" : "goals"}` : "not rated"
        const pressProps = {
          role: "button",
          tabIndex: 0,
          "aria-pressed": active,
          "aria-label": `${a.label}. ${goals} ${goals === 1 ? "goal" : "goals"}.${rating != null ? ` Rated ${rating} out of 10.` : ""} Open it.`,
          onClick: () => onPick(a.id),
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              onPick(a.id)
            }
          },
          className: "cursor-pointer focus:outline-none",
        }
        return (
          <g key={a.id}>
            {/* The unrated wash. Solid enough to be that area's colour. */}
            <path
              d={wedge(start, end, R)}
              fill={`${a.color}3d`}
              stroke={active ? "#fff" : `${a.color}80`}
              strokeWidth={active ? 2 : 1}
              {...pressProps}
            >
              <title>{a.sublabel ? `${a.label} — ${a.sublabel}` : a.label}</title>
            </path>
            {rating != null && (
              <path
                d={wedge(start, end, (R * Math.min(10, Math.max(0.6, rating))) / 10)}
                fill={a.color}
                fillOpacity={0.92}
                stroke={a.color}
                strokeWidth="1.5"
                filter="url(#ns-wheel-glow)"
                className="pointer-events-none"
              />
            )}
            {goals > 0 && (
              <circle
                cx={lx - (anchor === "end" ? -6 : anchor === "start" ? 6 : 0)}
                cy={ly - (anchor === "middle" ? 10 : 0)}
                r="2.4"
                fill={a.color}
                className="pointer-events-none"
              />
            )}
            <text
              x={lx.toFixed(2)}
              y={ly.toFixed(2)}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize="9.5"
              fontWeight={active ? 700 : 500}
              fill={active ? "#fff" : "#e4e4e7"}
              onClick={() => onPick(a.id)}
              className="cursor-pointer"
            >
              {label}
            </text>
            <text
              x={lx.toFixed(2)}
              y={(ly + 11).toFixed(2)}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize="8.5"
              fill={rating != null && rating < NS_FLOOR ? "#fbbf24" : rating != null ? a.color : "#71717a"}
              onClick={() => onPick(a.id)}
              className="cursor-pointer tabular-nums"
            >
              {sub}
            </text>
          </g>
        )
      })}

      {/* The floor sits above the fills so it stays readable on a lit sector. */}
      <circle cx={C} cy={C} r={(R * NS_FLOOR) / 10} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="3 4" className="pointer-events-none">
        <title>The floor, at {NS_FLOOR}. Below it an area is asking for attention.</title>
      </circle>

      {areas.map((_, i) => {
        const [x, y] = polar(C, C, R, i * seg)
        return <line key={i} x1={C} y1={C} x2={x.toFixed(2)} y2={y.toFixed(2)} stroke="rgba(9,9,11,0.9)" strokeWidth="2" className="pointer-events-none" />
      })}

      <circle cx={C} cy={C} r="31" fill="#09090b" stroke="rgba(255,255,255,0.18)" strokeWidth="1" className="pointer-events-none" />
      <text x={C} y={C - 4} textAnchor="middle" fontSize="17" fontWeight="700" fill="#fff" className="tabular-nums pointer-events-none">
        {avg != null ? avg : areas.length}
      </text>
      <text x={C} y={C + 12} textAnchor="middle" fontSize="7.5" fill="#a1a1aa" letterSpacing="1" className="pointer-events-none">
        {avg != null ? "AVG / 10" : (centreLabel ?? "AREAS")}
      </text>
    </svg>
  )
}
