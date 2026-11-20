"use client"

/**
 * THE TWELVE REAL STEP PARTS, mounted with exactly the props `NorthStarFlow` gives them
 * (Plans/plan-new-from-real.md, Phase 3.3). One `case` per step, copied from its tab switch one-to-one; every
 * writer, read and jump comes from `useRealStep()`. No markup of a step is drawn here, only the real part.
 *
 * Differences from the real page, all on purpose and all about the frame, not the step:
 *  - the rail, the back link, "start over", the read-back and the to-do list are `NorthStarFlow`'s frame and are
 *    not drawn (Phase 4 puts the new frame around the build steps);
 *  - the review reminder is shown off and read-only (`onReminderChange` absent, `reminderReadOnly`), as the copy space has no pushes.
 */

import { useEffect, useRef, useState, type ReactNode } from "react"
import type { NorthStarTabId } from "@/src/goals/types"
import { COMMIT_EDIT_COPY } from "@/src/goals/data/northStar"
import { DEFAULT_REVIEW_DAY } from "@/src/goals/dueNowService"
import * as ns from "@/src/goals/northStarService"
import * as nsTrack from "@/src/goals/northStarTrackService"
import { appendToReview, parsePeriodParam, periodOfReview, removeReview, reviewIdFor, writeReview } from "@/src/goals/reviewService"
import { StarTab } from "@/src/goals/components/north-star/StarTab"
import { NowTab } from "@/src/goals/components/north-star/NowTab"
import { PathPicker } from "@/src/goals/components/north-star/PathPicker"
import { BuildBoard } from "@/src/goals/components/north-star/BuildBoard"
import { OneThingTab } from "@/src/goals/components/north-star/OneThingTab"
import { FocusTab } from "@/src/goals/components/north-star/FocusTab"
import { MilestonesTab, SystemLinks } from "@/src/goals/components/north-star/MilestonesTab"
import { ValuesSoFar } from "@/src/goals/components/north-star/ValuesSoFar"
import { ValuesWork } from "@/src/goals/components/north-star/ValuesWork"
import { RecapTab } from "@/src/goals/components/north-star/RecapTab"
import { GoalOverview } from "@/src/goals/components/north-star/GoalOverview"
import { CommitTab } from "@/src/goals/components/north-star/CommitTab"
import { ReviewTab } from "@/src/goals/components/north-star/ReviewTab"
import { TrackTab } from "@/src/goals/components/north-star/TrackTab"
import { TodayTab } from "@/src/goals/components/north-star/TodayTab"
import { JournalTab } from "@/src/goals/components/north-star/JournalTab"
import { PeriodReviewTab } from "@/src/goals/components/north-star/PeriodReviewTab"
import { DueNow } from "@/src/goals/components/north-star/DueNow"
import { PlanProgressList } from "../north-star/PlanProgressList"
import { QuickAdd } from "../north-star/QuickAdd"
import { useRealStep } from "./RealStep"

/** What the reminder block shows on the copy space: off, the table's own day and hour, no device. Never read, never written. */
const COPY_SPACE_REMINDER = { pushOn: false, reviewDay: DEFAULT_REVIEW_DAY, reviewHour: 19, hasEnabledDevice: false }

