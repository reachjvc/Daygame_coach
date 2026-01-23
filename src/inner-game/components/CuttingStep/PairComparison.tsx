"use client"

type PairComparisonProps = {
  valueA: { id: string; displayName: string }
  valueB: { id: string; displayName: string }
  onChoose: (chosenId: string) => void
  questionNumber: number
  totalQuestions: number
}

export function PairComparison({
  valueA,
  valueB,
  onChoose,
  questionNumber,
  totalQuestions,
}: PairComparisonProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {questionNumber} of {totalQuestions}
        </p>
        <h3 className="text-lg sm:text-xl font-semibold text-foreground">
          If you could only keep one?
        </h3>
      </div>

      {/* Comparison grid with VS divider */}
      <div className="relative">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <button
            onClick={() => onChoose(valueA.id)}
            className="
              p-5 sm:p-6 rounded-xl border-2 border-border
              bg-card hover:bg-primary/5 hover:border-primary hover:shadow-lg hover:shadow-primary/10
              transition-all duration-200 active:scale-[0.98]
              text-center group
            "
          >
            <span className="text-base sm:text-lg font-semibold text-foreground capitalize group-hover:text-primary transition-colors">
              {valueA.displayName}
            </span>
          </button>

          <button
            onClick={() => onChoose(valueB.id)}
            className="
              p-5 sm:p-6 rounded-xl border-2 border-border
              bg-card hover:bg-primary/5 hover:border-primary hover:shadow-lg hover:shadow-primary/10
              transition-all duration-200 active:scale-[0.98]
              text-center group
            "
          >
            <span className="text-base sm:text-lg font-semibold text-foreground capitalize group-hover:text-primary transition-colors">
              {valueB.displayName}
            </span>
          </button>
        </div>

        {/* VS badge centered between the two cards */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-muted border-2 border-background shadow-sm flex items-center justify-center">
            <span className="text-xs font-bold text-muted-foreground">VS</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Trust your gut—go with your first instinct
      </p>
    </div>
  )
}
