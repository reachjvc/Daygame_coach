"use client"

import { PrimaryButton } from "../../../components/kit"
import { InferredTag } from "../../progress/shared/Bits"
import { qdText } from "./text"

/** A tall single-choice card: label, grey line, radio dot, optional pill on top. */
export function OptionCard({ label, sub, selected, onClick, pill, testId }: { label: string; sub?: string; selected: boolean; onClick: () => void; pill?: string; testId?: string }) {
  return (
    <div className="relative pt-2">
      {pill && <span data-testid={testId ? `${testId}-pill` : undefined} className="absolute left-3 top-0 z-10 rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">{pill}</span>}
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        data-testid={testId}
        onClick={onClick}
        className={`flex min-h-16 w-full items-center gap-3 rounded-lg border p-3 text-left ${selected ? "border-primary bg-card" : "border-border bg-card"}`}
      >
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{label}</span>
          {sub && <span className="block text-sm text-muted-foreground">{sub}</span>}
        </span>
        <span aria-hidden="true" className={`size-5 shrink-0 rounded-full border-2 ${selected ? "border-primary bg-primary" : "border-border"}`} />
      </button>
    </div>
  )
}

/** A multi-select tile or row. */
export function CheckRow({ label, on, onClick, testId }: { label: string; on: boolean; onClick: () => void; testId?: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      data-testid={testId}
      onClick={onClick}
      className={`flex min-h-11 w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm ${on ? "border-primary bg-primary/15" : "border-border bg-card"}`}
    >
      <span aria-hidden="true" className={`inline-flex size-5 shrink-0 items-center justify-center rounded border text-xs ${on ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
        {on ? "✓" : ""}
      </span>
      <span className="min-w-0 flex-1">{label}</span>
    </button>
  )
}

/** Step dots at the top of the question screens. */
export function StepDots({ count, index, testId }: { count: number; index: number; testId?: string }) {
  return (
    <div data-testid={testId} data-step={index} className="mb-3 flex justify-center gap-1.5" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={`h-1.5 w-8 rounded-full ${i <= index ? "bg-primary" : "bg-border"}`} />
      ))}
    </div>
  )
}

/** A step that belongs to payment or accounts: shown as one dashed tile. */
export function NotCopied({ title, line, why, onBack, onNext, nextLabel }: { title: string; line?: string; why: "payment" | "account"; onBack: () => void; onNext: () => void; nextLabel: string }) {
  return (
    <section data-testid="not-copied" className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button type="button" data-testid="screen-back" aria-label={qdText.back} onClick={onBack} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card text-lg">
          {"‹"}
        </button>
        <h2 className="flex-1 text-lg font-semibold">{title}</h2>
      </div>
      {line && <p className="text-sm text-muted-foreground">{line}</p>}
      <div data-testid="not-copied-tile" className="flex min-h-11 items-center justify-center rounded-md border border-dashed border-border px-3 py-3 text-center text-sm text-muted-foreground">
        {why === "payment" ? qdText.notCopiedPayment : qdText.notCopiedAccount}
      </div>
      <PrimaryButton testId="not-copied-next" onClick={onNext}>
        {nextLabel}
      </PrimaryButton>
    </section>
  )
}

/** Screen header whose title may wrap over several lines (question screens). */
export function QHead({ title, onBack, right, inferred }: { title: string; onBack?: (() => void) | null; right?: React.ReactNode; inferred?: boolean }) {
  return (
    <div className="mb-3 flex items-start gap-2">
      {onBack && (
        <button type="button" data-testid="screen-back" aria-label={qdText.back} onClick={onBack} className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-lg">
          {"‹"}
        </button>
      )}
      <h2 className="min-w-0 flex-1 py-1.5 text-lg font-semibold leading-snug">{title}</h2>
      {inferred && <InferredTag />}
      {right}
    </div>
  )
}
