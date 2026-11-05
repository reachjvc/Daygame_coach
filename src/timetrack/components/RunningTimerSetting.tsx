"use client"

/**
 * "SHOW THE RUNNING TIMER ON THIS DEVICE" (Plans/time-tracker-like-toggl.md,
 * Phase 7, item 4; Q4 scenarios 9 and 11).
 *
 * A setting of THIS device, not of the account: it lives on the device's row
 * on the server (`push_devices.timer_running`), because the server decides
 * where a push goes. On by default for the installed phone app when it
 * registers, off for a desktop browser. Switching it on here asks for
 * notification permission (from the tap, as browsers require) without turning
 * Thought Frequencies reminders on.
 *
 * Off means this device gets no timer pushes at all, so the entry's
 * description is never sent to it.
 */

import { useEffect, useState } from "react"
import { isInstalledApp } from "@/src/notifications/pushClient"
import { usePushDevice } from "@/src/notifications/hooks/usePushDevice"
import { SectionCard, ToggleRow } from "./primitives"

export const LOCK_SCREEN_NOTE =
  "Your lock screen shows what the timer is for. To hide that, use Android's own setting: Settings → Notifications → Notifications on lock screen → hide sensitive content."

/** Why the switch cannot work here, in words, or null when it can. */
function blockedBecause(support: ReturnType<typeof usePushDevice>["support"], permission: string): string | null {
  if (support === "needs-install") return "On an iPhone or iPad, add the app to the Home Screen first: Apple allows notifications only there."
  if (support === "unsupported") return "This browser cannot show notifications from the app."
  if (support === "dev") return "Notifications work on the live site, not on the development server."
  if (permission === "denied") return "Notifications are blocked for this site. Allow them in the browser's site settings, then switch this on."
  return null
}

/**
 * THE "NEXT APP OPEN" HALF OF AN OFFLINE STOP. A Stop tapped in the shade with
 * no signal waits in the worker, which sends it by Background Sync where the
 * browser has it (Chrome on Android). Where it does not, opening the tracker
 * asks the worker to send whatever is waiting, still with the tap time.
 * Renders nothing.
 */
export function SendWaitingTimerStops() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return
    void navigator.serviceWorker.ready
      .then((registration) => registration.active?.postMessage({ type: "send-queued-stops" }))
      .catch(() => undefined)
  }, [])
  return null
}

export function RunningTimerSetting() {
  const push = usePushDevice()
  const [installed, setInstalled] = useState(false)
  useEffect(() => setInstalled(isInstalledApp()), [])

  const on = push.thisDevice?.timerRunning === true && push.permission === "granted"
  const blocked = push.support === null ? null : blockedBecause(push.support, push.permission)
  const hint =
    blocked ??
    (installed
      ? "The notification shade shows what is running, with a Stop button. On by default in the installed app."
      : "The notification shade shows what is running, with a Stop button. Off by default in a desktop browser.")

  return (
    // Toggl's words: Settings › Notifications › "Running timer" (D-NOTIFY)
    <SectionCard title="Notifications" description="While a timer runs, this device shows it, silently, wherever it was started.">
      <div data-testid="running-timer-setting">
        <ToggleRow
          label="Running timer"
          hint={hint}
          checked={on}
          onChange={(next) => {
            if (push.busy || (blocked !== null && next)) return
            void push.setTimer(next)
          }}
        />
        <p className="text-xs text-muted-foreground">{LOCK_SCREEN_NOTE}</p>
        {push.error && (
          <p role="alert" className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs">
            {push.error}
          </p>
        )}
      </div>
    </SectionCard>
  )
}
