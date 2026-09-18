"use client"

/**
 * ONE ROW SHAPE FOR EVERY LIST OF PROGRAMS.
 *
 * There are five lists of programs in this app -- the ones you are running, the
 * catalogue, the ones you have finished, your saved weeks, and the block inside
 * the Life Mastery plan -- and until now they were five different rows. Five
 * paddings, five type sizes, three different ways of saying "there is more
 * behind this", and one of them (Finished) built from 26px buttons you had to
 * aim at. Nothing about a program changes between those screens, so nothing
 * about the row should either.
 *
 * It is a link when tapping it takes you somewhere and a real button when it
 * does something on the spot -- never a `div` with an onClick, which a keyboard
 * cannot reach and a screen reader will not announce.
 */

import Link from "next/link"
import type { ReactNode } from "react"
import { ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

export function ProgramRow({
  name,
  meta,
  href,
  onClick,
  right,
  testId,
  className,
}: {
  /** The program's name. Truncated rather than wrapped -- see below. */
  name: string
  /** The one line under it: level, how long, how far through. */
  meta?: ReactNode
  /** Given when the row goes somewhere. */
  href?: string
  /** Given when the row does something instead. */
  onClick?: () => void
  /** A badge, a word, or a "⋮" button, shown before the chevron. */
  right?: ReactNode
  testId?: string
  className?: string
}) {
  // min-h-14 is 56px: comfortably over the 44px floor, because these rows are
  // stacked and a list of rows that are each only just tappable is a list you
  // mis-tap.
  const rowClass = cn(
    "flex min-h-14 w-full items-center justify-between gap-3 px-4 text-left transition-colors hover:bg-muted/50",
    className,
  )

  const body = (
    <>
      <span className="min-w-0 flex-1">
        {/* A long program name truncates. Wrapping it pushes the meta line down
            and makes one row in the list taller than its neighbours, which is
            what made the catalogue look ragged. */}
        <span className="block truncate font-medium">{name}</span>
        {meta && <span className="block truncate text-xs text-muted-foreground">{meta}</span>}
      </span>
      {right && <span className="shrink-0">{right}</span>}
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </>
  )

  if (href) {
    return (
      <Link href={href} className={rowClass} data-testid={testId}>
        {body}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className={rowClass} data-testid={testId}>
      {body}
    </button>
  )
}
