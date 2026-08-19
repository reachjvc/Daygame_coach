"use client"

/**
 * The small pieces every step is built from.
 *
 * They exist so that seventeen step components cannot drift into seventeen
 * slightly different text sizes and border colours, which is the first thing
 * anybody notices. The palette matches the north star flow next door: white/10
 * borders on a near-black ground, violet for the live thing, zinc for the rest.
 *
 * Only utility icons in this file and in every step. Every semantic icon in the
 * project already means something somewhere else, and taking one into a new
 * context needs sign-off, so the buttons here say what they do in words.
 */

import { useId, useState, type ReactNode } from "react"
import { Check, Plus, X } from "lucide-react"

/** The standard bordered box. Everything sits in one of these. */
export function Panel({ children, tone = "plain", className = "" }: {
  children: ReactNode
  tone?: "plain" | "quiet" | "warn" | "live"
  className?: string
}) {
  const tones = {
    plain: "border-white/10 bg-white/[0.03]",
    quiet: "border-white/[0.07] bg-white/[0.015]",
    warn: "border-amber-400/30 bg-amber-500/[0.06]",
    live: "border-violet-400/30 bg-violet-500/[0.06]",
  }
  return <div className={`rounded-2xl border p-4 ${tones[tone]} ${className}`}>{children}</div>
}

export function StepHeader({ title, blurb, caution, source }: {
  title: string
  blurb: string
  caution?: string
  source?: string
}) {
  return (
    <header className="mb-5">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="text-[13px] text-zinc-400 mt-1 leading-relaxed">{blurb}</p>
      {caution && (
        <p className="mt-3 rounded-xl border border-amber-400/25 bg-amber-500/[0.06] px-3 py-2 text-[12px] text-amber-100/90 leading-relaxed">
          {caution}
        </p>
      )}
      {/* Provenance folded. It is what separates this from a wellness app and
          it stays one tap away, but it is not what a person needs first. */}
      {source && <Why label="where this comes from"><p>{source}</p></Why>}
    </header>
  )
}

/** A labelled textarea. The only text input in the module. */
export function Field({ label, help, value, onChange, placeholder, rows = 3, minWords, example, ariaLabel }: {
  label: string
  help?: string
  value: string
  onChange: (text: string) => void
  placeholder?: string
  rows?: number
  minWords?: number
  example?: string
  /** Required when `label` is empty — the question is a heading above instead. */
  ariaLabel?: string
}) {
  const id = useId()
  const words = value.trim() ? value.trim().split(/\s+/).length : 0
  const short = minWords !== undefined && minWords > 0 && words > 0 && words < minWords
  return (
    <div>
      {/* Some callers supply no label because the question is already the
          heading above. Rendering it anyway leaves an empty line box, so it is
          dropped — and `ariaLabel` carries the accessible name instead, because
          a box with neither is a box a screen reader cannot describe. */}
      {label && <label className="block text-[13px] text-zinc-200" htmlFor={id}>{label}</label>}
      {help && <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{help}</p>}
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label ? undefined : ariaLabel}
        rows={rows}
        className="w-full mt-1.5 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-400/40 resize-y transition-colors"
      />
      {/* Says what is short, and does not stop anybody. Nothing in this module
          blocks on a word count; a half-answer saved beats a blank field. */}
      {short && <p className="text-[10.5px] text-zinc-600 mt-1">A bit more would help — {words} of about {minWords} words.</p>}
      {example && <p className="text-[10.5px] text-zinc-600 mt-1 leading-relaxed">{example}</p>}
    </div>
  )
}

/** A single-line input, for short things like a name or one reason. */
export function Line({ label, value, onChange, placeholder, maxLength }: {
  label?: string
  value: string
  onChange: (text: string) => void
  placeholder?: string
  maxLength?: number
}) {
  const id = useId()
  return (
    <div>
      {label && <label className="block text-[12px] text-zinc-300 mb-1" htmlFor={id}>{label}</label>}
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-400/40 transition-colors"
      />
    </div>
  )
}

/**
 * The 0–10 slider.
 *
 * A native range input on purpose: it is draggable, it is keyboard-operable,
 * screen readers already know what it is, and a hand-rolled one would be worse
 * at all three.
 */
