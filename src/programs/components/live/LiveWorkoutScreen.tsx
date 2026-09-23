"use client"

/**
 * The workout, while you are in it.
 *
 * THE SCREEN THIS REPLACES was a form: every lift pre-filled with the plan's
 * numbers, nothing saved until one orange button at the end that said "I did
 * all of this — save it". That is not how anybody trains. You do a set, you
 * write it down, you rest, you do the next one — over an hour, with the phone
 * locking twenty times in between.
 *
 * So: one row per set, a ✓ that saves that set the moment you tap it, the rest
 * timer starting itself where your thumb already is, and what you did last time
 * sitting beside what you are about to do.
 *
 * SUPERSETS DO NOT START THE CLOCK EARLY. A pair is done alternating, so the
 * rest belongs after the second lift, not between them — a timer that goes off
 * in the middle of A2 is a timer people learn to ignore.
 */

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, MoreVertical } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { BackLink } from "@/components/BackLink"
import { canBeUnweighted } from "../../data/exerciseLibrary"
import { SetRow } from "./SetRow"
import { RestBar } from "./RestBar"
import { LiftMenu } from "./LiftMenu"
import { SetMenu } from "./SetMenu"
import { LiftHistorySheet } from "./LiftHistorySheet"
import type { MissRule } from "../../types"
import { FinishSheet } from "./FinishSheet"
import { AddLift } from "./AddLift"
import { useLiveWorkout } from "../../hooks/useLiveWorkout"
import {
  describeSets,
  restTargetFor,
  groupOrdinal,
  addedLiftId,
  unfinishedLifts,
  describePlates,
  platesFor,
  enduranceMinutes,
  isStaleWorkout,
  fixedRowsToTick,
  liftRows,
  setLabel,
  setSlot,
  applyLiftOrder,
  moveLift,
} from "../../programsService"
import { REST_SECONDS, UNIT_CONFIG } from "../../config"
import type {
  LiftRow,
  LiveWorkout,
  LiveWorkoutSet,
  PlateSetup,
  PrescribedExercise,
  SessionPrescription,
  UnitSystem,
} from "../../types"

interface Props {
  /** The ACCOUNT's zone, for every time this screen shows or reads. */
  /**
   * What a miss costs per lift, read on the server from the program and the
   * enrollment. Absent for a loose workout, which has no program to deload.
   */
  missRules?: Record<string, MissRule>
  timezone: string

  initial: LiveWorkout
  prescription: SessionPrescription | null
  programName: string | null
  unit: UnitSystem
  plates?: PlateSetup
  /** What each lift did the last time it came round, keyed by exercise id. */
  lastTime: Record<string, { weight: number; reps: number }[]>
  /**
   * The read for `lastTime` failed. Said on screen, because an empty PREVIOUS
   * column is a claim — "you have not done this before" — and that is the one
   * claim it must never make wrongly.
   */
  previousUnavailable?: boolean
}

