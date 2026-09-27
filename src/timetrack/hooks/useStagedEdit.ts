"use client"

/**
 * An edit held in component state that must still reach the record when the
 * field goes away.
 *
 * `useDebouncedCommit` next door does this for text: it waits for a pause, and
 * flushes on unmount so a sheet closed mid-word does not lose the word. The
 * times in the entry detail sheet had no such thing — they committed in
 * `onBlur` only, and React does not fire blur on unmount. Type a new end time,
 * press Escape, and the edit was gone with no warning, while the description
 * beside it survived the identical gesture. One sheet, two rules, and the field
 * that mattered had the worse one.
 *
 * NO TIMER HERE, ON PURPOSE. A `datetime-local` input reads `""` while a
 * segment is half-typed, and an empty stop means "this entry is running" to
 * everything downstream — so a debounce would fire in the middle of typing and
 * turn a finished entry into a running timer. This commits on blur and on the
 * way out, and at no other moment.
 */

import { useEffect, useRef } from "react"

export function useStagedEdit(commit: () => void): { flush: () => void } {
  const latest = useRef(commit)
  latest.current = commit

  // the unmount case is the one that used to lose the edit
  useEffect(() => () => latest.current(), [])

  return { flush: () => latest.current() }
}
