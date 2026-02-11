"use client"

import { CheckCircle2, Sparkles, Star } from "lucide-react"
import type { ValueSource } from "../../types"
import { VALUE_SOURCE_CONFIG } from "../../config"

type AspirationalCheckProps = {
  value: { id: string; displayName: string }
  onChoose: (isAspirational: boolean) => void
  questionNumber: number
  totalQuestions: number
  /** Optional: source of the value for smart defaults and display */
  source?: ValueSource
  /** Optional: suggested default based on source (null = no suggestion) */
  defaultValue?: boolean | null
}

export function AspirationalCheck({
  value,
  onChoose,
  questionNumber,
  totalQuestions,
  source,
  defaultValue,
}: AspirationalCheckProps) {
  const sourceConfig = source ? VALUE_SOURCE_CONFIG[source] : null

  // Determine which option is suggested (if any)
  const suggestLiveThis = defaultValue === false
  const suggestAspire = defaultValue === true

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {questionNumber} of {totalQuestions}
        </p>
        <div className="inline-block px-5 py-2 rounded-full bg-primary/10 border border-primary/20">
          <h3 className="text-xl sm:text-2xl font-bold text-primary capitalize">
            {value.displayName}
          </h3>
        </div>

        {/* Source indicator */}
        {sourceConfig && (
          <div className="flex items-center justify-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: sourceConfig.color }}
            />
            <span className="text-xs text-muted-foreground">
              {sourceConfig.description}
            </span>
          </div>
        )}

        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          Do you live this value today, or is it something you're working towards?
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <button
          onClick={() => onChoose(false)}
          className={`
            relative p-5 sm:p-6 rounded-xl border-2
            bg-card hover:bg-green-500/10 hover:border-green-500 hover:shadow-lg hover:shadow-green-500/10
            transition-all duration-200 active:scale-[0.98]
            text-center space-y-3 group
            ${suggestLiveThis ? "border-green-500/50 bg-green-500/5" : "border-border"}
          `}
        >
          {/* Suggested badge */}
          {suggestLiveThis && (
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-green-500 text-[10px] font-medium text-white flex items-center gap-1">
              <Star className="w-2.5 h-2.5" />
              Suggested
            </span>
          )}

          <div className="w-10 h-10 mx-auto rounded-full bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="space-y-1">
            <span className="text-base sm:text-lg font-semibold text-foreground block group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
              I Live This
            </span>
            <span className="text-xs text-muted-foreground block">
              This is who I am
            </span>
          </div>
        </button>

        <button
          onClick={() => onChoose(true)}
          className={`
            relative p-5 sm:p-6 rounded-xl border-2
            bg-card hover:bg-blue-500/10 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10
            transition-all duration-200 active:scale-[0.98]
            text-center space-y-3 group
            ${suggestAspire ? "border-blue-500/50 bg-blue-500/5" : "border-border"}
          `}
        >
          {/* Suggested badge */}
          {suggestAspire && (
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-blue-500 text-[10px] font-medium text-white flex items-center gap-1">
              <Star className="w-2.5 h-2.5" />
              Suggested
            </span>
          )}

          <div className="w-10 h-10 mx-auto rounded-full bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="space-y-1">
            <span className="text-base sm:text-lg font-semibold text-foreground block group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              I Aspire to This
            </span>
            <span className="text-xs text-muted-foreground block">
              I'm working on it
            </span>
          </div>
        </button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {defaultValue !== null
          ? "We've suggested based on your responses—but you know yourself best"
          : "Be honest—there's no wrong answer"
        }
      </p>
    </div>
  )
}