export function LiveWorkoutScreen({
  initial,
  prescription,
  programName,
  unit,
  plates,
  lastTime,
  previousUnavailable,
  missRules,
  timezone,
}: Props) {
  const live = useLiveWorkout(initial)
  /**
   * IS THIS A SESSION BEING WRITTEN UP, rather than one happening now?
   *
   * The same six-hour rule the Tracking card uses for "still open": a workout
   * left open since Monday and one deliberately backdated are the same
   * situation on this screen, and both want the same thing — no minute
   * counter racing away, and no rest clock starting on a set you did
   * yesterday.
   */
  const past = isStaleWorkout(initial.startedAt)
  const router = useRouter()
  /** Whether the discard confirmation is open. */
  const [discarding, setDiscarding] = useState(false)
  const [finishing, setFinishing] = useState(false)
  /**
   * The workout as it was when Finish was pressed. Kept because finishing
   * clears the live one, and the summary is rendered from this side of that.
   */
  const [finished, setFinished] = useState<LiveWorkout | null>(null)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  /**
   * Extra set rows revealed by "+ Add a set", per lift.
   *
   * Not stored anywhere: once a row is ticked it IS a set, and the row count is
   * derived from the sets on the workout. This only decides how many EMPTY rows
   * are showing, which nobody needs to survive a reload.
   */
  const [extraRows, setExtraRows] = useState<Record<string, number>>({})
  /**
   * WHICH SET'S MENU IS OPEN — the slot, not the number, because a warm-up
   * set 1 and a working set 1 are two rows on one lift.
   */
  const [openSet, setOpenSet] = useState<string | null>(null)
  /**
   * What an untouched row has been told it is, and what it cost, before it is
   * ticked. Keyed by the row's own slot.
   *
   * Held here rather than written anywhere: there is no row in the database to
   * patch yet. It travels with the tick, and the entry is dropped once the set
   * exists, so the empty row that comes back is a fresh row again.
   */
  const [rowKinds, setRowKinds] = useState<Record<string, LiveWorkoutSet["kind"]>>({})
  const [rowEffort, setRowEffort] = useState<Record<string, number>>({})
  /** Rows swiped away on this phone. Never a set that exists. */
  const [hiddenRows, setHiddenRows] = useState<string[]>([])
  /** Warm-up rows revealed from the lift menu, per lift. */
  const [warmupRows, setWarmupRows] = useState<Record<string, number>>({})
  /** Which lift's last-five-sessions sheet is open. */
  const [openHistory, setOpenHistory] = useState<string | null>(null)

  const workout = live.workout
  /** Working sets actually ticked — what a discard would throw away. */
  const setsTicked = (workout?.sets ?? []).filter((set) => set.completedAt).length
  const unitLabel = UNIT_CONFIG[unit].label

  /**
   * WHAT IS ON THE SCREEN: what the program asked for, plus anything added on
   * the day. The squat rack is busy, you do front squats, and the app has to
   * have somewhere to put them — otherwise the session is either logged wrong
   * or not logged at all. Added lifts live on the workout in
   * `adjustments.added`, so they come back on a reload like everything else.
   */
  const added = (live.workout ?? finished)?.adjustments.added ?? []
  const addedIds = new Set(added.map((a) => a.exerciseId))
  /**
   * THE RACK WAS TAKEN, SO YOU DID SOMETHING ELSE.
   *
   * A swap replaces the lift on screen: the new name, and a new id so the
   * sets you tick belong to what you actually did rather than to the lift you
   * could not get on. The old id keeps whatever was already ticked under it —
   * two sets of squats before the rack went is a fact, and a swap must not
   * quietly relabel them as front squats.
   */
  const swapped = (live.workout ?? finished)?.adjustments.swapped ?? {}
  const swapFor = (ex: PrescribedExercise): PrescribedExercise => {
    const to = swapped[ex.exerciseId]
    if (!to) return ex
    return {
      ...ex,
      exerciseId: addedLiftId(to.name),
      name: to.name,
      unweightedOk: canBeUnweighted(to.libraryId, to.name),
      note: `swapped for ${ex.name}`,
    }
  }

  /**
   * THE ORDER YOU DID THEM IN, if you moved anything.
   *
   * `adjustments.order` has existed since the type was written and was read by
   * nothing: the screen drew the program's order whatever the workout said, so
   * a session done in a different order was recorded in the wrong one. Applied
   * after the swap and the additions so a moved lift, a swapped lift and a
   * lift added on the day are all in the list being ordered.
   */
  const exercises: PrescribedExercise[] = applyLiftOrder([
    ...(prescription?.exercises ?? []).map(swapFor),
    ...added.map((a) => ({
      exerciseId: a.exerciseId,
      name: a.name,
      // No prescription means no suggested numbers: the boxes start empty
      // rather than pre-filled with something nobody asked for.
      sets: [1, 2, 3].map((setNumber) => ({ setNumber, weight: 0, reps: 0 })),
      /**
       * Whether an empty weight box is honest on this lift. A pull-up added on
       * the day saves with nothing added; a front squat added on the day does
       * not save until a weight is typed.
       */
      unweightedOk: canBeUnweighted(a.libraryId, a.name),
    })) as PrescribedExercise[],
  ], (live.workout ?? finished)?.adjustments.order)

  /**
   * The workout the screen is describing. `live.workout` goes null the moment a
   * finish succeeds, and the summary is rendered after that, so everything read
   * for display falls back to the copy taken when Finish was pressed.
   */
  const shown = workout ?? finished

  /** Sets already ticked, by lift. */
  const doneByLift = useMemo(() => {
    const map = new Map<string, LiveWorkoutSet[]>()
    for (const s of shown?.sets ?? []) {
      const key = s.exerciseId ?? s.exercise
      map.set(key, [...(map.get(key) ?? []), s])
    }
    return map
  }, [shown])

  const skipped = new Set(shown?.adjustments.skipped ?? [])

  /**
   * A LIFT YOU ADDED IS NOT A LIFT YOU FAILED.
   *
   * This used to run over `exercises`, which includes added lifts and their
   * three placeholder rows — so "Front Squat 0 of 3" appeared under "these
   * count as misses and will bring the weight down", for a lift nobody
   * prescribed. `unfinishedLifts` is pure and tested and tells the two apart;
   * this screen computes none of it.
   */
  const { short: unfinished, untouchedAdded } = unfinishedLifts(
    prescription?.exercises ?? [],
    shown?.adjustments ?? {},
    shown?.sets ?? []
  )

  /**
   * THE SUMMARY OUTLIVES THE WORKOUT.
   *
   * Saving clears the live workout, and the empty state used to be checked
   * first — so the moment somebody pressed save, the sheet holding "63 minutes,
   * 4,200 kg, a new best" was replaced by "this workout is finished". The whole
   * reward for an hour, gone in the frame it arrived. The finish sheet is
   * therefore rendered from `shown`, which survives the clearing, and only a
   * screen that was never finishing falls through to the empty state.
   */
  if (finishing && shown) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <FinishSheet
          missRules={missRules}
          timezone={timezone}
          past={past}
          endurance={Boolean(prescription?.enduranceSets?.length)}
          /**
           * How much of the run happened. Counted from the blocks ticked on
           * the plan card, not guessed from the time: a session cut short
           * after three of five intervals used to be recorded exactly like
           * one that was finished.
           */
          blocks={
            prescription?.enduranceSets?.length
              ? {
                  done: (shown.adjustments.blocksDone ?? []).length,
                  asked: prescription.enduranceSets.length,
                }
              : undefined
          }
          loose={!shown.enrollmentId}
          workout={shown}
          unfinished={unfinished}
          untouchedAdded={untouchedAdded}
          unsaved={live.unsaved}
          saving={live.saving}
          busy={live.busy}
          error={live.error}
          onSkipLift={(id) =>
            void live.adjust({ skipped: [...(shown.adjustments.skipped ?? []), id] })
          }
          onFinish={live.finish}
          // Before saving this is "Keep going" and goes back to the sets. After
          // saving there are no sets to go back to, so it leaves.
          onCancel={() => (workout ? setFinishing(false) : router.push("/programs"))}
        />
      </div>
    )
  }

  if (!workout) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center">
        <p className="text-sm text-muted-foreground">This workout is finished.</p>
        <Button asChild className="mt-3">
          <Link href="/programs">Back to training</Link>
        </Button>
      </div>
    )
  }

  /**
   * The rows of one lift, which are SLOTS and not positions.
   *
   * This used to render "as many rows as were prescribed" and find each row's
   * set with `setNumber === n && kind !== "warmup"` — a different rule from
   * the database's, which is why a warm-up set 1 marked the working row done
   * and a set ticked into an unprescribed slot had no row at all. `liftRows`
   * is that rule, and it is pure and tested.
   */
  const rowsFor = (ex: PrescribedExercise): LiftRow[] =>
    liftRows(ex, doneByLift.get(ex.exerciseId) ?? [], {
      extra: extraRows[ex.exerciseId] ?? 0,
      warmups: warmupRows[ex.exerciseId] ?? 0,
      kinds: rowKinds,
      hidden: hiddenRows,
    })

  /** The last lift of a superset pair — the one the rest belongs after. */
  const isLastOfGroup = (ex: PrescribedExercise, i: number) => {
    if (!ex.supersetGroup) return true
    const next = exercises[i + 1]
    return !next || next.supersetGroup !== ex.supersetGroup
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <Elapsed
        startedAt={workout.startedAt}
        programName={programName}
        dayLabel={prescription?.dayLabel}
        past={past}
        timezone={timezone}
        onFinish={() => {
          setFinished(workout)
          setFinishing(true)
        }}
      />

      <div data-testid="live-column" className="mx-auto max-w-2xl space-y-3 px-4 py-3">
        {/*
          A COLUMN THAT COULD NOT BE READ SAYS SO.
          The read behind PREVIOUS used to discard its own error, so a database
          that would not answer looked exactly like a lift you had never done:
          blank. One amber line, once, above the lifts — not per row, which
          would be twenty copies of the same sentence.
        */}
        {previousUnavailable && (
          <p data-testid="previous-unavailable" className="text-xs text-amber-500">
            Could not read your past sets — the PREVIOUS column is empty for now.
          </p>
        )}
        {/**
          * A RUN IS A WORKOUT TOO. An endurance session prescribes blocks, not
          * sets, so `exercises` is empty and this screen said "nothing
          * prescribed" and offered a search box for lifts. The only place a
          * cardio session could be logged was the old form. The blocks are the
          * session; there is nothing to tick, and the length is asked for at
          * the end like every other workout.
          */}
        {prescription?.enduranceSets && prescription.enduranceSets.length > 0 && (
          <Card data-testid="endurance-plan" className="gap-0 py-0">
            <CardContent className="space-y-1.5 px-3 py-2.5">
              <p className="font-medium">{prescription.dayLabel}</p>
              <p className="text-xs text-muted-foreground">
                About {enduranceMinutes(prescription.enduranceSets)} min
                {prescription.summary ? ` · ${prescription.summary}` : ""}
              </p>
              {/*
                A RUN HAS SOMETHING TO TICK. This was a read-only list under
                "Nothing to tick off here", so a session cut short after three
                of five intervals was recorded exactly like one finished — and
                the finish sheet had no way to say how much of it happened.

                One tick per ROW of the prescription, which is the repeat group
                as it is drawn: "6 × (1 min hard / 2 min easy)" is one thing
                you do, not eighteen.
              */}
              <ul className="space-y-1 pt-1 text-sm">
                {prescription.enduranceSets.map((set, i) => {
                  const done = (shown?.adjustments.blocksDone ?? []).includes(i)
                  return (
                    <li key={i} className="flex items-center gap-2">
                      <button
                        type="button"
                        data-testid={`block-${i}`}
                        aria-label={`Block ${i + 1} done`}
                        aria-pressed={done}
                        disabled={live.busy}
                        onClick={() => {
                          // The WHOLE list, every time: this field is written
                          // whole, and building it from one index at the call
                          // site is how one tick wipes another.
                          const now = shown?.adjustments.blocksDone ?? []
                          void live.adjust({
                            blocksDone: done ? now.filter((n) => n !== i) : [...now, i].sort((a, b) => a - b),
                          })
                        }}
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md border transition-colors ${
                          done
                            ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-500"
                            : "border-border hover:bg-accent"
                        }`}
                      >
                        <Check className="size-5" />
                      </button>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {set.repeat > 1 ? `${set.repeat}×` : ""}
                      </span>
                      <span className="min-w-0">{set.blocks.map((b) => b.label).join(" → ")}</span>
                    </li>
                  )
                })}
              </ul>
              <p className="pt-1 text-xs text-muted-foreground">
                Tick what you did. Press Finish when you are done and say how long it took.
              </p>
            </CardContent>
          </Card>
        )}

        {exercises.length === 0 && !prescription?.enduranceSets?.length && (
          <p className="text-sm text-muted-foreground">
            Nothing prescribed for this one — add what you did as you go.
          </p>
        )}

        {exercises.map((ex, i) => {
          const isSkipped = skipped.has(ex.exerciseId)
          const previous = lastTime[ex.exerciseId] ?? []
          /**
           * ONE FUNCTION DECIDES THE REST — what you edited on this workout,
           * then the program author's, then our guess. This asked
           * `restSecondsFor({ name })`, dropping the first two, so a program
           * specifying three minutes got our ninety seconds under a caption
           * reading "our suggestion".
           */
          const rest = restTargetFor(ex, workout?.adjustments)
          const rows = rowsFor(ex)
          /**
           * The rows already know which slots are filled, so nothing is
           * excluded by NUMBER here any more — that was the comparison that
           * let a warm-up set 1 stand in for working set 1.
           */
          const fixedToTick = fixedRowsToTick(
            rows
              .filter((row) => row.done === null && row.prescribed !== null)
              .map((row) => ({ ...row.prescribed!, slot: row.slot, kind: row.kind })),
            new Set<number>()
          )

          return (
            /*
              THE SAME DOUBLE PADDING AS EVERY OTHER SCREEN, ON THE ONE YOU
              STAND IN FRONT OF FOR AN HOUR. `Card` carries its own vertical
              padding and this added `p-3` inside it, so a three-lift session
              barely fitted one and a half lifts on a phone — on the screen where
              scrolling costs you most, between sets, with a bar in your hands.
              A bordered block, one padding.
            */
            <div
              key={ex.exerciseId}
              className={`rounded-lg border border-border bg-card px-3 py-2.5 ${isSkipped ? "opacity-60" : ""}`}
            >
              <div className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium">
                      {ex.supersetGroup && (
                        <span className="rounded bg-primary/15 px-1.5 py-0.5 text-xs uppercase tracking-wide text-primary">
                          {/* The number within the PAIR, not the position in
                              the day: the second pair read "B4"/"B5", which
                              reads as a set count or as a mistake. */}
                          {ex.supersetGroup}
                          {groupOrdinal(exercises, i)}
                        </span>
                      )}
                      {/* THE NAME IS THE DOOR TO ITS HISTORY. It was a
                          `span`, so the only way to see what you did last time
                          was one cell of the PREVIOUS column with no date on
                          it. */}
                      <button
                        type="button"
                        data-testid={`lift-name-${ex.exerciseId}`}
                        onClick={() => setOpenHistory(ex.exerciseId)}
                        className="min-h-11 min-w-0 truncate text-left text-base font-semibold"
                      >
                        {ex.name}
                      </button>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {/* A lift nobody prescribed has no prescription to
                          describe. It read "3 × 0 reps @ 0 kg", which is a plan
                          the app invented and then printed back. */}
                      {addedIds.has(ex.exerciseId) ? "added on the day" : describeSets(ex, unitLabel)}
                      {ex.note ? ` · ${ex.note}` : ""}
                      {isSkipped ? " · skipped" : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Options for ${ex.name}`}
                    onClick={() => setOpenMenu(openMenu === ex.exerciseId ? null : ex.exerciseId)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent"
                  >
                    <MoreVertical className="size-5" />
                  </button>
                </div>

                {/* EVERY OPTION FOR THIS LIFT, in the app's own sheet.
                    It was one 26px "Skip this one" chip and a read-only rest
                    line — so the two things that actually happen in a gym,
                    the rack being taken and a lift needing longer today, had
                    no answer at all. */}
                <LiftMenu
                  open={openMenu === ex.exerciseId}
                  onClose={() => setOpenMenu(null)}
                  exercise={ex}
                  adjustments={workout.adjustments}
                  alreadyHere={exercises.map((e) => e.name)}
                  wasAdded={addedIds.has(ex.exerciseId)}
                  skipped={isSkipped}
                  position={{ index: i, count: exercises.length }}
                  onAdjust={(patch) => void live.adjust(patch)}
                  onAddWarmup={() =>
                    setWarmupRows((r) => ({ ...r, [ex.exerciseId]: (r[ex.exerciseId] ?? 0) + 1 }))
                  }
                  /**
                   * The WHOLE order, from the list on screen. Building it at
                   * the call site from one id is how one lift's move comes to
                   * wipe another's — the same reason the rest map is written
                   * whole.
                   */
                  onMove={(delta) => void live.adjust({ order: moveLift(exercises, ex.exerciseId, delta) })}
                  onHistory={() => setOpenHistory(ex.exerciseId)}
                />

                {/*
                  MOUNTED ONLY WHILE IT IS OPEN, because it reads a hundred
                  workouts. `useLoad` fires on mount, and one of these per lift
                  would be six of those reads on a page somebody opened to tick
                  a set.
                */}
                {openHistory === ex.exerciseId && (
                  <LiftHistorySheet
                    open
                    onClose={() => setOpenHistory(null)}
                    name={ex.name}
                    unit={unit}
                    unitLabel={unitLabel}
                    timezone={timezone}
                  />
                )}

                {/*
                  THE COLUMNS ARE NAMED ONCE.
                  The unit used to be printed inside every row — "20 kg × 5",
                  five times for a 5×5 — so a lift said "kg" five times and "×"
                  five times to convey one fact about the columns. Every tracker
                  lifters use captions the row once at the top and leaves the
                  rows as numbers, which is what makes a column scannable.
                */}
                {!isSkipped && rows.length > 0 && (
                  <div className="grid grid-cols-[2.75rem_4.5rem_1fr_1fr_2.75rem] items-center gap-2 px-1 pb-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <span>Set</span>
                    {/* PREVIOUS, the name every tracker lifters use gives it.
                        "Last" was shorter than the column it captioned. */}
                    <span>Previous</span>
                    <span>{unitLabel}</span>
                    <span>Reps</span>
                    <span aria-hidden />
                  </div>
                )}

                {!isSkipped &&
                  rows.map((row) => {
                    const ticked = row.done ?? undefined
                    const label = setLabel(row.kind, row.setNumber)
                    /**
                     * PREVIOUS BELONGS TO A WORKING SET. There is no honest
                     * "last time" for a warm-up you decided to add today, and
                     * printing the working set's numbers there would suggest
                     * one.
                     */
                    const last =
                      row.workingIndex === null
                        ? null
                        : (previous[row.workingIndex - 1] ??
                          previous[previous.length - 1] ??
                          null)
                    return (
                      /*
                        KEYED BY THE SLOT IT WRITES TO, kind included.
                        Re-tagging a row changes where it will be written, so
                        it is a different row — and the numbers in its boxes
                        were prescribed for a working set. React only runs a
                        row's initial state once, so without the kind in the
                        key a row tagged as a warm-up kept 100 kg pre-filled.
                      */
                      <div key={`${row.slot}|${row.kind}`}>
                        <SetRow
                          setNumber={row.setNumber}
                          kind={row.kind}
                          prescribed={{
                            weight: row.prescribed?.weight ?? 0,
                            reps: row.prescribed?.reps ?? 0,
                            repRangeMax: row.prescribed?.repRangeMax,
                            amrap: row.prescribed?.amrap,
                          }}
                          previous={last}
                          done={ticked}
                          /**
                           * WHEN it was ticked, and whether its write has
                           * given up — not just "unconfirmed".
                           *
                           * The row used to be handed `unsaved: id starts with
                           * "pending:"`, which is true from the instant the ✓
                           * is tapped, so every set on a good connection
                           * flashed "not saved" for a frame. The moment lets
                           * the row stay quiet for the second and a half that
                           * a normal save takes.
                           */
                          pendingSince={
                            ticked?.id.startsWith("pending:") && ticked.completedAt
                              ? Date.parse(ticked.completedAt)
                              : null
                          }
                          /**
                           * Asked of the SET's slot, not the row's. They are
                           * the same until a row is re-tagged, and then the
                           * queue knows the set by where it will be written.
                           */
                          queued={Boolean(ticked) && live.queuedSlots.includes(setSlot(ticked!))}
                          unitLabel={unitLabel}
                          repUnit={ex.repUnit ?? "reps"}
                          bodyweight={ex.bodyweight}
                          unweightedOk={ex.unweightedOk ?? canBeUnweighted(undefined, ex.name)}
                          onOpenMenu={() => setOpenSet(row.slot)}
                          onTick={(weight, reps) => {
                            const saving = live.tick({
                              exerciseId: ex.exerciseId,
                              exercise: ex.name,
                              weight,
                              reps,
                              setNumber: row.setNumber,
                              // The row's own kind: what the program asked for,
                              // or what you told this row it was before ticking
                              // it.
                              kind: row.kind,
                              side: row.side,
                              // What it cost, if you said so before ticking.
                              rpe: rowEffort[row.slot] ?? null,
                            })
                            /**
                             * THE CLOCK STARTS ON THE TAP, not on the reply.
                             * Waiting for the round trip starts it late on gym
                             * wifi and, with no signal at all, not until the
                             * request gives up — so the rest you actually took
                             * is not the rest it counted.
                             *
                             * Only after the second lift of a superset pair.
                             */
                            /**
                             * NO REST CLOCK ON A SESSION THAT ALREADY HAPPENED.
                             * Ticking Tuesday's third set on Thursday must not
                             * start a 90-second timer.
                             */
                            const startedAt = !past && isLastOfGroup(ex, i) ? Date.now() : null
                            if (startedAt !== null) {
                              // The hook owns the clock, and writes it to
                              // storage — so a phone that locks and reloads
                              // between sets comes back still counting.
                              live.startRest(ex.exerciseId, rest.seconds, rest.ours)
                            }
                            void saving.then((outcome) => {
                              /**
                               * THE ROW'S LOCAL CHOICES ARE SPENT. They were a
                               * stand-in for a database row that now exists,
                               * and the empty prescribed row that comes back in
                               * their place must be a fresh row — not one still
                               * insisting it is a warm-up.
                               */
                              if (outcome === "saved" || outcome === "queued") {
                                setRowKinds((k) => {
                                  if (k[row.slot] === undefined) return k
                                  const next = { ...k }
                                  delete next[row.slot]
                                  return next
                                })
                                setRowEffort((r) => {
                                  if (r[row.slot] === undefined) return r
                                  const next = { ...r }
                                  delete next[row.slot]
                                  return next
                                })
                              }
                              if (startedAt === null || outcome !== "refused") return
                              /**
                               * Cleared only if it is still THIS set's clock.
                               *
                               * There is nothing to rest from after a refused
                               * set — but clearing unconditionally took the wrong
                               * one: tick set 1, tick set 2, and set 1's refusal
                               * arrives second, wiping the rest you had just
                               * started on set 2. The instant is the clock's
                               * identity, so a late answer can only clear its own.
                               */
                              // Only if it is still THIS set's clock. The
                              // comparison is inside the hook: out here, `live`
                              // is a render old and would compare against the
                              // state from before the clock started.
                              live.dismissRestStartedAt(startedAt)
                            })
                          }}
                          onUndo={ticked ? () => void live.removeSet(ticked.id) : undefined}
                          /**
                           * THE THIRD DOOR TO ONE ACTION. The swipe and the
                           * hover button on the row, and the set menu's own
                           * row, all call this — a swipe alone is
                           * undiscoverable and a desktop cannot make one.
                           */
                          onDelete={() => {
                            if (ticked) void live.removeSet(ticked.id)
                            else setHiddenRows((h) => [...h, row.slot])
                          }}
                        />

                        {/* THE SET'S OWN MENU: what kind it was, what it cost,
                            and taking it away. Three facts that had nowhere to
                            live while the number was a caption. */}
                        <SetMenu
                          open={openSet === row.slot}
                          onClose={() => setOpenSet(null)}
                          label={`Set ${label}`}
                          kind={row.kind}
                          rpe={ticked?.rpe ?? rowEffort[row.slot] ?? null}
                          ticked={Boolean(ticked)}
                          onKind={(kind) => {
                            if (kind === row.kind) return
                            // A set that exists is re-tagged on the server, so
                            // the correction survives the phone; an untouched
                            // row has nothing to patch and carries its choice
                            // to the tick.
                            if (ticked) void live.retagSet(ticked.id, kind)
                            else setRowKinds((k) => ({ ...k, [row.slot]: kind }))
                          }}
                          onRpe={(rpe) => {
                            if (ticked) void live.rateSet(ticked.id, rpe)
                            else setRowEffort((r) => ({ ...r, [row.slot]: rpe }))
                          }}
                          onDelete={() => {
                            setOpenSet(null)
                            if (ticked) void live.removeSet(ticked.id)
                            else setHiddenRows((h) => [...h, row.slot])
                          }}
                        />
                      </div>
                    )
                  })}

                {/*
                  THE REPLACEMENT FOR "I DID ALL OF THIS — SAVE IT".
                  That button saved a whole session at its prescribed numbers
                  in one tap, including rows whose prescription is a range or
                  an AMRAP, which is how a session came to claim numbers
                  nobody did. This one exists only when you are writing up a
                  session that already happened, ticks only the rows with one
                  definite prescription, and says how many that is.
                */}
                {!isSkipped && past && fixedToTick.length > 0 && (
                  <button
                    type="button"
                    data-testid={`tick-all-${ex.exerciseId}`}
                    onClick={() => {
                      for (const set of fixedToTick) {
                        void live.tick({
                          exerciseId: ex.exerciseId,
                          exercise: ex.name,
                          weight: set.weight,
                          reps: set.reps,
                          setNumber: set.setNumber,
                          kind: "working",
                          side: null,
                        })
                      }
                    }}
                    className="min-h-11 w-full rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    Did the {fixedToTick.length} fixed set{fixedToTick.length === 1 ? "" : "s"} as shown
                  </button>
                )}

                {/*
                  ONE BUTTON, BECAUSE THE OTHER ONE HAS A BETTER DOOR NOW.
                  "one fewer" existed only to take back a row this button had
                  revealed, and it could not touch a row the program had asked
                  for. The set menu's own Delete removes either, from the row
                  you are actually looking at, which is where somebody reaches
                  for it.
                */}
                {!isSkipped && (
                  <button
                    type="button"
                    data-testid={`add-set-${ex.exerciseId}`}
                    onClick={() =>
                      setExtraRows((r) => ({ ...r, [ex.exerciseId]: (r[ex.exerciseId] ?? 0) + 1 }))
                    }
                    className="min-h-11 w-full rounded-md border border-dashed border-border px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    + Add a set
                  </button>
                )}

                {!isSkipped && !ex.bodyweight && !addedIds.has(ex.exerciseId) && ex.sets[0]?.weight ? (
                  <p className="pt-1 text-xs text-muted-foreground">
                    Bar: {describePlates(platesFor(ex.sets[0].weight, unit, plates), unitLabel)}
                  </p>
                ) : null}
              </div>
            </div>
          )
        })}

        {/* ERRORS BELONG ON THE SCREEN THE PERSON IS LOOKING AT. This was only
            rendered inside the finish sheet, so "one set could not be saved and
            has been dropped" — a permanently lost set — was announced to nobody
            until an hour later, if at all. */}
        {live.error && (
          <p
            data-testid="live-error"
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-2 text-xs text-destructive"
          >
            {live.error}
          </p>
        )}

        <Dialog open={discarding} onOpenChange={(v) => !v && setDiscarding(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Throw this workout away?</DialogTitle>
              {/* SAYS WHAT GOES. "Nothing will be recorded" is true and
                  useless: the question is how much of your session it is
                  about to take, and only this screen knows. */}
              <DialogDescription>
                {setsTicked === 0
                  ? "Nothing has been ticked yet, so there is nothing to lose."
                  : `${setsTicked} ${setsTicked === 1 ? "set" : "sets"} will be thrown away. This cannot be undone.`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="destructive"
                data-testid="confirm-discard"
                onClick={() => {
                  setDiscarding(false)
                  void live.discard()
                }}
              >
                Throw it away
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AddLift
          alreadyHere={exercises.map((e) => e.name)}
          onAdd={(entry) =>
            void live.adjust({
              added: [...((live.workout ?? finished)?.adjustments.added ?? []), entry],
            })
          }
        />

        <div className="flex items-center justify-between gap-2 pt-2">
          {/* THE APP'S OWN DIALOG, not the browser's box.
              `confirm()` cannot say how much work is about to go, is
              unstyleable, and is suppressed outright by some mobile browsers —
              which would fire this destructive action with nothing asked, on
              the screen you are holding mid-workout. */}
          <Button
            variant="ghost"
            size="sm"
            className="min-h-11 text-destructive"
            data-testid="discard-workout"
            onClick={() => setDiscarding(true)}
          >
            Discard workout
          </Button>
          {live.unsaved > 0 && (
            <span className="text-xs text-amber-600 dark:text-amber-400">
              {live.unsaved} not saved yet
            </span>
          )}
        </div>
      </div>

      {/* Restored from storage on a reload, so a phone locking itself between
          sets no longer takes the countdown with it. */}
      <RestBar
        startedAt={live.rest?.from ?? null}
        targetSeconds={live.rest?.seconds ?? REST_SECONDS.accessory}
        ours={live.rest?.ours ?? true}
        onDismiss={live.dismissRest}
        onExtend={live.extendRest}
      />
    </div>
  )
}

/**
 * How long you have been here. Derived from the stored start instant, so it is
 * right after the phone has been locked — the same rule as the rest timer.
 */
function Elapsed({
  startedAt,
  programName,
  dayLabel,
  onFinish,
  past,
  timezone,
}: {
  startedAt: string
  programName: string | null
  dayLabel?: string
  onFinish: () => void
  /** A session being written up: say WHEN, not how long ago. */
  past: boolean
  timezone: string
}) {
  const [now, setNow] = useState(() => Date.now())
  // useEffect, not useMemo: a memo's return value is a value, not a cleanup, so
  // that version started a new interval on every remount and cleared none.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  /**
   * mm:ss, NOT whole minutes.
   *
   * It read "0 min" for the first sixty seconds of a workout and then jumped
   * to "1 min" — a clock ticking every second and only ever showing one of
   * them. The first minute is the one where you are most likely to be looking
   * at it, checking the thing you just started actually started.
   */
  const elapsed = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000))
  const clock = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`

  return (
    <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-2">
        {/* THE ONE WAY BACK, shared. Hand-rolling a link with a back arrow is
            how thirteen of them ended up disagreeing about where "back" was;
            `tests/unit/navigation/backNavigation.test.ts` fails on a new one. */}
        <BackLink
          fallback="/programs"
          fallbackLabel="Training"
          className="inline-flex min-h-11 shrink-0 items-center text-xs"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {dayLabel ?? "Workout"}
            {programName ? <span className="text-muted-foreground"> · {programName}</span> : null}
          </p>
          {/* A COUNTER IS WRONG FOR A SESSION THAT ALREADY HAPPENED. A
              workout dated yesterday read "1,440 min" and climbing. */}
          <p className="text-xs tabular-nums text-muted-foreground">
            {past
              ? `since ${new Date(startedAt).toLocaleString([], {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: timezone,
                })}`
              : clock}
          </p>
        </div>
        <Button size="sm" onClick={onFinish} data-testid="finish-workout">
          Finish
        </Button>
      </div>
    </div>
  )
}
