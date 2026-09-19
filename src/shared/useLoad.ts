"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/**
 * THREE STATES, NEVER TWO.
 *
 * WHY THIS EXISTS. There was no shared way to load data, so components each
 * wrote their own, and each decided separately what to do when the request
 * failed. Most decided the same wrong thing:
 *
 *     .then((r) => (r.ok ? r.json() : []))
 *
 * That line is from `LiftHistory`, and it is the whole bug in one expression: a
 * 500 from the server becomes an empty list, and an empty list renders as "you
 * have no lifts" to somebody with three years of them. A sweep on 2026-09-08
 * found 59 places in this app where a failed computation reaches a person as a
 * plausible value; 39 were this idiom.
 *
 * The reason it keeps happening is economic, not careless. Leaving a state
 * variable at `[]` costs nothing to type. Telling the truth costs a design
 * decision — what does this screen say when it does not know? — every single
 * time. So the fix is not vigilance, it is making the honest path the cheap one.
 *
 * `loading` and `ready` are not enough, because "loaded, and it is empty" and
 * "could not find out" are different facts that look identical once both are
 * `[]`. `failed` carries a `retry`, because a screen that admits it failed and
 * offers nothing to do about it is only half honest.
 *
 * WHAT COUNTS AS A FAILURE HERE. All three of these, which hand-written loaders
 * routinely treat as success:
 *   - a response that is not ok (the `r.ok ? … : []` case above),
 *   - the request throwing (offline, aborted, DNS),
 *   - `parse` throwing, because a body in a shape the caller cannot read is not
 *     data the caller can show.
 *
 * `tests/unit/architecture.test.ts` names this module as the loader a new screen
 * must go through. That comment described something that did not exist until
 * this file; it is now true.
 */
/**
 * `reload` is on EVERY state, not just `failed`.
 *
 * A screen that has already loaded sometimes needs to ask again — after it
 * changed something the answer depends on. The Tracking card is the case that
 * added it: when a Start is refused, the honest response is not to guess at
 * the refusal's wording but to re-read and let the facts say what happened.
 *
 * `retry` stays on `failed` as its own name, because "try that again" is what
 * the button under a failure says and reads better at the call site.
 */
export type Load<T> =
  | { state: "loading"; reload: () => void }
  | { state: "ready"; data: T; reload: () => void }
  | { state: "failed"; retry: () => void; reload: () => void }

export function useLoad<T>(url: string, parse: (body: unknown) => T): Load<T> {
  const [result, setResult] = useState<Omit<Load<T>, "reload">>({ state: "loading" } as Omit<Load<T>, "reload">)

  /**
   * `parse` is almost always an inline arrow, so it is a new function on every
   * render. Putting it in the effect's dependencies would refetch forever. The
   * ref keeps the latest one without making identity a trigger.
   */
  const parseRef = useRef(parse)
  parseRef.current = parse

  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => {
    setResult({ state: "loading" })
    setAttempt((n) => n + 1)
  }, [])

  useEffect(() => {
    /**
     * A reply that arrives after the component is gone, or after the URL
     * changed, must not be written. Without this, switching quickly between two
     * subjects can leave the first one's answer on screen under the second
     * one's heading.
     */
    let alive = true

    const fail = () => {
      if (alive) setResult({ state: "failed", retry } as Omit<Load<T>, "reload">)
    }

    fetch(url)
      .then((response) => {
        // Not ok is a failure. This is the line every hand-written loader got
        // wrong, so it is the one line this module exists to own.
        if (!response.ok) throw new Error(`${url} answered ${response.status}`)
        return response.json()
      })
      .then((body: unknown) => {
        if (!alive) return
        // parse() throwing lands in the catch below, which is what we want: a
        // body we cannot read is not data.
        setResult({ state: "ready", data: parseRef.current(body) } as Omit<Load<T>, "reload">)
      })
      .catch(fail)

    return () => {
      alive = false
    }
  }, [url, attempt, retry])

  // `reload` on every state, so a screen that has already loaded can ask again.
  return { ...result, reload: retry } as Load<T>
}
