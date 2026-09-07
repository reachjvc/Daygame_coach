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
  runningSince,
  type OneThingAct,
} from "@/src/goals/oneThingService"
import type { OneThingAccount } from "./useOneThing"

export function OneThingBox({
  account,
  typed,
  onTyped,
}: {
  account: OneThingAccount
  /**
   * WHAT IS IN THE BOX, and what it started as.
   *
   * `null` means "show me what the account says". The moment somebody types it
   * becomes their text and stops tracking the account, so a reload landing
   * mid-sentence cannot overwrite what they are writing.
   *
   * **It is held by the page, not by this box, and that is not a draft coming
   * back.** A draft was a copy of the answer written to the plan and to
   * localStorage, which other screens then read as though it were the answer.
   * This is unsaved text in React state: nothing persists it, nothing else
   * reads it as your one thing, and it dies on reload — which is what unsaved
   * means. It lives one level up only so that the rest of the step can open on
   * a sentence being typed, and so that leaving the step and coming back does
   * not throw away what you were in the middle of writing.
   */
  typed: string | null
  onTyped: (text: string | null) => void
}) {
  const { current, past, loaded, signedOut, error: readError, reload } = account

  const [dueOn, setDueOn] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPast, setShowPast] = useState(false)
  /* Starting a new one is not undoable from the box — the old one becomes
     history and the clock restarts — so it asks first. */
  const [confirmNew, setConfirmNew] = useState(false)

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
  /* What the picker was SEEDED with, kept apart from what it now holds. Once a
     season has run out `nextDueOn` seeds a fresh horizon, so comparing the box
     against the SAVED deadline reported a date change the person never made —
     see `dateChanged`. */
  const seededDue = nextDueOn(current, defaultDue())
  const due = dueOn ?? seededDue

  /**
   * WHETHER THERE IS ANYTHING TO SAVE — the sentence OR the deadline.
   *
   * This used to compare the words alone, and the save button therefore stayed
   * grey when somebody changed only the date. The deadline looked editable, was
   * not, and said nothing about it. Half of "quit weed for 100 days" is the
   * hundred days; moving it is a change like any other.
   */
  const wordsChanged = text.trim().length > 0 && text.trim() !== (current?.body ?? "").trim()
  /* AGAINST WHAT THE PICKER OPENED ON, never against the saved deadline.
     Comparing with `current.dueOn` made this true the instant a season ran out,
     because the picker had already moved itself to a fresh horizon. The save
     button then read "Save this wording" and posted an EXTENSION: the next
     season opened carrying the old start date and the old why, cost, identity
     and values, and announced itself as "Running since <last season>". That is
     the one outcome the design says a new one thing must not have. */
  const dateChanged = text.trim().length > 0 && !!current && due !== seededDue
  const dirty = wordsChanged || dateChanged
  const dateBroken = !isRealDate(due)

  /* WRITING A NEW SENTENCE ON A SEASON THAT HAS RUN OUT STARTS THE NEXT ONE.
     No confirmation here, unlike the button further down: that one asks because
     it cuts a RUNNING season short. This season is already over — the page is
     asking for the next one — so there is nothing to protect. Keeping the same
     words and only moving the date is still an extension, and still carries the
     start date across, which is what "the tracking from the initial first date"
     asked for. */
  const actForSave: OneThingAct = current?.lapsed && wordsChanged ? "start" : dateChanged ? "extend" : "amend"

  /**
   * WHAT THE SERVER IS TOLD ABOUT THE DEADLINE, and `undefined` meaning "you
   * work it out".
   *
   * The picker OPENS on a date computed from the device's clock. That value
   * must never be what gets saved: `defaultDueOn(timezone)` on the server is
   * computed in the ACCOUNT's timezone, which is the whole reason it exists — a
   * phone a day ahead of its owner's calendar was quietly saving an 89-day
   * season. So only a deadline the person actually touched, or one already
   * committed to and still running, is sent.
   *
   * No default parameter, deliberately: passing `undefined` to a parameter that
   * has one runs the default, which is how "start a new one" came to post the
   * deadline of the season it was replacing.
   */
  const deadlineToSend = dueOn ?? (current && !current.lapsed ? current.dueOn : undefined)

  const save = async (act: OneThingAct, deadline: string | undefined) => {
    if (saving || dateBroken) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/life-answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "one_thing", act, body: text, dueOn: deadline }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "That did not save")
      /* Back to tracking the account: both boxes drop their local value, so
         what is on screen after a save IS what was saved. Leaving the date
         behind is how the picker ended up showing the deadline of the one thing
         it had just replaced. */
      onTyped(null)
      setDueOn(null)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not save")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (chapterId: string) => {
    setError(null)
    try {
      const res = await fetch(`/api/life-answers?chapterId=${encodeURIComponent(chapterId)}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Could not delete that")
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete that")
    }
  }

  const prompt = oneThingPrompt(current)
  const since = runningSince(current)

  return (
    <div className="mt-3 space-y-3">
      <SentenceBox
        value={text}
        onChange={onTyped}
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
        {/* THE BUTTON THAT SAVES WHAT IS IN FRONT OF YOU.
            It amends: a new wording of the same commitment, and NOTHING moves —
            not the day it started, not the deadline, not the countdown. Fixing
            a typo must never restart the clock, which is the whole reason
            chapters exist. Moving a deadline is the button beside it, and
            starting a new one is a separate, deliberate act below. */}
        <button
          // A bare <button> is type="submit". Inside any ancestor <form> that
          // reloads the page instead of saving: no request, no error, and the
          // component remounts looking untouched. Found by an e2e test that
          // clicked save and saw no POST at all.
          type="button"
          /* EXTEND WHENEVER THE DATE MOVED, whether or not the words did too.
             Sending "amend" for both-changed looked reasonable and silently
             threw the new deadline away — an amend has no way to carry one, by
             design — leaving the picker to snap back with no error. That is the
             original bug from the screenshot, wearing a new hat. */
          onClick={() => save(actForSave, deadlineToSend)}
          data-testid="one-thing-save"
          disabled={!dirty || dateBroken || saving || signedOut}
          className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-100 hover:bg-violet-500/30 disabled:opacity-30 transition-colors"
        >
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
          {!current
            ? "Save this to my account"
            : actForSave === "start"
              ? "Start the next one"
              : dateChanged && !wordsChanged
                ? "Move the deadline"
                : "Save this wording"}
        </button>
      </div>

      {/* STARTING A NEW ONE IS A DIFFERENT ACT, so it is a different control and
          it says what it costs. Editing the box above changes how this season is
          worded; this ends the season and begins another, with today as its
          first day and its supports blank. Only offered once there is something
          to replace. */}
      {current && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {confirmNew ? (
            <>
              <span className="text-[11px] text-zinc-400">
                Start a new one? This one is kept, and the clock starts again from today.
              </span>
              <button
                type="button"
                /* A FRESH SEASON GETS A FRESH LENGTH. `due` follows the CURRENT
                   one thing until the picker is touched, so a new one started
                   three days before the old deadline would have begun with a
                   three-day season — under a confirmation promising the clock
                   restarts today. Untouched means "the usual ninety days". */
                /* A fresh season gets a fresh length: only a deadline the
                   person typed is sent, never the one being replaced. */
                onClick={() => { setConfirmNew(false); void save("start", dueOn ?? undefined) }}
                data-testid="one-thing-start-new"
                disabled={!text.trim() || dateBroken || saving || signedOut}
                className="text-[11px] font-medium px-2.5 py-1 rounded-lg border border-amber-400/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20 disabled:opacity-30 transition-colors"
              >
                Yes, this is a new one
              </button>
              <button
                type="button"
                onClick={() => setConfirmNew(false)}
                className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                No, I am editing this one
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmNew(true)}
              data-testid="one-thing-new"
              disabled={signedOut}
              className="text-[11px] text-zinc-500 hover:text-zinc-200 transition-colors"
            >
              This is a different one thing — start a new one
            </button>
          )}
        </div>
      )}

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
          {/* PROOF THAT AMENDING DID NOT RESTART THE CLOCK.
              Shown only once this one has actually been reworded or extended,
              which is exactly the moment somebody would otherwise wonder. */}
          {since && (
            <p className="text-[11px] text-zinc-600" data-testid="one-thing-since">
              {since}
              {current.wordings > 1 && ` · reworded ${current.wordings - 1} ${current.wordings === 2 ? "time" : "times"}`}
            </p>
          )}
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
                <li key={p.chapterId} className="flex items-start gap-2 text-[11.5px] text-zinc-400">
                  <span className="flex-1">
                    {p.body}
                    {/* BOTH DATES, because one of them is the point. A chapter
                        that ran three months reads as three months here even if
                        the sentence was reworded twice inside it. */}
                    <span className="block text-[10px] text-zinc-600">
                      {formatDueDate(p.startedOn)} — {formatDueDate(p.dueOn)}
                      {p.wordings > 1 && ` · ${p.wordings} wordings`}
                      {p.extended && " · deadline moved"}
                    </span>
                  </span>
                  {/* Yours to drop: the history is kept for your benefit, not
                      as a record you are stuck with. */}
                  <button
                    type="button"
                    onClick={() => remove(p.chapterId)}
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
