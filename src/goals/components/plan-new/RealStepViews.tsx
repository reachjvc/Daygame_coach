"use client"

/**
 * THE TWELVE REAL STEP PARTS, mounted with exactly the props `NorthStarFlow` gives them
 * (Plans/plan-new-from-real.md, Phase 3.3). One `case` per step, copied from its tab switch one-to-one; every
 * writer, read and jump comes from `useRealStep()`. No markup of a step is drawn here, only the real part.
 *
 * Differences from the real page, all on purpose and all about the frame, not the step:
 *  - the rail, the back link, "start over", the read-back and the to-do list are `NorthStarFlow`'s frame and are
 *    not drawn (Phase 4 puts the new frame around the build steps);
 *  - the review reminder is never wired (`onReminderChange` absent), as on `/plan/sandbox`.
 */

import type { ReactNode } from "react"
import type { NorthStarTabId } from "@/src/goals/types"
import { COMMIT_EDIT_COPY } from "@/src/goals/data/northStar"
import * as ns from "@/src/goals/northStarService"
import * as nsTrack from "@/src/goals/northStarTrackService"
import { appendToReview, parsePeriodParam, removeReview, reviewIdFor, writeReview } from "@/src/goals/reviewService"
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
import { PlanProgressList, QuickAdd } from "./realStepExtras"
import { useRealStep } from "./RealStep"

/** The step `stepId` names, drawn from the real parts. */
export function RealStepView(): ReactNode {
  const r = useRealStep()
  const { plan, today, ticks, setTab } = r
  const tab: NorthStarTabId = r.stepId

  switch (tab) {
    case "star":
      return <StarTab plan={plan} {...r.starHandlers} onNext={() => setTab("now")} />

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
          <OneThingTab
            plan={plan}
            handlers={r.oneThingHandlers}
            account={r.oneThing}
            typed={r.oneThingTyped}
            onTyped={r.setOneThingTyped}
            today={today}
            goalHandlers={r.goalHandlers}
          />
          <FocusTab
            plan={plan}
            today={today}
            handlers={r.focusHandlers}
            onOpenGoal={(areaId, goalId) => { r.setPlanAreaId(areaId); r.setNowGoalId(goalId); setTab("milestones") }}
            onNext={() => setTab("milestones")}
            // The sentence is just above, in the same step: no echo of it here.
            oneThing={null}
          />
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
          <ValuesSoFar
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
          />
          <ValuesWork plan={plan} handlers={r.valuesHandlers} mode="elicit" />
          <ValuesWork plan={plan} handlers={r.valuesHandlers} mode="order" />
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

    case "review": {
      const named = parsePeriodParam(r.reviewPeriod ?? undefined)
      const dueWeek = r.dueWeek
      const initialPeriod = named ?? (dueWeek && "period" in dueWeek.go ? dueWeek.go.period ?? null : null)
      return (
        <PeriodReviewTab
          key={named ? reviewIdFor(named) : "now"}
          initialPeriod={initialPeriod}
          // The copy space has no reminder: never passed, so nothing is read or switched on for it.
          reminder={null}
          onReminderChange={undefined}
          plan={plan}
          today={today}
          ticks={ticks}
          handlers={{
            onWrite: (period, patch) => r.setPlan((p) => writeReview(p, period, patch, today)),
            onRemove: (id) => r.setPlan((p) => removeReview(p, id)),
            onAddMoments: (period, lines) => r.setPlan((p) => appendToReview(p, period, "magicMoments", lines, today)),
            onReading: (goalId, date, value) => r.setPlan((p) => ns.setGoalReading(p, date, goalId, value)),
          }}
        />
      )
    }

    case "recap":
      return (
        <>
          <PlanProgressList progress={r.planPct} onGo={(t) => setTab(t)} />
          <RecapTab
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
                <ReviewTab plan={plan} today={today} handlers={r.reviewHandlers} valuesHandlers={r.valuesHandlers} values={false} />
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
