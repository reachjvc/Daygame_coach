"use client"

/**
 * Small pieces shared across the six sessions.
 *
 * Nothing here holds state or knows about the plan. Sessions own their data
 * and pass it down, so a prompt rendered in session 2 and the same prompt
 * rendered in the read-back cannot drift apart.
 */

export function SessionHeading({ title, blurb }: { title: string; blurb?: string }) {
  return (
    <div className="space-y-1">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      {blurb ? <p className="text-sm text-muted-foreground">{blurb}</p> : null}
    </div>
  )
}

/** A written answer. The hint sits under the question, never inside the box. */
export function Prompt({
  title,
  body,
  minutes,
  value,
  onChange,
  rows = 5,
  placeholder,
}: {
  title: string
  body?: string
  minutes?: number
  value: string
  onChange: (v: string) => void
  rows?: number
  placeholder?: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-4">
        <label className="text-sm font-medium text-foreground">{title}</label>
        {minutes ? (
          <span className="shrink-0 text-xs text-muted-foreground">about {minutes} min</span>
        ) : null}
      </div>
      {body ? <p className="text-sm text-muted-foreground">{body}</p> : null}
      <textarea
        className="w-full rounded-md border border-border bg-background p-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

/** A single-line answer. */
export function LineInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        type={type}
        className="w-full rounded-md border border-border bg-background p-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  )
}

/**
 * A discrete scale. Rendered as buttons rather than a slider so that an
 * untouched scale is visibly untouched: a slider always looks answered.
 */
export function Scale({
  min,
  max,
  value,
  onChange,
  lowLabel,
  highLabel,
}: {
  min: number
  max: number
  value: number | null
  onChange: (v: number) => void
  lowLabel?: string
  highLabel?: string
}) {
  const options = Array.from({ length: max - min + 1 }, (_, i) => min + i)
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1">
        {options.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-pressed={value === n}
            className={`h-9 w-9 rounded-md border text-sm transition ${
              value === n
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:border-primary/50"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      {lowLabel || highLabel ? (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{lowLabel}</span>
          <span>{highLabel}</span>
        </div>
      ) : null}
    </div>
  )
}

/** A labelled scale where the options carry words rather than numbers. */
export function ChoiceRow({
  options,
  value,
  onChange,
}: {
  options: readonly { id: string; label: string }[]
  value: string | null
  onChange: (id: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={`rounded-md border px-3 py-1.5 text-sm transition ${
            value === o.id
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-muted-foreground hover:border-primary/50"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Chip({
  active,
  onClick,
  children,
  disabled,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-background text-muted-foreground hover:border-primary/50"
      }`}
    >
      {children}
    </button>
  )
}

/** A refusal, stated plainly. Used where the flow declines to proceed. */
export function Blocker({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {children ? <div className="mt-1 text-sm text-muted-foreground">{children}</div> : null}
    </div>
  )
}

/** Something worth looking at that does not stop the user. */
export function Notice({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-muted/40 p-3">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {children ? <div className="mt-1 text-sm text-muted-foreground">{children}</div> : null}
    </div>
  )
}

/** A list the user builds by typing. Enter adds, so it stays keyboard-only. */
export function AddRow({
  placeholder,
  onAdd,
  buttonLabel = "Add",
}: {
  placeholder: string
  onAdd: (text: string) => void
  buttonLabel?: string
}) {
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        const input = e.currentTarget.elements.namedItem("entry") as HTMLInputElement
        if (input.value.trim()) {
          onAdd(input.value)
          input.value = ""
        }
      }}
    >
      <input
        name="entry"
        className="flex-1 rounded-md border border-border bg-background p-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
        placeholder={placeholder}
      />
      <button
        type="submit"
        className="rounded-md border border-border px-3 py-2 text-sm text-foreground transition hover:bg-muted"
      >
        {buttonLabel}
      </button>
    </form>
  )
}
