"use client"

/**
 * THE PARTS EVERY NEW-VERSION SCREEN IS BUILT FROM, phone width first.
 *
 * One question per screen: a frame (title, help, progress dots, the bottom bar
 * with Back, the save indicator and Next), and the few inputs the screens use
 * (grown text, chips, a list with an Add button, tap-in-order). Tap targets are
 * 44 px or more, inputs are 16 px so a phone does not zoom, and nothing is
 * wider than the screen.
 */

import Link from "next/link"
import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import { commonCopy, limitsCopy, saveCopy, bottomBarCopy, badDayCopy } from "@/src/goals/planSteps/copy/common"
import { usePlanStore } from "@/src/goals/planStore"
import { fill } from "@/src/goals/planSteps/text"

export const btnPrimary =
  "inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-violet-500/40 bg-violet-500/20 px-4 text-sm font-medium text-violet-50 transition-colors hover:bg-violet-500/30 disabled:cursor-not-allowed disabled:opacity-40"
export const btnQuiet =
  "inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-white/10 px-4 text-sm text-zinc-300 transition-colors hover:bg-white/5 disabled:opacity-40"
export const linkQuiet = "inline-flex min-h-11 items-center text-sm text-zinc-400 underline-offset-2 hover:text-zinc-100 hover:underline"
export const card = "rounded-xl border border-white/10 bg-white/[0.02] p-4"
export const inputCls =
  "w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-base text-zinc-100 placeholder:text-zinc-600 focus:border-violet-400/60 focus:outline-none"

// --------------------------------------------------------------------- save

export function SaveIndicator() {
  const { status, waiting, note, retry } = usePlanStore()
  if (status === "loading") return <span className="text-xs text-zinc-500">…</span>
  if (status === "saved") return <span className="text-xs text-emerald-300/90" data-testid="save-status" data-state="saved">{saveCopy.saved}</span>
  if (status === "saving") {
    return (
      <span className="text-xs text-zinc-400" data-testid="save-status" data-state="saving">
        {saveCopy.saving}
        {waiting > 1 ? ` ${fill(saveCopy.waiting_short, { n: waiting })}` : ""}
      </span>
    )
  }
  return (
    <span className="flex min-w-0 items-center gap-1 text-xs text-rose-300" data-testid="save-status" data-state={status} title={note}>
      <span className="truncate">{saveCopy.failed}</span>
      <button type="button" onClick={() => void retry()} className="min-h-11 shrink-0 px-2 underline">
        {saveCopy.retry}
      </button>
    </span>
  )
}

// -------------------------------------------------------------------- frame

export interface FrameProps {
  /** The module's name, shown small above the title. */
  eyebrow?: string
  title: string
  help?: string
  /** Progress: dots for `m` up to 12, a counter beyond. */
  dots?: { n: number; m: number }
  /** Where Back goes. Null hides it. */
  back: { href: string; onClick?: () => void } | null
  next?: { label?: string; disabled?: boolean; onClick: () => void } | null
  /** An optional screen: Skip moves on and saves nothing. */
  skip?: { label?: string; onClick: () => void } | null
  /** A required screen: Later goes back to the plan home. */
  later?: { href: string } | null
  children?: ReactNode
  testId?: string
}

export function Frame({ eyebrow, title, help, dots, back, next, skip, later, children, testId }: FrameProps) {
  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-32 pt-2" data-testid={testId ?? "screen"}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="truncate text-xs font-medium uppercase tracking-wide text-zinc-500">{eyebrow}</span>
        {dots && <Dots n={dots.n} m={dots.m} />}
      </div>
      <h1 className="text-xl font-semibold leading-snug text-zinc-50 sm:text-2xl">{title}</h1>
      {help && <p className="mt-2 text-sm text-zinc-400">{help}</p>}
      <div className="mt-5 space-y-4">{children}</div>
      {(skip || later) && (
        <div className="mt-4 flex justify-center">
          {skip && (
            <button type="button" className={linkQuiet} onClick={skip.onClick} data-testid="skip">
              {skip.label ?? commonCopy.skip}
            </button>
          )}
          {later && (
            <Link href={later.href} className={linkQuiet} data-testid="later">
              {commonCopy.later}
            </Link>
          )}
        </div>
      )}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-zinc-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
        aria-label={title}
      >
        <div className="mx-auto flex h-16 max-w-xl items-center justify-between gap-2 px-4">
          <div className="w-[88px] shrink-0">
            {back && (
              <Link href={back.href} onClick={back.onClick} className={`${btnQuiet} w-full`} data-testid="back">
                <span aria-hidden>‹</span> {bottomBarCopy.back}
              </Link>
            )}
          </div>
          <div className="flex min-w-0 flex-1 justify-center">
            <SaveIndicator />
          </div>
          <div className="shrink-0">
            {next && (
              <button type="button" className={`${btnPrimary} min-w-[88px]`} disabled={next.disabled} onClick={next.onClick} data-testid="next">
                {next.label ?? bottomBarCopy.next} <span aria-hidden>›</span>
              </button>
            )}
          </div>
        </div>
      </nav>
    </div>
  )
}

