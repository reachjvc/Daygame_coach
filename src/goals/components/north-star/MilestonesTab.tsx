"use client"

/**
 * Steps 5 and 6: what you want, and then what you will do about it.
 *
 * TWO STEPS, ONE BODY. They are two rails entries and two rings, because the
 * fork at step 4 sends people to one or the other by name and because they are
 * two different pieces of work. They are one component because the thing you
 * work IN is identical: the same twelve areas on the same wheel, the same four
 * routines beside it, the same builder underneath. Only the half changes, and
 * the half is now the step rather than a toggle somewhere on the page.
 *
 * What goes on the MILESTONES step is everything you would be glad to have done
 * — a hundred kilos on the bench, twelve percent, ten thousand a month, the
 * car, the girlfriend, the trip, the threesome. Some of it is measurable and
 * some of it is not, and none of it is a plan. It is not supposed to be: this is
 * the step that produces the wanting, so the framing is deliberately loose.
 * Write everything, respectable or not, because it is much easier to cut a list
 * than to invent one, and a person whose list contains nothing they would be
 * embarrassed to say out loud has written somebody else's list.
 *
 * What goes on the SYSTEMS step is what you actually do — the rates, the
 * routines, the thing you do on a Tuesday you do not feel like it — and, the
 * question the split exists to make askable, what each one is pointed at.
 *
 * The catalogue is neither of them. It was a tab riding on both, which put
 * somebody else's ready-made list beside the box asking what THIS person wants;
 * it is its own step now (step 5, before both of these), walked through and
 * left. The achievements step is one box per area instead — `AreaWants`, above
 * the 10 — and everything that offered, filed or listed something else there
 * (the Templates tab, the in-area catalogue, the strip naming lines that went
 * to Systems, the Things-to-experience list) is off it.
 *
 * Nothing on either step is final, and the page says so — somebody who thinks
 * this is their last chance to write the right thing writes the safe thing.
 */


import { useState } from "react"
import { Check, Pencil, Plus, X } from "lucide-react"
import type { NorthStarTabId, NsArea, NsAreaReview, NsGoal, NsPlan } from "@/src/goals/types"
import { HALVES_COPY, MILESTONES_COPY, PLAN_INTRO, ROUTINES_INTRO, ROUTINE_BLUEPRINTS, SYSTEMS_COPY } from "@/src/goals/data/northStar"
import {
  areaSystemMilestones,
  milestoneGoals,
  milestonesWithoutSystems,
  systemGoals,
  systemsForGoal,
  systemsWithoutMilestones,
  oneThingRequirements,
  routineSummary,
  systemMilestones,
  areaReview,
  goalHasWhy,
  goalNeedsWhy,
  goalRateLabel,
  wheelRatings,
} from "@/src/goals/northStarService"
import { AreaBuilder, AreaWants } from "./AreaBuilder"
import { RoutineCard, type RoutineHandlers } from "./RoutineCard"

import { AreaWheel } from "./AreaWheel"
import type { GuideHandlers } from "./GuidedBuild"

/** Which of the two steps this is. Both render from the same component. */
export type BuildStep = "milestones" | "systems"

/**
 * What the body is showing.
 *
 * It was this step or the catalogue riding on top of it. The catalogue is its
 * own step now — walked through and left, rather than a tab beside the box
 * asking what you want — so a half is just the step.
 */
export type MilestonesHalf = BuildStep

/** Joining the two halves: what moves what, and what a routine adds up to. */
export interface SystemHandlers {
  onLinkStep: (routineId: string, stepId: string, goalId: string, on: boolean) => void
  onLinkGoal: (fromId: string, toId: string, on: boolean) => void
  onAddSystemMilestone: (routineId: string, id: "hours" | "sessions" | "streak", areaId?: string) => void
}

