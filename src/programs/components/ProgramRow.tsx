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
  /**
   * A badge, a word, or real controls — shown beside the row, NOT inside it.
   *
   * This used to be rendered within the row's own `<button>`/`<Link>`, and the
   * comment here said "a ⋮ button", which invited exactly what happened: a
   * `<button>` inside a `<button>` is invalid HTML, so React's server and
   * client trees disagreed and the whole subtree was thrown away and re-rendered
   * — a hydration failure on the Training tab for anybody with a finished
   * program. Found by walking the page cold, not by any test: every test asked
   * for "the" control and got one.
   */
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
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </>
  )

  /**
   * The row's own control. When there is a `right` slot it becomes a flex child
   * rather than the whole row, so whatever is in that slot is its SIBLING.
   *
   * A row with no slot is byte-identical to what it was before, which is what
   * keeps the four lists that do not use one exactly as they were.
   */
  const control = href ? (
    <Link
      href={href}
      /* `min-w-0` because a flex child's default `min-width: auto` will not let
         it shrink below its content — without it the name refused to truncate
         and pushed the buttons in the slot off the side of the card. */
      className={cn(rowClass, right && "min-w-0 w-auto flex-1 pr-0")}
      data-testid={testId}
    >
      {body}
    </Link>
  ) : (
    <button
      type="button"
      onClick={onClick}
      /* `min-w-0` because a flex child's default `min-width: auto` will not let
         it shrink below its content — without it the name refused to truncate
         and pushed the buttons in the slot off the side of the card. */
      className={cn(rowClass, right && "min-w-0 w-auto flex-1 pr-0")}
      data-testid={testId}
    >
      {body}
    </button>
  )

  if (!right) return control

  return (
    <div className={cn("flex w-full items-center gap-1 pr-4", className)}>
      {control}
      <span className="shrink-0">{right}</span>
    </div>
  )
}
