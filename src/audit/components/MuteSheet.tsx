"use client"

/**
 * MUTE THE PINGS (D-MUTE): 30 min · 1 h · 2 h · until morning, or unmute.
 *
 * Redrawn after the owner's note on the look page (2026-11-09: "this tab looks
 * a bit bad"): the state on top in one line you can read at a glance, and each
 * choice as a tile that says when it would end, so nobody has to add an hour
 * in their head.
 *
 * With no device getting pings, one short line leads to Settings, where the
 * full help lives. The whole help box here pushed the mute choices below the
 * fold on an iPhone (alpha prove-eye-03, owner note K-A4).
 */

import { Bell, BellOff, Moon } from "lucide-react"
import { useEffect, useReducer, useState } from "react"
import { BottomSheet } from "@/components/BottomSheet"
import { cn } from "@/lib/utils"
import type { PushDeviceState } from "@/src/notifications/hooks/usePushDevice"
import { muteUntil, type MuteOption } from "../auditService"
import { clockLabel, QUARTER_MS, quarterStart } from "../quarterService"
import type { AuditRun } from "../types"
import { noPingDevice, pingDeviceNames } from "./PingDevices"

const CHOICES: { option: Exclude<MuteOption, "off">; label: string }[] = [
  { option: "30m", label: "30 min" },
  { option: "1h", label: "1 hour" },
  { option: "2h", label: "2 hours" },
  { option: "morning", label: "Until morning" },
]

/** "Muted until 10:00" (or "… tomorrow"), or null when not muted. */
export function mutedLine(mutedUntil: string | null, timezone: string, now: number): string | null {
  if (!mutedUntil || Date.parse(mutedUntil) <= now) return null
  const sameDay = Date.parse(mutedUntil) - now < 20 * 60 * 60_000
  return `Muted until ${clockLabel(Date.parse(mutedUntil), timezone)}${sameDay ? "" : " tomorrow"}`
}

export function MuteSheet({
  open,
  onClose,
  run,
  timezone,
  onMute,
  push,
  onOpenSettings,
}: {
  open: boolean
  onClose: () => void
  run: Pick<AuditRun, "mutedUntil" | "quietStart" | "quietEnd">
  timezone: string
  /** `shown`: the end the tapped tile showed, so that is the end stored (alpha p10-sheets-03). */
  onMute: (option: MuteOption, shown?: string) => Promise<string | null>
  /** Which devices get pings: the state line says only what is true (alpha picky-eye-09). */
  push: PushDeviceState
  onOpenSettings: () => void
}) {
  const [busy, setBusy] = useState<MuteOption | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Drawn again at each quarter while open: each tile's end moves on at the
  // boundary, as the server's does, so the tile tapped names the end stored
  // (alpha p9-sheet-03: drawn at 08:29:40, tapped at 08:30:04, "until 08:45" stored 09:00).
  const [, redraw] = useReducer((n: number) => n + 1, 0)
  useEffect(() => {
    if (!open) return
    let timer = 0
    const arm = () => {
      timer = window.setTimeout(() => {
        redraw()
        arm()
      }, quarterStart(Date.now()) + QUARTER_MS - Date.now())
    }
    arm()
    return () => window.clearTimeout(timer)
  }, [open])
  const now = new Date()
  const line = mutedLine(run.mutedUntil, timezone, now.getTime())
  // "Pings are on" only when a device gets them; until the list is read, no claim either way.
  const nowhere = push.devicesKnown && noPingDevice(push)
  const names = pingDeviceNames(push)
  const title = line ?? (nowhere ? "No device gets pings" : push.devicesKnown ? "Pings are on" : "Pings")
  const sub = line
    ? "You can still answer. Only the pings wait."
    : nowhere
      ? "Muting changes nothing until a device gets them."
      : `Every 15 minutes, outside your quiet hours${names ? `, to ${names}` : ""}.`
  const tone = line || nowhere ? "warn" : push.devicesKnown ? "on" : "unknown"

  const pick = async (option: MuteOption, shown?: Date | null) => {
    setBusy(option)
    setError(null)
    const failed = await (shown ? onMute(option, shown.toISOString()) : onMute(option))
    setBusy(null)
    if (failed) setError(failed)
    else onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Mute pings" testId="audit-mute-sheet">
      <div
        className={cn(
          "flex items-center gap-3 rounded-2xl border px-4 py-3",
          tone === "warn" ? "border-amber-500/50 bg-amber-500/10" : tone === "on" ? "border-emerald-500/40 bg-emerald-500/10" : "border-border bg-card",
        )}
        data-testid="audit-mute-state"
      >
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            tone === "warn" ? "bg-amber-500 text-black" : tone === "on" ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground",
          )}
          aria-hidden
        >
          {tone === "warn" ? <BellOff className="size-5" /> : <Bell className="size-5" />}
        </span>
        <div className="min-w-0">
          <p className="font-semibold" data-testid={line ? "audit-muted-line" : undefined}>
            {title}
          </p>
          <p className="text-sm text-muted-foreground">{sub}</p>
        </div>
      </div>
      {nowhere && (
        <button
          type="button"
          onClick={onOpenSettings}
          className="mt-2 min-h-11 text-sm text-primary underline-offset-4 hover:underline"
          data-testid="audit-mute-setup"
        >
          Turn pings on in Settings
        </button>
      )}

      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">{line ? "Change it to" : "Mute for"}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {CHOICES.map((c) => {
          const until = muteUntil(c.option, run, now, timezone)
          return (
            <button
              key={c.option}
              type="button"
              disabled={busy !== null}
              onClick={() => void pick(c.option, until)}
              className="flex min-h-16 flex-col items-start justify-center gap-0.5 rounded-xl border border-border bg-background/60 px-3.5 py-2 text-left transition-colors hover:border-primary/60 hover:bg-primary/10 disabled:opacity-50"
            >
              <span className="flex items-center gap-1.5 text-base font-semibold">
                {c.option === "morning" && <Moon className="size-4 text-muted-foreground" aria-hidden />}
                {busy === c.option ? "Muting…" : c.label}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">until {until ? clockLabel(until.getTime(), timezone) : "—"}</span>
            </button>
          )
        })}
      </div>
      {line && (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void pick("off")}
          className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground disabled:opacity-50"
          data-testid="audit-unmute"
        >
          <Bell className="size-4" aria-hidden /> Unmute now
        </button>
      )}
      {error && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </BottomSheet>
  )
}
