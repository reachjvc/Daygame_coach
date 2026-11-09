"use client"

/**
 * THE CARD THAT SAYS WHAT IS HAPPENING WITH NOTIFICATIONS ON THIS DEVICE, and
 * the one thing to do about it. Moved out of Thoughts (Plans/energy-audit.md,
 * Phase 1); the words are passed in, so each feature keeps its own.
 *
 * Exactly one of: the iPhone install steps (Apple allows notifications only in
 * the Home Screen app); "this browser cannot"; how to undo a refused
 * permission, per phone type; the permission taken back; the offer to turn
 * them on; a silent-device warning; or the status line with the way to the
 * settings.
 */

import { Bell } from "lucide-react"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { isAppleTouch } from "../pushClient"
import type { PushDeviceState } from "../hooks/usePushDevice"

export interface PushDeviceWords {
  installTitle: string
  installLead: string
  installFoot: string
  devUnsupported: string
  browserUnsupported: string
  deniedTitle: string
  withdrawnTitle: string
  withdrawnBody: string
  turnBackOn: string
  offerTitle: string
  offerBody: string
  turnOn: string
  turningOn: string
  silentTitle: string
  silentBody: string
  sendTest: string
  settings: string
}

/** What the "on" line shows. */
export interface PushDeviceStatus {
  line: string
  sub?: string | null
  paused?: boolean
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

export function PushDeviceCard({
  push,
  words,
  featureOn,
  status,
  silent,
  onTurnOn,
  onOpenSettings,
  testIdPrefix = "push",
  settingsTestId = "push-settings-open",
}: {
  push: PushDeviceState
  words: PushDeviceWords
  /** The feature's own switch: pings or reminders wanted at all. */
  featureOn: boolean
  status: PushDeviceStatus
  /** The caller decides when a device counts as silent (it knows the schedule). */
  silent: boolean
  onTurnOn: () => void
  onOpenSettings: () => void
  testIdPrefix?: string
  settingsTestId?: string
}): ReactNode {
  const settingsButton = (
    <Button variant="ghost" size="sm" onClick={onOpenSettings} className="shrink-0 text-muted-foreground" data-testid={settingsTestId}>
      {words.settings}
    </Button>
  )

  if (push.support === null) return <div className="h-12" aria-hidden />

  if (push.support === "needs-install") {
    return (
      <section className="rounded-2xl border border-primary/40 bg-card p-4" data-testid={`${testIdPrefix}-install`}>
        <p className="font-semibold">{words.installTitle}</p>
        <p className="mt-1 text-sm text-muted-foreground">{words.installLead}</p>
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
          <p className="text-xs text-muted-foreground">{words.installFoot}</p>
          {settingsButton}
        </div>
      </section>
    )
  }

  if (push.support === "unsupported" || push.support === "dev") {
    return (
      <section className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm">
        <p className="text-muted-foreground">{push.support === "dev" ? words.devUnsupported : words.browserUnsupported}</p>
        {settingsButton}
      </section>
    )
  }

  if (push.permission === "denied") {
    return (
      <section className="rounded-2xl border border-amber-400/40 bg-card p-4" data-testid={`${testIdPrefix}-denied`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">{words.deniedTitle}</p>
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
  if (featureOn && push.thisDevice?.enabled && push.permission === "default") {
    return (
      <section className="rounded-2xl border border-amber-400/40 bg-card p-4" data-testid={`${testIdPrefix}-withdrawn`}>
        <p className="font-semibold">{words.withdrawnTitle}</p>
        <p className="mt-1 text-sm text-muted-foreground">{words.withdrawnBody}</p>
        <div className="mt-3 flex items-center gap-2">
          <Button onClick={onTurnOn} disabled={push.busy} className="flex-1">
            {words.turnBackOn}
          </Button>
          {settingsButton}
        </div>
      </section>
    )
  }

  if (!featureOn || !onHere) {
    return (
      <section className="rounded-2xl border border-border bg-card p-4" data-testid={`${testIdPrefix}-offer`}>
        <div className="flex items-start gap-3">
          <Bell className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-medium">{words.offerTitle}</p>
            <p className="mt-1 text-sm text-muted-foreground">{words.offerBody}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button onClick={onTurnOn} disabled={push.busy} className="flex-1" data-testid={`${testIdPrefix}-turn-on`}>
            {push.busy ? words.turningOn : words.turnOn}
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

  if (silent) {
    return (
      <section className="rounded-2xl border border-amber-400/40 bg-card p-4" data-testid={`${testIdPrefix}-silent`}>
        <p className="font-semibold">{words.silentTitle}</p>
        <p className="mt-1 text-sm text-muted-foreground">{words.silentBody}</p>
        <div className="mt-3 flex items-center gap-2">
          <Button variant="outline" className="flex-1" onClick={() => void push.sendTest()}>
            {words.sendTest}
          </Button>
          {settingsButton}
        </div>
      </section>
    )
  }

  return (
    <section className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-2.5" data-testid={`${testIdPrefix}-on`}>
      <div className="min-w-0 text-sm">
        <p className="flex items-center gap-2">
          <span aria-hidden className={`size-2 rounded-full ${status.paused ? "bg-amber-400" : "bg-emerald-400"}`} />
          {status.line}
        </p>
        {status.sub && <p className="mt-0.5 text-xs text-muted-foreground">{status.sub}</p>}
      </div>
      {settingsButton}
    </section>
  )
}
