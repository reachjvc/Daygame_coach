"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dumbbell, Plus, ChevronLeft } from "lucide-react"
import { ProgramCatalog } from "./ProgramCatalog"
import { ProgramDetail } from "./ProgramDetail"
import { TodayCard } from "./TodayCard"
import { SessionNotices } from "./SessionNotices"
import { ProgressionView } from "./ProgressionView"
import { StartLooseWorkout } from "./StartLooseWorkout"
import { EditActiveProgram } from "./EditActiveProgram"
import { WeekStrip } from "./WeekStrip"
import { ProgramRow } from "./ProgramRow"
import { BuildYourWeek } from "./BuildYourWeek"
import { SavedWeeksSection } from "./SavedWeeksSection"
import { TRAINING_CARD } from "./trainingStyles"
import { ProgramSheet } from "./ProgramSheet"
import { DayAssignment } from "./DayAssignment"
import { PastPrograms } from "./PastPrograms"
import { useActiveEnrollments, useEnrollment } from "../hooks/useEnrollment"
import { requireProgram, enrollmentName, getProgram } from "../data/catalog"
import { effectiveProgram } from "../customize"
import { formatDateOnly, computePrescription } from "../programsService"
import { LEVEL_LABELS } from "../config"
import type {
  EnrollmentDetail,
  LiveWorkout,
  ProgramEnrollment,
  ProgramsLocation,
  TrainingCardState,
} from "../types"
import { endProgram, resetProgram } from "../programActions"

/**
 * WHICH SCREEN, IN THE ADDRESS BAR.
 *
 * This was `useState<View>`, so nothing could link to the catalogue or to one
 * program, Back always landed on the inventory whatever you were reading, and
 * the server could not resolve the first paint. The four modes map onto the
 * URL the server already parses: home is `?view=today`, browse is
 * `?view=programs`, detail carries `?catalog=`, and active carries
 * `?program=`.
 *
 * `router.replace` rather than `push`: these change what data the page needs,
 * so the server page re-runs — and Back should leave Training rather than walk
 * back through its screens.
 */

interface ProgramsAppProps {
  /** Resolved by the server component, so the first paint has data on it. */
  initialActive?: ProgramEnrollment[]
  initialPast?: ProgramEnrollment[]
  initialDetail?: EnrollmentDetail | null
  /** Today, decided on the server. See `trainingCardState`. */
  cardState?: TrainingCardState | null
  /** Which screen the address bar asked for, parsed on the server. */
  where?: Pick<ProgramsLocation, "view" | "programId" | "catalogId" | "draftId">
  /**
   * A workout already open, if there is one.
   *
   * Server-resolved so "Resume · 23 min" is on the first paint rather than
   * appearing a moment later — and so the card can say which program it belongs
   * to, since only one workout can be open at a time.
   */
  live?: LiveWorkout | null
}