export function Scale({ label, help, value, onChange, lowAnchor, highAnchor, max = 10 }: {
  label: string
  help?: string
  value: number | undefined
  onChange: (n: number) => void
  lowAnchor: string
  highAnchor: string
  max?: number
}) {
  const id = useId()
  const shown = value ?? 0
  /**
   * Commit whatever the thumb is on, even when it did not move.
   *
   * An unanswered slider parks at zero, so somebody whose honest answer *is*
   * zero drags to a position it already occupies, no change event fires, and
   * the answer never registers — on the importance ruler that silently swallows
   * the one response with its own dedicated follow-up question. Committing on
   * release and on key-up makes zero reachable without changing how the control
   * behaves for every other value.
   */
  const commit = () => onChange(shown)
  return (
    <div>
      <label className="block text-[13px] text-zinc-200" htmlFor={id}>{label}</label>
      {help && <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{help}</p>}
      <div className="flex items-center gap-3 mt-2">
        <input
          id={id}
          type="range"
          min={0}
          max={max}
          step={1}
          value={shown}
          onChange={(e) => onChange(Number(e.target.value))}
          onPointerUp={commit}
          onKeyUp={commit}
          className="flex-1 accent-violet-400"
        />
        <span className={`w-8 text-right text-lg tabular-nums ${value === undefined ? "text-zinc-600" : "text-violet-200"}`}>
          {value === undefined ? "–" : value}
        </span>
      </div>
      <div className="flex justify-between text-[10.5px] text-zinc-600 mt-0.5">
        <span>{lowAnchor}</span>
        <span>{highAnchor}</span>
      </div>
      {value === undefined && <p className="text-[10.5px] text-zinc-600 mt-1">Not answered yet. Zero is a real answer — tap the slider to give it.</p>}
    </div>
  )
}

/** A one-tap option that can be on or off. */
export function Chip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`text-[12px] px-2.5 py-1.5 rounded-full border transition-colors ${
        on
          ? "border-violet-400/50 bg-violet-500/20 text-violet-100"
          : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/30 hover:text-zinc-200"
      }`}
    >
      {label}
    </button>
  )
}

/**
 * A bank of chips plus a box to type one that is not there.
 *
 * The typed one matters more than the bank. A menu that cannot be escaped is a
 * menu that quietly tells somebody their answer is not one of the options.
 */
export function ChipBank({ label, help, options, selected, onToggle, allowCustom = true, hideLabel = false }: {
  label: string
  help?: string
  // `readonly` so the banks declared `as const` in the copy file can be passed
  // straight in without a defensive copy at every call site.
  options: readonly string[]
  selected: string[]
  onToggle: (item: string) => void
  allowCustom?: boolean
  /**
   * Keep the label for the "add your own" box and drop it from the page.
   * For the places where a heading directly above already asks the question,
   * so printing it twice reads as a stutter — but removing it outright would
   * leave the text input with no accessible name.
   */
  hideLabel?: boolean
}) {
  const [draft, setDraft] = useState("")
  const extras = selected.filter((s) => !options.includes(s))
  const add = () => {
    const trimmed = draft.trim()
    if (!trimmed) return
    if (!selected.includes(trimmed)) onToggle(trimmed)
    setDraft("")
  }
  return (
    <div>
      {label && !hideLabel && <p className="text-[13px] text-zinc-200">{label}</p>}
      {help && <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{help}</p>}
      <div className={`flex flex-wrap gap-1.5 ${(label && !hideLabel) || help ? "mt-2" : ""}`}>
        {options.map((option) => (
          <Chip key={option} label={option} on={selected.includes(option)} onClick={() => onToggle(option)} />
        ))}
        {extras.map((extra) => (
          <Chip key={extra} label={extra} on onClick={() => onToggle(extra)} />
        ))}
      </div>
      {allowCustom && (
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add() } }}
            placeholder="Something else"
            aria-label={`Add your own to ${label}`}
            className="flex-1 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 text-[12px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-400/40 transition-colors"
          />
          <button
            type="button"
            onClick={add}
            disabled={!draft.trim()}
            className="text-[12px] px-3 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:border-white/30 disabled:opacity-30 disabled:hover:text-zinc-400 disabled:hover:border-white/10 transition-colors"
          >
            Add
          </button>
        </div>
      )}
    </div>
  )
}

