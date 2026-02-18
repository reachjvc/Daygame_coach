"use client"

import { Heart, Flame, ArrowRight } from "lucide-react"
import type { GoalTemplate } from "@/src/goals/types"

interface GoalPickerProps {
  onePerson: GoalTemplate[]
  abundance: GoalTemplate[]
  onPick: (template: GoalTemplate) => void
}

/**
 * Initial goal picker screen with the whiteboard aesthetic.
 * Shows L1 goals in two paths: "Find the One" and "Abundance".
 * Clicking a goal transitions to the full mind-map canvas.
 */
export function GoalPicker({ onePerson, abundance, onPick }: GoalPickerProps) {
  return (
    <div
      className="rounded-2xl border-2 border-dashed p-8 mx-auto max-w-3xl"
      style={{
        backgroundColor: "#fafbfc",
        borderColor: "#cbd5e1",
        backgroundImage:
          "radial-gradient(circle, #d1d5db 0.6px, transparent 0.6px)",
        backgroundSize: "20px 20px",
      }}
    >
      {/* Header */}
      <div className="text-center mb-8">
        <h2
          className="text-2xl font-bold mb-2"
          style={{
            color: "#1e293b",
            fontFamily: "'Caveat', 'Patrick Hand', cursive, sans-serif",
            fontSize: 32,
          }}
        >
          What&apos;s your big goal?
        </h2>
        <p className="text-sm" style={{ color: "#64748b" }}>
          Pick a life goal and we&apos;ll build your complete goal map — like a whiteboard plan you can actually track.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Find the One path */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Heart className="size-5" style={{ color: "#ec4899" }} />
            <h3
              className="font-bold"
              style={{
                color: "#1e293b",
                fontFamily: "'Caveat', 'Patrick Hand', cursive, sans-serif",
                fontSize: 20,
              }}
            >
              Find the One
            </h3>
          </div>
          <div className="space-y-2">
            {onePerson.map((tmpl) => (
              <GoalPickerCard key={tmpl.id} template={tmpl} onPick={onPick} accentColor="#ec4899" />
            ))}
          </div>
        </div>

        {/* Abundance path */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Flame className="size-5" style={{ color: "#f97316" }} />
            <h3
              className="font-bold"
              style={{
                color: "#1e293b",
                fontFamily: "'Caveat', 'Patrick Hand', cursive, sans-serif",
                fontSize: 20,
              }}
            >
              Abundance
            </h3>
          </div>
          <div className="space-y-2">
            {abundance.map((tmpl) => (
              <GoalPickerCard key={tmpl.id} template={tmpl} onPick={onPick} accentColor="#f97316" />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom hint */}
      <div className="text-center mt-8">
        <p
          className="text-xs"
          style={{
            color: "#94a3b8",
            fontFamily: "'Caveat', 'Patrick Hand', cursive, sans-serif",
            fontSize: 14,
          }}
        >
          Click any goal to see its complete mind-map breakdown
        </p>
      </div>
    </div>
  )
}

function GoalPickerCard({
  template,
  onPick,
  accentColor,
}: {
  template: GoalTemplate
  onPick: (t: GoalTemplate) => void
  accentColor: string
}) {
  return (
    <button
      onClick={() => onPick(template)}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 text-left transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer group"
      style={{
        backgroundColor: "#ffffff",
        borderColor: "#e2e8f0",
      }}
    >
      <div
        className="w-1.5 h-8 rounded-full flex-shrink-0 transition-all group-hover:h-10"
        style={{ backgroundColor: accentColor + "60" }}
      />
      <span
        className="text-sm font-medium flex-1"
        style={{ color: "#1e293b" }}
      >
        {template.title}
      </span>
      <ArrowRight
        className="size-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: accentColor }}
      />
    </button>
  )
}