export function MilestonesTab({
  plan,
  today,
  openId,
  setOpenId,
  onOpenGoal,
  guideHandlers,
  routineHandlers,
  systemHandlers,
  onAddRoutine,
  openRoutineId,
  setOpenRoutineId,
  onAddRequirement,
  onGoToTab,
  step,
  oneThing,
}: {
  plan: NsPlan
  today: string
  /** Lifted, because the dialog it drives is rendered by the shell. */
  openId: string | null
  setOpenId: (id: string | null) => void
  onOpenGoal: (areaId: string, goalId: string) => void
  guideHandlers: GuideHandlers
  routineHandlers: RoutineHandlers
  systemHandlers: SystemHandlers
  onAddRoutine: (blueprintId: string) => void
  openRoutineId: string | null
  setOpenRoutineId: (id: string | null) => void
  /** Writing what the one thing needs, from here. */
  onAddRequirement: (title: string) => void
  onGoToTab: (tab: NorthStarTabId) => void
  /** Which step this is. The rail is the switch between them. */
  step: BuildStep
  /** The saved one thing, read from the account by the flow. */
  oneThing: string | null
}) {
  const requirements = oneThingRequirements(plan)
  const ratings = wheelRatings(plan, today)
  /**
   * THE WHEEL COUNTS WHAT THIS STEP SHOWS.
   *
   * It counted every goal in the area — so an area holding one driver and no
   * experiences said "1 goal" on the wheel of the Experiences step and then
   * opened on an empty list, and the same number disagreed with the "N written"
   * beside the step's own name. A count next to a list has to be a count OF
   * that list.
   */
  const goalCounts = Object.fromEntries(
    plan.areas.map((a) => [a.id, (step === "milestones" ? milestoneGoals(plan, a.id) : systemGoals(plan, a.id)).length]),
  )
  // Only the goals that owe one. A count that includes four Tuesday runs is a
  // count nobody reads twice.
  const needWhy = plan.goals.filter((g) => goalNeedsWhy(g) && !goalHasWhy(g)).length
  /**
   * The gap worth naming: an area you have PICTURED and then aimed nothing at.
   * An area you have not thought about yet is not a gap, and listing all eleven
   * empty ones is a wall rather than a finding.
   */
  const gaps = plan.areas.filter((a) => (goalCounts[a.id] ?? 0) === 0 && areaReview(plan, a.id).ten.trim().length > 0)
  const openArea = plan.areas.find((a) => a.id === openId) ?? null
  const openRoutine = plan.routines.find((r) => r.id === openRoutineId) ?? null
  /** Structural edits to the routines: rename one, remove one, add one. */
  const [editing, setEditing] = useState(false)
  /**
   * THE CATALOGUE IS A STEP, NOT A TAB HERE. It was a second tab on both build
   * steps, which put somebody else's ready-made list beside the box asking
   * what this person wants. It is step 5 now, walked through and left.
   */
  const half: MilestonesHalf = step
  /** The builder only knows two halves. Templates has no builder of its own. */
  const builderHalf: BuildStep = step
  const milestones = milestoneGoals(plan)
  const runningCount =
    systemGoals(plan).length + plan.routines.reduce((sum, r) => sum + r.steps.length, 0)

  /**
   * What this step still has open, in its own words.
   *
   * Not a gate — nothing here blocks the next step — but the flow's argument is
   * that you write everything down before you choose between it, and a page
   * whose only obvious button is "next" is arguing the opposite.
   */

  return (
    <div className="space-y-5">
      {/* WHAT THE ONE THING NEEDS, ABOVE THE WHEEL.
          The question itself moved to step 3, where it has the why, the
          identity and the values around it. What belongs here is its output:
          the goals it already put on this page, so the list opens as "what
          this needs" rather than as twelve empty areas. Everything else that
          used to sit above the wheel — counts, banners, a builder — is gone.

          MILESTONES ONLY. What the one thing needs is a list of things you
          want, so it belongs on the step that is about wanting; repeating it
          over the systems step is the same panel twice for anybody walking
          from one to the other. */}
      {step === "milestones" && oneThing?.trim() && (
        <section className="rounded-2xl border border-violet-400/25 bg-violet-500/[0.05] px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-200/70">{PLAN_INTRO.oneEcho}</p>
          <button
            onClick={() => onGoToTab("one")}
            className="block text-left text-[13px] text-zinc-100 mt-1 leading-relaxed hover:text-white transition-colors"
            title={PLAN_INTRO.oneEdit}
          >{oneThing}</button>
          {requirements.length > 0 ? (
            <>
              <p className="text-[11.5px] text-zinc-400 mt-2.5">{PLAN_INTRO.oneNeeds(requirements.length)}</p>
              <ul className="flex flex-wrap gap-1.5 mt-1.5">
                {requirements.map((goal: NsGoal) => {
                  const area = plan.areas.find((a) => a.id === goal.areaId)
                  return (
                    <li key={goal.id}>
                      <button
                        onClick={() => setOpenId(goal.areaId)}
                        className="inline-flex items-center gap-1.5 text-[11.5px] px-2 py-0.5 rounded-full border border-white/15 text-zinc-100 hover:bg-white/10 transition-colors max-w-full"
                      >
                        <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: area?.color ?? "#a1a1aa" }} />
                        <span className="min-w-0 truncate">{goal.title}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          ) : (
            /* WRITE IT HERE, rather than being told where it gets written.
               This was a sentence pointing at step 3. Pointing is what a page
               does when it cannot be bothered: the box is the same box, the
               area is guessed the same way, and what lands is the same real
               goal — so it may as well be under the cursor that is already
               here. */
            <AddRequirement onAdd={onAddRequirement} />
          )}
        </section>
      )}

      {/* NOTHING ELSE ABOVE THE WHEEL.
          This opened on a line of counts, a season banner, and a card holding a
          builder, six doors and a question queue — three screens before the
          picture of your life. The wheel is the best navigator on the page and
          the only thing here that is already yours, so it goes first and the
          rest hangs off clicking it. */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
        {/* The same wheel, doing the same job it does everywhere: the whole life
            at once, and the fastest way into one part of it. Here a sector opens
            the goals rather than the rating, and the sub-labels count goals. */}
        <div className={`px-5 pt-5 pb-1 grid gap-4 items-start ${step === "systems" ? "lg:grid-cols-[minmax(0,1fr)_260px]" : ""}`}>
          <div className="min-w-0">
            <AreaWheel
              areas={plan.areas}
              ratings={ratings}
              goalCounts={goalCounts}
              activeId={openId}
              onPick={(id) => setOpenId(id === openId ? null : id)}
              subMode="goals"
              centreLabel="AREAS"
            />
            <p className="mt-1 text-center text-[12px] text-zinc-400">
              {step === "systems" ? PLAN_INTRO.wheelHintSystems : PLAN_INTRO.wheelHint}
            </p>
            <p className="mt-1 text-center text-[11.5px] text-zinc-500">
              {PLAN_INTRO.wheelFill}
              {needWhy > 0 ? ` ${needWhy} ${needWhy === 1 ? "goal still needs" : "goals still need"} a why.` : ""}
            </p>
          </div>

          {/* THE ROUTINES ARE ON THE SYSTEMS STEP AND NOWHERE ELSE.
              They stood beside the wheel on both steps while the two halves
              were one page, and once they are two the argument dies: a routine
              is a system, it is never a milestone, and the step about what you
              WANT has nothing to say about the stack you run on a Tuesday.
              Offering it there — and offering what it adds up to inside each
              area — is what made the wanting step read as a plan. */}
          {step === "systems" && (
            <RoutineStack
              plan={plan}
              openRoutineId={openRoutineId}
              setOpenRoutineId={setOpenRoutineId}
              editing={editing}
              setEditing={setEditing}
              onAdd={onAddRoutine}
              onOpenRoutine={() => setOpenId(null)}
            />
          )}
        </div>

        {/* WHICH STEP THIS IS, UNDER THE AREAS AND THE ROUTINES.
            This was a tab strip — the step, and the catalogue beside it. The
            catalogue is its own step now, so there is nothing to switch
            between here and a one-tab tablist is a control that does nothing.
            What is left says which step you are on, how much is on it, and
            the way to the other one. */}
        <div className="mt-1 border-b border-white/10 px-5">
          <div className="flex items-end gap-1">
            <h2 className="relative px-3.5 py-2 text-[13px] font-medium text-white">
              {HALVES_COPY[step].label}
              <span className="absolute left-0 right-0 -bottom-px h-0.5 rounded-full bg-violet-400" />
            </h2>
            <span className="ml-auto flex items-center gap-3 pb-2">
              <span className="text-[10.5px] text-zinc-600 tabular-nums">
                {step === "milestones" ? MILESTONES_COPY.tabCount(milestones.length) : MILESTONES_COPY.tabCountSystems(runningCount)}
              </span>
              {/* The other half, named as the step it is. Both directions,
                  because either one can be the one you started with. */}
              <button
                onClick={() => onGoToTab(step === "milestones" ? "systems" : "milestones")}
                className="text-[11px] text-zinc-500 hover:text-zinc-200 transition-colors"
              >
                {step === "milestones" ? HALVES_COPY.toSystems : HALVES_COPY.toMilestones}
              </button>
            </span>
          </div>
        </div>
        <p className="px-5 pt-2.5 text-[11.5px] text-zinc-400 leading-relaxed">{HALVES_COPY[half].line}</p>

        {/* The routine that is open, full width. Always a system — what it adds
            up to is offered as a milestone underneath it — so it only ever
            opens on the systems step. */}
        {step === "systems" && openRoutine && (
          <div className="mx-5 mb-4 rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
            <RoutineCard
              routine={openRoutine}
              areas={plan.areas}
              editing={editing}
              open
              onToggleOpen={() => setOpenRoutineId(null)}
              handlers={routineHandlers}
            />
            <DerivedMilestones plan={plan} routineId={openRoutine.id} onAdd={systemHandlers.onAddSystemMilestone} />
          </div>
        )}

        {/* The area you clicked, built here, with its 10 at the top — the
            reminder appears when you are working in that area rather than as a
            list of twelve under the wheel. */}
        {openArea && (
          <div className="mx-5 mb-4 rounded-xl border border-white/15 bg-white/[0.03] overflow-hidden">
            <div className="flex items-center gap-2 px-4 pt-3">
              <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: openArea.color }} />
              <span className="text-[12.5px] font-medium text-zinc-100 min-w-0 flex-1">{openArea.label}</span>
              <button onClick={() => setOpenId(null)} aria-label={`Close ${openArea.label}`} className="shrink-0 text-zinc-600 hover:text-zinc-200 transition-colors">
                <X className="size-3.5" />
              </button>
            </div>
            {/* THE WANTING, FIRST, AND ABOVE THE 10.
                The area opened on a picture of the finished thing and then a
                one-line box under it, which asks for the tidy answer twice
                over: the 10 says what "good" is here before anything is
                written, and one line of cursor says write one. The dump goes
                first, the 10 and the identity stay underneath it as the
                reminder they are, and the list of what you wrote follows. */}
            {step === "milestones" && <AreaWants plan={plan} area={openArea} handlers={guideHandlers} />}
            {/* WHO YOU SAID YOU WOULD BE HERE, beside what a 10 looks like.
                The identity and the values for an area are written two steps
                back and then never seen again — and they are the half that
                answers "why would I do any of this". A goal list under a
                picture of the outcome is a to-do list; under the outcome AND
                the person, it is a plan to become somebody. */}
            <AreaReminder area={openArea} review={areaReview(plan, openArea.id)} />
            {/* WHAT THE ROUTINES IN THIS AREA ADD UP TO IS NOT SHOWN HERE.
                It was: open Health under Milestones and the first thing on the
                page was hours and streaks read off the morning routine, offered
                as milestones. That is the systems step answering the wanting
                step's question — and it arrives before the person has written
                anything of their own, which is the surest way to get somebody
                else's list. The same offer still stands under the routine
                itself, one step along. */}
            <AreaBuilder
              plan={plan}
              today={today}
              handlers={guideHandlers}
              areaId={openArea.id}
              only={builderHalf}
              /* The box above already asked. Here it lists, and each row still
                 opens into where you are, by when and what you will do. */
              intake={step !== "milestones"}
              onGoToOtherHalf={() => onGoToTab(step === "milestones" ? "systems" : "milestones")}
            />
          </div>
        )}

        {/* The twelve areas as rows used to be here, under the wheel. That was
            the wheel again as text: same names, same numbers, same click, same
            dialog — which is exactly the argument that took the identical list
            off tab 2, and it applied here the moment the guide above became the
            place goals actually get written. */}

        {/* EVERYTHING WRITTEN SO FAR, WITHOUT PICKING AN AREA FIRST.
            The wheel is the way IN to an area, and until you clicked one this
            page showed you nothing you had written — so the list you are here
            to build was invisible from the page that builds it, and the only
            way to check whether you had already said something was to open
            twelve areas. Grouped by area and deliberately unnumbered: this step
            is the wanting, and ranking it is the focus step's job. */}
        {!openArea && step === "milestones" && milestones.length > 0 && (
          <div className="px-5 pb-4">
            <div className="flex items-baseline gap-2">
              <h3 className="text-[12.5px] font-semibold text-zinc-200">{MILESTONES_COPY.allTitle}</h3>
              <span className="ml-auto text-[10.5px] text-zinc-600 tabular-nums">{MILESTONES_COPY.allCount(milestones.length)}</span>
            </div>
            <p className="text-[10.5px] text-zinc-600 mt-0.5 leading-relaxed">{MILESTONES_COPY.allHelp}</p>
            <div className="mt-2.5 space-y-2.5">
              {plan.areas
                .map((area) => ({ area, rows: milestoneGoals(plan, area.id) }))
                .filter(({ rows }) => rows.length > 0)
                .map(({ area, rows }) => (
                  <div key={area.id}>
                    <button
                      onClick={() => setOpenId(area.id)}
                      className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 hover:text-zinc-200 transition-colors"
                    >
                      <span className="size-1.5 rounded-full" style={{ backgroundColor: area.color }} />
                      {area.label}
                      <span className="text-zinc-700 tabular-nums">{rows.length}</span>
                    </button>
                    <ul className="flex flex-wrap gap-1.5 mt-1.5">
                      {rows.map((goal) => (
                        <li key={goal.id}>
                          <button
                            onClick={() => { setOpenId(goal.areaId); onOpenGoal(goal.areaId, goal.id) }}
                            className="inline-flex items-center gap-1.5 text-[11.5px] px-2 py-0.5 rounded-full border border-white/10 text-zinc-200 hover:bg-white/10 hover:border-white/30 transition-colors max-w-full"
                          >
                            <span className="min-w-0 truncate">{goal.title}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          </div>
        )}

        {gaps.length > 0 && (
          <p className="px-5 py-2.5 text-[11.5px] text-zinc-500 border-t border-white/10">
            {PLAN_INTRO.gap(gaps.map((a) => a.label).join(", "))}
          </p>
        )}

        {/* NO WHOLE-PLAN LIST HERE, AND NO YEAR-AS-THINGS-TO-HIT UNDERNEATH.
            Every goal across every area, in priority order, and then the same
            goals again spread over twelve months: two long answers to "so what
            have I got", on the step whose whole job is writing the next line.
            They also listed both halves — a Tuesday run sitting in the list of
            things you want to have achieved — which is the distinction this
            step exists to draw. Ordering lives on Focus & season, which is the
            step about choosing between what is written. */}

        {/* WHAT IS RUNNING AT WHAT — the systems half's own body, and the
            question the split exists to make askable. */}
        {half === "systems" && (
          <SystemLinks plan={plan} handlers={systemHandlers} onOpenArea={(id: string) => setOpenId(id)} />
        )}

        {/* THE CATALOGUE IS NOT HERE. It was a tab on this page; it is step 5
            now, walked through before either build step. */}
      </section>

      {/* The catalogue, last and closed.
          It was the front page for one afternoon: every area, every set, every
          target, every practice, 329 controls and nine screens of scroll. It
          assumed the hard part was choosing, and the hard part is that almost
          nobody's real goals are in any catalogue. So it kept its job — a set
          arrives with numbers, rungs, a date and its routine — and lost its
          place. */}
      {/* The list that is not goals. Closed, and absent entirely until there is
          something in it — somebody who never opens that door should not have a
          permanently empty section explaining what they are missing. */}
      {/* THINGS TO EXPERIENCE IS GONE FROM THIS PAGE.
          A Ferrari, a threesome, the northern lights — a second list, with its
          own heading and its own rules, under a step whose own box now asks
          for exactly that: everything in this area you want to experience. Two
          lists asking one question is the thing that made this page long. The
          component (`ExperienceList`) and the model (`plan.experiences`) are
          untouched, and anything already written there is still in the plan —
          it has no surface on this step. */}

      {/* The catalogue used to live down here, closed, and only once the plan
          had a goal in it. It is a tab now — see the Templates half above. */}

    </div>
  )
}

/**
 * The 10, the identity and the values for the area you are working in.
 *
 * All three are written on the step before this one and then never shown again
 * while the goals are being written — which leaves the goal list floating free
 * of the reason it exists. Together they say: this is what it looks like, this
 * is who you are when it is true, and this is what it asks of you.
 */
function AreaReminder({ area, review }: { area: NsArea; review: NsAreaReview }) {
  const ten = review.ten.trim()
  const identity = review.identity.trim()
  /**
   * Nothing to remind you of, no card.
   *
   * With neither written it rendered as an empty coloured strip, which was
   * invisible enough at the top of the panel and is a bug-shaped bar now that
   * the wanting box sits above it.
   */
  if (!ten && !identity) return null
  return (
    <div
      className="mx-4 mt-2 rounded-xl border px-3.5 py-3 space-y-2"
      style={{ borderColor: `${area.color}55`, backgroundColor: `${area.color}14` }}
    >
      {ten && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: area.color }}>
            {PLAN_INTRO.tenReminder}
          </p>
          <p className="text-[12.5px] text-zinc-100 mt-0.5 leading-relaxed">{ten}</p>
        </div>
      )}
      {identity && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: area.color }}>
            {PLAN_INTRO.identityReminder}
          </p>
          <p className="text-[12.5px] text-zinc-100 mt-0.5 leading-relaxed">{identity}</p>
        </div>
      )}
      {/* NO VALUES HERE.
          They were shown here, then made editable, and now they are gone: this
          step is what you want and what you will do about it, and a ranking
          exercise in the corner of it is a third subject competing with both.
          Values are step 6, where they get the room to be ranked properly. */}
    </div>
  )
}



/**
 * The four routines, beside the wheel on the goals tab.
 *
 * They live here rather than with the assessment because they ARE the plan: the
 * part of it that runs whether or not you looked at the page. Compact on
 * purpose — name, what it costs a week, the colour of the area it is filed
 * under — with the whole builder opening full width underneath, since it is two
 * columns wide and unreadable squeezed into a rail.
 */
function RoutineStack({
  plan,
  openRoutineId,
  setOpenRoutineId,
  editing,
  setEditing,
  onAdd,
  onOpenRoutine,
}: {
  plan: NsPlan
  openRoutineId: string | null
  setOpenRoutineId: (id: string | null) => void
  editing: boolean
  setEditing: (next: boolean) => void
  onAdd: (blueprintId: string) => void
  /** Closes the open area, so only one thing is being worked on. */
  onOpenRoutine: () => void
}) {
  return (
    <div id="ns-routines" className="min-w-0 scroll-mt-4">
      <div className="flex items-baseline gap-2">
        <h3 className="text-[13px] font-semibold text-zinc-200">{ROUTINES_INTRO.title}</h3>
        <span className="text-[10.5px] text-zinc-600 tabular-nums">{plan.routines.length}</span>
        {/* Structure only: rename one, remove one, add one. Opening a routine
            and changing what is in it is not editing, so it works either way. */}
        <button
          onClick={() => setEditing(!editing)}
          aria-pressed={editing}
          className={`ml-auto shrink-0 inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg border transition-colors ${
            editing
              ? "border-violet-500/40 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25"
              : "border-white/15 text-zinc-400 hover:text-white hover:border-white/30"
          }`}
        >
          {editing ? <Check className="size-3" /> : <Pencil className="size-3" />}
          {editing ? "Done" : "Edit"}
        </button>
      </div>
      <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
        {editing ? ROUTINES_INTRO.help : ROUTINES_INTRO.beside}
      </p>

      <ul className="mt-2.5 space-y-1.5">
        {plan.routines.map((routine) => {
          const area = plan.areas.find((a) => a.id === routine.areaId)
          const color = area?.color ?? "#a1a1aa"
          const open = routine.id === openRoutineId
          return (
            <li key={routine.id}>
              <button
                onClick={() => { setOpenRoutineId(open ? null : routine.id); if (!open) onOpenRoutine() }}
                aria-pressed={open}
                className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  open ? "border-white/30 bg-white/[0.06]" : "border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-[12.5px] font-medium text-zinc-100 min-w-0 truncate">{routine.label}</span>
                </span>
                <span className="block text-[10.5px] text-zinc-500 tabular-nums mt-0.5 pl-4">
                  {routineSummary(routine)}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {editing && <AddRoutine plan={plan} onAdd={onAdd} />}
    </div>
  )
}


/**
 * The twelve 10s used to be listed here, under the wheel.
 *
 * It was the right instinct and the wrong place: a column of twelve paragraphs
 * under a picture of twelve areas is the picture again as text, and it pushed
 * the work down the page. The 10 now appears where it is useful — inside the
 * area you opened, above the goals you are writing in it.
 */


function AddRoutine({ plan, onAdd }: { plan: NsPlan; onAdd: (blueprintId: string) => void }) {
  const [open, setOpen] = useState(false)
  const used = new Set(plan.routines.map((r) => r.blueprintId))
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full mt-1.5 rounded-xl border border-dashed border-white/15 py-2 text-[11.5px] text-zinc-500 hover:text-zinc-200 hover:border-white/30 transition-colors"
      >
        + Add another routine
      </button>
    )
  }
  return (
    <div className="mt-1.5 rounded-xl border border-white/10 p-3">
      <div className="flex items-center gap-2">
        <p className="text-[11px] text-zinc-500">Which one?</p>
        <button onClick={() => setOpen(false)} className="ml-auto text-[10px] text-zinc-600 hover:text-zinc-400">cancel</button>
      </div>
      <div className="grid gap-2 mt-2">
        {ROUTINE_BLUEPRINTS.map((bp) => (
          <button
            key={bp.id}
            onClick={() => { onAdd(bp.id); setOpen(false) }}
            className="rounded-xl border border-white/10 bg-white/[0.02] p-2.5 text-left hover:border-white/25 transition-colors"
          >
            <span className="flex items-baseline gap-2">
              <span className="text-[12px] font-medium text-zinc-200">{bp.label}</span>
              {used.has(bp.id) && <span className="text-[10px] text-zinc-600">already in your stack</span>}
            </span>
            <span className="block text-[10.5px] text-zinc-500 mt-0.5 leading-relaxed">{bp.why}</span>
          </button>
        ))}
      </div>
    </div>
  )
}


/**
 * WHAT A ROUTINE ADDS UP TO.
 *
 * A routine is a system and never a milestone — "morning routine" is not
 * something you achieve. Its total is: ninety minutes of deep work five days a
 * week is four hundred hours a year, and four hundred hours is a number
 * somebody will be proud of. The numbers come off the routine as built, so
 * they mean something to this person rather than to a person in an example.
 */
function DerivedMilestones({
  plan,
  routineId,
  areaId,
  onAdd,
}: {
  plan: NsPlan
  routineId?: string
  areaId?: string
  onAdd: (routineId: string, id: "hours" | "sessions" | "streak", areaId?: string) => void
}) {
  const routine = routineId ? plan.routines.find((r) => r.id === routineId) : null
  const options = routine
    ? systemMilestones(routine).map((m) => ({ ...m, routineId: routine.id, routineLabel: routine.label }))
    : areaId
      ? areaSystemMilestones(plan, areaId)
      : []
  if (options.length === 0) return null
  /**
   * QUIET, AND SHORT.
   *
   * It was a bordered card with a title, two lines of explanation and a note
   * under every option — fifteen of those on one area. What it is now: one
   * line saying where these came from, and the suggestions as chips you can
   * press. The reasoning that used to be printed under each one lives in the
   * title attribute, for whoever wants it.
   */
  return (
    <div className="mx-4 my-2">
      <p className="text-[10.5px] text-zinc-500">{HALVES_COPY.derivedTitle}</p>
      <ul className="flex flex-wrap gap-1.5 mt-1">
        {options.map((option) => (
          <li key={`${option.routineId}-${option.id}`}>
            <button
              onClick={() => onAdd(option.routineId, option.id, areaId)}
              title={`${option.note} ${HALVES_COPY.derivedFrom(option.routineLabel)}`}
              className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-emerald-400/25 bg-emerald-500/[0.06] text-emerald-50 hover:bg-emerald-500/15 transition-colors"
            >
              <Plus className="size-2.5 shrink-0 text-emerald-300/70" />
              {option.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}


/**
 * The systems half's body: what is running at what.
 *
 * This is the question the two halves exist to make askable, and it cannot be
 * asked while the wanting and the doing are one column of "goals". Every
 * milestone with what moves it underneath, a way to point something new at it,
 * and — named rather than hidden — the two failure modes: a milestone with
 * nothing running at it is a wish, a system pointed at nothing is a chore.
 */
export function SystemLinks({
  plan,
  handlers,
  onOpenArea,
}: {
  plan: NsPlan
  handlers: SystemHandlers
  onOpenArea: (areaId: string) => void
}) {
  const milestones = milestoneGoals(plan)
  const wishes = milestonesWithoutSystems(plan)
  const orphans = systemsWithoutMilestones(plan)

  return (
    <div className="px-5 pb-5 space-y-4">
      {milestones.length === 0 ? (
        <p className="text-[12px] text-zinc-500 leading-relaxed">{SYSTEMS_COPY.noMilestones}</p>
      ) : (
        <div>
          <p className="text-[12.5px] text-zinc-200">{SYSTEMS_COPY.linkTitle}</p>
          <p className="text-[11.5px] text-zinc-500 mt-0.5 leading-relaxed">{SYSTEMS_COPY.linkHelp}</p>
          <ul className="mt-2.5 space-y-3">
            {plan.areas
              .filter((area) => milestoneGoals(plan, area.id).length > 0)
              .map((area) => (
                <li key={area.id}>
                  <button
                    onClick={() => onOpenArea(area.id)}
                    className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    <span className="size-1.5 rounded-full" style={{ backgroundColor: area.color }} />
                    {area.label}
                  </button>
                  <ul className="mt-1.5 space-y-1.5">
                    {milestoneGoals(plan, area.id).map((goal) => (
                      <MilestoneLinks key={goal.id} plan={plan} goal={goal} handlers={handlers} />
                    ))}
                  </ul>
                </li>
              ))}
          </ul>
        </div>
      )}

      {(wishes.length > 0 || orphans.length > 0) && (
        <div className="rounded-xl border border-amber-400/20 bg-amber-500/[0.04] px-3.5 py-3 space-y-2.5">
          {wishes.length > 0 && (
            <div>
              <p className="text-[12px] text-amber-100">{SYSTEMS_COPY.wishesTitle(wishes.length)}</p>
              <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">{SYSTEMS_COPY.wishesHelp}</p>
              <p className="text-[11.5px] text-zinc-300 mt-1">{wishes.map((g) => g.title).join(" · ")}</p>
            </div>
          )}
          {orphans.length > 0 && (
            <div>
              <p className="text-[12px] text-amber-100">{SYSTEMS_COPY.orphansTitle(orphans.length)}</p>
              <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">{SYSTEMS_COPY.orphansHelp}</p>
              <p className="text-[11.5px] text-zinc-300 mt-1">{orphans.map((s) => s.title).join(" · ")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** One milestone, everything running at it, and a way to point more at it. */
function MilestoneLinks({ plan, goal, handlers }: { plan: NsPlan; goal: NsGoal; handlers: SystemHandlers }) {
  const [picking, setPicking] = useState(false)
  const running = systemsForGoal(plan, goal.id)
  const candidates = [
    ...plan.routines.flatMap((r) =>
      r.steps
        .filter((step) => !step.servesGoalIds.includes(goal.id))
        .map((step) => ({ kind: "step" as const, id: step.id, routineId: r.id, title: step.title, where: r.label })),
    ),
    ...plan.goals
      .filter((g) => g.type === "habit_ramp" && !g.feedsGoalIds.includes(goal.id))
      .map((g) => ({ kind: "driver" as const, id: g.id, routineId: undefined, title: g.title, where: goalRateLabel(g) })),
  ]

  return (
    <li className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-2">
      <div className="flex items-baseline gap-2">
        <span className="text-[12.5px] text-zinc-100 min-w-0 flex-1">{goal.title}</span>
        <button
          onClick={() => setPicking(!picking)}
          aria-expanded={picking}
          className="shrink-0 text-[10.5px] px-2 py-0.5 rounded-full border border-white/15 text-zinc-300 hover:bg-white/10 transition-colors"
        >
          {SYSTEMS_COPY.linkAdd}
        </button>
      </div>

      {running.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5 mt-1.5">
          {running.map((system) => (
            <li key={`${system.kind}-${system.id}`} className="inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-500/[0.06] pl-2 pr-1 py-0.5">
              <span className="text-[11px] text-emerald-50">{system.title}</span>
              <span className="text-[9.5px] text-emerald-200/60">
                {system.routineLabel ?? SYSTEMS_COPY.kind[system.kind]} · {system.daysPerWeek}×
              </span>
              {system.kind !== "action" && (
                <button
                  onClick={() =>
                    system.kind === "step"
                      ? handlers.onLinkStep(system.routineId as string, system.id, goal.id, false)
                      : handlers.onLinkGoal(system.id, goal.id, false)
                  }
                  aria-label={`Unlink ${system.title} from ${goal.title}`}
                  className="size-4 rounded text-emerald-200/50 hover:text-rose-300 flex items-center justify-center transition-colors"
                ><X className="size-3" /></button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11px] text-amber-200/70 mt-1">{SYSTEMS_COPY.nothingRunning}</p>
      )}

      {picking && (
        <div className="mt-2 rounded-lg border border-white/10 bg-black/20 p-2">
          {candidates.length === 0 ? (
            <p className="text-[11px] text-zinc-500">{SYSTEMS_COPY.nothingToLink}</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {candidates.map((c) => (
                <li key={`${c.kind}-${c.id}`}>
                  <button
                    onClick={() => {
                      if (c.kind === "step") handlers.onLinkStep(c.routineId as string, c.id, goal.id, true)
                      else handlers.onLinkGoal(c.id, goal.id, true)
                      setPicking(false)
                    }}
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-white/15 text-zinc-200 hover:bg-white/10 transition-colors"
                  >
                    <Plus className="size-2.5" />
                    {c.title}
                    <span className="text-[9.5px] text-zinc-500">{c.where}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  )
}


/** One line, filed where the words say it belongs. Same adder as step 3. */
function AddRequirement({ onAdd }: { onAdd: (title: string) => void }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState("")
  const add = () => {
    if (!draft.trim()) return
    onAdd(draft)
    setDraft("")
  }
  /**
   * CLOSED UNTIL ASKED FOR.
   *
   * Somebody who has written their one thing does not want the page's next
   * words to be a box demanding more of them. It is one line to click when
   * they want it, and silent otherwise.
   */
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 text-[11.5px] text-zinc-500 hover:text-zinc-200 underline decoration-dotted underline-offset-2 transition-colors"
      >{PLAN_INTRO.oneNothingYet}</button>
    )
  }
  return (
    <div className="mt-2.5">
      <div className="flex items-center gap-1.5">
        <Plus className="size-3.5 text-zinc-600 shrink-0" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add() } }}
          placeholder={PLAN_INTRO.oneNeedsPlaceholder}
          aria-label={PLAN_INTRO.oneNothingYet}
          className="flex-1 min-w-0 bg-transparent border-b border-white/10 focus:border-white/30 text-[12.5px] text-zinc-100 placeholder:text-zinc-700 focus:outline-none py-1 transition-colors"
        />
        <button
          onClick={add}
          disabled={!draft.trim()}
          className="shrink-0 text-[11.5px] px-2.5 py-1 rounded-lg border border-white/15 text-zinc-100 hover:bg-white/10 disabled:opacity-30 transition-colors"
        >{PLAN_INTRO.oneNeedsAdd}</button>
      </div>
    </div>
  )
}
