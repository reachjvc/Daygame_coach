"use client"

/**
 * The training weeks you have saved.
 *
 * WHAT THIS FIXES. A week you built here existed only while the page was open.
 * Close the tab before pressing "Start tracking this" and it was gone, and it
 * could never follow you to another device — the design lived in this browser's
 * local storage and nowhere else. Meanwhile "saved workouts" on the health
 * screen were a different thing entirely that could not be started as a program.
 * There is one saved week now, it lives on your account, and it can be loaded
 * back into the builder or started from the training screen.
 *
 * SAVING AND STARTING ARE DIFFERENT ACTS. A week with a day you have not filled
 * in yet is a perfectly good thing to save and come back to; it is not a
 * program, and starting it is refused by name until the day has a lift in it.
 *
 * It is deliberately a sibling of the builder rather than part of it: the
 * builder is already long, and nothing here needs to know how a day is edited.
 */

import { useCallback, useEffect, useState } from "react"
import { Loader2, Save, Trash2, Upload } from "lucide-react"
import { numericWeights } from "../builder"
import type { ProgramSchedule, UnitSystem } from "../types"

/** The parts of a draft this screen shows or sends back. */
interface Draft {
  id: string
  name: string
  unitSystem: UnitSystem
  schedule: ProgramSchedule
  workingWeights: Record<string, number>
  updatedAt: string
}

interface Props {
  schedule: ProgramSchedule
  unit: UnitSystem
  /** The builder holds weights as typed text; a draft holds them as numbers. */
  weights: Record<string, string>
  onLoad: (draft: {
    schedule: ProgramSchedule
    unit: UnitSystem
    weights: Record<string, string>
    /** Which saved week this is, so Save updates it rather than making another. */
    draftId: string
    name: string
  }) => void
  /** The week currently loaded into the builder, if one was loaded. */
  loadedId?: string | null
  loadedName?: string
}

const dayCount = (s: ProgramSchedule): number => ("days" in s ? s.days.length : 0)
const liftCount = (s: ProgramSchedule): number =>
  "days" in s ? s.days.reduce((n, d) => n + d.exercises.length, 0) : 0

