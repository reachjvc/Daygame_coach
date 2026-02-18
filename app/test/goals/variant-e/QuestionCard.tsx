"use client"

import { useState } from "react"
import { ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface QuestionOption<T extends string> {
  value: T
  label: string
  description: string
}

interface QuestionCardProps<T extends string> {
  question: string
  subtitle?: string
  options: QuestionOption<T>[]
  selected: T | null
  onSelect: (value: T) => void
  onContinue: () => void
  phaseNumber: number
  totalPhases: number
  canContinue?: boolean
  /** Allow multiple selection (for life areas) */
  multi?: boolean
  multiSelected?: string[]
  onMultiToggle?: (value: string) => void
}

export function QuestionCard<T extends string>({
  question,
  subtitle,
  options,
  selected,
  onSelect,
  onContinue,
  phaseNumber,
  totalPhases,
  canContinue = true,
  multi = false,
  multiSelected = [],
  onMultiToggle,
}: QuestionCardProps<T>) {
  const [hovered, setHovered] = useState<T | null>(null)

  return (
    <div className="max-w-2xl mx-auto px-4">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-8">
        {Array.from({ length: totalPhases }, (_, i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-500"
            style={{
              backgroundColor: i < phaseNumber
                ? "#f97316"
                : i === phaseNumber
                  ? "#f97316"
                  : "rgba(255,255,255,0.1)",
              opacity: i === phaseNumber ? 1 : i < phaseNumber ? 0.6 : 0.2,
            }}
          />
        ))}
      </div>

      {/* Question */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight mb-2">{question}</h2>
        {subtitle && (
          <p className="text-muted-foreground text-sm">{subtitle}</p>
        )}
      </div>

      {/* Options */}
      <div className="space-y-3 mb-8">
        {options.map((opt) => {
          const isSelected = multi
            ? multiSelected.includes(opt.value)
            : selected === opt.value
          const isHovered = hovered === opt.value

          return (
            <button
              key={opt.value}
              onClick={() => {
                if (multi && onMultiToggle) {
                  onMultiToggle(opt.value)
                } else {
                  onSelect(opt.value)
                }
              }}
              onMouseEnter={() => setHovered(opt.value)}
              onMouseLeave={() => setHovered(null)}
              className="w-full text-left rounded-xl px-5 py-4 transition-all duration-200 cursor-pointer group"
              style={{
                border: `1.5px solid ${isSelected ? "#f97316" : isHovered ? "rgba(249,115,22,0.4)" : "rgba(255,255,255,0.08)"}`,
                backgroundColor: isSelected
                  ? "rgba(249,115,22,0.08)"
                  : isHovered
                    ? "rgba(249,115,22,0.03)"
                    : "rgba(255,255,255,0.02)",
                transform: isSelected ? "scale(1.01)" : undefined,
              }}
              data-testid={`option-${opt.value}`}
            >
              <div className="flex items-center gap-4">
                {/* Selection indicator */}
                <div
                  className="size-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all"
                  style={{
                    borderColor: isSelected ? "#f97316" : "rgba(255,255,255,0.2)",
                    backgroundColor: isSelected ? "#f97316" : "transparent",
                  }}
                >
                  {isSelected && (
                    <div className="size-2 rounded-full bg-white" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                </div>

                {isSelected && (
                  <ChevronRight className="size-4 text-orange-500 flex-shrink-0" />
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Continue button */}
      <div className="flex justify-end">
        <Button
          onClick={onContinue}
          disabled={!canContinue || (!multi && !selected) || (multi && multiSelected.length === 0 && options.length > 0)}
          className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-all disabled:opacity-30"
          data-testid="question-continue"
        >
          Continue
          <ChevronRight className="size-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}
