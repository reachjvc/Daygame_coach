import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react"
import type { NsPlan, NsRoutineProgram, LinkedProgram } from "@/src/goals/types"
import type { SyncDecision } from "@/src/goals/lifePlanSync"
import type { SessionType } from "@/src/health/types"
import { NO_TRAINING_TICKS, trainingTicks } from "@/src/goals/dayTicks"
import { reconcileProgramReference } from "@/src/goals/programReferenceService"
import { getTodayInTimezone } from "@/src/shared/dateUtils"
import { useLoad } from "@/src/shared/useLoad"
// ONE DOOR into the gym slice — see src/programs/forLifeMastery.ts.
import {
  useActiveEnrollments,
  enrollmentName,
  describeTrainingWeek,
  getProgram,
} from "@/src/programs/forLifeMastery"
import { useOneThing } from "./useOneThing"

/**
 * Everything NorthStarFlow reads about the account that is not the plan itself,
 * moved out of it unchanged (Plans/plan-new-from-real.md, Phase 3.2): the
 * running programs and the plan's reconciliation with them, the clock that
 * keeps "today" current, the one thing, and the training log with the ticks
 * derived from it.
 *
 * The mount effect that FIRST sets `today` (and loads the browser's copy) stays
 * in NorthStarFlow: it also sets `loaded` and the browser-copy ref.
 */
