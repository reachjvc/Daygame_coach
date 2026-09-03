"use client"

/**
 * THE ONE THING, WRITTEN TO THE ACCOUNT.
 *
 * The account is the only place it lives. What you type before pressing save is
 * React state and nothing else: not the plan, not localStorage, not a second
 * row. It does not survive a reload, which is exactly what "not saved yet"
 * should mean, and there is no copy anywhere to disagree with the account.
 *
 * Saving the same sentence on the same deadline does nothing. Changing EITHER —
 * the words or the day it runs until — adds a new one and keeps the old, with
 * the day you wrote it, in the history below.
 */

import { useState } from "react"
import { Loader2, Check, Clock, Trash2, AlertTriangle } from "lucide-react"
import { SentenceBox } from "./SentenceBox"
import { FOCUS_COPY } from "@/src/goals/data/northStar"
import {
  DEFAULT_HORIZON_DAYS,
  formatDueDate,
  isRealDate,
  nextDueOn,
  oneThingCountdown,
  oneThingPrompt,
} from "@/src/goals/oneThingService"
import type { OneThingAccount } from "./useOneThing"

export function OneThingBox({ account }: { account: OneThingAccount }) {
  const { current, past, loaded, signedOut, error: readError, reload } = account

  /**
   * WHAT IS IN THE BOX, and what it started as.
   *
   * `null` means "show me what the account says". The moment somebody types,
   * it becomes their text and stops tracking the account, so a reload landing
   * mid-sentence cannot overwrite what they are writing.
   */
  const [typed, setTyped] = useState<string | null>(null)
  const [dueOn, setDueOn] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPast, setShowPast] = useState(false)

  const text = typed ?? current?.body ?? ""

  /**
   * A LAPSED DEADLINE IS NOT A DEFAULT FOR THE NEXT ONE.
   *
   * The picker follows the saved deadline, which is right until the day it goes
   * past: the prompt then says "write the one thing for the next one", somebody
   * types one, and the form posts a date that has already been — which the
   * server refuses, correctly, and the person is stuck in a loop with a 400 and
   * no idea why. Once it has run out the picker offers a fresh horizon instead.
   * `lapsed` comes from the server and is worked out in the user's own
   * timezone, so this does not re-decide the date question in the browser.
   */
  const due = dueOn ?? nextDueOn(current, defaultDue())

  /**
   * WHETHER THERE IS ANYTHING TO SAVE — the sentence OR the deadline.
   *
   * This used to compare the words alone, and the save button therefore stayed
   * grey when somebody changed only the date. The deadline looked editable, was
   * not, and said nothing about it. Half of "quit weed for 100 days" is the
   * hundred days; moving it is a change like any other.
   */
  const wordsChanged = text.trim().length > 0 && text.trim() !== (current?.body ?? "").trim()
  const dateChanged = text.trim().length > 0 && !!current && due !== current.dueOn
  const dirty = wordsChanged || dateChanged
  const dateBroken = !isRealDate(due)

  const save = async () => {
    if (saving || !dirty || dateBroken) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/life-answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "one_thing", body: text, dueOn: due }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "That did not save")
      /* Back to tracking the account: both boxes drop their local value, so
         what is on screen after a save IS what was saved. Leaving the date
         behind is how the picker ended up showing the deadline of the one thing
         it had just replaced. */
      setTyped(null)
      setDueOn(null)
      await reload()
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
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete that")
    }
  }

  const prompt = oneThingPrompt(current)

  return (
    <div className="mt-3 space-y-3">
      <SentenceBox
        value={text}
        onChange={setTyped}
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
            value={due}
            onChange={(e) => setDueOn(e.target.value)}
            data-testid="one-thing-due"
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
          disabled={!dirty || dateBroken || saving || signedOut}
          className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-100 hover:bg-violet-500/30 disabled:opacity-30 transition-colors"
        >
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
          {/* The button says which of the two changes it is about to make, so
              "save" on an unchanged sentence with a moved date does not read as
              though it were about to rewrite the sentence. */}
          {!current ? "Save this to my account" : wordsChanged ? "Save as my new one thing" : "Move the deadline"}
        </button>
      </div>

      {signedOut && (
        <p className="text-[11px] text-amber-200/80">
          Sign in and this saves to your account, where the tracking page can read it.
        </p>
      )}
      {/* A READ THAT FAILED IS NOT AN EMPTY ANSWER, and must never look like
          one. Without this line a dropped request drew a blank box, no
          countdown and no history — identical to somebody who has never
          written one, over the top of an answer that is still on the account. */}
      {readError && (
        <p className="text-[11px] text-rose-300" data-testid="one-thing-read-error">
          {readError} — this is not your one thing being gone, it is this page
          failing to read it. Reload before writing over it.
        </p>
      )}
      {dateBroken && <p className="text-[11px] text-rose-300">That is not a date on the calendar — pick a day.</p>}
      {error && <p className="text-[11px] text-rose-300" data-testid="one-thing-error">{error}</p>}

      {loaded && current && (
        <div className="space-y-1.5">
          <p className="text-[11px] text-zinc-500 inline-flex items-center gap-1.5" data-testid="one-thing-countdown">
            <Clock className="size-3" />
            {oneThingCountdown(current)}
          </p>
          {/* THE PROMPT, as the deadline comes up. One rule, in the service, so
              this and the tracking header say the same thing on the same day. */}
          {prompt && (
            <p
              className="text-[11px] text-amber-200/90 inline-flex items-center gap-1.5"
              data-testid="one-thing-prompt"
            >
              <AlertTriangle className="size-3" />
              {prompt}
            </p>
          )}
        </div>
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
                    <span className="block text-[10px] text-zinc-600">until {formatDueDate(p.dueOn)}</span>
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

/**
 * The date the picker opens on when there is nothing saved yet.
 *
 * The browser's own day, and deliberately only a starting value for an empty
 * form: the server works the real default out in the ACCOUNT's timezone and
 * refuses a day that has already been, so a device left on the wrong timezone
 * can no longer quietly save a deadline in the past.
 */
function defaultDue(): string {
  const d = new Date()
  d.setDate(d.getDate() + DEFAULT_HORIZON_DAYS)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