export function SavedWeeks({ schedule, unit, weights, onLoad, loadedId = null, loadedName = "" }: Props) {
  const [drafts, setDrafts] = useState<Draft[]>([])
  /**
   * Three states, not two. `failed` is NOT an empty list — telling somebody
   * they have no saved weeks when the request simply did not arrive is a claim
   * about them, and a false one.
   */
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading")
  const [name, setName] = useState("")

  /**
   * The name box follows the week that was loaded.
   *
   * Loading a week replaced the design and left the box empty, so Save was
   * disabled on a week you had just opened — and typing the name back in by
   * hand was the only way to save an edit to it.
   */
  useEffect(() => {
    if (loadedName) setName(loadedName)
  }, [loadedName])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/programs/drafts")
      if (!res.ok) throw new Error(String(res.status))
      const body = (await res.json()) as unknown
      if (!Array.isArray(body)) throw new Error("unexpected shape")
      setDrafts(body as Draft[])
      setState("ready")
    } catch {
      // The list is left exactly as it was. See the comment on `state`.
      setState("failed")
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  /** The week on screen, next to the one it was loaded from. */
  const loaded = loadedId ? drafts.find((d) => d.id === loadedId) : undefined
  const changedSinceLoad =
    !!loaded &&
    (JSON.stringify(loaded.schedule) !== JSON.stringify(schedule) ||
      loaded.unitSystem !== unit ||
      JSON.stringify(loaded.workingWeights ?? {}) !== JSON.stringify(numericWeights(weights)))

  const days = dayCount(schedule)
  const lifts = liftCount(schedule)
  const canSave = name.trim().length > 0 && days > 0

  async function save({ asNew = false }: { asNew?: boolean } = {}) {
    setBusy(true)
    setError(null)
    setSaved(null)
    try {
      /**
       * WHICH WEEK THIS SAVE GOES TO — the one that was loaded, by id.
       *
       * It used to match on the TYPED NAME. Load "Monday Push", edit it,
       * correct the name to "Monday push" and Save made a second week under
       * the near-duplicate rather than updating the one on screen — and there
       * was no way to tell which of the two the builder was showing.
       */
      const existing = asNew ? undefined : loadedId ? drafts.find((d) => d.id === loadedId) : undefined
      const body = JSON.stringify({
        name: name.trim(),
        schedule,
        unitSystem: unit,
        workingWeights: numericWeights(weights),
      })
      // Saving under a name you already used updates that week rather than
      // refusing you or quietly making a second one called the same thing.
      const res = existing
        ? await fetch(`/api/programs/drafts/${existing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body,
          })
        : await fetch("/api/programs/drafts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
          })
      if (!res.ok) {
        const problem = (await res.json().catch(() => null)) as { error?: string } | null
        setError(problem?.error ?? "That week could not be saved.")
        return
      }
      setSaved(existing ? `Updated "${name.trim()}".` : `Saved as "${name.trim()}".`)
      await load()
    } catch {
      setError("Could not reach the server, so nothing was saved.")
    } finally {
      setBusy(false)
    }
  }

  async function remove(draft: Draft) {
    if (!window.confirm(`Delete the saved week "${draft.name}"? This does not touch anything you have already logged.`)) return
    setError(null)
    try {
      const res = await fetch(`/api/programs/drafts/${draft.id}`, { method: "DELETE" })
      if (!res.ok) {
        setError("That week could not be deleted.")
        return
      }
      await load()
    } catch {
      setError("Could not reach the server, so nothing was deleted.")
    }
  }

  return (
    <div className="space-y-2.5 rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[12.5px] font-medium text-zinc-200">Your saved weeks</h3>
        <span className="text-[11px] text-zinc-500">
          Kept on your account, so they follow you to another device.
        </span>
      </div>

      {state === "failed" && (
        <div
          data-testid="saved-weeks-error"
          role="alert"
          className="flex items-center justify-between gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-[11.5px] text-amber-300"
        >
          <span>Your saved weeks could not be loaded, so this list may be incomplete.</span>
          <button
            type="button"
            onClick={() => void load()}
            className="shrink-0 rounded-md border border-amber-500/40 px-2 py-0.5 transition-colors hover:bg-amber-500/15"
          >
            Try again
          </button>
        </div>
      )}

      {state === "ready" && drafts.length === 0 && (
        <p className="text-[11.5px] text-zinc-500">
          Nothing saved yet. Build a week below and give it a name.
        </p>
      )}

      {drafts.length > 0 && (
        <ul className="space-y-1" data-testid="saved-weeks-list">
          {drafts.map((d) => (
            <li key={d.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  onLoad({
                    schedule: d.schedule,
                    unit: d.unitSystem,
                    // Back to typed text, which is what the builder edits.
                    weights: Object.fromEntries(
                      Object.entries(d.workingWeights ?? {}).map(([k, v]) => [k, String(v)])
                    ),
                    draftId: d.id,
                    name: d.name,
                  })
                }
                className="flex flex-1 items-center justify-between gap-2 rounded-md border border-white/10 px-2.5 py-1.5 text-left text-[12px] text-zinc-200 transition-colors hover:bg-white/5"
                title={`Load "${d.name}" into the builder`}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <Upload className="size-3 shrink-0 opacity-60" />
                  <span className="truncate">{d.name}</span>
                </span>
                <span className="shrink-0 text-[11px] text-zinc-500">
                  {dayCount(d.schedule)} {dayCount(d.schedule) === 1 ? "day" : "days"} ·{" "}
                  {liftCount(d.schedule)} {liftCount(d.schedule) === 1 ? "lift" : "lifts"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => void remove(d)}
                aria-label={`Delete ${d.name}`}
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-300"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-2.5">
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setSaved(null)
          }}
          placeholder="Name this week"
          aria-label="Name for the week you are saving"
          maxLength={60}
          className="h-8 min-w-0 flex-1 rounded-md border border-white/10 bg-transparent px-2 text-[12px] text-zinc-200 placeholder:text-zinc-500"
        />
        <button
          type="button"
          onClick={() => void save()}
          disabled={!canSave || busy}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-sky-400/40 bg-sky-500/10 px-2.5 text-[12px] text-sky-200 transition-colors hover:bg-sky-500/20 disabled:opacity-40"
        >
          {busy ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
          {loaded ? "Save this week" : "Save this week"}
        </button>
        {/* OFFERED ONLY WHILE SOMETHING IS LOADED, because that is the only
            time "new" and "the one I opened" are two different things. */}
        {loaded && (
          <button
            type="button"
            onClick={() => void save({ asNew: true })}
            disabled={!canSave || busy}
            className="inline-flex h-8 shrink-0 items-center rounded-md border border-white/10 px-2.5 text-[12px] text-zinc-400 transition-colors hover:bg-white/5 disabled:opacity-40"
          >
            Save as new
          </button>
        )}
      </div>

      {/* WHICH WEEK YOU ARE EDITING. Without it, the builder showed a week with
          nothing saying where it came from or whether the edits were safe. */}
      {loaded && (
        <p className="text-[11px] text-zinc-500" data-testid="saved-weeks-editing">
          Editing &ldquo;{loaded.name}&rdquo;{changedSinceLoad ? " · unsaved changes" : ""}
        </p>
      )}

      {/* Saving is allowed on a half-built week on purpose; starting is not. */}
      {days > 0 && lifts === 0 && (
        <p className="text-[11px] text-zinc-500">
          You can save this and come back to it. It cannot be started until a day has a lift in it.
        </p>
      )}
      {error && <p className="text-[11.5px] text-red-400">{error}</p>}
      {saved && <p className="text-[11.5px] text-emerald-400">{saved}</p>}
    </div>
  )
}
