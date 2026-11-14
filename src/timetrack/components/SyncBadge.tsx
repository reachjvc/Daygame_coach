"use client"

/**
 * Where your work is being kept, and how fresh this device's copy is, said
 * plainly.
 *
 * This exists because the difference between "saved to your account" and "saved
 * in this browser only" is somebody's history, and a spinner that lies about it
 * is worse than no spinner at all.
 *
 * It reports both halves (D6 in Plans/time-tracker-like-toggl.md). "Saved" used
 * to mean only that nothing was waiting to be sent, so an offline phone with
 * nothing to send said "Saved" over a timer the PC had stopped hours before.
 * Now it also says when this device last heard from the account — "Saved ·
 * checked 3 min ago" — turns amber after five minutes without hearing, or when
 * the last check failed, and checks again when tapped. While the first check
 * after opening or waking is on its way it says "Checking…", and Start and Stop
 * wait for it (D2).
 */

import { cn } from "@/lib/utils"

import type { CheckState, SyncStatus } from "../hooks/useTimetrackSync"

/** Longer than this without hearing from the account, and the badge turns amber */
export const CHECK_STALE_MS = 5 * 60_000

type Tone = "quiet" | "busy" | "amber" | "alarm"

interface Shown {
  /** the words on the badge */
  label: string
  /** what a screen reader hears first; "Saved" whenever nothing is waiting to be sent */
  short: string
  /** the sentence explaining what it means for the person's work */
  title: string
  tone: Tone
  dot: string
}

function ago(ms: number): string {
  const minutes = Math.floor(ms / 60_000)
  return minutes < 1 ? "just now" : `${minutes} min ago`
}

export function describeBadge(status: SyncStatus, pending: number, check: CheckState, nowMs: number): Shown | null {
  const syncing = status !== "local-only" && status !== "signed-out"
  if (check.checking && syncing) {
    return {
      label: "Checking…",
      short: "Checking…",
      title: "Asking your account for the latest. Start and Stop wait a moment for the answer.",
      tone: "busy",
      dot: "bg-primary",
    }
  }
  switch (status) {
    case "starting":
      // the first answer is late: the copy on screen is this device's own, and it says so
      return check.failed
        ? {
            label: "Couldn't reach the server",
            short: "Not checked",
            title: "Couldn't reach the server — this might be out of date. Your changes are kept in this browser. Tap to try again.",
            tone: "amber",
            dot: "bg-amber-500",
          }
        : null
    case "local-only":
      return {
        label: "This device only",
        short: "This device only",
        title: "Sign in to keep your time on every device. Nothing is lost — it is saved in this browser.",
        tone: "quiet",
        dot: "bg-muted-foreground",
      }
    case "signed-out":
      return {
        label: "Signed out",
        short: "Signed out",
        title: "Your session ended. Everything is still saved in this browser; sign in again to save it to your account.",
        tone: "alarm",
        dot: "bg-destructive",
      }
    case "saving":
      return {
        label: pending > 0 ? `Saving ${pending}…` : "Saving…",
        short: pending > 0 ? `Saving ${pending}…` : "Saving…",
        title: "Sending your latest changes",
        tone: "busy",
        dot: "bg-primary",
      }
    case "offline":
      return {
        label: pending > 0 ? `Offline · ${pending} waiting` : "Offline",
        short: pending > 0 ? `Offline · ${pending} waiting` : "Offline",
        title: "No connection. Your work is saved here and will be sent when you are back. This might be out of date.",
        tone: "busy",
        dot: "bg-muted-foreground",
      }
    case "error":
      return {
        label: "Not saved",
        short: "Not saved",
        // "error" is also a server that answered and refused, so this does not say it was unreachable
        title: "Not saved to your account. Your work is kept in this browser. Tap to try again.",
        tone: "alarm",
        dot: "bg-destructive",
      }
    case "synced": {
      // A change waits out the upload debounce before the request starts, and
      // the status only turns to "saving" when it does. Until then a Stop is
      // still on this device, so it is not "Saved".
      if (pending > 0) return describeBadge("saving", pending, check, nowMs)
      if (check.failed) {
        return {
          label: "Couldn't reach the server",
          short: "Saved",
          title: "Couldn't reach the server — this might be out of date. Tap to check again.",
          tone: "amber",
          dot: "bg-amber-500",
        }
      }
      if (check.lastCheckedAt === null) {
        return {
          label: "Saved · not checked yet",
          short: "Saved",
          title: "Saved to your account. Not checked for the other device's changes yet. Tap to check now.",
          tone: "amber",
          dot: "bg-amber-500",
        }
      }
      const since = Math.max(0, nowMs - check.lastCheckedAt)
      if (since > CHECK_STALE_MS) {
        const minutes = Math.floor(since / 60_000)
        return {
          label: `Saved · not checked for ${minutes} min`,
          short: "Saved",
          title: `Saved to your account, but not checked for ${minutes} minutes — this might be out of date. Tap to check now.`,
          tone: "amber",
          dot: "bg-amber-500",
        }
      }
      return {
        label: `Saved · checked ${ago(since)}`,
        short: "Saved",
        title: `Saved to your account, and checked for the other device's changes ${ago(since)}. Tap to check again.`,
        tone: "quiet",
        dot: "bg-[#2da608]",
      }
    }
  }
}

