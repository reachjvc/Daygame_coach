"use client"

/**
 * THIS DEVICE AND REMINDERS: can it receive them, is it switched on, and the
 * person's other devices.
 *
 * On open, a browser that already allowed notifications re-registers its
 * address (a browser can replace it silently), keeping whether it is on. That
 * is the backstop for every way an address can change without telling us.
 *
 * TWO SWITCHES PER DEVICE: `enabled` (audit pings) and
 * `timerRunning` ("Show the running timer on this device", the time tracker's,
 * Plans/time-tracker-like-toggl.md Phase 7). `setTimer` is the second one; it
 * asks for permission and registers the device itself when it has to, without
 * switching reminders on.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { deviceLabel } from "../endpoints"
import { isInstalledApp, permission, pushSupport, subscribe, subscriptionForPage, workerRegistration, type PushSupport } from "../pushClient"

export interface DeviceSummary {
  id: string
  label: string
  enabled: boolean
  timerRunning: boolean
  lastSuccessAt: string | null
  createdAt: string
}

export interface ThisDevice {
  id: string
  enabled: boolean
  timerRunning: boolean
}

/** The running timer's tag in public/sw.js. */
const TIMER_TAG = "timer-running"

/**
 * THE LAST DEVICE LIST THIS PHONE READ (alpha prove-slow-02). With no signal
 * the list cannot be read, and "no device gets pings" was assumed: a phone
 * that gets them showed the big "Turn on pings for this device" offer. The
 * kept list answers instead, while `devicesKnown` stays false, so the page
 * names where pings go but offers nothing from a copy. Removed at sign-out
 * (src/shared/offlineCopies.ts).
 */
export const DEVICES_COPY_KEY = "push-devices-copy-v1"

function keepDevices(devices: DeviceSummary[]): void {
  try {
    window.localStorage.setItem(DEVICES_COPY_KEY, JSON.stringify(devices))
  } catch {
    // storage blocked or full: offline, the page names no device
  }
}

function keptDevices(): DeviceSummary[] | null {
  try {
    const raw = window.localStorage.getItem(DEVICES_COPY_KEY)
    const list: unknown = raw ? JSON.parse(raw) : null
    return Array.isArray(list) ? (list as DeviceSummary[]) : null
  } catch {
    return null
  }
}

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: init?.body ? { "Content-Type": "application/json" } : undefined, cache: "no-store" })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(typeof body.error === "string" ? body.error : "Something went wrong")
  return body as T
}

/** Take the running timer off this device's screen at once, rather than at the next start or stop. */
async function closeTimerNotifications(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker?.getRegistration()
    for (const n of (await registration?.getNotifications({ tag: TIMER_TAG })) ?? []) n.close()
  } catch {
    // nothing shown, or no worker: nothing to close
  }
}

