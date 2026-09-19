"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"

/**
 * A TEXT BOX YOU CAN ACTUALLY TYPE IN.
 *
 * WHAT WAS WRONG, in plain language: three boxes in the app let you rename a
 * training day, and in none of them could you type "Upper Body". Press space
 * after "Upper" and the space vanishes as you type it.
 *
 * WHY. Each box was controlled by the stored name and pushed every keystroke
 * straight through a function that trims — `renameDay`, `renameSplitDay`. Trim
 * on every keystroke means a trailing space never survives a render, so the
 * second word can never be started. Worse, clearing the box to retype the name
 * hit the `|| day.label` guard and snapped the old name straight back.
 *
 * THE RULE THIS INSTALLS: trimming is a COMMIT rule, not a typing rule. While
 * the box has focus it holds what you typed, exactly. On blur or Enter it
 * commits the trimmed text — once — and only if it is different and not empty.
 * Empty means "I changed my mind", so the old name comes back and nothing is
 * committed.
 *
 * The pattern is lifted from `StepMinutes` in `RoutineCard.tsx`, which had
 * already solved the same problem for a number and was the only box in the
 * app that behaved.
 */
export function DraftInput({
  value,
  onCommit,
  ...inputProps
}: Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "onBlur" | "onKeyDown"> & {
  value: string
  /** Called with the trimmed text, only when it is non-empty and changed. */
  onCommit: (value: string) => void
}) {
  const [draft, setDraft] = React.useState(value)
  const [editing, setEditing] = React.useState(false)
  /**
   * Enter and Escape both blur the box on purpose, and blurring fires onBlur —
   * so without this Enter committed twice and Escape committed the very text it
   * was abandoning. A ref, not state, because the blur happens in the same tick
   * and would not see a state change.
   */
  const handled = React.useRef(false)

  // Somebody else's change wins while the box is not being typed in — an undo,
  // a preset, a reload. Mirrors StepMinutes, deliberately: rendering from the
  // prop instead would throw away what is half-typed.
  if (!editing && draft !== value) setDraft(value)

  function commit() {
    if (handled.current) {
      handled.current = false
      return
    }
    setEditing(false)
    const next = draft.trim()
    if (next === "") {
      // An emptied box is not a rename to nothing. Put the old name back and
      // tell nobody.
      setDraft(value)
      return
    }
    setDraft(next)
    if (next !== value) onCommit(next)
  }

  return (
    <Input
      {...inputProps}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={() => setEditing(true)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault()
          commit()
          handled.current = true
          e.currentTarget.blur()
        }
        if (e.key === "Escape") {
          setDraft(value)
          setEditing(false)
          handled.current = true
          e.currentTarget.blur()
        }
      }}
    />
  )
}
