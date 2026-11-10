"use client"

import { useState } from "react"

import { COUNCIL_MAX } from "../councilTypes"
import { useCouncil } from "../hooks/useCouncil"

/**
 * "Add to my council" on a profile (Plans/role-models.md, Phase 7). Opens a
 * small sheet: tick which of his values you take (at least one), save. Once he
 * is in your council it shows what you take from him, with Change and Remove.
 */
export function CouncilButton({ id, name, values, pronoun }: { id: string; name: string; values: string[]; pronoun?: "he" | "she" }) {
  const { state, error, busy, save, remove } = useCouncil()
  const [open, setOpen] = useState(false)
  const [ticked, setTicked] = useState<string[]>([])
  const his = pronoun === "she" ? "her" : "his"

  if (state.status === "loading") return <div className="h-10" aria-hidden="true" />
  if (state.status === "failed") return <p className="text-sm text-muted-foreground">Your council could not be loaded. Reload to try again.</p>

  const member = state.members.find((m) => m.roleModelId === id)
  const full = !member && state.members.length >= COUNCIL_MAX

  const start = () => {
    setTicked(member ? member.takenValues : [])
    setOpen(true)
  }
  const toggle = (v: string) => setTicked((t) => (t.includes(v) ? t.filter((x) => x !== v) : [...t, v]))
  const submit = async () => {
    if (await save(id, ticked)) setOpen(false)
  }

  return (
    <section className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4" data-testid="council-box">
      {member && !open && (
        <>
          <p className="text-sm text-foreground" data-testid="council-member-note">
            In your council. You take: <span className="font-medium">{member.takenValues.join(", ")}</span>
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={start} disabled={busy} className="min-h-10 rounded-lg border border-border px-3 text-sm">
              Change
            </button>
            <button
              type="button"
              onClick={() => void remove(id)}
              disabled={busy}
              className="min-h-10 rounded-lg border border-border px-3 text-sm"
              data-testid="council-remove"
            >
              Remove from my council
            </button>
          </div>
        </>
      )}
      {!member && !open && (
        <button
          type="button"
          onClick={start}
          disabled={busy || full}
          className="min-h-11 self-start rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
          data-testid="council-add"
        >
          Add to my council
        </button>
      )}
      {full && !open && (
        <p className="text-sm text-muted-foreground" data-testid="council-full">
          Your council has five people. Remove one before you add another.
        </p>
      )}
      {open && (
        <div className="flex flex-col gap-3" role="group" aria-label={`Values you take from ${name}`} data-testid="council-sheet">
          <p className="text-sm text-foreground">Which of {his} values do you take from {name}? At least one.</p>
          <div className="flex flex-wrap gap-2">
            {values.map((v) => (
              <label key={v} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-border px-3 text-sm">
                <input type="checkbox" checked={ticked.includes(v)} onChange={() => toggle(v)} />
                {v}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy || ticked.length === 0}
              className="min-h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
              data-testid="council-save"
            >
              {busy ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => setOpen(false)} disabled={busy} className="min-h-10 rounded-lg border border-border px-3 text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-400" data-testid="council-error">
          {error}
        </p>
      )}
    </section>
  )
}
