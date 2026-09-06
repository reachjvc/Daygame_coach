"use client"

import { useState, useEffect, useCallback, useSyncExternalStore } from "react"
import type { EnrollmentDetail, ProgramEnrollment } from "../types"

/**
 * ONE REQUEST FOR THE ENROLLMENT LIST, however many components want it.
 *
 * `/programs` asked `/api/programs/enrollments` THREE times on every load: the
 * page (to choose which tab to open on), `ProgramsApp` (to decide what to
 * render), and `RunningPrograms` (to name what is running). Three round trips
 * for one answer, each with its own loading flash, and each arriving at a
 * slightly different moment so the page assembled itself in visible stages.
 *
 * A tiny module-level store fixes it without restructuring the tree into
 * providers: the first caller starts the request, later callers within the same
 * render join the one already in flight, and `refresh()` from any of them
 * updates all of them. That last part matters as much as the request count —
 * before this, ending a program refreshed the component you clicked in and left
 * the other two showing a program that no longer existed.
 *
 * Deliberately not a cache with a lifetime. It holds the answer for as long as
 * something is mounted and asks again on the next mount, which is the behaviour
 * every caller already assumed.
 */
type Listener = () => void

const store: {
  data: ProgramEnrollment[]
  loading: boolean
  inFlight: Promise<void> | null
  listeners: Set<Listener>
} = { data: [], loading: true, inFlight: null, listeners: new Set() }

function emit() {
  for (const l of store.listeners) l()
}

/** The value `useSyncExternalStore` compares — stable unless something changed. */
let snapshot: { enrollments: ProgramEnrollment[]; loading: boolean } = {
  enrollments: store.data,
  loading: store.loading,
}
function getSnapshot() {
  if (snapshot.enrollments !== store.data || snapshot.loading !== store.loading) {
    snapshot = { enrollments: store.data, loading: store.loading }
  }
  return snapshot
}
/** The server renders nothing user-specific here; the fetch is a client effect. */
const SERVER_SNAPSHOT: { enrollments: ProgramEnrollment[]; loading: boolean } = {
  enrollments: [],
  loading: true,
}

async function load(force: boolean): Promise<void> {
  // Join the request already in flight rather than starting a second one. This
  // is the whole point: three components mounting together make one call.
  if (store.inFlight && !force) return store.inFlight
  // Already answered — by an earlier caller or by the server seed. A second
  // component mounting is not a reason to ask again, and neither is React's
  // development double-invoke of effects.
  if (!force && !store.loading) return
  store.loading = true
  emit()
  store.inFlight = (async () => {
    try {
      const res = await fetch("/api/programs/enrollments")
      const data = res.ok ? await res.json().catch(() => []) : []
      store.data = Array.isArray(data) ? data : []
    } catch {
      store.data = []
    } finally {
      store.loading = false
      store.inFlight = null
      emit()
    }
  })()
  return store.inFlight
}

function subscribe(listener: Listener) {
  store.listeners.add(listener)
  return () => {
    store.listeners.delete(listener)
  }
}

/** Active enrollments for the current user. Shared across every caller. */
export function useActiveEnrollments(initial?: ProgramEnrollment[]) {
  // Seeded by the server component when there is one, so the first paint has
  // the list already and no request is made at all.
  if (initial && store.loading && store.data.length === 0) {
    store.data = initial
    store.loading = false
  }
  const { enrollments, loading } = useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT)

  useEffect(() => {
    // Nothing to fetch when the server already answered.
    if (initial) return
    void load(false)
  }, [initial])

  // A refresh is always forced: the caller has just changed something.
  const refresh = useCallback(() => load(true), [])

  return { enrollments, loading, refresh }
}

/** One enrollment + today's prescription + log history. */
export function useEnrollment(id: string | null, initial?: EnrollmentDetail | null) {
  const [detail, setDetail] = useState<EnrollmentDetail | null>(initial ?? null)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!id) {
      setDetail(null)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/programs/enrollments/${id}`)
      if (res.ok) setDetail(await res.json().catch(() => null))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    // Ask only when what we are holding is not the enrollment being asked for.
    // Stated as a comparison rather than a one-shot flag on purpose: a flag is
    // consumed by React's development double-invoke and fetches anyway, which
    // is exactly the round trip the server seed exists to remove.
    if (detail && detail.enrollment.id === id) return
    refresh()
    // `detail` is deliberately absent from the dependency list: refetching
    // because the data arrived is the loop this guard exists to prevent. The
    // effect re-runs when the id changes, which is the only time it should.
  }, [refresh, id, detail])

  return { detail, loading, refresh }
}
