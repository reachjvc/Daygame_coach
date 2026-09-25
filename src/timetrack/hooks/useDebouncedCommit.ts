"use client"

/**
 * A text edit that reaches the stored record shortly after you stop typing —
 * and always before the field goes away.
 *
 * Every keystroke cannot be a commit: one `updateEntry` clones the whole
 * workspace, writes it to localStorage, posts it to the other tabs and queues a
 * sync diff. A word typed into a description would do that a dozen times.
 *
 * But a debounce alone trades one silent loss for another: the timer is still
 * pending when the field unmounts, and the edit is gone. That is exactly how
 * the entry detail sheet used to lose a description — you closed the sheet and
 * what you had typed went with it. So `flush` runs on unmount too, and callers
 * also call it on blur, which is what a thumb does on the way to any button.
 *
 * The commit is kept in a ref, so a caller may pass an inline closure without
 * restarting the timer on every render.
 */

import { useCallback, useEffect, useRef } from "react"

export const COMMIT_DELAY_MS = 400

export function useDebouncedCommit<T>(
  commit: (value: T) => void,
  delayMs: number = COMMIT_DELAY_MS,
): { schedule: (value: T) => void; flush: () => void; cancel: () => void } {
  const commitRef = useRef(commit)
  commitRef.current = commit

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // a box rather than the bare value: `null` has to mean "nothing pending",
  // and an empty string is a real edit somebody made on purpose
  const pending = useRef<{ value: T } | null>(null)

  const clear = useCallback(() => {
    if (timer.current === null) return
    clearTimeout(timer.current)
    timer.current = null
  }, [])

  const flush = useCallback(() => {
    clear()
    const held = pending.current
    if (!held) return
    pending.current = null
    commitRef.current(held.value)
  }, [clear])

  const cancel = useCallback(() => {
    clear()
    pending.current = null
  }, [clear])

  const schedule = useCallback(
    (value: T) => {
      pending.current = { value }
      clear()
      timer.current = setTimeout(flush, delayMs)
    },
    [clear, delayMs, flush],
  )

  // The unmount case is the one that used to lose work; see the note above.
  useEffect(() => () => flush(), [flush])

  return { schedule, flush, cancel }
}
