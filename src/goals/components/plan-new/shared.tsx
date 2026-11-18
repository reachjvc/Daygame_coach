"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type ReactNode } from "react"
import { commonCopy, doneSummaryCopy, earlierNotesCopy } from "@/src/goals/planSteps/copy/common"
import type { ModuleId } from "@/src/goals/planSteps/planRoutes"
import { homeHref, screenHref, todayHref, isExtraId } from "@/src/goals/planSteps/planRoutes"
import type { EarlierNote } from "@/src/goals/planSteps/earlierNotes"
import { usePlanNew } from "./PlanNewContext"
import { Frame, btnQuiet, card, linkQuiet } from "./ui"

/** The Done summary frame every module ends on: reasons first, then what was made, then what to do next. */
export function DoneScreen({ module, eyebrow, title, children }: { module: ModuleId; eyebrow: string; title: string; children: ReactNode }) {
  const { status } = usePlanNew()
  const router = useRouter()
  const reasons = (isExtraId(module) ? status.extras[module] : status.modules[module]).reasons
  const next = status.nextUp
  return (
    <Frame
      testId={`${module}-done`}
      eyebrow={eyebrow}
      title={title}
      back={{ href: homeHref() }}
      next={{
        label: next ? doneSummaryCopy.next_button : doneSummaryCopy.next_button_none,
        onClick: () => router.push(next ? next.href : todayHref()),
      }}
    >
      {reasons.length > 0 && (
        <section className={`${card} border-amber-400/40 bg-amber-500/[0.06]`} data-testid="done-reasons">
          <h2 className="mb-2 text-sm font-semibold text-amber-100">{doneSummaryCopy.reasons_heading}</h2>
          <ul className="space-y-2">
            {reasons.map((r, i) => (
              <li key={`${r.id}${r.itemId ?? ""}${i}`} className="flex items-start justify-between gap-3 text-sm text-amber-50">
                <span className="min-w-0">{r.text}</span>
                <Link href={r.href} className={`${linkQuiet} shrink-0`} data-testid="reason-fix" data-reason={r.id}>
                  {doneSummaryCopy.fix}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {children}
      <Link href={homeHref()} className={linkQuiet}>
        {doneSummaryCopy.home_link}
      </Link>
    </Frame>
  )
}

/** Old text with no new screen: collapsed, read only, each with Copy. Nothing when there is none. */
export function EarlierBlock({ notes, topics }: { notes: EarlierNote[]; topics: Record<string, string> }) {
  const [copied, setCopied] = useState<number | null>(null)
  if (notes.length === 0) return null
  return (
    <details className={card} data-testid="earlier-notes">
      <summary className="min-h-11 cursor-pointer text-sm font-medium text-zinc-300">{earlierNotesCopy.heading}</summary>
      <p className="mb-2 text-xs text-zinc-500">{earlierNotesCopy.help}</p>
      <ul className="space-y-3">
        {notes.map((n, i) => (
          <li key={i}>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{topics[n.topic] ?? n.topic}</p>
            <p className="whitespace-pre-wrap break-words text-sm text-zinc-200">{n.text}</p>
            <button
              type="button"
              className={btnQuiet}
              onClick={() => {
                void navigator.clipboard?.writeText(n.text).catch(() => {})
                setCopied(i)
              }}
            >
              {copied === i ? commonCopy.copied : earlierNotesCopy.copy}
            </button>
          </li>
        ))}
      </ul>
    </details>
  )
}

/** A "needs X first" page with one button to the screen that makes X. */
export function NeedsFirst({ eyebrow, kind, href, back }: { eyebrow: string; kind: "goal" | "big_goal" | "season" | "weekly_action"; href: string; back: string }) {
  const c = needsCopy[kind]
  return (
    <Frame eyebrow={eyebrow} title={c.title} help={c.body} back={{ href: back }} testId="needs-first">
      <Link href={href} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-violet-500/40 bg-violet-500/20 px-4 text-sm font-medium text-violet-50">
        {c.button}
      </Link>
    </Frame>
  )
}

import { needsFirstCopy } from "@/src/goals/planSteps/copy/common"
const needsCopy = needsFirstCopy

export const hrefOf = screenHref