/** The step `stepId` names, drawn from the real parts. */
export function RealStepView(): ReactNode {
  const r = useRealStep()
  const { plan, today, ticks, setTab, section } = r
  const tab: NorthStarTabId = r.stepId
  /** On a split screen only the blocks of its section are drawn; `show` is "does this part draw on this screen". */
  const show = (...ids: string[]) => !section || ids.includes(section)

  switch (tab) {
    case "star":
      return <StarTab plan={plan} {...r.starHandlers} onNext={() => setTab("now")} hideNext={r.framed} section={section as "star.vision" | "star.self" | undefined} />

    case "now":
      return (
        <NowTab
          plan={plan}
          today={today}
          openId={r.nowAreaId}
          setOpenId={r.setNowAreaId}
          areaHandlers={r.areaHandlers}
          onSeasonFocus={r.setSeasonFocus}
          onNext={() => setTab("pick")}
          hideNext={r.framed}
        />
      )

    case "pick":
      return (
        <PathPicker
          plan={plan}
          onPick={(id) => {
            r.setOpenRoutineId(null)
            setTab(id === "systems" ? "systems" : "milestones")
          }}
          onPickRoutine={(routineId) => {
            r.setPlanAreaId(null)
            r.setOpenRoutineId(routineId)
            setTab("systems")
          }}
          catalogueOpen={r.catalogueOpen}
          onCatalogue={() => r.setCatalogueOpen((open) => !open)}
        >
          <BuildBoard
            plan={plan}
            today={today}
            handlers={{ ...r.boardHandlers, onOpenArea: (id: string) => { r.boardHandlers.onOpenArea(id); setTab("milestones") } }}
            program={{
              read: r.programRead,
              timezone: r.timezone,
              adopted: r.adopted,
              ended: r.endedProgram,
              onRetry: r.refreshPrograms,
            }}
          />
        </PathPicker>
      )

    case "focus":
      return (
        <div className="space-y-8">
          {show("season.one-thing", "season.why", "season.who") && <OneThingTab
            plan={plan}
            handlers={r.oneThingHandlers}
            account={r.oneThing}
            typed={r.oneThingTyped}
            onTyped={r.setOneThingTyped}
            today={today}
            goalHandlers={r.goalHandlers}
            section={section as "season.one-thing" | "season.why" | "season.who" | undefined}
            goalSection={r.goalSection}
            onGoalSection={r.setGoalSection}
            hideNext={r.framed}
            draftKey={`plan-new-draft:${r.account}`}
          />}
          {show("season.areas", "season.order") && <FocusTab
            plan={plan}
            today={today}
            handlers={r.focusHandlers}
            onOpenGoal={(areaId, goalId) => { r.setPlanAreaId(areaId); r.setNowGoalId(goalId); setTab("milestones") }}
            onNext={() => setTab("milestones")}
            hideNext={r.framed}
            // The sentence is just above, in the same step: no echo of it here. On a screen of its own the sentence is not
            // above, so the real echo shows it.
            oneThing={section === "season.areas" ? r.oneThingBody : null}
            section={section as "season.areas" | "season.order" | undefined}
          />}
        </div>
      )

    case "milestones":
    case "systems":
      return (
        <MilestonesTab
          key={tab}
          step={tab}
          plan={plan}
          today={today}
          openId={r.planAreaId}
          setOpenId={r.setPlanAreaId}
          onOpenGoal={(areaId, goalId) => { r.setPlanAreaId(areaId); r.setNowGoalId(goalId) }}
          guideHandlers={r.guideHandlers}
          routineHandlers={r.routineHandlers}
          systemHandlers={r.systemHandlers}
          linkedProgram={r.linkedProgram}
          onAddRoutine={r.areaHandlers.onAddRoutine}
          openRoutineId={r.openRoutineId}
          setOpenRoutineId={r.setOpenRoutineId}
          onAddRequirement={r.onAddSystemsRequirement}
          onGoToTab={(t: NorthStarTabId) => setTab(t)}
          oneThing={r.oneThingBody}
        />
      )

    case "values":
      return (
        <div className="space-y-5">
          {show("values.so-far") && <ValuesSoFar
            plan={plan}
            {...r.valuesSoFarWriters}
            onGoTo={(mention) => {
              if (mention.goalId && mention.areaId) {
                r.setNowAreaId(null)
                r.setPlanAreaId(mention.areaId)
                r.setNowGoalId(mention.goalId)
                setTab("milestones")
              } else if (mention.areaId) {
                r.openAreaRating(mention.areaId)
              } else {
                setTab(mention.tab)
              }
            }}
          />}
          {show("values.lists") && <ValuesWork plan={plan} handlers={r.valuesHandlers} mode="elicit" />}
          {show("values.order") && <ValuesWork plan={plan} handlers={r.valuesHandlers} mode="order" />}
        </div>
      )

    case "today":
      return (
        <div className="space-y-5">
          <DueNow cards={r.dueCards} onGo={r.onDueGo} onHide={r.onHideDue} />
          <TodayTab
            ticks={ticks}
            plan={plan}
            today={today}
            {...r.todayWriters}
            onOpenRoutine={(routineId) => { r.setPlanAreaId(null); r.setOpenRoutineId(routineId); setTab("systems") }}
            onOpenField={(fieldId) => {
              const field = plan.fields.find((f) => f.id === fieldId)
              const source = nsTrack.destination(plan, field?.readSourceId ?? null)
              if (!field || !source) return
              r.goTo(source.home, {
                label: field.label.trim() || source.label,
                tickId: field.id,
                back: "today",
                backAnchor: `field-${field.id}`,
              })
            }}
            onOpenStep={(stepId) => {
              const step = plan.routines.flatMap((x) => x.steps).find((s) => s.id === stepId)
              const source = nsTrack.destination(plan, step?.goesTo ?? null)
              if (!step || !source) return
              r.goTo(source.home, {
                label: step.title,
                tickId: step.id,
                back: "today",
                backAnchor: `row-${step.id}`,
              })
            }}
            onOpenGoal={r.openGoalFromToday}
            onGoToTab={(t) => setTab(t)}
          />
        </div>
      )

    case "journal":
      return <JournalTab plan={plan} today={today} {...r.journalWriters} />

    case "review":
      return <ReviewScreen />

    case "recap":
      return (
        <>
          {show("everything.driving-force") && <PlanProgressList progress={r.planPct} onGo={(t) => setTab(t)} />}
          <RecapTab
            section={section as "everything.driving-force" | "everything.plan" | "everything.links" | "everything.check" | "everything.commit" | undefined}
            plan={plan}
            today={today}
            ticks={ticks}
            handlers={r.recapHandlers}
            valuesHandlers={r.valuesHandlers}
            onOpenArea={(areaId) => r.setNowAreaId(areaId)}
            onOpenRoutine={(routineId) => { r.setPlanAreaId(null); r.setOpenRoutineId(routineId); setTab("systems") }}
            onGoToTab={(t) => setTab(t)}
            oneThing={r.oneThingBody}
            goals={
              <>
                <QuickAdd plan={plan} onAdd={r.onQuickAdd} />
                <GoalOverview
                  plan={plan}
                  today={today}
                  onOpenGoal={(goal) => { r.setPlanAreaId(goal.areaId); r.setNowGoalId(goal.id); setTab(ns.isMilestone(goal) ? "milestones" : "systems") }}
                  onSetPriority={r.goalHandlers.onSetPriority}
                  onMovePriority={r.goalHandlers.onMovePriority}
                  onRemoveGoal={r.removePlanGoal}
                  onOpenRoutine={(routineId) => { r.setPlanAreaId(null); r.setOpenRoutineId(routineId); setTab("systems") }}
                  emptyHint={COMMIT_EDIT_COPY.empty}
                />
              </>
            }
            commit={
              <CommitTab
                section={section as "everything.plan" | "everything.links" | "everything.check" | "everything.commit" | undefined}
                plan={plan}
                today={today}
                onOpenToday={() => setTab("today")}
                handlers={r.commitHandlers}
                tools={
                  <section className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
                    <SystemLinks
                      plan={plan}
                      handlers={r.systemHandlers}
                      onOpenArea={(id: string) => { r.setPlanAreaId(id); setTab("milestones") }}
                    />
                  </section>
                }
              >
                <ReviewTab plan={plan} today={today} handlers={r.reviewHandlers} valuesHandlers={r.valuesHandlers} values={false} section={section as "everything.check" | "everything.commit" | undefined} />
              </CommitTab>
            }
          />
        </>
      )

    case "track":
      return (
        <TrackTab
          plan={plan}
          today={today}
          ticks={ticks}
          logUnavailable={r.workouts.state === "failed"}
          onRetryLog={r.workouts.state === "failed" ? r.workouts.retry : undefined}
          onToggleStep={r.onTrackToggleStep}
          onGoToToday={() => setTab("today")}
        />
      )

    // Folded steps never reach here: the address maps them to the step that took them over.
    default:
      return null
  }
}