function Dots({ n, m }: { n: number; m: number }) {
  if (m > 12) return <span className="text-xs text-zinc-500" data-testid="dots">{fill(commonCopy.item_counter, { n, m })}</span>
  return (
    <span className="flex items-center gap-1" data-testid="dots" aria-label={fill(commonCopy.item_counter, { n, m })}>
      {Array.from({ length: m }, (_, i) => (
        <span key={i} className={`h-2 w-2 rounded-full ${i + 1 === n ? "bg-violet-400" : i + 1 < n ? "bg-violet-400/40" : "bg-white/15"}`} />
      ))}
    </span>
  )
}

// ------------------------------------------------------------------- inputs

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-zinc-200">
      {children}
    </label>
  )
}

/** A text box that grows with what is typed, stops at its limit and says which field when it is close. */
export function GrownText({
  label,
  value,
  onChange,
  placeholder,
  max = 2000,
  rows = 2,
  autoFocus = false,
  testId,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  max?: number
  rows?: number
  autoFocus?: boolean
  testId?: string
}) {
  const id = useId()
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  const near = value.length >= max * 0.9
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <textarea
        id={id}
        ref={ref}
        rows={rows}
        value={value}
        maxLength={max}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputCls} resize-none overflow-hidden`}
        data-testid={testId}
      />
      {near && (
        <p className="mt-1 text-xs text-amber-300" role="status">
          {fill(limitsCopy.chars, { field: label, count: value.length, max })}
        </p>
      )}
    </div>
  )
}

export function Line({
  label,
  value,
  onChange,
  placeholder,
  max = 300,
  type = "text",
  inputMode,
  testId,
  onEnter,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  max?: number
  type?: "text" | "date" | "number"
  inputMode?: "numeric" | "decimal" | "text"
  testId?: string
  onEnter?: () => void
}) {
  const id = useId()
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id}
        type={type}
        value={value}
        maxLength={max}
        placeholder={placeholder}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onEnter) {
            e.preventDefault()
            onEnter()
          }
        }}
        className={inputCls}
        data-testid={testId}
      />
    </div>
  )
}

export function Chip({ on, children, onClick, testId, disabled }: { on?: boolean; children: ReactNode; onClick: () => void; testId?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      data-testid={testId}
      className={`min-h-11 max-w-full rounded-full border px-4 py-2 text-left text-sm transition-colors disabled:opacity-40 ${
        on ? "border-violet-400/60 bg-violet-500/25 text-violet-50" : "border-white/10 text-zinc-300 hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  )
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>
}

/** One or several picks out of a list. Tapping a picked chip in single mode keeps it (clearing is its own link). */
export function Pick<T extends string>({
  options,
  value,
  onChange,
  multi = false,
  testPrefix = "pick",
}: {
  options: { id: T; label: string; sub?: string }[]
  value: T[]
  onChange: (v: T[]) => void
  multi?: boolean
  testPrefix?: string
}) {
  return (
    <ChipRow>
      {options.map((o) => {
        const on = value.includes(o.id)
        return (
          <Chip
            key={o.id}
            on={on}
            testId={`${testPrefix}-${o.id}`}
            onClick={() => onChange(multi ? (on ? value.filter((x) => x !== o.id) : [...value, o.id]) : [o.id])}
          >
            <span className="block">{o.label}</span>
            {o.sub && <span className="block text-xs text-zinc-400">{o.sub}</span>}
          </Chip>
        )
      })}
    </ChipRow>
  )
}

