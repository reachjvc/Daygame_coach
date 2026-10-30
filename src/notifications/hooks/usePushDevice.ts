"use client"

/**
 * THIS DEVICE AND REMINDERS: can it receive them, is it switched on, and the
 * person's other devices.
 *
 * On open, a browser that already allowed notifications re-registers its
 * address (a browser can replace it silently), keeping whether it is on. That
 * is the backstop for every way an address can change without telling us.
 */

import { useCallback, useEffect, useState } from "react"
import { deviceLabel } from "../endpoints"
import { isInstalledApp, permission, pushSupport, subscribe, workerRegistration, type PushSupport } from "../pushClient"

export interface DeviceSummary {
  id: string
  label: string
  enabled: boolean
  lastSuccessAt: string | null
  createdAt: string
}

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: init?.body ? { "Content-Type": "application/json" } : undefined, cache: "no-store" })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(typeof body.error === "string" ? body.error : "Something went wrong")
  return body as T
}

export function usePushDevice() {
  const [support, setSupport] = useState<PushSupport | null>(null)
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default")
  const [thisDevice, setThisDevice] = useState<{ id: string; enabled: boolean } | null>(null)
  const [devices, setDevices] = useState<DeviceSummary[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadDevices = useCallback(async () => {
    try {
      setDevices((await json<{ devices: DeviceSummary[] }>("/api/notifications/devices")).devices)
    } catch {
      // The list is a convenience; the switch for this device works without it.
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
      const sub = await registration?.pushManager.getSubscription()
      if (!sub) return
      try {
        const r = await json<{ id: string | null; enabled: boolean }>("/api/notifications/devices", {
          method: "POST",
          body: JSON.stringify({ subscription: sub.toJSON(), intent: "refresh", label: deviceLabel(navigator.userAgent, isInstalledApp()) }),
        })
        setThisDevice(r.id ? { id: r.id, enabled: r.enabled } : null)
        void loadDevices()
      } catch {
        // Offline: tried again next time the page opens.
      }
    })()
  }, [loadDevices])

  /**
   * "Turn on for this phone": ask, subscribe, register, and send a test
   * reminder so the person sees it work. Must be called from a tap.
   */
  const turnOn = useCallback(async (): Promise<boolean> => {
    setBusy(true)
    setError(null)
    try {
      const answer = await Notification.requestPermission()
      setPerm(answer)
      if (answer !== "granted") return false
      const registration = await workerRegistration()
      if (!registration) throw new Error("This browser could not start the app's background worker")
      const { publicKey } = await json<{ publicKey: string }>("/api/notifications/key")
      const sub = await subscribe(registration, publicKey)
      const r = await json<{ id: string; enabled: boolean }>("/api/notifications/devices", {
        method: "POST",
        body: JSON.stringify({ subscription: sub.toJSON(), intent: "enable", label: deviceLabel(navigator.userAgent, isInstalledApp()) }),
      })
      setThisDevice({ id: r.id, enabled: true })
      await json("/api/notifications/test", { method: "POST" }).catch(() => undefined)
      await loadDevices()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not turn reminders on")
      return false
    } finally {
      setBusy(false)
    }
  }, [loadDevices])

  const setEnabled = useCallback(
    async (id: string, enabled: boolean) => {
      setError(null)
      setDevices((list) => list.map((d) => (d.id === id ? { ...d, enabled } : d)))
      if (thisDevice?.id === id) setThisDevice({ id, enabled })
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

  return { support, permission: perm, thisDevice, devices, busy, error, turnOn, setEnabled, remove, sendTest, reloadDevices: loadDevices }
}

export type PushDeviceState = ReturnType<typeof usePushDevice>
