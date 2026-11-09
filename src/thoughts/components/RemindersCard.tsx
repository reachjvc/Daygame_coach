"use client"

/**
 * THE REMINDER LINE AT THE TOP OF THE PAGE. The states and the markup live in
 * the shared `PushDeviceCard`; this passes Thoughts' words and works out its
 * schedule-bound parts ("on · next in 9 min", the silent-device rule).
 */

import { PushDeviceCard, type PushDeviceWords } from "@/src/notifications/components/PushDeviceCard"
import type { PushDeviceState } from "@/src/notifications/hooks/usePushDevice"
import type { ThoughtSettings } from "../types"
import { formatTime, untilLabel } from "./format"

function quietLine(s: ThoughtSettings): string {
  if (s.quietStart === null || s.quietEnd === null) return "around the clock"
  const t = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
  return `${t(s.quietEnd)}–${t(s.quietStart)}`
}

const WORDS: Omit<PushDeviceWords, "offerTitle"> = {
  installTitle: "Reminders need the Home Screen app",
  installLead: "On iPhone, Apple only allows reminders from apps added to the Home Screen. Three steps, once:",
  installFoot: "You can log thoughts here meanwhile. Only the reminders wait for the app.",
  devUnsupported: "Reminders are off on the development server. They work on the live site.",
  browserUnsupported: "This browser can't receive reminders. Install the app, or open it in Chrome, Edge, Firefox or Safari.",
  deniedTitle: "Notifications are blocked for this site",
  withdrawnTitle: "Reminders stopped on this device",
  withdrawnBody: "This browser's permission to show them was taken back.",
  turnBackOn: "Turn back on",
  offerBody: "Your phone asks “What's on your mind?”. Your thoughts never show on the lock screen.",
  turnOn: "Turn on for this device",
  turningOn: "Turning on…",
  silentTitle: "No reminder has reached this device for a day",
  silentBody: "Battery saver or Do Not Disturb can hold them back. Send a test to check.",
  sendTest: "Send a test reminder",
  settings: "Settings",
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
  const paused = settings.pausedUntil !== null && Date.parse(settings.pausedUntil) > Date.now()
  const here = push.devices.find((d) => d.id === push.thisDevice?.id)
  const silentSince = here ? (here.lastSuccessAt ?? here.createdAt) : null
  // Only with every day active: a weekdays-only schedule is silent all weekend on purpose.
  const silent =
    !paused && settings.activeDays === 127 && silentSince !== null && Date.now() - Date.parse(silentSince) > 24 * 60 * 60_000
  return (
    <PushDeviceCard
      push={push}
      words={{ ...WORDS, offerTitle: `Remind me every ${settings.intervalMinutes} minutes, ${quietLine(settings)}` }}
      featureOn={settings.remindersOn}
      silent={silent}
      status={{
        paused,
        line: paused
          ? `Paused until ${formatTime(settings.pausedUntil as string, timezone)}`
          : nextDueAt
            ? `Reminders on · next ${untilLabel(nextDueAt, new Date())}`
            : "Reminders on",
        sub: lastDeliveredAt ? `Last delivered ${formatTime(lastDeliveredAt, timezone)}` : null,
      }}
      onTurnOn={onTurnOn}
      onOpenSettings={onOpenSettings}
      testIdPrefix="reminders"
      settingsTestId="reminder-settings-open"
    />
  )
}