/** A list typed one line at a time: Enter or Add puts the line in; each line can be changed or removed. */
export function LineList({
  label,
  items,
  onChange,
  placeholder,
  max,
  maxItems,
  addLabel,
  fieldName,
  testId = "list",
}: {
  label: string
  items: string[]
  onChange: (items: string[]) => void
  placeholder?: string
  max?: number
  maxItems?: number
  addLabel?: string
  fieldName?: string
  testId?: string
}) {
  const [draft, setDraft] = useState("")
  const full = maxItems != null && items.length >= maxItems
  const add = () => {
    const t = draft.trim()
    if (!t || full) return
    onChange([...items, t])
    setDraft("")
  }
  return (
    <div data-testid={testId}>
      {items.length > 0 && (
        <ul className="mb-3 space-y-2">
          {items.map((it, i) => (
            <li key={i} className="flex items-start gap-2">
              <input
                value={it}
                maxLength={max ?? 300}
                onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
                className={inputCls}
                aria-label={`${label} ${i + 1}`}
              />
              <button type="button" className={`${btnQuiet} shrink-0`} onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={`${commonCopy.remove}: ${it}`}>
                {commonCopy.remove}
              </button>
            </li>
          ))}
        </ul>
      )}
      {full ? (
        <p className="text-sm text-amber-300">{fill(limitsCopy.items_full, { field: fieldName ?? label, max: maxItems ?? 0 })}</p>
      ) : (
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <Line label={label} value={draft} onChange={setDraft} placeholder={placeholder} max={max} onEnter={add} testId={`${testId}-draft`} />
          </div>
          <button type="button" className={btnQuiet} onClick={add} disabled={!draft.trim()} data-testid={`${testId}-add`}>
            {addLabel ?? commonCopy.add}
          </button>
        </div>
      )}
    </div>
  )
}

/** Put items in order by tapping: the first tap is 1, the second 2. */
export function TapOrder({
  items,
  order,
  onChange,
  testPrefix = "order",
}: {
  items: { id: string; label: string }[]
  order: string[]
  onChange: (order: string[]) => void
  testPrefix?: string
}) {
  return (
    <div>
      <ul className="space-y-2">
        {items.map((it) => {
          const at = order.indexOf(it.id)
          return (
            <li key={it.id}>
              <button
                type="button"
                data-testid={`${testPrefix}-${it.id}`}
                onClick={() => onChange(at >= 0 ? order : [...order, it.id])}
                className={`flex min-h-11 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm ${at >= 0 ? "border-violet-400/60 bg-violet-500/20 text-violet-50" : "border-white/10 text-zinc-300"}`}
              >
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${at >= 0 ? "bg-violet-400 text-zinc-950" : "bg-white/10 text-zinc-500"}`}>{at >= 0 ? at + 1 : ""}</span>
                <span className="min-w-0 break-words">{it.label}</span>
              </button>
            </li>
          )
        })}
      </ul>
      {order.length > 0 && (
        <button type="button" className={`${linkQuiet} mt-2`} onClick={() => onChange([])}>
          {commonCopy.start_again}
        </button>
      )}
    </div>
  )
}

/** The bad-day test under a why: one tap, not stored. "Not yet" says how to make it stronger. */
export function BadDay({ show }: { show: boolean }) {
  const [answer, setAnswer] = useState<"yes" | "not-yet" | null>(null)
  if (!show) return null
  return (
    <div className={card} data-testid="bad-day">
      <p className="text-sm text-zinc-200">{badDayCopy.question}</p>
      <div className="mt-2 flex gap-2">
        <Chip on={answer === "yes"} onClick={() => setAnswer("yes")}>{badDayCopy.yes}</Chip>
        <Chip on={answer === "not-yet"} onClick={() => setAnswer("not-yet")}>{badDayCopy.not_yet}</Chip>
      </div>
      {answer === "not-yet" && <p className="mt-2 text-sm text-violet-200">{badDayCopy.not_yet_help}</p>}
    </div>
  )
}

export function Row({ label, children, href, testId }: { label: string; children: ReactNode; href?: string; testId?: string }) {
  return (
    <div className={`${card} flex items-start justify-between gap-3`} data-testid={testId}>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
        <div className="mt-1 break-words text-sm text-zinc-100">{children}</div>
      </div>
      {href && (
        <Link href={href} className={`${linkQuiet} shrink-0`} data-testid="change">
          {commonCopy.change}
        </Link>
      )}
    </div>
  )
}

/** Local date text, never forced into one order. */
export function dateText(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(d)
}

export function weekdayName(isoWeekday: number, width: "short" | "long" = "short"): string {
  // 2024-01-01 was a Monday.
  return new Intl.DateTimeFormat(undefined, { weekday: width }).format(new Date(2024, 0, isoWeekday))
}

export function hourText(h: number): string {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(2024, 0, 1, h, 0))
}