export function SyncBadge({
  status,
  pending,
  check,
  nowMs,
  onCheck,
  compact = false,
}: {
  /**
   * The phone's header (Plans/time-log-phone.md 6.6): nothing at all when
   * everything is saved, and the short word ("Offline", "Saving…", "Not
   * saved") beside the dot whenever it is not.
   */
  compact?: boolean
  status: SyncStatus
  pending: number
  check: CheckState
  /** now, on the same clock as `check.lastCheckedAt` */
  nowMs: number
  /** tapped: check the account now, and send what is waiting */
  onCheck: () => void
}) {
  const shown = describeBadge(status, pending, check, nowMs)
  if (!shown) return null
  if (compact && status === "synced" && shown.tone === "quiet") return null

  const tone =
    shown.tone === "quiet"
      ? "border-border text-muted-foreground"
      : shown.tone === "alarm"
        // `text-destructive` measured 4.49:1 against this background — a hundredth under
        // the 4.5:1 floor, on the one label that means "your work did not save"
        ? "border-destructive/50 text-destructive-foreground bg-destructive"
        : shown.tone === "amber"
          // the app is dark everywhere and its `dark:` variant needs a `.dark` class this
          // page does not have, so the light text is set outright (seen at 390px)
          ? "border-amber-500/60 bg-amber-500/10 text-amber-300"
          : "border-border text-foreground"

  /**
   * Quiet when everything is fine, loud when it is not.
   *
   * "Saved, checked just now" is the state you are in almost always, and a
   * phone header has no room to keep saying so — it shows as a dot. Anything
   * that needs you to know something (checking, still sending, no connection,
   * not heard from the account, signed out, not saved) keeps its words at every
   * width, because that is the moment the words matter.
   */
  const settled = shown.tone === "quiet"

  return (
    <button
      type="button"
      onClick={onCheck}
      title={shown.title}
      data-tone={shown.tone}
      // both halves: the short state a screen reader announces, and the
      // sentence explaining what it means for the person's work
      aria-label={`${shown.short}. ${shown.title}`}
      className={cn(
        // 27px tall until this was changed, on a control whose whole point is
        // being tappable in the one state that matters: "Not saved. Tap to try
        // again." The header has 57px to give, so this costs nothing.
        // min-w-11 as well as min-h-11: in its settled state this is a bare dot,
        // and a dot you can still tap to check is 24px wide without it
        "flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full border px-2 py-1 text-[11px] sm:min-h-0 sm:min-w-0",
        tone,
        settled && "border-transparent sm:border-border",
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", shown.dot)} />
      {/* the word is always there for a screen reader; on a phone only the
          states that need attention spend space on it */}
      {/* No `truncate`. A badge cut to "This d…" tells you less than its dot
          does, and this is the control whose whole job is saying where your work
          is. When space runs out it is the BACK LABEL that gives way — see the
          header, which is `min-w-0` for exactly that. */}
      <span className={cn(settled && "sr-only sm:not-sr-only")}>{compact ? shown.short : shown.label}</span>
    </button>
  )
}
