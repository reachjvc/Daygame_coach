"use client"

/**
 * THE ONE THING, WRITTEN TO THE ACCOUNT.
 *
 * The box you type in is a draft and lives in the browser, as it always has.
 * Pressing save writes a row to `life_answers`, and from then on **the database
 * is what everything shows** — this step, and the header on the tracking page.
 * Nothing keeps a copy, which is why the header cannot go stale.
 *
 * Saving the same words again does nothing. Saving different words adds a new
 * one and keeps the old, with the day you wrote it, in the history below.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, Check, Clock, Trash2 } from "lucide-react"
import { SentenceBox } from "./SentenceBox"
import { FOCUS_COPY } from "@/src/goals/data/northStar"
import { DEFAULT_HORIZON_DAYS } from "@/src/goals/oneThingService"

interface OneThingView {
  id: string
  body: string
  answeredAt: string
  dueOn: string
  daysLeft: number
  lapsed: boolean
}

const dayLabel = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })

/** The default deadline, worked out in the browser for the date input's initial value. */
function defaultDue(): string {
  const d = new Date()
  d.setDate(d.getDate() + DEFAULT_HORIZON_DAYS)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function OneThingBox({ draft, onDraft }: { draft: string; onDraft: (text: string) => void }) {
  const [current, setCurrent] = useState<OneThingView | null>(null)
  const [past, setPast] = useState<OneThingView[]>([])
  const [loaded, setLoaded] = useState(false)
  const [signedOut, setSignedOut] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dueOn, setDueOn] = useState(defaultDue)
  const [showPast, setShowPast] = useState(false)

  /* Read inside `load` without making it re-run on every keystroke. */
  const draftRef = useRef(draft)
  draftRef.current = draft

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/life-answers?key=one_thing")
      if (res.status === 401) {
        setSignedOut(true)
        setLoaded(true)
        return
      }
      if (!res.ok) throw new Error("Could not read your one thing")
      const data = await res.json()
      setCurrent(data.current ?? null)
      setPast(data.past ?? [])
      if (data.current?.dueOn) setDueOn(data.current.dueOn)
      // Seed the box from the account when this browser has nothing of its own,
      // which is the new-phone case this whole change exists for.
      if (data.current?.body && !draftRef.current.trim()) onDraft(data.current.body)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read your one thing")
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  /**
   * THE DRAFT IS THE ONLY EDITING SURFACE, and it lives in the plan.
   *
   * It was local component state for a while, and that state was destroyed
   * between mousedown and click: pressing save blurs the textarea, the blur
   * updates the plan, the plan re-render remounts this component, and the click
   * then ran against a fresh instance that thought nothing had changed. Typing
   * and pressing save did nothing at all, silently — found by the e2e walk.
   *
   * The plan survives that remount, so the draft goes there and nowhere else.
   */
  const text = draft
  const dirty = text.trim().length > 0 && text.trim() !== (current?.body ?? "").trim()

  const save = async () => {
    if (saving || !dirty) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/life-answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "one_thing", body: text, dueOn }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "That did not save")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not save")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    setError(null)
    try {
      const res = await fetch(`/api/life-answers?id=${encodeURIComponent(id)}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Could not delete that")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete that")
    }
  }

  return (
    <div className="mt-3 space-y-3">
      <SentenceBox
        value={text}
        onChange={onDraft}
        placeholder={FOCUS_COPY.onePlaceholder}
        label={FOCUS_COPY.oneWrite}
        rows={3}
      />

      {/* WHEN IT RUNS UNTIL, beside the sentence rather than hidden in a
          setting: "Quit weed for 100 days" carries its own deadline, and the
          countdown on the tracking page is read off this. */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-[11px] text-zinc-400 inline-flex items-center gap-2">
          Runs until
          <input
            type="date"
            value={dueOn}
            onChange={(e) => setDueOn(e.target.value)}
            className="bg-transparent border border-white/15 rounded-lg px-2 py-1 text-[12px] text-zinc-200 focus:outline-none focus:border-white/35"
          />
        </label>
        <button
          // A bare <button> is type="submit". Inside any ancestor <form> that
          // reloads the page instead of saving: no request, no error, and the
          // component remounts looking untouched. Found by an e2e test that
          // clicked save and saw no POST at all.
          type="button"
          onClick={save}
          data-testid="one-thing-save"
          disabled={!dirty || saving || signedOut}
          className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-100 hover:bg-violet-500/30 disabled:opacity-30 transition-colors"
        >
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
          {current ? "Save as my new one thing" : "Save this to my account"}
        </button>
      </div>

      {signedOut && (
        <p className="text-[11px] text-amber-200/80">
          Sign in and this saves to your account, where the tracking page can read it.
        </p>
      )}
      {error && <p className="text-[11px] text-rose-300">{error}</p>}

      {loaded && current && (
        <p className="text-[11px] text-zinc-500 inline-flex items-center gap-1.5">
          <Clock className="size-3" />
          {current.lapsed
            ? `Ran out ${dayLabel(current.dueOn)} — write a new one when you are ready`
            : `${current.daysLeft} ${current.daysLeft === 1 ? "day" : "days"} left, until ${dayLabel(current.dueOn)}`}
        </p>
      )}

      {past.length > 0 && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowPast((v) => !v)}
            className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {showPast ? "Hide" : `The ${past.length} before this`}
          </button>
          {showPast && (
            <ul className="mt-2 space-y-1.5">
              {past.map((p) => (
                <li key={p.id} className="flex items-start gap-2 text-[11.5px] text-zinc-400">
                  <span className="flex-1">
                    {p.body}
                    <span className="block text-[10px] text-zinc-600">until {dayLabel(p.dueOn)}</span>
                  </span>
                  {/* Yours to drop: the history is kept for your benefit, not
                      as a record you are stuck with. */}
                  <button
                    type="button"
                    onClick={() => remove(p.id)}
                    aria-label={`Delete "${p.body.slice(0, 40)}"`}
                    className="shrink-0 text-zinc-600 hover:text-rose-300 transition-colors"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
