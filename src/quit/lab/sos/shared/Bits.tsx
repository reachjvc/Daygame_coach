import { sharedText } from "./text"

/** Small tag on a screen that was never seen in public material. */
export function InferredTag() {
  return (
    <span
      data-testid="inferred-tag"
      className="inline-flex items-center rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground"
    >
      {sharedText.inferredTag}
    </span>
  )
}

/** A dashed tile where a guessed label, item or card would be. */
export function Placeholder({ className = "" }: { className?: string }) {
  return (
    <div
      data-testid="placeholder"
      className={`flex min-h-11 items-center justify-center rounded-md border border-dashed border-border px-3 py-3 text-center text-sm text-muted-foreground ${className}`}
    >
      {sharedText.notSeen}
    </div>
  )
}

/** Stands where a competitor's unsourced number would be. */
export function NotSourced() {
  return (
    <span data-testid="not-sourced" className="rounded border border-dashed border-border px-1.5 py-0.5 text-sm text-muted-foreground">
      {sharedText.notSourced}
    </span>
  )
}

/** A whole screen that was never seen: back link, inferred tag, placeholder tiles. */
export function PlaceholderScreen({ title, onBack }: { title: string; onBack: (() => void) | null }) {
  return (
    <section data-testid="placeholder-screen" className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {onBack && (
          <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline">
            {sharedText.back}
          </button>
        )}
        <h2 className="flex-1 text-lg font-semibold">{title}</h2>
        <InferredTag />
      </div>
      <p className="text-sm text-muted-foreground">{sharedText.placeholderScreen}</p>
      <Placeholder />
      <Placeholder />
    </section>
  )
}

/** Breathing pacer: a circle that swells on the in-breath and shrinks on the out-breath. */
export function Orb({ big, seconds, label }: { big: boolean; seconds: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-4" data-testid="orb">
      <div
        className="flex size-56 items-center justify-center rounded-full border-4 border-primary/60 bg-primary/10"
        style={{ transform: `scale(${big ? 1 : 0.6})`, transition: `transform ${seconds}s ease-in-out` }}
      >
        <span data-testid="orb-word" className="text-xl font-semibold">
          {label}
        </span>
      </div>
    </div>
  )
}