/**
 * THE REVIEW STEP. The period lives in the tab's own state; it is also kept in the address (`?period=`) beside every
 * change, so a move between the review's screens, a reload and a link all keep it. The tab remounts when a link names
 * another period, but not for a change the tab itself made.
 */
function ReviewScreen(): ReactNode {
  const r = useRealStep()
  const { plan, today, ticks } = r
  // A fortnight (the copied 10s) has no rule that builds it from its start: it is the review the plan holds under that id.
  const fortnight = (plan.reviews ?? []).find((x) => x.cadence === "fortnight" && reviewIdFor({ cadence: "fortnight", start: x.periodStart }) === r.reviewPeriod)
  const named = parsePeriodParam(r.reviewPeriod ?? undefined) ?? (fortnight ? periodOfReview(fortnight) : null)
  const dueWeek = r.dueWeek
  const initialPeriod = named ?? (dueWeek && "period" in dueWeek.go ? dueWeek.go.period ?? null : null)
  const namedId = named ? reviewIdFor(named) : "now"
  const own = useRef<string | null>(null)
  const [key, setKey] = useState(namedId)
  useEffect(() => {
    if (namedId === own.current) return
    setKey(namedId)
  }, [namedId])
  return (
    <PeriodReviewTab
      key={key}
      initialPeriod={initialPeriod}
      // The copy space shows the reminder block, off, with every control disabled: no read, no switch, no push.
      reminder={COPY_SPACE_REMINDER}
      onReminderChange={undefined}
      reminderReadOnly
      plan={plan}
      today={today}
      ticks={ticks}
      section={r.section as "review.open" | "review.goals" | "review.write" | undefined}
      onPeriod={(period) => {
        const id = reviewIdFor(period)
        own.current = id
        r.setPeriodParam(id)
      }}
      handlers={{
        onWrite: (period, patch) => r.setPlan((p) => writeReview(p, period, patch, today)),
        onRemove: (id) => r.setPlan((p) => removeReview(p, id)),
        onAddMoments: (period, lines) => r.setPlan((p) => appendToReview(p, period, "magicMoments", lines, today)),
        onReading: (goalId, date, value) => r.setPlan((p) => ns.setGoalReading(p, date, goalId, value)),
      }}
    />
  )
}
