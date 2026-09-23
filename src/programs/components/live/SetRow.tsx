"use client"

/**
 * One set, during the workout.
 *
 * A FIXED GRID, not a flex row. The old session card put an input, the unit,
 * an "×", another input and a label in a wrapping flex line, so on a phone
 * "kg ×" broke onto its own line under the box it belonged to. A grid cannot
 * do that.
 *
 * The ✓ is the whole feature: tapping it writes the set. Everything else on
 * this row exists to make the number right before you do.
 */

import { useEffect, useState } from "react"
import { Check, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  formatLoad,
  readSetEntry,
  saveStateFor,
  setLabel,
  SAVE_GIVEN_UP_MS,
  SAVE_QUIET_MS,
} from "../../programsService"
import { SET_LIMITS, setLimitSentence } from "../../schemas"
import type { LiveWorkoutSet } from "../../types"

export interface SetRowProps {
  setNumber: number
  /** What the program asks for. Pre-filled, and yours to change. */
  prescribed: { weight: number; reps: number; repRangeMax?: number; amrap?: boolean }
  /** What you did the last time this lift came round, if ever. */
  previous?: { weight: number; reps: number } | null
  done?: LiveWorkoutSet
  unitLabel: string
  repUnit: "reps" | "sec"
  bodyweight?: boolean
  /**
   * This lift can honestly be done with nothing added — a pull-up, a dip, a
   * plank. The weight box stays (weighted pull-ups exist) but an empty one
   * means "just me" and saves as 0, which is the truth. On every other lift an
   * empty box means the number was not typed, and the ✓ stays greyed out.
   */
  unweightedOk?: boolean
  kind?: LiveWorkoutSet["kind"]
  /**
   * When this set was ticked, if the server has not confirmed it yet — null
   * once it has. A moment, not a boolean, because "on the wire" and "on the
   * wire for ten seconds" are different things to say.
   */
  pendingSince?: number | null
  /** Its write failed and is waiting for signal. */
  queued?: boolean
  onTick: (weight: number, reps: number) => void
  onUndo?: () => void
  /**
   * Open this set's own menu — warm-up / working / drop set, effort, delete.
   *
   * The number was a `span`, so those three facts had nowhere to live and a
   * mis-tagged set could only be fixed by deleting it.
   */
  onOpenMenu?: () => void
  /**
   * Take this row away — the set if it exists, the empty row if it does not.
   *
   * Offered three ways (swipe, hover, the set menu) because a swipe alone is
   * undiscoverable and a hover does not exist on the phone this screen is
   * designed for.
   */
  onDelete?: () => void
}