export function usePushDevice() {
  const [support, setSupport] = useState<PushSupport | null>(null)
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default")
  const [thisDevice, setThisDevice] = useState<ThisDevice | null>(null)
  const [devices, setDevices] = useState<DeviceSummary[]>([])
  /** The device list has been read at least once: until then, "no device" is not known. */
  const [devicesKnown, setDevicesKnown] = useState(false)
  const readNow = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadDevices = useCallback(async () => {
    try {
      const list = (await json<{ devices: DeviceSummary[] }>("/api/notifications/devices")).devices
      setDevices(list)
      setDevicesKnown(true)
      readNow.current = true
      keepDevices(list)
    } catch {
      // The list is a convenience; the switch for this device works without it.
      // No signal: the last list read here, until the server answers (never over a list read now).
      const kept = readNow.current ? null : keptDevices()
      if (kept) setDevices(kept)
    }
  }, [])

  useEffect(() => {
    const s = pushSupport()
    setSupport(s)
    setPerm(permission())
    void loadDevices()
    if (s !== "ready" || permission() !== "granted") return
    void (async () => {
      const registration = await workerRegistration()
      // a subscription made with an earlier server key is replaced here, without a tap (prove-slow-01)
      const here = registration ? await subscriptionForPage(registration) : null
      if (!here) return
      try {
        const r = await json<{ id: string | null; enabled: boolean; timerRunning?: boolean }>("/api/notifications/devices", {
          method: "POST",
          body: JSON.stringify({
            subscription: here.subscription.toJSON(),
            intent: "refresh",
            label: deviceLabel(navigator.userAgent, isInstalledApp()),
            ...(here.oldEndpoint ? { oldEndpoint: here.oldEndpoint } : {}),
          }),
        })
        setThisDevice(r.id ? { id: r.id, enabled: r.enabled, timerRunning: r.timerRunning === true } : null)
        void loadDevices()
      } catch {
        // Offline: tried again next time the page opens.
      }
    })()
  }, [loadDevices])

  /** Ask, subscribe and register with `intent`. Must be called from a tap. Null when permission was refused. */
  const register = useCallback(async (intent: "enable" | "timer"): Promise<ThisDevice | null> => {
    const answer = await Notification.requestPermission()
    setPerm(answer)
    if (answer !== "granted") return null
    const registration = await workerRegistration()
    if (!registration) throw new Error("This browser could not start the app's background worker")
    const { publicKey } = await json<{ publicKey: string }>("/api/notifications/key")
    const sub = await subscribe(registration, publicKey)
    // the label also tells the server whether this is the installed app on a phone (`timerOnByDefault`)
    const r = await json<{ id: string; enabled: boolean; timerRunning?: boolean }>("/api/notifications/devices", {
      method: "POST",
      body: JSON.stringify({ subscription: sub.toJSON(), intent, label: deviceLabel(navigator.userAgent, isInstalledApp()) }),
    })
    const device = { id: r.id, enabled: r.enabled, timerRunning: r.timerRunning === true }
    setThisDevice(device)
    return device
  }, [])

  /**
   * "Turn on for this phone": ask, subscribe, register, and send a test
   * reminder so the person sees it work. Must be called from a tap.
   */
  const turnOn = useCallback(async (): Promise<boolean> => {
    setBusy(true)
    setError(null)
    try {
      if (!(await register("enable"))) return false
      await json("/api/notifications/test", { method: "POST" }).catch(() => undefined)
      await loadDevices()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not turn reminders on")
      return false
    } finally {
      setBusy(false)
    }
  }, [loadDevices, register])

  /**
   * "Show the running timer on this device", on or off. On asks for permission
   * and registers this browser when it has to (from a tap); reminders are not
   * switched on by it. Off also takes the timer off this screen at once.
   */
  const setTimer = useCallback(
    async (on: boolean): Promise<boolean> => {
      setBusy(true)
      setError(null)
      try {
        if (thisDevice && (!on || permission() === "granted")) {
          await json(`/api/notifications/devices/${thisDevice.id}`, { method: "PATCH", body: JSON.stringify({ timerRunning: on }) })
          setThisDevice({ ...thisDevice, timerRunning: on })
        } else if (on) {
          if (!(await register("timer"))) return false
        }
        if (!on) await closeTimerNotifications()
        await loadDevices()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not change the running timer")
        return false
      } finally {
        setBusy(false)
      }
    },
    [loadDevices, register, thisDevice],
  )

  const setEnabled = useCallback(
    async (id: string, enabled: boolean) => {
      setError(null)
      setDevices((list) => list.map((d) => (d.id === id ? { ...d, enabled } : d)))
      if (thisDevice?.id === id) setThisDevice({ ...thisDevice, enabled })
      try {
        await json(`/api/notifications/devices/${id}`, { method: "PATCH", body: JSON.stringify({ enabled }) })
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not change the device")
        await loadDevices()
      }
    },
    [loadDevices, thisDevice],
  )

  const remove = useCallback(
    async (id: string) => {
      setError(null)
      try {
        await json(`/api/notifications/devices/${id}`, { method: "DELETE" })
        if (thisDevice?.id === id) setThisDevice(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not remove the device")
      }
      await loadDevices()
    },
    [loadDevices, thisDevice],
  )

  const sendTest = useCallback(async (): Promise<string> => {
    setError(null)
    try {
      const r = await json<{ devices: number; delivered: number }>("/api/notifications/test", { method: "POST" })
      await loadDevices()
      return r.delivered === r.devices
        ? `Sent to ${r.devices === 1 ? "1 device" : `${r.devices} devices`}.`
        : `Reached ${r.delivered} of ${r.devices} devices.`
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not send a test reminder"
      setError(message)
      return ""
    }
  }, [loadDevices])

  return { support, permission: perm, thisDevice, devices, devicesKnown, busy, error, turnOn, setTimer, setEnabled, remove, sendTest, reloadDevices: loadDevices }
}

export type PushDeviceState = ReturnType<typeof usePushDevice>
