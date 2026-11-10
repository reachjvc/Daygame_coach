"use client"

import { useCallback, useEffect, useState } from "react"

export interface CouncilSettingsState {
  weekValue: string | null
  weekOf: string
  remindOn: boolean
  remindHour: number
  hasEnabledDevice: boolean
}

/** The council's settings (value of the week, daily reminder), read once and replaced by each save's answer. */
export function useCouncilSettings() {
  const [settings, setSettings] = useState<CouncilSettingsState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let live = true
    fetch("/api/role-models/settings", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((b: CouncilSettingsState | null) => live && b && setSettings(b))
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [])
  const save = useCallback(async (patch: Partial<Pick<CouncilSettingsState, "weekValue" | "remindOn" | "remindHour">>) => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/role-models/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) })
      const body = (await res.json().catch(() => ({}))) as CouncilSettingsState & { error?: string }
      if (!res.ok) {
        setError(body.error ?? "Not saved. Try again.")
        return false
      }
      setSettings(body)
      return true
    } catch {
      setError("Not saved. Check your connection and try again.")
      return false
    } finally {
      setBusy(false)
    }
  }, [])
  return { settings, error, busy, save, setSettings }
}

export interface WeekMarkState { day: string; value: string; lived: boolean }

/** The marks between two days, and a way to set today's (or an earlier day this week). */
export function useWeekMarks(from: string, to: string, enabled = true) {
  const [marks, setMarks] = useState<WeekMarkState[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!enabled) return
    let live = true
    fetch(`/api/role-models/week?from=${from}&to=${to}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { marks: [] }))
      .then((b: { marks: WeekMarkState[] }) => live && setMarks(b.marks ?? []))
      .catch(() => live && setMarks([]))
    return () => {
      live = false
    }
  }, [from, to, enabled])
  const mark = useCallback(async (day: string, lived: boolean | null) => {
    setError(null)
    try {
      const res = await fetch("/api/role-models/week", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ day, lived }) })
      const body = (await res.json().catch(() => ({}))) as { marks?: WeekMarkState[]; error?: string }
      if (!res.ok || !body.marks) {
        setError(body.error ?? "Not saved. Try again.")
        return
      }
      setMarks(body.marks)
    } catch {
      setError("Not saved. Check your connection and try again.")
    }
  }, [])
  return { marks, error, mark }
}
