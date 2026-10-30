"use client"

/**
 * THE REMINDER LINE AT THE TOP OF THE PAGE: what is happening with reminders
 * on this device, and the one thing to do about it.
 *
 * Exactly one of: the iPhone install steps (Apple allows reminders only in the
 * Home Screen app, Q20); "this browser cannot"; how to undo a refused
 * permission, per phone type; the offer to turn them on; or the status line
 * ("on · next in 9 min") with the way to the settings.
 */

import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { isAppleTouch } from "@/src/notifications/pushClient"
import type { PushDeviceState } from "@/src/notifications/hooks/usePushDevice"
import type { ThoughtSettings } from "../types"
import { formatTime, untilLabel } from "./format"

function quietLine(s: ThoughtSettings): string {
  if (s.quietStart === null || s.quietEnd === null) return "around the clock"
  const t = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
  return `${t(s.quietEnd)}–${t(s.quietStart)}`
}

function DeniedHelp() {
  const ios = isAppleTouch()
  const android = typeof navigator !== "undefined" && /Android/.test(navigator.userAgent)
  return (
    <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
      {ios ? (
        <>
          <li>Open the iPhone&apos;s Settings, then Notifications.</li>
          <li>Find Daygame and switch Allow Notifications on.</li>
        </>
      ) : android ? (
        <>
          <li>Hold the app&apos;s icon, then tap App info (ⓘ).</li>
          <li>Tap Notifications and switch them on, then come back here.</li>
        </>
      ) : (
        <>
          <li>Click the icon left of the address bar.</li>
          <li>Set Notifications to Allow, then reload this page.</li>
        </>
      )}
    </ol>
  )
}

export function RemindersCard({
  push,
  settings,
  nextDueAt,
  lastDeliveredAt,
  timezone,
  onTurnOn,
  onOpenSettings,
}: {
  push: PushDeviceState
  settings: ThoughtSettings
  nextDueAt: string | null
  lastDeliveredAt: string | null
  timezone: string
  onTurnOn: () => void
  onOpenSettings: () => void
}) {
  const settingsButton = (
    <Button variant="ghost" size="sm" onClick={onOpenSettings} className="shrink-0 text-muted-foreground" data-testid="reminder-settings-open">
      Settings
    </Button>
  )

  if (push.support === null) return <div className="h-12" aria-hidden />

  if (push.support === "needs-install") {
    return (
      <section className="rounded-2xl border border-primary/40 bg-card p-4" data-testid="reminders-install">
        <p className="font-semibold">Reminders need the Home Screen app</p>
        <p className="mt-1 text-sm text-muted-foreground">
          On iPhone, Apple only allows reminders from apps added to the Home Screen. Three steps, once:
        </p>
        <ol className="mt-3 space-y-2 text-sm">
          {[
            <>Tap <b>Share</b> at the bottom of Safari</>,
            <>Choose <b>Add to Home Screen</b></>,
            <>Open <b>Daygame</b> from its icon and come back here</>,
          ].map((step, i) => (
            <li key={i} className="flex items-center gap-3 rounded-xl bg-background/60 px-3 py-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">You can log thoughts here meanwhile. Only the reminders wait for the app.</p>
          {settingsButton}
        </div>
      </section>
    )
  }

  if (push.support === "unsupported" || push.support === "dev") {
    return (
      <section className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm">
        <p className="text-muted-foreground">
          {push.support === "dev"
            ? "Reminders are off on the development server. They work on the live site."
            : "This browser can't receive reminders. Install the app, or open it in Chrome, Edge, Firefox or Safari."}
        </p>
        {settingsButton}
      </section>
    )
  }

  if (push.permission === "denied") {
    return (
      <section className="rounded-2xl border border-amber-400/40 bg-card p-4" data-testid="reminders-denied">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">Notifications are blocked for this site</p>
            <p className="mt-1 text-sm text-muted-foreground">Only your phone&apos;s settings can undo that:</p>
          </div>
          {settingsButton}
        </div>
        <DeniedHelp />
      </section>
    )
  }

  const onHere = push.thisDevice?.enabled === true && push.permission === "granted"

  // Switched on here, but the browser's permission is gone: the phone (or
  // Chrome, for a site whose notifications go unopened) took it back.
  if (settings.remindersOn && push.thisDevice?.enabled && push.permission === "default") {
    return (
      <section className="rounded-2xl border border-amber-400/40 bg-card p-4" data-testid="reminders-withdrawn">
        <p className="font-semibold">Reminders stopped on this device</p>
        <p className="mt-1 text-sm text-muted-foreground">This browser&apos;s permission to show them was taken back.</p>
        <div className="mt-3 flex items-center gap-2">
          <Button onClick={onTurnOn} disabled={push.busy} className="flex-1">
            Turn back on
          </Button>
          {settingsButton}
        </div>
      </section>
    )
  }

  if (!settings.remindersOn || !onHere) {
    return (
      <section className="rounded-2xl border border-border bg-card p-4" data-testid="reminders-offer">
        <div className="flex items-start gap-3">
          <Bell className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-medium">
              Remind me every {settings.intervalMinutes} minutes, {quietLine(settings)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your phone asks “What&apos;s on your mind?”. Your thoughts never show on the lock screen.
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button onClick={onTurnOn} disabled={push.busy} className="flex-1" data-testid="reminders-turn-on">
            {push.busy ? "Turning on…" : "Turn on for this device"}
          </Button>
          {settingsButton}
        </div>
        {push.error && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {push.error}
          </p>
        )}
      </section>
    )
  }

  const paused = settings.pausedUntil !== null && Date.parse(settings.pausedUntil) > Date.now()
  const here = push.devices.find((d) => d.id === push.thisDevice?.id)
  const silentSince = here ? (here.lastSuccessAt ?? here.createdAt) : null
  // Only with every day active: a weekdays-only schedule is silent all weekend on purpose.
  const silent =
    !paused && settings.activeDays === 127 && silentSince !== null && Date.now() - Date.parse(silentSince) > 24 * 60 * 60_000
  if (silent) {
    return (
      <section className="rounded-2xl border border-amber-400/40 bg-card p-4" data-testid="reminders-silent">
        <p className="font-semibold">No reminder has reached this device for a day</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Battery saver or Do Not Disturb can hold them back. Send a test to check.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <Button variant="outline" className="flex-1" onClick={() => void push.sendTest()}>
            Send a test reminder
          </Button>
          {settingsButton}
        </div>
      </section>
    )
  }
  return (
    <section className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-2.5" data-testid="reminders-on">
      <div className="min-w-0 text-sm">
        <p className="flex items-center gap-2">
          <span aria-hidden className={`size-2 rounded-full ${paused ? "bg-amber-400" : "bg-emerald-400"}`} />
          {paused
            ? `Paused until ${formatTime(settings.pausedUntil as string, timezone)}`
            : nextDueAt
              ? `Reminders on · next ${untilLabel(nextDueAt, new Date())}`
              : "Reminders on"}
        </p>
        {lastDeliveredAt && <p className="mt-0.5 text-xs text-muted-foreground">Last delivered {formatTime(lastDeliveredAt, timezone)}</p>}
      </div>
      {settingsButton}
    </section>
  )
}