export function SetRow({
  setNumber,
  prescribed,
  previous,
  done,
  unitLabel,
  repUnit,
  bodyweight,
  unweightedOk,
  kind = "working",
  pendingSince = null,
  queued = false,
  onTick,
  onUndo,
  onOpenMenu,
  onDelete,
}: SetRowProps) {
  /**
   * REPS PRE-FILL FROM LAST TIME, NOT FROM THE FLOOR OF THE RANGE.
   *
   * A 6–8 lift was seeded as 6, and the rule for adding weight is 8 on every
   * set — so the one-tap save recorded the bottom of every range and the three
   * programs built out of ranges could never progress. What you did last time
   * is the number you are actually deciding against.
   */
  /**
   * A lift added on the day has no prescription, so it suggests nothing. `0`
   * means "nobody asked for a number here" — the box starts empty and says
   * "reps", rather than pre-filling a zero that somebody has to delete.
   */
  const defaultReps = previous?.reps ?? (prescribed.reps || "")
  // `done.weight` and not `done.weightKg`: the box is labelled in the lifter's
  // own unit, and the kilogram number under a "lb" label is how a 135 lb bench
  // redisplayed as 61.23 and re-saved as 61.
  /**
   * Empty, not zero, when nothing was prescribed. A lift added on the day
   * showed "0" in every box, which somebody has to delete before they can type
   * — and a zero that is not a fact is the same lie as any other.
   */
  const [weight, setWeight] = useState(
    String(done?.weight ?? (prescribed.weight || ""))
  )
  const [reps, setReps] = useState(String(done?.reps ?? (prescribed.amrap ? "" : defaultReps)))

  useEffect(() => {
    if (done) {
      setWeight(String(done.weight))
      setReps(String(done.reps))
    }
  }, [done])

  const ticked = Boolean(done)
  const label = setLabel(kind, setNumber)
  const range = prescribed.repRangeMax ? `${prescribed.reps}–${prescribed.repRangeMax}` : null

  /**
   * WHETHER THE ✓ MAY FIRE IS NOT THIS ROW'S DECISION.
   *
   * It was, and it was wrong twice over: `Number("")` sent an empty weight box
   * as 0 kg, and the bounds were spelled out here with the server's numbers
   * copied by hand. Both rules now live in one place — `readSetEntry` — which
   * also hands back the two numbers to send, so there is no second conversion
   * left on this side for the zero to come back through.
   */
  /**
   * A CLOCK THAT ONLY RUNS WHILE A SET IS UNCONFIRMED.
   *
   * The marker's wording depends on how long the write has been out, so
   * something has to re-render the row at a second and a half and again at
   * ten seconds. An interval per row, always running, on a screen with twenty
   * rows and an hour of use is not that something: this schedules exactly the
   * two moments it needs, and only while there is a pending set to describe.
   */
  const [, setNow] = useState(0)
  useEffect(() => {
    if (pendingSince === null || queued) return
    const waited = Date.now() - pendingSince
    const next = waited < SAVE_QUIET_MS ? SAVE_QUIET_MS - waited : SAVE_GIVEN_UP_MS - waited
    if (next <= 0) return
    const timer = setTimeout(() => setNow(Date.now()), next)
    return () => clearTimeout(timer)
  }, [pendingSince, queued])

  const saveState = saveStateFor({ pendingSince, queued }, Date.now())
  /**
   * NOTHING FOR A NORMAL TICK. The row used to shout "not saved yet" the
   * instant the ✓ was tapped — before the request had left — so every set on a
   * good connection flashed an alarm, and the alarm that meant something
   * looked exactly like the one that did not.
   */
  const saveMessage =
    saveState === "saving"
      ? "Saving…"
      : saveState === "queued"
        ? "Not saved — no signal. It will retry."
        : null

  /**
   * SWIPED AWAY, ON A PHONE. Tracked as a plain offset rather than through a
   * gesture library: one row, one axis, and the threshold is the whole rule.
   * A drag that stops short snaps back, because a row that half-deletes itself
   * is worse than one that does not move.
   */
  const [dragX, setDragX] = useState(0)
  const [startX, setStartX] = useState<number | null>(null)
  const revealed = dragX <= -SWIPE_REVEAL_PX

  const entry = readSetEntry({ weight, reps, bodyweight, unweightedOk })
  const { problem } = entry
  const repWord = repUnit === "sec" ? "Seconds" : "Reps"
  /**
   * A number the database cannot hold is named. An empty box is not: the
   * placeholder already says which number is missing, and an amber sentence on
   * every untouched row is noise.
   */
  const boundsMessage =
    problem?.reason === "out-of-range"
      ? setLimitSentence(problem.field, { unitLabel, repWord })
      : null

  return (
    <div className="group relative">
      {/*
        THE DELETE ZONE A SWIPE REVEALS. Under the row, uncovered as the row
        slides left, so the gesture shows what it is about to do rather than
        doing it on release.
      */}
      {onDelete && revealed && (
        <button
          type="button"
          data-testid={`swipe-delete-${label}`}
          aria-label={`Delete set ${label}`}
          onClick={() => {
            setDragX(0)
            onDelete()
          }}
          className="absolute inset-y-0 right-0 flex h-11 w-22 items-center justify-center rounded-md bg-destructive text-sm text-white"
        >
          Delete
        </button>
      )}

      <div
        /**
          IDENTIFIED BY ITS SLOT, NOT BY ITS NUMBER. A warm-up set 1 and a
          working set 1 are two rows on one lift, and `set-row-1` twice is two
          elements that cannot be told apart — by a test or by a screen reader.
          For a working set the label IS the number, so nothing outside changed.
        */
        data-testid={`set-row-${label}`}
        onTouchStart={(e) => setStartX(e.touches[0]?.clientX ?? null)}
        onTouchMove={(e) => {
          if (startX === null) return
          const dx = (e.touches[0]?.clientX ?? startX) - startX
          // Left only, and never further than the zone it reveals.
          setDragX(Math.max(-SWIPE_MAX_PX, Math.min(0, dx)))
        }}
        onTouchEnd={() => {
          setStartX(null)
          // Short of the threshold it snaps back: a row that half-deletes
          // itself is worse than one that does not move.
          setDragX((x) => (x <= -SWIPE_REVEAL_PX ? -SWIPE_MAX_PX : 0))
        }}
        style={dragX !== 0 ? { transform: `translateX(${dragX}px)` } : undefined}
        className={`relative grid grid-cols-[2.75rem_4.5rem_1fr_1fr_2.75rem] items-center gap-2 rounded-md px-1 py-1 transition-transform ${
          ticked ? "bg-emerald-500/10" : "bg-card"
        }`}
      >
      {/*
        THE NUMBER IS A BUTTON, 44px, not an 18px caption.
        Behind it: what kind of set this was, how hard it was, and deleting it.
        Those three facts had nowhere to live, so a warm-up logged as a working
        set stayed one — dragging the lift's average down and counting towards
        whether the program's session was finished.
      */}
      {onOpenMenu ? (
        <button
          type="button"
          data-testid={`set-menu-${label}`}
          aria-label={`Set ${label} type`}
          onClick={onOpenMenu}
          className="flex h-11 w-11 items-center justify-center rounded-md text-sm tabular-nums text-muted-foreground transition-colors hover:bg-accent"
        >
          {label}
        </button>
      ) : (
        <span className="flex h-11 w-11 items-center justify-center text-sm tabular-nums text-muted-foreground">
          {label}
        </span>
      )}

      {/*
        PREVIOUS IS A COLUMN, and it is tappable.
        It was a line UNDER the row, so it only existed when there was room for
        it and it read as an afterthought. Every tracker lifters use puts it
        second in the row — SET, PREVIOUS, WEIGHT, REPS, ✓ — because "what did I
        do last time" is the decision you are making while you stand there.
        Blank when there is no last time: blank is the honest answer and must
        never be a zero.
      */}
      {previous ? (
        <button
          type="button"
          /**
           * ROUNDED THE WAY A BAR IS ADJUSTABLE, because this number came back
           * through a conversion. 135 lb is stored as 61.23 kg and reads back
           * as 134.99, and "134.99×5" beside a box you are about to type 135
           * into is noise — and tapping it used to fill 134.99 in.
           */
          onClick={() => {
            setWeight(formatLoad(previous.weight))
            setReps(String(previous.reps))
          }}
          aria-label={`Use last time: ${formatLoad(previous.weight)} ${unitLabel} by ${previous.reps}`}
          className="min-w-0 truncate text-left text-[11px] tabular-nums text-muted-foreground transition-colors hover:text-foreground"
        >
          {formatLoad(previous.weight)}×{previous.reps}
        </button>
      ) : (
        <span aria-hidden />
      )}

      {bodyweight ? (
        <span className="text-xs text-muted-foreground">bodyweight</span>
      ) : (
        <Input
          type="number"
          inputMode="decimal"
          min={0}
          max={SET_LIMITS.weightMax}
          step="any"
          aria-label={`Weight for set ${label} in ${unitLabel}`}
          /**
           * "+kg" on a lift you can do unweighted, because an empty box there
           * means "nothing added" rather than "not filled in yet".
           */
          placeholder={
            unweightedOk ? `+${unitLabel}` : prescribed.weight ? undefined : "weight"
          }
          className="h-11 w-full sm:h-9"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />
      )}

      <Input
        type="number"
        inputMode="numeric"
        min={0}
        max={SET_LIMITS.repsMax}
        step={1}
        aria-label={`${repWord} for set ${label}`}
        placeholder={prescribed.amrap ? "max" : (range ?? (prescribed.reps ? String(prescribed.reps) : "reps"))}
        className="h-11 w-full sm:h-9"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
      />

      <button
        type="button"
        data-testid={`tick-${label}`}
        aria-label={ticked ? `Undo set ${label}` : `Save set ${label}`}
        aria-pressed={ticked}
        disabled={!ticked && problem !== null}
        onClick={() => (ticked && onUndo ? onUndo() : onTick(entry.weight, entry.reps))}
        className={`flex h-11 w-11 items-center justify-center rounded-md border transition-colors disabled:opacity-30 ${
          ticked
            ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-500"
            : "border-border hover:bg-accent"
        }`}
      >
        <Check className="size-5" />
      </button>

      {boundsMessage && !ticked && (
        <span className="col-span-5 text-[11px] text-amber-500">{boundsMessage}</span>
      )}

      {saveMessage && (
        <span
          data-testid={`set-save-state-${label}`}
          className={`col-span-5 text-xs ${saveState === "queued" ? "text-amber-500" : "text-muted-foreground"}`}
        >
          {saveMessage}
        </span>
      )}

        {/*
          AND A BUTTON, FOR EVERY DEVICE WITHOUT A FINGER. A swipe is
          undiscoverable and a desktop cannot perform one at all; this sits at
          the row's edge and appears on hover. Both doors, and the set menu's
          own row, call the same thing.
        */}
        {onDelete && (
          <button
            type="button"
            data-testid={`hover-delete-${label}`}
            aria-label={`Delete set ${label}`}
            onClick={onDelete}
            className="absolute right-1 top-1 hidden h-11 w-11 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100 sm:flex"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
    </div>
  )
}

/** Past this, the row is offering to delete itself. Short of it, it snaps back. */
const SWIPE_REVEAL_PX = 88
/** As far as the row slides: the width of the zone it uncovers. */
const SWIPE_MAX_PX = 88
