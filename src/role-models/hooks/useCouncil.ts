"use client"

import { useCallback, useEffect, useState } from "react"

import type { CouncilMember, CouncilPersonDetails } from "../councilTypes"

export const COUNCIL_API = "/api/role-models/council"

type People = Record<string, CouncilPersonDetails>
type State = { status: "loading" } | { status: "failed" } | { status: "ready"; members: CouncilMember[]; people: People }

/**
 * The signed-in person's council, read once on mount and replaced by each
 * write's answer (the route always answers with the whole council).
 */
export function useCouncil() {
  const [state, setState] = useState<State>({ status: "loading" })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let live = true
    fetch(COUNCIL_API, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("read failed")
        const body = (await res.json()) as { members: CouncilMember[]; people: People }
        if (live) setState({ status: "ready", members: body.members, people: body.people ?? {} })
      })
      .catch(() => live && setState({ status: "failed" }))
    return () => {
      live = false
    }
  }, [])

  const send = useCallback(async (init: RequestInit, url = COUNCIL_API): Promise<boolean> => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(url, { ...init, headers: { "content-type": "application/json" } })
      const body = (await res.json().catch(() => ({}))) as { members?: CouncilMember[]; people?: People; error?: string }
      if (!res.ok || !body.members) {
        setError(body.error ?? "Not saved. Try again.")
        return false
      }
      setState({ status: "ready", members: body.members, people: body.people ?? {} })
      return true
    } catch {
      setError("Not saved. Check your connection and try again.")
      return false
    } finally {
      setBusy(false)
    }
  }, [])

  const save = useCallback(
    (roleModelId: string, takenValues: string[]) => send({ method: "PUT", body: JSON.stringify({ roleModelId, takenValues }) }),
    [send],
  )
  const remove = useCallback(
    (roleModelId: string) => send({ method: "DELETE" }, `${COUNCIL_API}?id=${encodeURIComponent(roleModelId)}`),
    [send],
  )
  const reorder = useCallback((order: string[]) => send({ method: "PUT", body: JSON.stringify({ order }) }), [send])

  return { state, error, busy, save, remove, reorder }
}