export function ProgramsApp({
  initialActive,
  initialPast,
  initialDetail,
  live = null,
  cardState = null,
  where,
}: ProgramsAppProps = {}) {
  const router = useRouter()
  const view = where ?? { view: "today" as const, programId: null, catalogId: null, draftId: null }

  /** Move to another screen by changing the address. */
  function goTo(next: {
    view: "today" | "programs" | "detail" | "edit" | "build"
    program?: string | null
    catalog?: string | null
    draft?: string | null
  }) {
    const url = new URL(window.location.href)
    const q = url.searchParams
    if (next.view === "today") q.delete("view")
    else q.set("view", next.view)
    for (const [key, value] of [
      ["program", next.program],
      ["catalog", next.catalog],
      ["draft", next.draft],
    ] as const) {
      if (value) q.set(key, value)
      else q.delete(key)
    }
    router.replace(`${url.pathname}?${q.toString()}`)
  }
  const { enrollments, loading, error, refresh } = useActiveEnrollments(initialActive)

  /**
   * ONE PROGRAM MEANS NO CHOICE TO MAKE, so do not ask for one.
   *
   * The page opened on a list headed "My Programs" containing a single card you
   * had to click to reach today's session — a menu of one, in front of the only
   * thing you came for. With two or more the list is the point and it stays.
   */
  /**
   * THE ONE MOUNT OF "start an empty workout".
   *
   * It was rendered in two places — the empty state here and the fourth tab on
   * the training screen — and the walk found three of these buttons across two
   * tabs. Held in a const so there is exactly one in the source; where it goes
   * is a placement question, what it is is not.
   *
   * Never in `browse` or `detail`: you are reading about a program there, not
   * about to train.
   */
  const looseStart = (
    <StartLooseWorkout live={live} variant={enrollments.length === 0 ? "primary" : "row"} />
  )

  // `edit` shares this branch: the editor is a state of the one running
  // program, not a screen of its own with its own data.
  if (
    (view.view === "today" || view.view === "edit") &&
    !view.programId &&
    !loading &&
    enrollments.length === 1
  ) {
    return (
      <div className="space-y-3">
        <ActiveProgram
          enrollmentId={enrollments[0].id}
          initialDetail={initialDetail ?? null}
          initialPast={initialPast}
          cardState={cardState}
          editing={view.view === "edit"}
          onEditProgram={() => goTo({ view: "edit", program: enrollments[0]?.id })}
          onLeaveEditor={() => goTo({ view: "today" })}
          onExit={() => {
            refresh()
            goTo({ view: "programs" })
          }}
        />
        {looseStart}
      </div>
    )
  }

  if (view.view === "programs") {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => goTo({ view: "today" })}>
          ← My programs
        </Button>
        <ProgramCatalog onSelect={(programId) => goTo({ view: "detail", catalog: programId })} />
        {/* THE SECOND DOOR, BESIDE THE FIRST. "Build my own" was inside Life
            Mastery, behind a mode switch, on a step most people never opened —
            so the catalogue read as the only way to have a program. */}
        <Button variant="outline" className="w-full" onClick={() => goTo({ view: "build" })}>
          Build your own week
        </Button>
      </div>
    )
  }

  if (view.view === "build") {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => goTo({ view: "today" })}>
          ← My programs
        </Button>
        <BuildYourWeek
          enrollments={enrollments}
          draftId={view.draftId}
          onStarted={(enrollmentId) => {
            refresh()
            goTo({ view: "today", program: enrollmentId })
          }}
        />
      </div>
    )
  }

  if (view.view === "detail" && view.catalogId) {
    return (
      <ProgramDetail
        programId={view.catalogId}
        onBack={() => goTo({ view: "programs" })}
        onEnrolled={(enrollmentId) => {
          refresh()
          goTo({ view: "today", program: enrollmentId })
        }}
      />
    )
  }

  if ((view.view === "today" || view.view === "edit") && view.programId) {
    return (
      <div className="space-y-3">
        <ActiveProgram
          enrollmentId={view.programId}
          cardState={cardState}
          editing={view.view === "edit"}
          onEditProgram={() => goTo({ view: "edit", program: view.programId })}
          onLeaveEditor={() => goTo({ view: "today", program: view.programId })}
          onExit={() => {
            refresh()
            goTo({ view: "today" })
          }}
        />
        {looseStart}
      </div>
    )
  }

  // home
  return (
    <div className="space-y-4">
      {/* Every program the account is on, with when it started and a way to end
          it. Enrollments only deactivate within a discipline, so one from
          months ago keeps prescribing sessions until somebody stops it — and
          until now nothing on any screen said it was there. */}
      {/* NO "RUNNING NOW" BAND HERE. It named the running programs directly
          above a list of the running programs — the same two facts twice, and
          only the list was clickable, so the first thing you read was the thing
          you could not use. The band earns its place where nothing else says
          what is running (the Life Mastery Templates tab); here the list is
          better at the same job, so the list carries the facts instead. */}
      {/*
        ONE PRIMARY ACTION, NOT TWO IDENTICAL ONES.
        This heading sat above a "Browse" button, and the empty state below it
        carried a second "Browse programs" button doing exactly the same thing,
        forty pixels apart. When there IS a program the heading is furniture —
        you came to train, not to read an inventory — so it only appears when
        there is a choice to make.
      */}
      {enrollments.length > 0 && (
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Your programs</h2>
          <Button size="sm" variant="ghost" onClick={() => goTo({ view: "programs" })}>
            <Plus className="size-4 mr-1" /> Browse
          </Button>
        </div>
      )}

      {/* A FAILED REQUEST IS NOT AN EMPTY LIST. Emptying the list on failure
          told somebody three weeks into a program that they had none and should
          go and pick one. The list now keeps whatever was last known and this
          says the screen may be out of date, with a way to try again. */}
      {error && (
        <div
          data-testid="programs-load-error"
          role="alert"
          className="flex items-center justify-between gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void refresh()}
            className="shrink-0 rounded-md border border-amber-500/40 px-2 py-1 transition-colors hover:bg-amber-500/15"
          >
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : enrollments.length === 0 && !error ? (
        <Card>
          {/*
            BOTH DOORS, ON THE SCREEN YOU LAND ON.
            With no program the app opened on the "Anything else" tab — a
            write-it-up-afterwards form — so a new user never learned that
            programs existed, and somebody who just wanted to log today's session
            had to find the right tab first. The two things a person can do here
            are "follow a program" and "log what I am about to do", so both are
            on the first screen and neither is behind a tab.
          */}
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <Dumbbell className="size-8 text-muted-foreground" />
            <p className="text-sm">Pick a program and this page becomes today&apos;s workout.</p>
            <Button size="sm" onClick={() => goTo({ view: "programs" })}>Browse programs</Button>
            <p className="text-xs text-muted-foreground">
              or start one now and add each lift as you get to it
            </p>
            {looseStart}
          </CardContent>
        </Card>
      ) : (
        /*
          ROWS, AND REAL CONTROLS.
          These were `Card`s with an `onClick` — a div that a keyboard cannot
          reach and a screen reader does not announce as anything you can do,
          on the list whose entire purpose is choosing one. `ProgramRow` is a
          button or a link, and the four other lists of programs in the app
          use the same one.
        */
        <Card className={TRAINING_CARD}>
          <CardContent className="divide-y p-0">
            {enrollments.map((e) => (
              <ProgramRow
                key={e.id}
                name={enrollmentName(e)}
                testId={`running-${e.id}`}
                onClick={() => goTo({ view: "today", program: e.id })}
                meta={
                  <>
                    {LEVEL_LABELS[e.level]} · started{" "}
                    {e.startedOn ? formatDateOnly(e.startedOn, "short") : "—"}
                    {" · "}
                    {/* The fact that tells a live program from a forgotten one. */}
                    {e.lastLoggedOn
                      ? `last trained ${formatDateOnly(e.lastLoggedOn, "short")}`
                      : "not trained yet"}
                  </>
                }
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* THE ARCHIVE, VISIBLE FROM THE STATE YOU ARE ACTUALLY IN. This rendered
          only inside the active-program view — so somebody whose own program had
          been archived, and who therefore had no active program, could not see
          it anywhere. That is the whole of "it still doesn't load the one I
          custom made a long time ago". */}
      {/* SAVED WEEKS, WHERE THE PROGRAMS ARE. They were listed inside Life
          Mastery's builder — a screen that has gone — with a 32-px delete
          square, no Start at all, and `/api/programs/drafts/[id]/start` had
          never had a caller on any screen. */}
      <SavedWeeksSection
        onOpen={(id) => goTo({ view: "build", draft: id })}
        onStarted={(enrollmentId) => {
          refresh()
          goTo({ view: "today", program: enrollmentId })
        }}
      />

      <PastPrograms initial={initialPast} onResumed={refresh} />
    </div>
  )
}

/**
 * What the program asks for on each weekday, for the strip's screen-reader text.
 *
 * Only a days-and-lifts program has weekdays at all: an endurance plan is a
 * sequence of weeks, and skill routines are day lists with no weekday field.
 * Those get no labels rather than invented ones.
 */
function weekdayLabels(enrollment: ProgramEnrollment): Record<number, string | undefined> {
  const program = getProgram(enrollment.program_id)
  if (!program) return {}
  const schedule = effectiveProgram(program, enrollment.customSchedule).schedule
  if (schedule.kind !== "linear_rotation" && schedule.kind !== "weekly_waved") return {}
  const out: Record<number, string | undefined> = {}
  for (const d of schedule.days) if (d.weekday != null) out[d.weekday] = d.label
  return out
}

function ActiveProgram({
  enrollmentId,
  initialDetail,
  initialPast,
  cardState = null,
  editing = false,
  onEditProgram,
  onLeaveEditor,
  onExit,
}: {
  enrollmentId: string
  /** Whether the address bar is asking for the editor. */
  editing?: boolean
  /** Opens the editor by changing the address. */
  onEditProgram: () => void
  /** Leaves it again. */
  onLeaveEditor: () => void
  /**
   * Today, from the server — including whether a workout is open and whose.
   * This used to take a separate `live` prop and the card compared it with
   * its own enrollment id; two sources for one fact, and the card's copy had
   * no time zone, so it named a stale workout's day from the phone's clock.
   */
  cardState?: TrainingCardState | null
  initialDetail?: EnrollmentDetail | null
  initialPast?: ProgramEnrollment[]
  onExit: () => void
}) {
  const { detail, error, refresh } = useEnrollment(enrollmentId, initialDetail)
  /** A session the user picked instead of the one the app offered. */
  const [pickedDayId, setPickedDayId] = useState<string | null>(null)
  /** Which weekday's assignment is open, 1 = Monday. */
  const [pickingWeekday, setPickingWeekday] = useState<number | null>(null)
  /** The ⋮ menu for this program. */
  const [menuOpen, setMenuOpen] = useState(false)
  /** The server's sentence when "I am done with this" or "Run it again" is refused. */
  const [finishFailed, setFinishFailed] = useState<string | null>(null)
  /**
   * A FAILED READ IS NOT A SLOW ONE.
   *
   * This was `if (loading || !detail)` and nothing else, so a failed request —
   * which leaves `detail` null with `loading` back to false — showed "Loading
   * session…" for ever. The hook has recorded the error the whole time and its
   * own comment names this exact outcome; the screen simply never asked.
   */
  if (error && !detail) {
    return (
      <div className="space-y-2 py-4" data-testid="session-error">
        <p className="text-sm text-amber-600 dark:text-amber-400">{error}</p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded-md border border-border px-2.5 py-1.5 text-xs transition-colors hover:bg-muted/50"
        >
          Try again
        </button>
      </div>
    )
  }

  /**
   * A REFRESH IS NOT A FIRST LOAD.
   *
   * This was `loading || !detail`, so ANY re-read replaced the card with
   * "Loading session…" even though the session was already in hand. Skip,
   * Reset, changing a weekday and writing up a workout all call `refresh()` —
   * so every one of them made today's session disappear for a moment and come
   * back with its day picker closed and its scroll position lost.
   *
   * Only the FIRST load has nothing to show. After that the card stays on
   * screen and quietly updates underneath.
   */
  if (!detail) {
    return (
      <div
        data-testid="today-card-loading"
        className="h-[92px] animate-pulse rounded-xl bg-muted/40"
      />
    )
  }

  /**
   * RECOMPUTED ON THE CLIENT, not fetched.
   *
   * The engine is pure and takes the program and the enrollment, both of which
   * are already here — so showing a different day's session is a function call
   * rather than a round trip. The server still owns what happens on log.
   */
  const program = effectiveProgram(
    requireProgram(detail.enrollment.program_id),
    detail.enrollment.customSchedule
  )
  const days =
    program.schedule.kind === "linear_rotation" || program.schedule.kind === "weekly_waved"
      ? program.schedule.days.map((d) => ({ id: d.id, label: d.label, weekday: d.weekday }))
      : undefined
  const pickedIndex = days?.findIndex((d) => d.id === pickedDayId) ?? -1
  const prescription =
    pickedIndex >= 0
      ? computePrescription(program, {
          ...detail.enrollment,
          cursor: { ...detail.enrollment.cursor, dayIndex: pickedIndex },
        })
      : detail.prescription

  return (
    <div className="space-y-4">
      {/* NAME THE PROGRAM. The header said "Today — Upper · Cycle 1 · Week 1"
          and never once said which program that was, which is how somebody
          ends up staring at a session they do not recognise with no way to
          find out where it came from. */}
      {/* THE PROGRAM IS THE HEADLINE. It was a thin line of grey 11px text above
          the card — the one thing you are actually doing, rendered smaller than
          everything around it. */}
      {/*
        ONE BORDERED CONTROL ON THIS TAB, AND IT IS THE ONE YOU CAME FOR.
        "All programs" was an outlined Button the same size as Start, so the
        screen offered two boxed choices of equal weight — one of them being
        "leave this screen". The level and the start date went with it: neither
        changes what you do today, and "Beginner · started 9/10/2026" was the
        second line of the page.
      */}
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="min-w-0 truncate text-lg font-semibold" data-testid="active-program-name">
          {enrollmentName(detail.enrollment)}
        </h2>
        <button
          type="button"
          onClick={onExit}
          className="-mr-2 inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:text-foreground sm:min-h-0 sm:py-1"
        >
          <ChevronLeft className="size-3.5" /> All programs
        </button>
      </div>
      {/* THE WEEK, above today's session. You open the app to log, not to
          browse — so the week answers "what is today and what is coming" in one
          glance and stays out of the way. */}
      {/*
        THIS WEEK ONLY.
        This handed WeekStrip every weekday ever trained, so a Monday you trained
        once in July showed green every Monday afterwards — including Monday
        morning of a week in which nothing had been done, directly above today's
        session. After a two-week break it still read "done" under all three
        training days. A week strip that cannot go back to empty is not
        reporting anything.
      */}
      <WeekStrip
        week={detail.week}
        labels={weekdayLabels(detail.enrollment)}
        onPickDay={setPickingWeekday}
      />
      {pickingWeekday !== null && (
        <DayAssignment
          enrollment={detail.enrollment}
          weekday={pickingWeekday}
          onSaved={() => {
            setPickingWeekday(null)
            void refresh()
          }}
          onCancel={() => setPickingWeekday(null)}
        />
      )}

      {/* WHAT TODAY IS, AND THE BUTTON THAT STARTS IT.
          Reading the session and doing it used to be one screen — a form with
          every set pre-filled and one save at the end, which is not how anybody
          trains. Doing it now lives at /programs/live, one set at a time. */}
      <TodayCard
        enrollmentId={enrollmentId}
        programName={enrollmentName(detail.enrollment)}
        prescription={prescription}
        unit={detail.enrollment.unitSystem}
        state={cardState}
        week={detail.week}
        days={days}
        onPickDay={setPickedDayId}
        onPickWeekday={setPickingWeekday}
        onOpenMenu={() => setMenuOpen(true)}
      >
        <SessionNotices
          prescription={prescription}
          logs={detail.logs}
          unit={detail.enrollment.unitSystem}
          onFinish={async (choice) => {
            setFinishFailed(null)
            // Both of these used to fire and forget. "Archive" then left the
            // screen for a program the server had refused to end.
            const res =
              choice === "archive" ? await endProgram(enrollmentId) : await resetProgram(enrollmentId)
            if (!res.ok) {
              setFinishFailed(res.error)
              return
            }
            if (choice === "archive") onExit()
            else refresh()
          }}
        />
        {finishFailed && (
          <p className="mt-2 text-xs text-destructive" data-testid="finish-action-failed">
            {finishFailed}
          </p>
        )}
      </TodayCard>

      {/* "Log a workout you already did" was here, a second form with its own
          weight boxes, its own personal-best rule and its own save path. It is
          now "Log a past workout" on History, which opens the ordinary live
          screen dated when you say. One way to record a workout. */}
      {/* The program is not fixed once it is running — the gym changes, the
          shoulder changes. Weights carry over across an edit. Opened from the
          history controls so every control for this program sits together. */}
      {/* THE EDITOR IS A SCREEN, not a toggle. It was component state, so it
          could not be linked to and Back walked out of Training entirely
          rather than back to the session. */}
      {editing && (
        <EditActiveProgram
          enrollment={detail.enrollment}
          onSaved={() => {
            onLeaveEditor()
            refresh()
          }}
          onCancel={onLeaveEditor}
        />
      )}
      {/* EVERY PROGRAM CONTROL BEHIND THE ⋮, and off the screen you open to
          train. The four that sat in a row here — Change, Skip, Reset, End —
          put a destructive action a thumb-width from the others and asked with
          the browser's own `confirm()` box. */}
      <ProgramSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        enrollment={detail.enrollment}
        onChanged={refresh}
        onChangeDays={() => {
          setMenuOpen(false)
          setPickingWeekday(detail.week.todayWeekday)
        }}
        onEdit={() => {
          setMenuOpen(false)
          onEditProgram()
        }}
      />
      <ProgressionView logs={detail.logs} enrollment={detail.enrollment} />
      <PastPrograms initial={initialPast} onResumed={refresh} />
    </div>
  )
}