/** A growable list of short lines: add, edit, remove. */
export function LineList({ label, help, items, onChange, placeholder, seeds, max, ariaLabel }: {
  label: string
  help?: string
  /** Used for the row and add-box names when `label` is empty. */
  ariaLabel?: string
  items: string[]
  onChange: (items: string[]) => void
  placeholder?: string
  seeds?: readonly string[]
  max?: number
}) {
  const [draft, setDraft] = useState("")
  // The accessible name for the rows and the add box. Falls back to the
  // explicit override when the visible label is dropped in favour of a heading.
  const name = label || ariaLabel || "list"
  const full = max !== undefined && items.length >= max
  const add = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || full || items.includes(trimmed)) return
    onChange([...items, trimmed])
    setDraft("")
  }
  return (
    <div>
      {label && <p className="text-[13px] text-zinc-200">{label}</p>}
      {help && <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{help}</p>}
      {items.length > 0 && (
        <ul className="space-y-1.5 mt-2">
          {items.map((item, i) => (
            <li key={`${item}-${i}`} className="flex items-start gap-2">
              <span className="text-[11px] text-zinc-600 tabular-nums pt-2 w-4 shrink-0">{i + 1}</span>
              <input
                type="text"
                value={item}
                onChange={(e) => onChange(items.map((v, j) => (j === i ? e.target.value : v)))}
                aria-label={`${name}, item ${i + 1}`}
                className="flex-1 min-w-0 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 text-[13px] text-zinc-100 focus:outline-none focus:border-violet-400/40 transition-colors"
              />
              <button
                type="button"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                aria-label={`Remove item ${i + 1}`}
                className="p-1.5 text-zinc-600 hover:text-rose-300 transition-colors shrink-0"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {!full && (
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(draft) } }}
            placeholder={placeholder}
            aria-label={`Add to ${name}`}
            className="flex-1 min-w-0 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-400/40 transition-colors"
          />
          <button
            type="button"
            onClick={() => add(draft)}
            disabled={!draft.trim()}
            aria-label={`Add to ${name}`}
            className="px-2.5 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:border-white/30 disabled:opacity-30 transition-colors"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
      )}
      {full && <p className="text-[10.5px] text-zinc-600 mt-1.5">That is the {max} this one takes. Editing them is still open.</p>}
      {seeds && seeds.length > 0 && (
        <div className="mt-2">
          <p className="text-[10.5px] text-zinc-600 mb-1">Or start from one of these:</p>
          <div className="flex flex-wrap gap-1.5">
            {seeds.filter((s) => !items.includes(s)).map((seed) => (
              <button
                key={seed}
                type="button"
                onClick={() => add(seed)}
                disabled={full}
                className="text-[11px] px-2 py-1 rounded-full border border-white/10 text-zinc-500 hover:text-zinc-200 hover:border-white/30 disabled:opacity-30 transition-colors"
              >
                {seed}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** The button that finishes a step. */
export function PrimaryButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="text-sm font-medium px-4 py-2 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-100 hover:bg-violet-500/30 disabled:opacity-40 disabled:hover:bg-violet-500/20 transition-colors"
    >
      {children}
    </button>
  )
}

export function QuietButton({ children, onClick, tone = "plain" }: {
  children: ReactNode
  onClick: () => void
  tone?: "plain" | "danger"
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-[12px] transition-colors ${tone === "danger" ? "text-zinc-500 hover:text-rose-300" : "text-zinc-500 hover:text-zinc-200"}`}
    >
      {children}
    </button>
  )
}

/** A row that reads as done. Used by the mission list and the checklists. */
export function CheckRow({ label, note, on, onClick }: { label: string; note?: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`w-full text-left rounded-xl border p-3 transition-colors ${
        on ? "border-emerald-400/30 bg-emerald-500/[0.07]" : "border-white/10 bg-white/[0.02] hover:border-white/25"
      }`}
    >
      <span className="flex items-start gap-2.5">
        <span className={`inline-flex items-center justify-center size-5 rounded-full shrink-0 mt-px ${
          on ? "bg-emerald-500/25 text-emerald-200" : "bg-white/5 text-zinc-600"
        }`}>
          {on ? <Check className="size-3" /> : <span className="size-1.5 rounded-full bg-current" />}
        </span>
        <span className="min-w-0">
          <span className={`block text-[13px] ${on ? "text-emerald-100" : "text-zinc-200"}`}>{label}</span>
          {note && <span className="block text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{note}</span>}
        </span>
      </span>
    </button>
  )
}

/** A number with a caption. Used on the review screens. */
export function Stat({ value, caption, tone = "plain" }: { value: string; caption: string; tone?: "plain" | "good" }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
      <p className={`text-xl tabular-nums ${tone === "good" ? "text-emerald-200" : "text-zinc-100"}`}>{value}</p>
      <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">{caption}</p>
    </div>
  )
}

/** Shown wherever a screen would otherwise be a blank rectangle. */
export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-[12px] text-zinc-500 leading-relaxed">{children}</p>
}

/**
 * The reasoning, folded away.
 *
 * This module's copy had grown to roughly 9,700 words — about forty-four
 * minutes of reading — because almost every screen explained *why* it was
 * built that way before letting anybody use it. The reasoning is worth
 * keeping: it is the difference between this and a wellness app, and somebody
 * who wants to check the thinking should be able to. It is not worth putting
 * in front of a person who has committed to nothing.
 *
 * So the rule is: what to do stays visible, why it works goes in here.
 */
export function Why({ children, label = "why this" }: { children: ReactNode; label?: string }) {
  return (
    <details className="mt-2 group">
      <summary className="cursor-pointer list-none text-[11.5px] text-zinc-600 hover:text-zinc-400 transition-colors">
        {label}
      </summary>
      <div className="mt-1.5 space-y-2 text-[12px] text-zinc-500 leading-relaxed">{children}</div>
    </details>
  )
}
