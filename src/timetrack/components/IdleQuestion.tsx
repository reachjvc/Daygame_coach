"use client"

/**
 * THE IDLE QUESTION: what should happen to the time nobody touched this page?
 *
 * It counts the time away up to NOW, on every tick. It used to be written once,
 * the moment the threshold passed: away three hours with a ten-minute
 * threshold, you came back to "No activity for 10 minutes … those 10 minutes",
 * while "Drop them" dropped all three hours (edits audit B6, 2026-11-04). And
 * "has been running since 14:21" named the moment the page went quiet, not when
 * the timer started, so the two times are now said separately.
 */

import { cn } from "@/lib/utils"
import { addDays, dateKey, epochSeconds, formatDayHeader, formatIdleSpan, formatTimeOfDay } from "../timetrackFormatService"
import type { IdlePrompt } from "../hooks/useTimetrack"
import type { IsoDateTime, TimetrackState } from "../types"
import { Modal } from "./primitives"

/** "09:05" today, "yesterday 09:05", "Mon, 2 Nov 09:05" — a bare time on a timer from yesterday reads as this morning */
function since(iso: IsoDateTime, todayKey: string, format: TimetrackState["user"]["timeFormat"]): string {
  const time = formatTimeOfDay(iso, format)
  const day = dateKey(iso)
  if (day === todayKey) return time
  if (day === addDays(todayKey, -1)) return `yesterday ${time}`
  return `${formatDayHeader(day, todayKey)} ${time}`
}

export function IdleQuestion({
  prompt,
  entryStartIso,
  nowSec,
  timeFormat,
  onResolve,
}: {
  prompt: Pick<IdlePrompt, "description" | "idleSinceIso">
  /** when the timer the question is about started */
  entryStartIso: IsoDateTime
  /** the running clock, so the count goes on while the question waits */
  nowSec: number
  timeFormat: TimetrackState["user"]["timeFormat"]
  onResolve: (action: "keep" | "discard" | "discard_and_stop") => void
}) {
  const span = formatIdleSpan(Math.max(0, nowSec - epochSeconds(prompt.idleSinceIso)))
  const todayKey = dateKey(new Date(nowSec * 1000))
  const quietSince = formatTimeOfDay(prompt.idleSinceIso, timeFormat)

  return (
    <Modal title={`No activity for ${span}`} onClose={() => onResolve("keep")}>
      <p className="text-sm">
        <strong>{prompt.description.trim() || "Your timer"}</strong> has been running since{" "}
        {since(entryStartIso, todayKey, timeFormat)}, and nothing has happened on this page since {quietSince}. What should
        happen to those {span}?
      </p>

      <div className="mt-4 space-y-2">
        <IdleChoice
          label="Count them"
          detail={`Leave the ${span} on this entry and keep the timer running.`}
          onClick={() => onResolve("keep")}
          primary
        />
        <IdleChoice
          label="Drop them, keep tracking"
          detail={`End this entry at ${quietSince} and start a fresh one from now.`}
          onClick={() => onResolve("discard")}
        />
        <IdleChoice
          label="Drop them and stop"
          detail={`End this entry at ${quietSince} and leave the timer stopped.`}
          onClick={() => onResolve("discard_and_stop")}
        />
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground">
        This page can only see activity on its own tab, so it only asks while you are looking at it. Turn the check off
        in Settings → Automation.
      </p>
    </Modal>
  )
}

function IdleChoice({
  label,
  detail,
  onClick,
  primary,
}: {
  label: string
  detail: string
  onClick: () => void
  primary?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
        primary ? "border-primary bg-primary/10 hover:bg-primary/15" : "border-border hover:bg-secondary/50",
      )}
    >
      <span className="block text-sm font-medium">{label}</span>
      <span className="block text-xs text-muted-foreground">{detail}</span>
    </button>
  )
}
