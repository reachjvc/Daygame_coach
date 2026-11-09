"use client"

/**
 * WHERE THE AUDIT'S PINGS ARRIVE (D-DEVICES): the shared device card, in the
 * audit's words, and the device list for the Settings sheet. A device's
 * switch (`push_devices.enabled`) means "audit pings on this device".
 */

import { PushDeviceCard, type PushDeviceWords } from "@/src/notifications/components/PushDeviceCard"
import { PushDeviceList } from "@/src/notifications/components/PushDeviceList"
import type { PushDeviceState } from "@/src/notifications/hooks/usePushDevice"

const WORDS: PushDeviceWords = {
  installTitle: "Pings need the Home Screen app",
  installLead: "On iPhone, Apple only allows notifications from apps added to the Home Screen. Three steps, once:",
  installFoot: "You can answer here meanwhile. Only the pings wait for the app.",
  devUnsupported: "Pings are off on the development server. They work on the live site.",
  browserUnsupported: "This browser can't receive pings. Install the app, or open it in Chrome, Edge, Firefox or Safari.",
  deniedTitle: "Notifications are blocked for this site",
  withdrawnTitle: "Pings stopped on this device",
  withdrawnBody: "This browser's permission to show them was taken back.",
  turnBackOn: "Turn back on",
  offerTitle: "Ping me every 15 minutes",
  offerBody: "At :00, :15, :30 and :45, outside your quiet hours. The lock screen shows only the times, never what you wrote.",
  turnOn: "Turn on pings for this device",
  turningOn: "Turning on…",
  silentTitle: "No ping has reached this device for a day",
  silentBody: "Battery saver or Do Not Disturb can hold them back. Send a test to check.",
  sendTest: "Send a test ping",
  settings: "Settings",
}

/** True when none of this person's devices has pings on. */
export function noPingDevice(push: PushDeviceState): boolean {
  return !push.devices.some((d) => d.enabled)
}

/** True when this browser itself gets pings. */
export function pingsHere(push: PushDeviceState): boolean {
  return push.thisDevice?.enabled === true && push.permission === "granted"
}

/** "Android phone · Chrome": the devices that get pings. */
export function pingDeviceNames(push: PushDeviceState): string {
  return push.devices
    .filter((d) => d.enabled)
    .map((d) => d.label || "A device")
    .join(" · ")
}

export function PingDeviceCard({ push, onOpenSettings }: { push: PushDeviceState; onOpenSettings?: () => void }) {
  const here = push.devices.find((d) => d.id === push.thisDevice?.id)
  const silentSince = here?.enabled ? (here.lastSuccessAt ?? here.createdAt) : null
  return (
    <PushDeviceCard
      push={push}
      words={WORDS}
      featureOn
      silent={silentSince !== null && Date.now() - Date.parse(silentSince) > 24 * 60 * 60_000}
      status={{ line: "Pings on for this device" }}
      onTurnOn={() => void push.turnOn()}
      onOpenSettings={onOpenSettings}
      testIdPrefix="audit-pings"
      settingsTestId="audit-pings-settings"
    />
  )
}

/**
 * THE DEVICES, AND A WAY TO ADD THIS ONE. A second device (the PC, once the
 * phone had pings) had no button anywhere to turn pings on for itself (alpha
 * slow-pass-01): the offer showed only while no device at all had them. Here
 * it shows whenever this browser does not get them, naming the ones that do.
 */
export function PingDeviceList({ push }: { push: PushDeviceState }) {
  const others = pingDeviceNames(push)
  return (
    <div>
      {push.devicesKnown && !pingsHere(push) && (
        <div className="mb-4" data-testid="audit-pings-this-device">
          <p className="mb-2 text-sm text-muted-foreground">{others ? `Pings go to ${others}. Not to this device.` : "No device gets pings yet."}</p>
          <PingDeviceCard push={push} />
        </div>
      )}
      <h4 className="text-sm font-semibold">Devices that get pings</h4>
      <div className="mt-2">
        <PushDeviceList push={push} words={{ empty: "None yet. Each phone or computer turns pings on for itself.", switchLabel: (l) => `Pings on ${l || "this device"}` }} />
      </div>
      <button type="button" className="mt-2 min-h-11 text-sm text-primary underline-offset-4 hover:underline" onClick={() => void push.sendTest()}>
        Send a test ping
      </button>
    </div>
  )
}
