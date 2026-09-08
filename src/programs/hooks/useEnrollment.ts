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
  /**
   * The list could not be fetched. NOT the same as having no programs, which is
   * what an empty array means — and what this used to become on every failure,
   * so a dropped request told somebody halfway through StrongLifts that they had
   * no training program and should go and pick one.
   */
  error: string | null
  inFlight: Promise<void> | null
  listeners: Set<Listener>
} = { data: [], loading: true, error: null, inFlight: null, listeners: new Set() }

/** The last server-rendered list this hook seeded from. */
let lastSeeded: ProgramEnrollment[] | null = null

function emit() {
  for (const l of store.listeners) l()
}

/** The value `useSyncExternalStore` compares — stable unless something changed. */
let snapshot: { enrollments: ProgramEnrollment[]; loading: boolean; error: string | null } = {
  enrollments: store.data,
  loading: store.loading,
  error: store.error,
}
function getSnapshot() {
  if (
    snapshot.enrollments !== store.data ||
    snapshot.loading !== store.loading ||
    snapshot.error !== store.error
  ) {
    snapshot = { enrollments: store.data, loading: store.loading, error: store.error }
  }
  return snapshot
}
/** The server renders nothing user-specific here; the fetch is a client effect. */
const SERVER_SNAPSHOT: { enrollments: ProgramEnrollment[]; loading: boolean; error: string | null } = {
  enrollments: [],
  loading: true,
  error: null,
}

async function load(force: boolean): Promise<void> {
  // Join the request already in flight rather than starting a second one. This
  // is the whole point: three components mounting together make one call, and
  // React's development double-invoke of effects joins rather than duplicates.
  if (store.inFlight && !force) return store.inFlight
  /**
   * IT USED TO RETURN HERE ONCE ANYTHING HAD EVER LOADED.
   *
   * "Asks again on the next mount" is what the comment said and not what the
   * code did: after the first answer, every later mount was a no-op. So the
   * exact path this feature exists for — design a week in Life Mastery, press
   * "Start tracking this", tap "Go to today's session" — arrived at a Training
   * page holding the list from BEFORE the program was started, and said "No
   * active program", or offered the one that had just been replaced.
   *
   * A mount is a page the person is looking at now. It asks.
   */
  store.loading = true
  emit()
  store.inFlight = (async () => {
    try {
      const res = await fetch("/api/programs/enrollments")
      if (!res.ok) throw new Error(String(res.status))
      const data = await res.json().catch(() => null)
      if (!Array.isArray(data)) throw new Error("unexpected shape")
      store.data = data
      store.error = null
    } catch {
      /**
       * THE LIST IS LEFT ALONE, and the failure is recorded.
       *
       * Emptying it turned "we could not ask" into "you have no programs" — the
       * screens below then offer the catalogue to somebody who is three weeks
       * into a program. Whatever was last known is better than a false answer,
       * and the error says the screen may be out of date.
       */
      store.error = "Your programs could not be loaded, so this may be out of date."
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
  /**
   * THE SERVER'S LIST ALWAYS WINS.
   *
   * This only seeded the store when it was still empty, so a page that arrived
   * with fresh server data was ignored in favour of whatever a previous screen
   * had cached — which is the other half of the "No active program" bug. The
   * server resolved this list for this request; nothing held here is fresher.
   */
  /**
   * The server's list wins ONCE, not on every render.
   *
   * This compared the store against `initial` each time it ran, so any client
   * refresh was undone on the very next render: end a program, the list
   * refetches without it, React re-renders, and this puts the ended program
   * straight back because the server's props still mention it. Seeding only
   * when the SERVER's answer itself changes keeps the original intent — a fresh
   * page beats a stale cache — without fighting the refresh it triggered.
   */
  if (initial && !sameEnrollments(lastSeeded, initial)) {
    lastSeeded = initial
    store.data = initial
    store.loading = false
    store.error = null
    snapshot = { enrollments: store.data, loading: store.loading, error: store.error }
  }
  const { enrollments, loading, error } = useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT)

  useEffect(() => {
    // Nothing to fetch when the server already answered for THIS page.
    if (initial) return
    void load(false)
  }, [initial])

  // A refresh is always forced: the caller has just changed something.
  const refresh = useCallback(() => load(true), [])

  return { enrollments, loading, error, refresh }
}

/**
 * Re-read the list from the server, from anywhere.
 *
 * Starting, ending and resuming a program all happen on screens that do not own
 * this hook — the Life Mastery templates tab, the builder, the catalogue. They
 * used to change what was running and leave every other reader showing the old
 * answer until something happened to refetch. One exported function so no
 * caller has to reach into the store.
 */
export function refreshEnrollments(): Promise<void> {
  return load(true)
}

/** Same rows in the same order? Compared, not referenced. */
function sameEnrollments(a: ProgramEnrollment[] | null, b: ProgramEnrollment[]): boolean {
  if (!a || a.length !== b.length) return false
  return a.every((e, i) => e.id === b[i].id && e.is_active === b[i].is_active)
}

/** One enrollment + today's prescription + log history. */
export function useEnrollment(id: string | null, initial?: EnrollmentDetail | null) {
  const [detail, setDetail] = useState<EnrollmentDetail | null>(initial ?? null)
  const [loading, setLoading] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!id) {
      setDetail(null)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/programs/enrollments/${id}`)
      if (!res.ok) throw new Error(String(res.status))
      setDetail(await res.json().catch(() => null))
      setError(null)
    } catch {
      /**
       * A failed request used to leave `detail` null with loading back to
       * false, which the screen renders as "Loading session…" for ever — a
       * spinner that will never resolve and never explains itself.
       */
      setError("Today's session could not be loaded.")
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

  return { detail, loading, error, refresh }
}
