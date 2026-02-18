"use client"

import { Clock } from "lucide-react"
import { LIFE_AREAS } from "@/src/goals/data/lifeAreas"

interface HoursPanelProps {
  selectedL2Ids: Set<string>
  hoursEstimates: Record<string, number>
}

/**
 * Left sidebar showing time budget per life area.
 * Matches the whiteboard pictures' left column showing "~10 hours pr. week" etc.
 */
export function HoursPanel({ selectedL2Ids, hoursEstimates }: HoursPanelProps) {
  // For now, show daygame hours only (matching the pictures)
  const daygameArea = LIFE_AREAS.find((a) => a.id === "daygame")!
  let totalHours = 0
  for (const id of Object.keys(hoursEstimates)) {
    if (selectedL2Ids.has(id)) {
      totalHours += hoursEstimates[id]
    }
  }

  const entries = Object.entries(hoursEstimates)

  return (
    <div className="flex flex-col gap-3 min-w-[180px]">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed"
        style={{
          borderColor: "#666",
          backgroundColor: "#fef9c3",
        }}
      >
        <Clock className="size-4" style={{ color: "#333" }} />
        <span
          className="text-sm font-bold uppercase tracking-wider"
          style={{ color: "#333", fontFamily: "'Caveat', 'Patrick Hand', cursive, sans-serif" }}
        >
          HOURS
        </span>
      </div>

      {/* Total estimate */}
      <div
        className="rounded-lg border-2 px-3 py-3"
        style={{
          borderColor: daygameArea.hex + "60",
          backgroundColor: daygameArea.hex + "08",
        }}
      >
        <div className="text-xs font-medium mb-1" style={{ color: "#555" }}>
          Dating & Daygame
        </div>
        <div
          className="text-2xl font-bold"
          style={{
            color: "#333",
            fontFamily: "'Caveat', 'Patrick Hand', cursive, sans-serif",
          }}
        >
          ~{totalHours || 10} hrs
        </div>
        <div className="text-xs" style={{ color: "#888" }}>
          per week
        </div>
      </div>

      {/* Breakdown hint */}
      <div className="space-y-1.5 px-1">
        {entries
          .filter(([id]) => selectedL2Ids.has(id))
          .slice(0, 6)
          .map(([id, hours]) => (
            <div key={id} className="flex items-center justify-between text-xs" style={{ color: "#666" }}>
              <span className="truncate max-w-[110px]">{formatL2Name(id)}</span>
              <span
                style={{
                  fontFamily: "'Caveat', 'Patrick Hand', cursive, sans-serif",
                  fontSize: 13,
                  color: "#444",
                }}
              >
                ~{hours}h
              </span>
            </div>
          ))}
      </div>

      {/* Other areas (placeholder matching pictures) */}
      <div className="mt-2 pt-2" style={{ borderTop: "1px dashed #ccc" }}>
        {LIFE_AREAS.filter((a) => a.id !== "daygame" && a.id !== "custom")
          .slice(0, 3)
          .map((area) => (
            <div
              key={area.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded text-xs"
              style={{ color: "#999" }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: area.hex + "40" }}
              />
              <span className="truncate">{area.name}</span>
            </div>
          ))}
      </div>
    </div>
  )
}

function formatL2Name(templateId: string): string {
  return templateId
    .replace("l2_", "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
