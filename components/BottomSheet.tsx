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
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

/** Tailwind's `sm` breakpoint. Below it we are on a phone and draw the sheet. */
const WIDE_SCREEN = "(min-width: 640px)"

/**
 * True once we know the window is wider than a phone.
 *
 * It starts false on purpose: the sheet is the design, the dialog is the
 * wide-screen variation. Starting false means a phone draws the right thing on
 * the first paint and a desktop corrects itself a frame later, rather than
 * every phone flashing a dialog. Environments with no `matchMedia` at all
 * (server render, jsdom) therefore get the sheet, which is the base case.
 */
function useWideScreen(): boolean {
  const [wide, setWide] = React.useState(false)

  React.useEffect(() => {
    const query = window.matchMedia?.(WIDE_SCREEN)
    if (!query) return
    const sync = () => setWide(query.matches)
    sync()
    query.addEventListener("change", sync)
    return () => query.removeEventListener("change", sync)
  }, [])

  return wide
}

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
  const wide = useWideScreen()

  // Escape closes it. Without this the only way out of the sheet was to find
  // the X or tap the exact strip of backdrop above the panel. Not on the
  // wide-screen path: Radix's dialog handles Escape itself there, and two
  // listeners would call the caller's onClose twice for one key press.
  React.useEffect(() => {
    if (!open || wide) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open, wide, onClose])

  if (!open) return null

  if (wide) {
    // Radix's dialog already handles Escape, the backdrop and the close button.
    return (
      <Dialog open onOpenChange={(next) => !next && onClose()}>
        <DialogContent data-testid={testId}>
          <DialogTitle>{title}</DialogTitle>
          <div className="space-y-1">{children}</div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <div
      /**
       * ABOVE EVERY BAR IN THE APP, not just the one this was written for.
       *
       * `z-50` cleared the app's own tab bar (`z-40`) and nothing else. The
       * time tracker draws its own bottom navigation at `z-[9500]` — a private
       * scale it invented so its portalled panels clear its sticky header — so
       * a sheet opened there was drawn UNDERNEATH it: the last row was on
       * screen, looked normal, and the tap landed on the navigation instead.
       * Measured, not guessed: `elementFromPoint` over the bottom row returned
       * the nav.
       *
       * That is the same failure the tracker's own panels already carry a
       * comment about, and a modal is the one thing that must be above page
       * chrome whatever the chrome thinks it is worth. 9600 is the tracker's
       * modal layer: over every bar, under the toasts that report what just
       * happened.
       */
      className="fixed inset-0 z-[9600]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-testid={testId}
    >
      {/* Backdrop. Tapping anywhere off the panel closes. */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />

      {/* The panel itself. `pb-safe` keeps the last row clear of the home bar. */}
      <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl border-t border-border pb-safe animate-slide-up">
        <div className="flex items-center justify-between px-3 pt-3 pb-1">
          <span className="px-2 text-sm font-semibold text-foreground">{title}</span>
          <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
            <X className="size-5" />
          </Button>
        </div>

        <div className="px-3 pb-4 space-y-1">{children}</div>
      </div>
    </div>
  )
}
