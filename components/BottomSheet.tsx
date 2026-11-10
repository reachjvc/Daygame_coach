"use client"

/**
 * ONE SHEET FOR EVERY MENU.
 *
 * A "⋮" menu on a phone slides a panel up from the bottom. The app had exactly
 * one of those, hand-built inside the bottom tab bar's "More" button, and four
 * more screens were about to need the same thing. Four hand-built copies is
 * four sheets that drift apart, so it is lifted out here and the tab bar is
 * now just its first caller.
 *
 * Three things the original got wrong are fixed in the move, because a shared
 * component is the only place a fix like this reaches everybody:
 *
 *  - its rows had no minimum height, so they landed a few pixels under the
 *    44px a fingertip actually needs;
 *  - its close "X" was a bare 20px icon -- a target you have to aim at;
 *  - it announced itself to a screen reader as nothing in particular, and
 *    Escape did not close it.
 *
 * On a screen wider than a phone it is a centred dialog instead. A phone sheet
 * stretched across a desktop is a 1400px-wide strip of buttons at the bottom of
 * the window, which is nobody's idea of a menu.
 */

import * as React from "react"
import Link from "next/link"
import { X } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cn } from "@/lib/utils"
import { useBackCloses } from "@/src/shared/HistoryBarrierContext"

/**
 * ONE TREE AT EVERY WIDTH (alpha p9-saves-01, -02).
 *
 * On a screen wider than a phone it is a centred dialog; below 640 px it is a
 * sheet from the bottom. That used to be two different trees picked by a
 * `matchMedia` hook, so crossing 640 px (a phone turned sideways, a window
 * narrowed, and on every desktop open a frame after the first paint) threw
 * away everything inside and built it again: the audit card he was typing in
 * went back to the old answer, and Save stored that. Now it is always the same
 * Radix dialog, and only CSS (`sm:`) moves it, so nothing inside is rebuilt.
 */
const PANEL =
  "fixed inset-x-0 bottom-0 z-[9600] flex max-h-[92dvh] flex-col rounded-t-2xl border-t border-border bg-card pb-safe shadow-lg outline-none animate-slide-up " +
  "sm:inset-0 sm:m-auto sm:h-fit sm:max-h-[min(calc(100dvh-2rem),100%)] sm:w-[calc(100%-2rem)] sm:max-w-lg sm:rounded-lg sm:border sm:pb-2"

/**
 * A second click this soon and this close to the first is the same double
 * click (alpha p9-saves-04): Save on a desktop dialog folds the card, the
 * dialog shrinks round its middle, and the second click of a double-click
 * landed outside it and closed the sheet.
 */
const DOUBLE_CLICK_MS = 500

/**
 * SPREAD ON A BAR THAT MUST STAY USABLE WHILE A SHEET IS OPEN (review of
 * 12c050e4): the audit's "Deleted · Undo", the time tracker's toasts. The
 * sheet is a modal dialog, so a press outside it closed it and the page behind
 * took no presses: Undo closed the sheet and did nothing. A press or focus on
 * a marked element leaves the sheet open. The bar also needs
 * `pointer-events-auto`, as the dialog turns presses off on the page behind,
 * and must be drawn above the sheet (z above 9600).
 *
 * HEARD AS WELL AS SEEN (p10-sheets-02). A modal sheet marks everything outside
 * it `aria-hidden`, so a screen reader was told nothing about the bar and could
 * not find its Undo. Radix leaves live regions alone (`aria-hidden` skips
 * `[aria-live]`), and every marked bar is a status that reports what just
 * happened, so the mark makes it one.
 */
export const OVER_SHEET = { "data-over-sheet": "", "aria-live": "polite" } as const
const overSheet = (target: EventTarget | null) => target instanceof Element && target.closest("[data-over-sheet]") !== null
const DOUBLE_CLICK_PX = 24

/**
 * One row of a sheet. A link when it goes somewhere, a button when it does
 * something -- never a `div` with an onClick, which the keyboard cannot reach.
 */
