"use client"

import { CheckCircle2, Sparkles } from "lucide-react"

type AspirationalCheckProps = {
  value: { id: string; displayName: string }
  onChoose: (isAspirational: boolean) => void
  questionNumber: number
  totalQuestions: number
}

export function AspirationalCheck({
  value,
  onChoose,
  questionNumber,
  totalQuestions,
}: AspirationalCheckProps) {
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
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          Do you live this value today, or is it something you're working towards?
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <button
          onClick={() => onChoose(false)}
          className="
            p-5 sm:p-6 rounded-xl border-2 border-border
            bg-card hover:bg-green-500/10 hover:border-green-500 hover:shadow-lg hover:shadow-green-500/10
            transition-all duration-200 active:scale-[0.98]
            text-center space-y-3 group
          "
        >
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
          className="
            p-5 sm:p-6 rounded-xl border-2 border-border
            bg-card hover:bg-blue-500/10 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10
            transition-all duration-200 active:scale-[0.98]
            text-center space-y-3 group
          "
        >
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
        Be honest—there's no wrong answer
      </p>
    </div>
  )
}
