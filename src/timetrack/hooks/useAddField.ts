"use client"

/**
 * A "type a name, press Add" field where the button tells the truth and Enter works.
 *
 * Six of these in the slice, all written the same way, all wrong the same way: the
 * button was always enabled and its handler opened with `if (!value.trim()) return`.
 * So a full-width primary button sat there looking ready and did nothing at all when
 * pressed with the box empty — which on screen is indistinguishable from a broken
 * button, and three of the six were reported as exactly that. None of them handled
 * Enter either, though several `autoFocus` the box, so the natural way to finish
 * typing a name was the one gesture with no effect.
 *
 * Both halves of the rule live here rather than at the call sites, because the call
 * sites are how six copies of it came to disagree. `aButtonSaysWhetherItWillWork` in
 * the architecture tests fails on the next one written the old way.
 *
 * `onSubmit` may return `false` to KEEP the text — for a value the submit itself
 * rejects, like a malformed webhook URL, where clearing the box throws away the thing
 * the person now has to correct.
 */

import { useState } from "react"
import type { ChangeEvent, KeyboardEvent } from "react"

export interface AddField {
  value: string
  /** True when a submit would do something — the button's enabled state. */
  ready: boolean
  submit: () => void
  clear: () => void
  inputProps: {
    value: string
    onChange: (event: ChangeEvent<HTMLInputElement>) => void
    onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  }
  buttonProps: { disabled: boolean; onClick: () => void }
}

export function useAddField(onSubmit: (trimmed: string) => boolean | void): AddField {
  const [value, setValue] = useState("")
  const ready = value.trim().length > 0

  const submit = () => {
    if (!ready) return
    if (onSubmit(value.trim()) === false) return
    setValue("")
  }

  return {
    value,
    ready,
    submit,
    clear: () => setValue(""),
    inputProps: {
      value,
      onChange: (event) => setValue(event.target.value),
      onKeyDown: (event) => {
        if (event.key !== "Enter") return
        event.preventDefault()
        submit()
      },
    },
    buttonProps: { disabled: !ready, onClick: submit },
  }
}
