"use client"

/** A dashed tile standing where a paywall, a sales card or a sign-up gate was. `label` is a bsText line. */
export function NotCopied({ label, testId = "not-copied" }: { label: string; testId?: string }) {
  return (
    <div data-testid={testId} className="flex min-h-11 items-center justify-center rounded-md border border-dashed border-border px-3 py-3 text-center text-sm text-muted-foreground">
      {label}
    </div>
  )
}

/** A multi-select or single-select card with a checkbox or radio mark on the right. */
export function PickCard({
  title,
  line,
  checked,
  onToggle,
  testId,
  radio,
  className = "",
}: {
  title: string
  line?: string
  checked: boolean
  onToggle: () => void
  testId: string
  radio?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      role={radio ? "radio" : "checkbox"}
      aria-checked={checked}
      data-testid={testId}
      data-checked={checked ? "1" : "0"}
      onClick={onToggle}
      className={`flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left ${checked ? "border-primary bg-primary/10" : "border-border bg-card"} ${className}`}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-semibold">{title}</span>
        {line && <span className="text-sm text-muted-foreground">{line}</span>}
      </span>
      <span aria-hidden="true" className={`flex size-6 shrink-0 items-center justify-center border ${radio ? "rounded-full" : "rounded"} ${checked ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
        {checked ? "✓" : ""}
      </span>
    </button>
  )
}

/** Toggle in a list: add or remove `id`. */
export function toggled(list: readonly string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
}