export function usePlanReads({
  plan,
  setPlan,
  loaded,
  today,
  setToday,
  timezone,
  decision,
}: {
  plan: NsPlan
  setPlan: Dispatch<SetStateAction<NsPlan>>
  loaded: boolean
  today: string | null
  setToday: Dispatch<SetStateAction<string | null>>
  timezone: string
  decision: SyncDecision | null
}) {
  /**
   * WHAT IS ACTUALLY RUNNING, and what the plan believes.
   *
   * Everything the Systems step says about the training week is derived here,
   * from the database, and handed down — the card itself reaches into the gym
   * slice for nothing.
   */
  const {
    enrollments,
    loading: programsLoading,
    error: programsError,
    refresh: refreshPrograms,
  } = useActiveEnrollments()
  /**
   * The read, in one object, because that is what the reconciliation takes.
   *
   * A NEW OBJECT EVERY RENDER WOULD RE-RUN THE EFFECT BELOW FOREVER: its
   * dependency list holds `plan`, and an effect that calls `setPlan` with a
   * dependency it recreates each render is a loop. Memoised on the three facts
   * it carries.
   */
  const programRead = useMemo(
    () => ({ enrollments, loading: programsLoading, error: programsError }),
    [enrollments, programsLoading, programsError]
  )

  /**
   * THE PLAN RECONCILES AGAINST THE DATABASE EVERY TIME IT OPENS.
   *
   * End a program on the Training page, or start one on your phone, and the
   * reference in this browser is wrong until this runs.
   *
   * THE "SUCCESSFUL READ" GUARD IS NO LONGER HERE. It was an early return in
   * this effect — `if (programsLoading || programsError) return` — which is the
   * one place a test could not reach it and the next caller had to remember it.
   * `reconcileProgramReference` takes the whole read and owns that rule now,
   * with a test of its own for each of the two states.
   */
  /**
   * WHAT THE RECONCILIATION DID, kept for one telling.
   *
   * Not stored in the plan: "we adopted this" is a fact about this page load,
   * not about somebody's life, and a notice that survives a reload is a notice
   * nobody can dismiss.
   */
  const [adopted, setAdopted] = useState<NsRoutineProgram | null>(null)
  const [endedProgram, setEndedProgram] = useState<NsRoutineProgram | null>(null)

  useEffect(() => {
    if (!loaded) return
    // Returns the same object when nothing changed, so this does not write to
    // storage on every mount.
    setPlan((p) => {
      const out = reconcileProgramReference(p, programRead)
      if (out.adopted) setAdopted(out.adopted)
      if (out.ended) setEndedProgram(out.ended)
      return out.plan
    })
    /**
     * `plan` IS A DEPENDENCY, and leaving it out lost the adoption.
     *
     * Two effects own `plan`, and the load order decided the answer. This one
     * ran the moment the enrollment list arrived; the account's plan arrives
     * from a SEPARATE request and lands as a wholesale `setPlan(decision.plan)`
     * at the end of an async load — which threw the reference away, and with
     * `plan` out of the list nothing ever re-adopted. So starting a program on
     * your phone and opening the laptop left the Systems step saying nothing
     * was linked, for as long as the tab stayed open: the exact scenario
     * `tests/e2e/life-mastery-program-link.spec.ts` was written to catch. It
     * caught it the day the shared test account acquired a plan row — before
     * that the load had nothing to overwrite with, and the bug was invisible.
     *
     * It terminates because `reconcileProgramReference` returns the SAME object
     * when nothing changed, so the re-run after an adoption is a no-op and
     * React bails out of the render. Both of its writing paths settle in one
     * step: an adoption leaves the reference referenced, and a detach leaves
     * nothing referenced.
     */
  }, [loaded, programRead, plan])

  /** The five states the Systems step can be in about its training week. */
  const linkedProgram = useMemo((): LinkedProgram => {
    if (programsLoading) return { state: "loading" }
    if (programsError) return { state: "failed" }
    const referenced = plan.routines.find((r) => r.blueprintId === "workout")?.program?.enrollmentId
    const enrollment = referenced ? enrollments.find((e) => e.id === referenced) : undefined
    // A reference dropped on THIS load, said once. The next load has no
    // `endedProgram` and the week is the person's own again.
    if (!enrollment && endedProgram) return { state: "ended" }
    if (!enrollment) return { state: "none" }
    if (enrollments.length > 1) return { state: "several", count: enrollments.length }
    const program = getProgram(enrollment.program_id)
    return {
      state: "linked",
      name: enrollmentName(enrollment),
      // Read from the enrollment's OWN schedule, so a swapped lift or a renamed
      // day is what it says.
      week: program ? describeTrainingWeek(program, enrollment) : "",
    }
  }, [plan, enrollments, programsLoading, programsError, endedProgram])

  /**
   * TODAY KEEPS UP WITH THE CLOCK.
   *
   * It used to be read once, in the mount effect, and never again — so a tab
   * left open across midnight went on ticking yesterday. This flow is the one
   * people leave open: it is where the morning routine gets ticked off.
   *
   * Polled rather than timed to the exact boundary because a sleeping laptop
   * does not fire a timer set eleven hours ago, and `visibilitychange` catches
   * the case that matters most — picking the phone up the next morning.
   */
  useEffect(() => {
    if (!loaded) return
    const check = () => setToday((was) => {
      const now = getTodayInTimezone(timezone)
      return now === was ? was : now
    })
    const timer = window.setInterval(check, 60_000)
    document.addEventListener("visibilitychange", check)
    window.addEventListener("focus", check)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", check)
      window.removeEventListener("focus", check)
    }
  }, [loaded, timezone])

  /**
   * THE ONE THING, READ ONCE FOR THE WHOLE FLOW.
   *
   * It is on the account and the plan keeps no copy of it, so every screen that
   * shows it — the step, the echo on Focus, the recap, the build step's banner
   * — is handed this rather than fetching its own or reading a stale draft.
   * The rail is scored off it too: `hasOneThing` is what makes the step ring
   * fill, which is why somebody signing in on a new phone sees their finished
   * step as finished.
   */
  // Drawn only once the account has answered: until then the plan on screen is
  // this browser's copy, and the read replaces it, a sentence saved in between too.
  const oneThing = useOneThing(plan, setPlan, today, timezone, loaded && decision !== null && decision.kind !== "stay-local")

  /**
   * WHAT YOU ACTUALLY DID, from the training log — READ ONCE, FOR EVERY TAB.
   *
   * The ticks on a step like "Strength session" lived only in the plan, so a
   * week with three finished gym sessions showed zero against it until
   * somebody ticked it by hand: two records of one workout, kept apart and
   * free to disagree, with the ignored one being the record of what actually
   * happened.
   *
   * It is read HERE rather than inside the Track tab, where it used to live,
   * because four surfaces answer "is this done today" and only one of them
   * could see it from there. One read, one answer, handed down.
   *
   * Nine days rather than seven: the grid shows eight columns and the server
   * cuts the history by ITS day, so a person far enough east or west needs the
   * extra one to have their whole week.
   */
  const workouts = useLoad<Array<{ logged_at: string; session_type: SessionType }>>(
    "/api/health/workout?days=9",
    (body) => (Array.isArray(body) ? (body as Array<{ logged_at: string; session_type: SessionType }>) : [])
  )

  /**
   * A FAILED READ IS NOT AN UNTRAINED WEEK.
   *
   * `NO_TRAINING_TICKS` while the log is loading or refused, and the schedule
   * says so on screen — a silent empty log would draw somebody's trained week
   * as a blank one, which is the "plausible number when the computation
   * failed" shape this project keeps paying for.
   */
  const ticks = useMemo(
    () => (workouts.state === "ready" ? trainingTicks(plan, workouts.data, timezone) : NO_TRAINING_TICKS),
    [workouts, plan, timezone]
  )

  return {
    enrollments,
    programsLoading,
    programsError,
    refreshPrograms,
    programRead,
    adopted,
    endedProgram,
    linkedProgram,
    oneThing,
    workouts,
    ticks,
  }
}
