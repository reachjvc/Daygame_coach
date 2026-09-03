"use client"

/**
 * THE ONE THING, FETCHED ONCE FOR THE WHOLE FLOW.
 *
 * Three components used to fetch `/api/life-answers` separately — the step, the
 * echo on the Focus step, and the step-rail's idea of whether anything had been
 * written — and each declared its own hand-written shape for the reply. Three
 * requests for one fact, and three contracts to keep in step by hand.
 *
 * There is now one request, at the top of the flow, and everything below reads
 * what it returned. The shape is `OneThing` from `oneThingService`, the same
 * type the server builds the reply from, so the two cannot drift apart.
 *
 * **Nothing is cached in the plan.** The sentence used to live in
 * `plan.answers` as a "draft" as well as on the account, which meant the rail
 * scored the copy: a saved one thing on a new phone showed in the header and
 * left the step marked as never started. The copy is gone. What you type before
 * pressing save is React state and nothing else — it is not written to the
 * browser, it is not written to the plan, and it does not survive a reload,
 * which is what "unsaved" should mean.
 */

import { useCallback, useEffect, useState } from "react"
import type { OneThing } from "@/src/goals/oneThingService"

export interface OneThingAccount {
  /** The one in force, or null when nothing has ever been written. */
  current: OneThing | null
  /** The ones before it, newest first. */
  past: OneThing[]
  /** False until the first reply has landed. Nothing should be drawn before it. */
  loaded: boolean
  /** True when the request came back 401 — the flow runs signed out too. */
  signedOut: boolean
  /** Set when the read itself failed, as opposed to there being nothing to read. */
  error: string | null
  /** Re-read after a write. */
  reload: () => Promise<void>
}

export function useOneThing(): OneThingAccount {
  const [current, setCurrent] = useState<OneThing | null>(null)
  const [past, setPast] = useState<OneThing[]>([])
  const [loaded, setLoaded] = useState(false)
  const [signedOut, setSignedOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/life-answers?key=one_thing")
      if (res.status === 401) {
        setSignedOut(true)
        setCurrent(null)
        setPast([])
        setError(null)
        return
      }
      if (!res.ok) throw new Error("Could not read your one thing")
      const data = await res.json()
      setSignedOut(false)
      setCurrent(data.current ?? null)
      setPast(data.past ?? [])
      setError(null)
    } catch (e) {
      // Loud, not silent: a read that failed is not the same as nothing saved,
      // and drawing "nothing yet" over somebody's season is the worse lie.
      setError(e instanceof Error ? e.message : "Could not read your one thing")
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { current, past, loaded, signedOut, error, reload }
}
