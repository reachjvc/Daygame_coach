"use client"

import { NotCopied } from "../../beliefs/shared/Bits"
import { InferredTag } from "../../progress/shared/Bits"
import { acText } from "./text"

/** Dashed tile for a step the site will not build. `label` is an acText line. */
export function NotBuilt({ label, testId = "not-built" }: { label: string; testId?: string }) {
  return <NotCopied label={label} testId={testId} />
}

/** Small tag for a control that exists only in the lab. */
export function LabTag() {
  return (
    <span data-testid="lab-tag" className="inline-flex items-center rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground">
      {acText.labOnly}
    </span>
  )
}

export interface HubItem {
  id: string
  label: string
  /** Tag on the row when the screen was never seen in public material. */
  inferred?: boolean
}

/** Lab navigation: one button per screen. */
export function Hub({ items, onOpen, id }: { items: readonly HubItem[]; onOpen: (id: string) => void; id: string }) {
  return (
    <section data-testid={`${id}-hub`} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h2 className="min-w-0 flex-1 text-lg font-semibold">{acText.hubTitle}</h2>
        <LabTag />
      </div>
      <p className="text-sm text-muted-foreground">{acText.hubLine}</p>
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          data-testid={`hub-${it.id}`}
          onClick={() => onOpen(it.id)}
          className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left text-sm"
        >
          <span className="min-w-0 flex-1">{it.label}</span>
          {it.inferred && <InferredTag />}
        </button>
      ))}
    </section>
  )
}

/** Back-to-hub button shown above every screen. */
export function ToHub({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" data-testid="to-hub" onClick={onClick} className="mb-2 inline-flex min-h-11 items-center text-sm text-muted-foreground underline">
      {acText.backToList}
    </button>
  )
}

/** Labelled field, starts empty. */
export function Field({
  label,
  value,
  onChange,
  testId,
  type = "text",
  disabled,
  inputMode,
  multiline,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  testId: string
  type?: string
  disabled?: boolean
  inputMode?: "text" | "email" | "numeric" | "decimal"
  multiline?: boolean
}) {
  const cls = "w-full rounded-md border border-border bg-background px-3 text-base disabled:opacity-50"
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span>{label}</span>
      {multiline ? (
        <textarea data-testid={testId} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} rows={4} className={`${cls} py-2`} />
      ) : (
        <input data-testid={testId} type={type} inputMode={inputMode} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={`${cls} min-h-11`} />
      )}
    </label>
  )
}

/** Wide primary button, 48px tall. */
export function Primary({ label, onClick, disabled, testId }: { label: string; onClick: () => void; disabled?: boolean; testId?: string }) {
  return (
    <button
      type="button"
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-4 text-base font-medium text-primary-foreground disabled:opacity-40"
    >
      {label}
    </button>
  )
}

export const initialOf = (name: string) => (name.trim()[0] ?? "?").toUpperCase()
