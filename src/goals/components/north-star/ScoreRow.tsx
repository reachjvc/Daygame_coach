"use client"


/**
 * A 0-10 row. Clicking the score you already picked clears it, so "I do not
 * want to answer this yet" stays reachable without a separate control.
 */
export function ScoreRow({ label, value, color, ariaLabel, onPick }: {
  label: string
  value: number | null
  color: string
  ariaLabel: (n: number) => string
  onPick: (n: number) => void
}) {
  return (
    <div className="mt-1.5">
      {label && (
        <p className="text-[11px] text-zinc-400 mb-1">
          {label}
          <span className={`ml-1.5 tabular-nums ${value == null ? "text-zinc-600" : "text-zinc-300"}`}>
            {value != null ? `${value}/10` : "not rated"}
          </span>
        </p>
      )}
      <div className="grid grid-cols-11 gap-1 sm:flex sm:flex-wrap">
        {Array.from({ length: 11 }, (_, n) => (
          <button
            key={n}
            onClick={() => onPick(n)}
            aria-pressed={value === n}
            aria-label={ariaLabel(n)}
            className="h-6 w-full min-w-0 sm:w-6 rounded-md border text-[10.5px] tabular-nums transition-colors hover:border-white/40"
            style={
              value === n
                ? { backgroundColor: color, borderColor: color, color: "#09090b" }
                : { borderColor: "rgba(255,255,255,0.12)", color: "#a1a1aa" }
            }
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