export function SheetRow({
  href,
  onClick,
  type = "button",
  icon: Icon,
  destructive = false,
  disabled = false,
  testId,
  children,
}: {
  href?: string
  /**
   * What the row does. On a `submit` row, DO NOT use this to close the sheet:
   * closing unmounts the form before the browser gets to submit it, and the
   * button silently does nothing. (That is not a theory -- it is what Log Out
   * did until it was caught in a browser.) A submitting row is followed by a
   * navigation or a refresh, which takes the sheet away on its own.
   */
  onClick?: () => void
  /** `submit` for a row inside a form, e.g. Log Out. */
  type?: "button" | "submit"
  /**
   * Off, and visibly so. A row that does nothing when tapped — "Move up" on
   * the first lift — reads as a broken app, and hiding it instead makes the
   * sheet's rows move around between openings.
   */
  disabled?: boolean
  icon?: LucideIcon
  /** Paints the row red. For the one row that takes something away. */
  destructive?: boolean
  testId?: string
  children: React.ReactNode
}) {
  // min-h-11 is the 44px floor. `py-3` alone got close and missed.
  const className = cn(
    "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors hover:bg-muted",
    destructive ? "text-destructive" : "text-foreground",
    disabled && "opacity-40 hover:bg-transparent",
  )
  const icon = Icon ? (
    <Icon className={cn("size-5", destructive ? "text-destructive" : "text-muted-foreground")} />
  ) : null

  if (href) {
    return (
      <Link href={href} onClick={onClick} className={className} data-testid={testId}>
        {icon}
        <span>{children}</span>
      </Link>
    )
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-testid={testId}
    >
      {icon}
      <span>{children}</span>
    </button>
  )
}

export function BottomSheet({
  open,
  onClose,
  title,
  testId,
  children,
}: {
  open: boolean
  onClose: () => void
  /** Shown as the sheet's heading, and read out as the dialog's name. */
  title: string
  testId?: string
  children: React.ReactNode
}) {
  /** The last press inside the panel, to tell a double click from a click outside. */
  const lastPress = React.useRef<{ at: number; x: number; y: number } | null>(null)
  // Back closes the sheet instead of leaving the page (p10-sheets-01).
  const backStep = useBackCloses(open, onClose)

  if (!open) return null

  // Radix handles Escape, the backdrop, focus and the page behind. Escape used
  // to be the only way out besides the X or the exact strip of backdrop above
  // the panel; it still closes, at every width.
  return (
    <DialogPrimitive.Root open onOpenChange={(next) => !next && onClose()}>
      <DialogPrimitive.Portal>
        {/* Backdrop. Tapping anywhere off the panel closes. */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-[9600] bg-background/60 backdrop-blur-sm" />
        {/**
         * ABOVE EVERY BAR IN THE APP, not just the one this was written for.
         *
         * `z-50` cleared the app's own tab bar (`z-40`) and nothing else. The
         * time tracker draws its own bottom navigation at `z-[9500]` — a private
         * scale it invented so its portalled panels clear its sticky header — so
         * a sheet opened there was drawn UNDERNEATH it: the last row was on
         * screen, looked normal, and the tap landed on the navigation instead.
         * Measured, not guessed: `elementFromPoint` over the bottom row returned
         * the nav. 9600 is the tracker's modal layer: over every bar, under the
         * toasts that report what just happened.
         *
         * `pb-safe` keeps the last row clear of the home bar. AT MOST 92% OF THE
         * SCREEN, AND THE INSIDE SCROLLS: a tall sheet (Thought Frequencies'
         * reminder settings, 2026-10-30) grew past the top of a phone screen,
         * its title and first rows unreachable. The title row stays put.
         */}
        <DialogPrimitive.Content
          className={PANEL}
          aria-modal="true"
          aria-describedby={undefined}
          data-testid={testId}
          onPointerDownCapture={(e) => {
            lastPress.current = { at: Date.now(), x: e.clientX, y: e.clientY }
          }}
          onClickCapture={(e) => {
            // A link followed from the sheet: its page goes on top of the
            // sheet's history step, which must not be stepped back over then.
            const a = e.target instanceof Element ? e.target.closest("a[href]") : null
            if (a && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && a.getAttribute("target") !== "_blank") backStep.leaving()
          }}
          onInteractOutside={(e) => {
            if (overSheet(e.target) || overSheet(e.detail.originalEvent.target)) e.preventDefault()
          }}
          onPointerDownOutside={(e) => {
            const last = lastPress.current
            const o = e.detail.originalEvent
            if (last && Date.now() - last.at < DOUBLE_CLICK_MS && Math.abs(o.clientX - last.x) <= DOUBLE_CLICK_PX && Math.abs(o.clientY - last.y) <= DOUBLE_CLICK_PX) {
              e.preventDefault()
            }
          }}
        >
          <div className="flex shrink-0 items-center justify-between px-3 pt-3 pb-1">
            <DialogPrimitive.Title className="px-2 text-sm font-semibold text-foreground sm:text-base">{title}</DialogPrimitive.Title>
            <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
              <X className="size-5" />
            </Button>
          </div>

          <div className="min-h-0 overflow-y-auto overscroll-contain px-3 pb-4 space-y-1">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
