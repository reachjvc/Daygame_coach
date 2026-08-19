"use client"

/**
 * One area, built the way somebody actually builds one.
 *
 * WHAT THIS REPLACES: a paragraph box. You wrote every goal for every area into
 * one textarea, and then a round-robin queue asked one question about one goal,
 * jumped to a different goal, and came back later. Nobody plans like that. You
 * take an area, you say everything you want in it, and then you take one of
 * those and finish it — how far, by when, what that means month by month, and
 * what you do on a Tuesday to make it happen.
 *
 * So this is one area at a time, and inside it:
 *
 *   1. every achievement you want here, listed — all of them, not the tidy one
 *   2. pick one, say where you are and where you are going, and by when
 *   3. it scales itself: the rungs between here and there, dated
 *   4. what gets you there, daily, and those are tracked as well
 *
 * Nothing here is new machinery. `setLadderStart` already spaces the rungs,
 * `suggestedActions` already knows what the routines in this area are made of,
 * `addAction` already tracks them. What was missing was a screen that does them
 * in that order, on one thing at a time.
 */

import { useState } from "react"
import { Check, ChevronDown, Plus, X } from "lucide-react"
import type { NsGoal, NsPlan } from "@/src/goals/types"
import { GOAL_DATE_PRESETS } from "@/src/goals/data/northStar"
import { BUILDER_COPY, OTHER_HALF_COPY, SYSTEM_BUILDER_COPY, WANT_EXAMPLES } from "@/src/goals/data/northStarStart"
import {
  areaGoalExample,
  areaOffersFor,
  goalRateLabel,
  goalEchoes,
  isMilestone,
  datedRungs,
  milestoneCheckpoints,
  parseProgression,
  isSystem,
  areaOfferNote,
  areaReview,
  climbPace,
  formatTargetDate,
  goalMilestones,
  goalsInArea,
  parseGoalTarget,
  presetDate,
  seasonAreas,
  suggestedActions,
  targetsForTemplate,
  templateFootprint,
  templatesInArea,
} from "@/src/goals/northStarService"
import { GeneratePanel } from "./Generate"
import { MilestoneBuilder } from "./GoalCard"
import { MilestoneCurveEditor } from "../MilestoneCurveEditor"
import type { GuideHandlers } from "./GuidedBuild"

export function AreaBuilder({ plan, today, handlers, areaId: controlledId, only, onGoToOtherHalf, intake = true }: {
  plan: NsPlan
  today: string
  handlers: GuideHandlers
  /**
   * The area to build, when something else is choosing it.
   *
   * On the goals tab the wheel is the chooser — clicking a sector opens that
   * area here — so the chips would be the same control twice, and the second
   * copy of a control is the one that disagrees with the first.
   */
  areaId?: string
  /**
   * Which half of the plan this builder is for.
   *
   * Milestones and systems are separate steps now, and each one lists its own.
   * The row you have OPEN stays listed whichever it is, so that switching a
   * goal's type mid-edit does not make it vanish from under the cursor — it
   * moves to the other step when you close it, which is both true and calm.
   */
  only?: "milestones" | "systems"
  /**
   * Sends you to the other step, for the lines that landed there.
   *
   * A rate typed on the achievements step is filed as a system and is not on
   * this list, so without somewhere to go the line has simply disappeared.
   */
  onGoToOtherHalf?: () => void
  /**
   * Whether this builder asks for the lines, or only lists them.
   *
   * On the achievements step the asking moved above the area's 10, into a box
   * you can dump into (`AreaWants`) — so the heading, the one-line adder and
   * the note under it would be the same question a second time, one paragraph
   * lower. Everywhere else the builder is still the place the question gets
   * asked, so this defaults to on.
   */
  intake?: boolean
}) {
  const picked = seasonAreas(plan)
  // The season's areas when there are any; otherwise all of them, because a
  // builder that refuses to open until you have been to another tab is a wall.
  const areas = picked.length > 0 ? picked : plan.areas
  const [ownId, setOwnId] = useState(areas[0]?.id ?? "")
  const areaId = controlledId ?? ownId
  const setAreaId = setOwnId
  const area = (controlledId ? plan.areas : areas).find((a) => a.id === areaId) ?? areas[0]
  const [openGoalId, setOpenGoalId] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [justAdded, setJustAdded] = useState<string | null>(null)

  if (!area) return null
  const half: "milestones" | "systems" = only === "systems" ? "systems" : "milestones"
  const copy = half === "systems" ? SYSTEM_BUILDER_COPY : BUILDER_COPY
  const allGoals = goalsInArea(plan, area.id)
  const mine = (g: NsGoal) => (half === "milestones" ? isMilestone(g) : isSystem(g))
  const goals = only
    ? allGoals.filter((g) => mine(g) || g.id === openGoalId)
    : allGoals
  /**
   * The lines in this area that are the OTHER half's kind.
   *
   * The list above shows one kind only — achievements on the achievements step
   * — so a rate typed here is filed, correctly, somewhere this list will never
   * show it. Naming them is the difference between "it went to the other step"
   * and "it disappeared".
   *
   * SYSTEMS ONLY, by decision: on the achievements step this printed a strip
   * of the person's own drivers ("No weed") under a paragraph about which step
   * they are on, every time the area was opened, which is a filing note in the
   * middle of the wanting. The cost is real and is the comment above — a rate
   * typed on the achievements step now moves to Systems silently.
   */
  const elsewhere = only === "systems" ? allGoals.filter((g) => !mine(g) && g.id !== openGoalId) : []
  // The goal the last line became, open on arrival.
  const arrived = justAdded ? goals.find((g) => g.title.trim().toLowerCase() === justAdded) : null
  /**
   * The steps already running in this area, from every routine that reaches it.
   *
   * A routine is filed under one area and serves others, so Health's list holds
   * the morning routine's steps even though the routine is not "a Health
   * routine". This is the same reach `areaCoverage` counts.
   */
  const running = plan.routines
    .filter((r) => r.areaId === area.id || r.serves.includes(area.id))
    .flatMap((r) => r.steps.map((step) => ({ title: step.title, routine: r.label, daysPerWeek: step.daysPerWeek })))
  const showId = arrived?.id ?? openGoalId
  const ten = areaReview(plan, area.id).ten.trim()
  /** What this area's boxes show as an example, rather than Fitness's. */
  const example = areaGoalExample(area.id)

  const add = () => {
    if (!draft.trim()) return
    handlers.onAddDump(area.id, draft)
    // Remembered so the row it becomes can be opened the moment it exists: the
    // questions that finish a goal — where you are, by when, what you will do —
    // are the point of writing it down, and they were two clicks away.
    setJustAdded(draft.trim().toLowerCase())
    setDraft("")
  }

  return (
    <div className="px-5 py-4">
      {/* Which area, when nothing else is choosing. */}
      {!controlledId && (
      <div className="flex flex-wrap gap-1.5">
        {areas.map((a) => {
          const on = a.id === area.id
          const n = goalsInArea(plan, a.id).length
          return (
            <button
              key={a.id}
              onClick={() => { setAreaId(a.id); setOpenGoalId(null) }}
              aria-pressed={on}
              className={`inline-flex items-center gap-1.5 text-[11.5px] px-2.5 py-1 rounded-full border transition-colors ${
                on ? "border-white/35 bg-white/10 text-white" : "border-white/10 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span className="size-1.5 rounded-full" style={{ backgroundColor: a.color }} />
              {a.label}
              <span className="text-[9.5px] text-zinc-500 tabular-nums">{n}</span>
            </button>
          )
        })}
      </div>
      )}

      {intake ? (
        <>
      {/* THE WORDS CHANGE WITH THE HALF. Asking "everything you want in
          Fitness" while the person is writing systems is asking the wrong
          question in the right box. */}
      <h2 className="text-sm font-semibold text-zinc-200">{copy.title(area.label)}</h2>
      <p className="text-[11.5px] text-zinc-400 mt-1 leading-relaxed">{copy.help}</p>
      {/* Only when nothing above is already showing it. On the goals tab the
          panel that the wheel opens prints the 10 in its header, and the same
          paragraph twice in one card reads as a bug. */}
      {ten && !controlledId && (
        <p className="text-[11px] text-zinc-500 mt-1.5 border-l-2 pl-2 leading-relaxed" style={{ borderColor: area.color }}>
          {BUILDER_COPY.tenPrefix} {ten}
        </p>
      )}

      {/* One line at a time, and the list stays in front of you. A box you have
          to fill in one sitting is the paragraph again with a smaller cursor. */}
      <div className="flex items-center gap-2 mt-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add() } }}
          placeholder={copy.placeholder(half === "systems" ? example.action : example.want)}
          aria-label={copy.title(area.label)}
          className="min-w-0 flex-1 bg-transparent border-b border-white/15 focus:border-white/35 text-[13px] text-zinc-100 placeholder:text-zinc-700 focus:outline-none py-1.5 transition-colors"
        />
        <button
          onClick={add}
          disabled={!draft.trim()}
          className="shrink-0 inline-flex items-center gap-1 text-[12px] px-2.5 py-1 rounded-lg border border-white/15 text-zinc-100 hover:bg-white/10 disabled:opacity-30 transition-colors"
        >
          <Plus className="size-3" />
          {BUILDER_COPY.add}
        </button>
      </div>
      <p className="text-[10.5px] text-zinc-600 mt-1 leading-relaxed">{BUILDER_COPY.allOfThem}</p>
        </>
      ) : (
        /* The box above asked the question. This is the list it fills. */
        goals.length > 0 && <h2 className="text-sm font-semibold text-zinc-200">{BUILDER_COPY.listTitle}</h2>
      )}

      {/* WHAT ALREADY RUNS HERE, before you write it again.
          Somebody stretches in their morning routine and then types "stretch"
          under Health, because nothing on this screen said it was already
          running — and which of the two they reach for first is not something
          we can know. Showing it is most of the fix: the collision that still
          happens is named on the row itself.

          SYSTEMS ONLY. That collision is a collision between two systems, and
          the milestones step has no routines on it at all: a person listing
          what they want in Health does not need to be told which steps of their
          morning stack reach the area. */}
      {half === "systems" && running.length > 0 && (
        <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.05] px-3 py-2">
          <p className="text-[11px] text-emerald-100/90">{BUILDER_COPY.running(area.label)}</p>
          <ul className="flex flex-wrap gap-1.5 mt-1.5">
            {running.map((step) => (
              <li key={`${step.routine}-${step.title}`} className="inline-flex items-baseline gap-1 text-[11px] px-2 py-0.5 rounded-full border border-emerald-400/25 text-emerald-50">
                {step.title}
                <span className="text-[9.5px] text-emerald-200/60">{step.routine} · {step.daysPerWeek}×</span>
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-zinc-500 mt-1.5 leading-relaxed">{BUILDER_COPY.runningNote}</p>
        </div>
      )}

      {/* WHAT OTHER PEOPLE SET IN THIS AREA, in this area.
          The catalogue existed the whole time, three sections down the page and
          behind a disclosure called "browse everything on offer" — so opening
          Health gave you a blank line and no sign that seventy-five ready-made
          goals for Health were on the same screen. An offer you have to go
          looking for is not an offer. */}
      {/* SYSTEMS ONLY, NOW.
          On the achievements step it was the first thing under the box: a
          catalogue of what other people set here, offered before the person
          had written a line of their own — which is the surest way to get
          somebody else's list, and it is the same catalogue the Templates tab
          held. The step is the dump now, and the dump is nobody else's. */}
      {half === "systems" && <AreaOffers plan={plan} area={area} handlers={handlers} half={half} />}

      {goals.length === 0 ? (
        <p className="text-[11.5px] text-zinc-600 mt-4">{copy.empty(area.label)}</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {goals.map((goal) => (
            <li key={goal.id}>
              <AchievementRow
                plan={plan}
                goal={goal}
                today={today}
                open={showId === goal.id}
                onToggle={() => { setJustAdded(null); setOpenGoalId(showId === goal.id ? null : goal.id) }}
                handlers={handlers}
              />
            </li>
          ))}
        </ul>
      )}

      {/* PUT A WHOLE SET BACK, from where its goals are.
          Only on the wanting half, because a set is goals — a routine you did
          not want is removed on its own card, one click, same idea. */}
      {half === "milestones" && <TakenSets plan={plan} areaId={area.id} handlers={handlers} />}

      {/* WHERE THE OTHER LINES WENT — SAID, NOT SHOWN.
          The step shows achievements and nothing else, so a system is not
          printed here in any form, not even as a grey chip under the list:
          "Consistent Bedtime" sitting under the things you want to have
          achieved is the thing the split exists to stop. But a line that is
          filed somewhere this page will never show it, with nothing said, is a
          line the person watched disappear — so one sentence names the count
          and the step it went to, and the step itself does the showing. */}
      {elsewhere.length > 0 && (
        <p className="mt-2.5 text-[10.5px] text-zinc-600 leading-relaxed">
          {half === "milestones" ? OTHER_HALF_COPY.fromMilestones(elsewhere.length) : OTHER_HALF_COPY.fromSystems(elsewhere.length)}
          {onGoToOtherHalf && (
            <>
              {" "}
              <button onClick={onGoToOtherHalf} className="underline underline-offset-2 hover:text-zinc-300 transition-colors">
                {half === "milestones" ? OTHER_HALF_COPY.goSystems : OTHER_HALF_COPY.goMilestones}
              </button>
            </>
          )}
        </p>
      )}
    </div>
  )
}

/**
 * EVERYTHING YOU WANT HERE, ABOVE THE PICTURE OF A 10.
 *
 * The area used to open on its 10 and its identity, and then a one-line adder.
 * A single line is a box that asks for the tidy answer: you write the one you
 * would say out loud and stop. This asks for the dump — all of it, in any
 * order, before anything is dated, qualified or prioritised — which is what
 * this step is for, and it sits above the 10 because the 10 is a picture of
 * the finished thing and reading it first narrows what gets written.
 *
 * Every line lands as a real goal in this area (`addGoalsFromDump`), so the
 * list underneath fills as you add, and nothing here asks for anything else.
 */
export function AreaWants({ plan, area, handlers }: {
  /** For the badge colours, and for knowing which examples are already taken. */
  plan: NsPlan
  area: { id: string; label: string }
  handlers: GuideHandlers
}) {
  const [text, setText] = useState("")
  const example = areaGoalExample(area.id)
  const line = text.trim()

  const add = () => {
    if (!line) return
    handlers.onAddDump(area.id, line)
    setText("")
  }

  /**
   * Which examples are already on the plan, by title.
   *
   * Clicking one twice is the obvious accident — the list does not reorder or
   * disappear as you use it — so a taken one says so and stops being a button
   * rather than quietly writing the same want twice.
   */
  const taken = new Set(plan.goals.map((g) => g.title.trim().toLowerCase()))
  /** This area's prompts, and only this area's. An area somebody invented has
      none, and shows none rather than borrowing another life's. */
  const examples = WANT_EXAMPLES.filter((w) => w.areaId === area.id)

  return (
    <div className="mx-4 mt-3">
      <h3 className="text-sm font-semibold text-zinc-200">{BUILDER_COPY.title(area.label)}</h3>
      <p className="text-[11.5px] text-zinc-400 mt-1 leading-relaxed">{BUILDER_COPY.wantsHelp}</p>

      {/* ONE AT A TIME, AND ENTER ADDS IT.
          It was a five-row textarea taking a list, which is the right shape for
          somebody pasting the notes app they already keep and the wrong shape
          for everybody else: a big empty box asks for a finished answer, and a
          finished answer is what nobody has yet. One line, one button, and the
          list of what you wrote grows under the 10. */}
      <div className="flex items-center gap-2 mt-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add() } }}
          placeholder={BUILDER_COPY.wantsPlaceholder(example.want)}
          aria-label={BUILDER_COPY.title(area.label)}
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-white/30 transition-colors"
        />
        <button
          onClick={add}
          disabled={!line}
          className="shrink-0 inline-flex items-center gap-1 text-[12px] px-2.5 py-1.5 rounded-lg border border-white/15 text-zinc-100 hover:bg-white/10 disabled:opacity-30 transition-colors"
        >
          <Plus className="size-3" />
          {BUILDER_COPY.wantsAdd(line ? 1 : 0)}
        </button>
      </div>
      <p className="text-[10.5px] text-zinc-600 mt-1 leading-relaxed">{BUILDER_COPY.allOfThem}</p>

      {/* THIS AREA'S SIX, UNDER THE BOX.
          It was twenty from across the whole life, each badged with the area it
          belonged to and landing there — so opening Money offered a muscle-up
          and ten days of silence, and the one chip that answered the question
          on the screen was three rows down. A prompt list answers "what sort of
          thing goes here", so it is the area you opened and nothing else, which
          also means the badge can go: every one of them is this area. */}
      {examples.length > 0 && (
      <div className="mt-3">
        <p className="text-[11px] font-semibold text-zinc-300">{BUILDER_COPY.examplesTitle}</p>
        <p className="text-[10.5px] text-zinc-600 mt-0.5 leading-relaxed">{BUILDER_COPY.examplesHelp(area.label)}</p>
        <ul className="flex flex-wrap gap-1.5 mt-2">
          {examples.map((want) => {
            const home = area
            const already = taken.has(want.title.trim().toLowerCase())
            return (
              <li key={`${want.areaId}-${want.title}`}>
                <button
                  onClick={() => handlers.onAddDump(want.areaId, want.title)}
                  disabled={already}
                  title={`${home.label}${already ? ` · ${BUILDER_COPY.examplesAdded}` : ""}`}
                  className={`inline-flex items-center gap-1.5 text-[11.5px] pl-2 pr-2.5 py-1 rounded-full border transition-colors ${
                    already
                      ? "border-white/[0.07] text-zinc-600"
                      : "border-white/10 text-zinc-200 hover:bg-white/10 hover:border-white/30"
                  }`}
                >
                  {already ? <Check className="size-3 text-emerald-300/70" /> : <Plus className="size-3 text-zinc-600" />}
                  <span>{want.title}</span>
                  {/* NO AREA BADGE. It said which area the chip belonged to
                      back when the list spanned all twelve; on a list that is
                      this area only, it is the same word twelve times. */}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
      )}
    </div>
  )
}


/**
 * One achievement, finished in place.
 *
 * Collapsed it says what is still missing, which is the same information the
 * round-robin queue used to deliver one question at a time across the whole
 * plan. Open, it asks for the three things in the order they depend on each
 * other: where you are and where you are going, by when, and what you will do
 * about it on an ordinary week.
 */
function AchievementRow({ plan, goal, today, open, onToggle, handlers }: {
  plan: NsPlan
  goal: NsGoal
  today: string
  open: boolean
  onToggle: () => void
  handlers: GuideHandlers
}) {
  const [start, setStart] = useState("")
  const [target, setTarget] = useState(() => (goal.ladder ? String(goal.ladder.target) : ""))
  const [unit, setUnit] = useState(goal.unit)
  const [action, setAction] = useState("")
  const [days, setDays] = useState(3)

  /** Taken off the goal rather than passed in, so a row shows its own area's
      language wherever it is rendered from. */
  const example = areaGoalExample(goal.areaId)
  const climbs = goal.type === "milestone_ladder" && !!goal.ladder
  const scaled = climbs && goal.checkpoints.length > 0
  const rungs = goalMilestones(goal, today)
  const pace = climbs ? climbPace(goal, today) : null

  // What this one still needs, in the order it needs it.
  const numbered = !!parseGoalTarget(goal.title)
  const echoes = goalEchoes(plan, goal)
  /** Rungs somebody wrote out by hand, which win over anything computed. */
  const written = milestoneCheckpoints(goal)
  const [title, setTitle] = useState(goal.title)
  // A driver is a thing you hold, not a thing you finish. "No weed, 7× a week"
  // was being told it needed a date, which is the page asking when you plan to
  // stop — and a driver whose own rate IS the commitment does not need an
  // action underneath it either, because it already is one.
  const drives = goal.type === "habit_ramp"
  const missing = [
    // A climb whose target the person has not given yet needs THAT, not a
    // starting point for a number nobody chose.
    climbs && !numbered && !goal.unit.trim() ? BUILDER_COPY.needsTarget : null,
    climbs && (numbered || goal.unit.trim()) && goal.ladder && goal.ladder.start === 0 && !start ? BUILDER_COPY.needsStart : null,
    !drives && !goal.targetDate ? BUILDER_COPY.needsDate : null,
    !drives && goal.habits.length === 0 ? BUILDER_COPY.needsAction : null,
    drives && goal.daysPerWeek === 0 ? BUILDER_COPY.needsRate : null,
  ].filter(Boolean) as string[]

  return (
    <div className={`rounded-xl border transition-colors ${open ? "border-white/25 bg-white/[0.05]" : "border-white/[0.07] bg-white/[0.02]"}`}>
      {/* THE TITLE ON THE ROW IS THE TITLE YOU EDIT.
          It was a button showing the name, with an input holding the same name
          one line lower once the row was open — so the obvious move, click the
          name and type, opened the row and did nothing, and the field that did
          work looked like a second copy of the line above it. Reported from the
          page: "if i change a name of a goal, i cant actually edit the name."
          The name is the field now; the chevron, the meta line and the status
          chip are what open the row. */}
      <div className="flex items-center gap-1">
      <button onClick={onToggle} aria-expanded={open} aria-label={`${open ? "Close" : "Open"} ${goal.title}`} className="shrink-0 pl-3 py-2 text-left">
        <ChevronDown className={`size-3.5 shrink-0 text-zinc-500 transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      <span className="min-w-0 flex-1 flex items-center gap-2 px-1 py-2">
        <span className="min-w-0 flex-1">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              const next = title.trim()
              if (next && next !== goal.title) handlers.onUpdateGoal(goal.id, { title: next })
              else if (!next) setTitle(goal.title)
            }}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur() }}
            aria-label={BUILDER_COPY.editTitle}
            className="w-full bg-transparent border-b border-transparent hover:border-white/15 focus:border-white/35 text-[12.5px] text-zinc-100 focus:outline-none transition-colors"
          />
          <button onClick={onToggle} aria-hidden tabIndex={-1} className="block w-full text-left text-[10.5px] text-zinc-500 tabular-nums mt-0.5">
            {/* Built as a list and joined, so a missing half never leaves the
              separator behind: "· by 17 August 2027" was what a target with no
              number of its own printed. */}
          {[
            climbs && goal.ladder && (parseGoalTarget(goal.title) || goal.unit.trim())
              ? `${goal.ladder.start} → ${goal.ladder.target} ${goal.unit}`.trimEnd()
              : null,
            goal.type === "habit_ramp" ? goalRateLabel(goal) : null,
            goal.targetDate ? `by ${formatTargetDate(goal.targetDate)}` : null,
            goal.habits.length > 0 ? `${goal.habits.length} ${goal.habits.length === 1 ? "action" : "actions"}` : null,
          ].filter(Boolean).join(" · ")}
          </button>
        </span>
        <button onClick={onToggle} aria-hidden tabIndex={-1} className="shrink-0">
          {missing.length > 0 ? (
            <span className="text-[10px] text-amber-300/70">{BUILDER_COPY.stillNeeds(missing[0])}</span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300/80"><Check className="size-3" /> {BUILDER_COPY.done}</span>
          )}
        </button>
      </span>
        {/* Removing one was the thing there was no way to do: the row had a
            chevron and nothing else, so a goal added by accident stayed. */}
        <RemoveAchievement title={goal.title} onRemove={() => handlers.onRemoveGoal(goal.id)} />
      </div>

      {/* The same thing, twice. Named rather than merged: which of the two the
          person wants to keep is theirs to say, and a page that silently folded
          a goal into a routine step would be deciding it for them. */}
      {echoes.length > 0 && (
        <p className="px-3 pb-2 -mt-1 text-[10.5px] text-amber-200/80 leading-relaxed">
          {BUILDER_COPY.echo(echoes.join(", "))}{" "}
          <button
            onClick={() => handlers.onRemoveGoal(goal.id)}
            className="text-amber-100 underline decoration-dotted underline-offset-2 hover:text-white transition-colors"
          >
            {BUILDER_COPY.echoDrop}
          </button>
        </p>
      )}

      {/* No second copy of the title down here. It was an input holding the
          same words as the line above it, which is how the line above it came
          to look like something you could not edit. */}
      {open && <p className="px-3 pb-2 text-[10px] text-zinc-600">{BUILDER_COPY.editTitleNote}</p>}

      {open && (
        <div className="px-3 pb-3 space-y-3 border-t border-white/[0.07] pt-2.5">
          {/* WHICH KIND OF THING THIS IS, said out loud.
              An area holds three different animals and the page only ever
              guessed between them from the wording: a driver that runs at the
              same rate forever ("train 5× a week", "2000 calories"), a target
              you climb to by a date, and a one-off that is not SMART at all
              ("complimented by a stranger") but is worth being conscious of
              because wanting it is what makes the rest run. Guessing meant a
              muscle-up — a real target with no number in the sentence — was
              filed as a finish line and never offered a progression. */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-600 mr-0.5">{BUILDER_COPY.kind}</span>
            {([
              ["milestone_ladder", BUILDER_COPY.kindTarget, BUILDER_COPY.kindTargetNote(example.rungs)],
              ["habit_ramp", BUILDER_COPY.kindDriver, BUILDER_COPY.kindDriverNote],
              ["achievement", BUILDER_COPY.kindOneOff, BUILDER_COPY.kindOneOffNote],
            ] as const).map(([type, label, note]) => (
              <button
                key={type}
                onClick={() => handlers.onSetType(goal.id, type)}
                aria-pressed={goal.type === type}
                title={note}
                className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                  goal.type === type ? "border-violet-400/50 bg-violet-500/15 text-violet-50" : "border-white/10 text-zinc-400 hover:text-zinc-100 hover:border-white/30"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-[10.5px] text-zinc-600 -mt-1.5 leading-relaxed">
            {goal.type === "milestone_ladder" ? BUILDER_COPY.kindTargetNote(example.rungs)
              : goal.type === "habit_ramp" ? BUILDER_COPY.kindDriverNote
              : BUILDER_COPY.kindOneOffNote}
          </p>

          {/* A driver has no finish line: it has a rate you hold. */}
          {goal.type === "habit_ramp" && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11.5px] text-zinc-300">{BUILDER_COPY.driverAsk}</span>
              <div className="inline-flex flex-wrap gap-1">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <button
                    key={n}
                    onClick={() => handlers.onDriverDays(goal.id, n)}
                    aria-pressed={goal.daysPerWeek === n}
                    className={`size-6 rounded-md text-[11px] tabular-nums transition-colors ${
                      goal.daysPerWeek === n ? "bg-violet-500/25 text-violet-50" : "bg-white/5 text-zinc-400 hover:text-zinc-100"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <span className="text-[10.5px] text-zinc-600">{BUILDER_COPY.driverNote}</span>
            </div>
          )}

          {/* HOW MUCH, BESIDE HOW OFTEN.
              One field was answering both, so a catalogue driver of twenty
              approaches a week arrived clamped to seven and printed as "7× a
              week" — a number nobody chose, describing the wrong thing. */}
          {goal.type === "habit_ramp" && <DriverCount goal={goal} handlers={handlers} />}
          {/* 1. Where you are, so the climb has a bottom rung. */}
          {/* The progression, offered even when the sentence carries no number.
              "One muscle-up" has nothing to parse and is exactly the case where
              somebody wants the ladder — 5 pull-ups, 10, then the muscle-up —
              so the target and the unit are asked for rather than read off. */}
          {/* Shown whenever the SENTENCE carries no number, not just when there
              is no ladder yet. Flipping "One muscle-up" to a target handed it a
              default of 100 — a number the person never chose, printed in the
              row as "0 → 100" — because the shape defaults fill one in and the
              ask only appeared when the ladder was missing entirely. */}
          {goal.type === "milestone_ladder" && !parseGoalTarget(goal.title) && (
            <div>
              <p className="text-[11.5px] text-zinc-300">{BUILDER_COPY.targetAsk}</p>
              <p className="text-[10.5px] text-zinc-600 mt-0.5 leading-relaxed">{BUILDER_COPY.targetNote}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <input
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  inputMode="decimal"
                  placeholder={BUILDER_COPY.targetPlaceholder}
                  aria-label={BUILDER_COPY.targetAsk}
                  className="w-24 bg-transparent border-b border-white/15 focus:border-white/35 text-[14px] tabular-nums text-zinc-100 placeholder:text-zinc-700 focus:outline-none py-1 transition-colors"
                />
                <input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder={BUILDER_COPY.unitPlaceholder(example.units)}
                  aria-label="Counted in"
                  className="w-32 bg-transparent border-b border-white/15 focus:border-white/35 text-[12.5px] text-zinc-100 placeholder:text-zinc-700 focus:outline-none py-1 transition-colors"
                />
                <button
                  onClick={() => {
                    const n = Number(target.replace(",", "."))
                    if (Number.isFinite(n) && n > 0) handlers.onSetTarget(goal.id, n, unit)
                  }}
                  disabled={!Number.isFinite(Number(target.replace(",", "."))) || Number(target.replace(",", ".")) <= 0}
                  className="ml-auto text-[11.5px] px-2.5 py-1 rounded-lg border border-white/15 text-zinc-100 hover:bg-white/10 disabled:opacity-30 transition-colors"
                >
                  {BUILDER_COPY.scale}
                </button>
              </div>
            </div>
          )}

          {climbs && goal.ladder && parseGoalTarget(goal.title) && (
            <div>
              <p className="text-[11.5px] text-zinc-300">{BUILDER_COPY.startAsk(goal.ladder.target, goal.unit)}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <input
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return
                    e.preventDefault()
                    const n = Number(start.replace(",", "."))
                    if (Number.isFinite(n)) handlers.onLadderStart(goal.id, n)
                  }}
                  inputMode="decimal"
                  placeholder={goal.ladder.start > 0 ? String(goal.ladder.start) : BUILDER_COPY.startPlaceholder}
                  aria-label={BUILDER_COPY.startAsk(goal.ladder.target, goal.unit)}
                  className="w-24 bg-transparent border-b border-white/15 focus:border-white/35 text-[14px] tabular-nums text-zinc-100 placeholder:text-zinc-700 focus:outline-none py-1 transition-colors"
                />
                <span className="text-[11.5px] text-zinc-500">{goal.unit}</span>
                <button
                  onClick={() => {
                    const n = Number(start.replace(",", "."))
                    if (Number.isFinite(n)) handlers.onLadderStart(goal.id, n)
                  }}
                  disabled={!Number.isFinite(Number(start.replace(",", ".")))}
                  className="ml-auto text-[11.5px] px-2.5 py-1 rounded-lg border border-white/15 text-zinc-100 hover:bg-white/10 disabled:opacity-30 transition-colors"
                >
                  {BUILDER_COPY.scale}
                </button>
              </div>
            </div>
          )}

          {/* 2. By when. Presets for the round answers, a date for the real one. */}
          <div>
            <p className="text-[11.5px] text-zinc-300">{BUILDER_COPY.dateAsk}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {GOAL_DATE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlers.onDate(goal.id, presetDate(preset.id) ?? "")}
                  title={preset.note}
                  className="text-[11px] px-2 py-0.5 rounded-full border border-white/10 text-zinc-200 hover:bg-white/10 hover:border-white/30 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
              <label className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500">
                or
                <input
                  type="date"
                  value={goal.targetDate ?? ""}
                  onChange={(e) => handlers.onDate(goal.id, e.target.value)}
                  aria-label={`${BUILDER_COPY.dateAsk} ${goal.title}`}
                  className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-zinc-200 focus:outline-none focus:border-white/30 [color-scheme:dark]"
                />
              </label>
            </div>
          </div>

          {/* 3a. THE SCALING TOOL, ON THE STEP WHERE THE GOALS ARE.
              All three shapes a climb comes in — weight and reps together, a
              number getting bigger, and a written progression whose last rung
              is a different move ("5 pull-ups → 10 → muscle-up") — used to
              exist only inside the goal dialog. So this step could set a
              target and a date and then had nothing to say about the road
              between them, and the one-line "write the steps yourself" box
              that stood here did a third of the job. Offered for every goal:
              one with no number in its title is exactly the case that needs
              the written shape. */}
          <MilestoneBuilder
            goal={goal}
            color={plan.areas.find((a) => a.id === goal.areaId)?.color ?? "#a1a1aa"}
            today={today}
            handlers={{ onSetMilestones: handlers.onMilestones, onSetProgression: handlers.onProgression }}
          />

          {/* 3. What it scales into. The point of the date and the start. */}
          {written.length > 0 ? (
            <div>
              <p className="text-[11.5px] text-zinc-300">{BUILDER_COPY.writtenTitle}</p>
              {/* WITH THE DATE EACH ONE FALLS ON. An ordered list with no
                  dates is a list you can never be behind on. */}
              <ol className="flex flex-wrap gap-1.5 mt-1.5">
                {datedRungs(goal, today).map((c, i) => (
                  <li key={c.id} className="inline-flex items-baseline gap-1 text-[10.5px] text-zinc-300 px-2 py-0.5 rounded-full border border-violet-400/30 bg-violet-500/10">
                    <span className="text-zinc-500 tabular-nums">{i + 1}</span>
                    {c.title}
                    {c.date && <span className="text-zinc-500">{formatTargetDate(c.date)}</span>}
                  </li>
                ))}
              </ol>
              {!goal.targetDate && <p className="text-[10px] text-amber-200/70 mt-1">{BUILDER_COPY.writtenNoDate}</p>}
            </div>
          ) : scaled && rungs.length > 0 && (
            <div>
              <p className="text-[11.5px] text-zinc-300">{BUILDER_COPY.scaledTitle}</p>
              {/* THE CURVE, BECAUSE THE SPACING IS A CHOICE.
                  Even rungs are a guess about how somebody's year goes, and
                  the guess was being presented as the answer — "the scaling
                  does not feel like I have chosen it myself". Dragging the
                  line is choosing it: gentle at first and steep later, or the
                  reverse, or pin one rung and let the rest flow around it. */}
              {goal.ladder && (
                <div className="mt-2">
                  <MilestoneCurveEditor
                    config={goal.ladder}
                    onChange={(next) => handlers.onLadder(goal.id, next)}
                    allowDirectEdit
                    themeId="orrery"
                    targetDate={goal.targetDate ?? undefined}
                  />
                </div>
              )}
              <ul className="flex flex-wrap gap-1.5 mt-1.5">
                {rungs.map((rung) => (
                  <li key={rung.id} className="text-[10.5px] text-zinc-400 tabular-nums px-2 py-0.5 rounded-full border border-white/10">
                    {rung.label} <span className="text-zinc-600">{formatTargetDate(rung.date)}</span>
                  </li>
                ))}
              </ul>
              {pace && (
                <p className="text-[10.5px] text-zinc-500 mt-1.5 leading-relaxed">
                  {BUILDER_COPY.pace(
                    String(pace.perMonth >= 10 ? Math.round(pace.perMonth) : Math.round(pace.perMonth * 10) / 10),
                    goal.unit,
                    Math.round(pace.months),
                  )}
                </p>
              )}
            </div>
          )}

          {/* 4. What you do about it, which is tracked like anything else. */}
          <div>
            <p className="text-[11.5px] text-zinc-300">{BUILDER_COPY.actionAsk}</p>
            <p className="text-[10.5px] text-zinc-600 mt-0.5 leading-relaxed">{BUILDER_COPY.actionHelp}</p>
            {goal.habits.length > 0 && (
              <ul className="flex flex-wrap gap-1.5 mt-1.5">
                {goal.habits.map((habit) => (
                  <li key={habit.id} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 text-emerald-100">
                    {habit.title}
                    <span className="text-[9.5px] text-emerald-200/70 tabular-nums">{habit.daysPerWeek}×</span>
                    <button
                      onClick={() => handlers.onRemoveAction(goal.id, habit.id)}
                      aria-label={`Remove ${habit.title}`}
                      className="text-emerald-200/50 hover:text-rose-300 transition-colors"
                    >×</button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {suggestedActions(plan, goal)
                .filter((s) => !goal.habits.some((h) => h.title.trim().toLowerCase() === s.title.trim().toLowerCase()))
                .slice(0, 5)
                .map((s) => (
                  <button
                    key={s.title}
                    onClick={() => handlers.onAction(goal.id, s.title, s.daysPerWeek)}
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-white/10 text-zinc-200 hover:bg-white/10 hover:border-white/30 transition-colors"
                  >
                    <Plus className="size-2.5 text-zinc-500" />
                    {s.title}
                    <span className="text-[9.5px] text-zinc-500 tabular-nums">{s.daysPerWeek}×</span>
                  </button>
                ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                value={action}
                onChange={(e) => setAction(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" || !action.trim()) return
                  e.preventDefault()
                  handlers.onAction(goal.id, action, days)
                  setAction("")
                }}
                placeholder={BUILDER_COPY.actionPlaceholder(example.action)}
                aria-label={`${BUILDER_COPY.actionAsk} ${goal.title}`}
                className="min-w-0 flex-1 bg-transparent border-b border-white/15 focus:border-white/35 text-[12.5px] text-zinc-100 placeholder:text-zinc-700 focus:outline-none py-1 transition-colors"
              />
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                aria-label="Days per week"
                className="bg-white/5 border border-white/10 rounded-md px-1.5 py-1 text-[10.5px] text-zinc-300 focus:outline-none shrink-0"
              >
                {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n} className="bg-zinc-900">{n}×/wk</option>)}
              </select>
              <button
                onClick={() => { if (action.trim()) { handlers.onAction(goal.id, action, days); setAction("") } }}
                disabled={!action.trim()}
                className="shrink-0 text-[11.5px] px-2 py-1 rounded-lg border border-white/15 text-zinc-100 hover:bg-white/10 disabled:opacity-30 transition-colors"
              >
                {BUILDER_COPY.add}
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}


/**
 * What this area offers, offered where the area is.
 *
 * Three kinds, and they are genuinely different things rather than three
 * flavours of list: single goals people actually set here, whole sets that
 * arrive sized and dated together, and practices that belong in a routine
 * rather than in a goal list. A set is read before it is accepted — clicking
 * one used to write nine goals into the plan behind a `+9`, which is how
 * somebody ended up with a goal they had never chosen.
 */
function AreaOffers({ plan, area, handlers, half }: {
  plan: NsPlan
  area: { id: string; label: string; color: string; sublabel: string; custom: boolean }
  handlers: GuideHandlers
  half: "milestones" | "systems"
}) {
  /**
   * Open while there is nothing here yet.
   *
   * It was collapsed behind one line, so opening Health showed a blank input
   * and a grey summary saying "23 goals · 3 sets · 4 practices" — the offer was
   * on the screen and invisible. Once somebody has written their own, it folds
   * away rather than sitting above their list forever.
   */
  const empty = plan.goals.filter((g) => g.areaId === area.id).length === 0
  const [openOverride, setOpenOverride] = useState<boolean | null>(null)
  const open = openOverride ?? empty
  const setOpen = (next: boolean) => setOpenOverride(next)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const { objectives, templates, practices } = areaOffersFor(area, half)
  const note = areaOfferNote(area)
  const ten = areaReview(plan, area.id).ten.trim()
  const has = new Set(plan.goals.map((g) => g.title.trim().toLowerCase()))
  /** Labels already printed, so one goal is offered once across all objectives. */
  const shown = new Set<string>()
  const preview = templates.find((t) => t.id === previewId) ?? null

  if (objectives.length === 0 && templates.length === 0 && practices.length === 0 && !ten) return null

  return (
    <div className="mt-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex items-center gap-2 w-full text-left">
        <span className="text-[11.5px] text-zinc-300">{BUILDER_COPY.offersTitle(area.label)}</span>
        <span className="ml-auto text-[10.5px] text-zinc-600 tabular-nums shrink-0">
          {BUILDER_COPY.offersCount(objectives.reduce((n, o) => n + o.targets.length, 0), templates.length, practices.length)}
        </span>
      </button>

      {open && (
        <div className="mt-2.5 space-y-3">
          {note && <p className="text-[10.5px] text-zinc-600 leading-relaxed">{note}</p>}

          {/* The model, on what this area's 10 says. Free — it runs through the
              Claude CLI rather than a metered key. */}
          {ten.length >= 30 && (
            <GeneratePanel
              plan={plan}
              text={ten}
              areaId={area.id}
              areaLabel={area.label}
              ten={ten}
              mode="actions"
              label={BUILDER_COPY.suggest}
              handlers={handlers}
            />
          )}

          {/* Shown once each. "Gym Sessions" and "Protein Target" belong to
              three of Fitness's objectives, so the same chip appeared in three
              rows and the list read as though the catalogue were padded. */}
          {objectives.map(({ objective, targets }) => {
            const fresh = targets.filter((t) => {
              const key = t.label.trim().toLowerCase()
              if (has.has(key) || shown.has(key)) return false
              shown.add(key)
              return true
            })
            if (fresh.length === 0) return null
            return (
              <div key={objective.id}>
                <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">{objective.label}</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {fresh.slice(0, 8).map((target) => (
                    <button
                      key={target.id}
                      onClick={() => handlers.onAddTarget(area.id, target.id)}
                      className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-white/10 text-zinc-200 hover:bg-white/10 hover:border-white/30 transition-colors"
                    >
                      <Plus className="size-2.5 text-zinc-500" />
                      {target.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}

          {templates.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">{BUILDER_COPY.sets}</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {templates.map((t) => {
                  const fresh = targetsForTemplate(t).filter((x) => !has.has(x.label.trim().toLowerCase()))
                  return (
                    <button
                      key={t.id}
                      onClick={() => setPreviewId(previewId === t.id ? null : t.id)}
                      aria-pressed={previewId === t.id}
                      disabled={fresh.length === 0}
                      title={t.description}
                      className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border transition-colors disabled:opacity-40 ${
                        previewId === t.id ? "border-violet-400/50 bg-violet-500/15 text-violet-50" : "border-white/10 text-zinc-200 hover:bg-white/10 hover:border-white/30"
                      }`}
                    >
                      {t.label}
                      <span className="text-[9.5px] text-zinc-500 tabular-nums">+{fresh.length}</span>
                    </button>
                  )
                })}
              </div>
              {preview && (
                <div className="mt-2 rounded-lg border border-white/15 bg-white/[0.04] p-2.5">
                  <p className="text-[11px] text-zinc-300">{BUILDER_COPY.setPreview(preview.label)}</p>
                  <ul className="mt-1 space-y-0.5">
                    {targetsForTemplate(preview).map((target) => {
                      const already = has.has(target.label.trim().toLowerCase())
                      return (
                        <li key={target.id} className={`text-[11.5px] ${already ? "text-zinc-600 line-through" : "text-zinc-200"}`}>
                          {target.label}
                        </li>
                      )
                    })}
                  </ul>
                  <div className="flex items-center gap-3 mt-2">
                    <button onClick={() => setPreviewId(null)} className="text-[11px] text-zinc-500 hover:text-zinc-200 transition-colors">
                      {BUILDER_COPY.setCancel}
                    </button>
                    <button
                      onClick={() => { handlers.onAddTemplate(area.id, preview.id, 1); setPreviewId(null) }}
                      className="ml-auto text-[11.5px] font-medium px-2.5 py-1 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-100 hover:bg-violet-500/30 transition-colors"
                    >
                      {BUILDER_COPY.setAdd(targetsForTemplate(preview).filter((x) => !has.has(x.label.trim().toLowerCase())).length)}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {practices.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">{BUILDER_COPY.practices}</p>
              <p className="text-[10.5px] text-zinc-600 mt-0.5 leading-relaxed">{BUILDER_COPY.practicesHelp}</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {practices.map((p) => {
                  const on = plan.routines.some((r) => r.blueprintId === p.blueprintId && r.steps.some((s) => s.id === p.stepId))
                  return (
                    <button
                      key={`${p.blueprintId}-${p.stepId}`}
                      onClick={() => handlers.onTogglePractice(p.blueprintId, p.stepId, !on)}
                      aria-pressed={on}
                      title={`${p.routine} · ${p.daysPerWeek}×/wk`}
                      className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                        on ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100" : "border-white/10 text-zinc-300 hover:bg-white/10"
                      }`}
                    >
                      {on ? <Check className="size-2.5" /> : <Plus className="size-2.5 text-zinc-500" />}
                      {p.title}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}


/**
 * The sets this area is carrying, each removable in one click.
 *
 * Taking "Strength Focus" writes five goals; not wanting it afterwards was five
 * confirms on five rows. Silent when there are none, which is most areas most
 * of the time — a heading saying "no sets here" is the page talking about
 * itself.
 */
function TakenSets({ plan, areaId, handlers }: { plan: NsPlan; areaId: string; handlers: GuideHandlers }) {
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const taken = templatesInArea(plan, areaId)
  if (taken.length === 0) return null
  return (
    <div className="mt-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2">
      <p className="text-[10.5px] text-zinc-500">{BUILDER_COPY.tookTitle}</p>
      <ul className="flex flex-wrap items-center gap-1.5 mt-1.5">
        {taken.map(({ template, goalIds }) => {
          const footprint = templateFootprint(plan, areaId, template.id)
          const stepsLeaving = footprint.steps.filter((x) => !footprint.routineIds.includes(x.routineId))
          const alsoRoutines = [...new Set(stepsLeaving.map((x) => x.routineLabel))]
          const goneRoutines = plan.routines.filter((r) => footprint.routineIds.includes(r.id)).map((r) => r.label)
          return (
          <li key={template.id}>
            {confirmId === template.id ? (
              <span className="inline-flex flex-wrap items-center gap-2 text-[11px] px-2 py-0.5 rounded-full border border-rose-400/30">
                <span className="text-zinc-300">
                  {BUILDER_COPY.tookConfirm(goalIds.length)}
                  {alsoRoutines.length > 0 && ` ${BUILDER_COPY.tookAlso(stepsLeaving.length, alsoRoutines.join(" and "))}`}
                  {goneRoutines.length > 0 && ` ${BUILDER_COPY.tookAlsoRoutine(goneRoutines.join(" and "))}`}
                </span>
                <button
                  onClick={() => { handlers.onRemoveTemplate(areaId, template.id); setConfirmId(null) }}
                  className="text-rose-300 hover:text-rose-200 transition-colors"
                >{BUILDER_COPY.tookYes}</button>
                <button onClick={() => setConfirmId(null)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                  {BUILDER_COPY.tookNo}
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfirmId(template.id)}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-white/15 text-zinc-300 hover:border-rose-400/40 hover:text-rose-200 transition-colors"
              >
                <X className="size-2.5" />
                {BUILDER_COPY.tookRemove(template.label, goalIds.length)}
              </button>
            )}
          </li>
          )
        })}
      </ul>
    </div>
  )
}


/**
 * How much a week, and what it is counted in.
 *
 * Closed until asked for when the goal has no count yet: most drivers are only
 * a frequency, and a second number under every one of them is noise. Open the
 * moment one exists, because then it is the number that matters.
 */
function DriverCount({ goal, handlers }: { goal: NsGoal; handlers: GuideHandlers }) {
  const [open, setOpen] = useState(goal.perWeek != null)
  const [count, setCount] = useState(goal.perWeek != null ? String(goal.perWeek) : "")
  const [unit, setUnit] = useState(goal.unit)
  const save = () => {
    const n = Number(count.replace(",", "."))
    handlers.onDriverCount(goal.id, Number.isFinite(n) && n > 0 ? Math.round(n) : null, unit.trim())
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-[11px] text-zinc-500 hover:text-zinc-200 underline decoration-dotted underline-offset-2 transition-colors"
      >
        {BUILDER_COPY.countAsk}
      </button>
    )
  }
  return (
    <div>
      <p className="text-[11.5px] text-zinc-300">{BUILDER_COPY.countAsk}</p>
      <p className="text-[10.5px] text-zinc-600 mt-0.5 leading-relaxed">{BUILDER_COPY.countNote}</p>
      <div className="flex flex-wrap items-center gap-2 mt-1.5">
        <input
          value={count}
          onChange={(e) => setCount(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur() }}
          inputMode="numeric"
          placeholder="20"
          aria-label={BUILDER_COPY.countAsk}
          className="w-20 bg-transparent border-b border-white/15 focus:border-white/35 text-[14px] tabular-nums text-zinc-100 placeholder:text-zinc-700 focus:outline-none py-1 transition-colors"
        />
        <input
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur() }}
          placeholder={BUILDER_COPY.countUnitPlaceholder}
          aria-label={BUILDER_COPY.countUnit}
          className="w-40 bg-transparent border-b border-white/15 focus:border-white/35 text-[12.5px] text-zinc-100 placeholder:text-zinc-700 focus:outline-none py-1 transition-colors"
        />
        <span className="text-[11px] text-zinc-600">a week</span>
        {goal.perWeek != null && (
          <button
            onClick={() => { handlers.onDriverCount(goal.id, null, goal.unit); setCount(""); setOpen(false) }}
            className="ml-auto text-[10.5px] text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            {BUILDER_COPY.countClear}
          </button>
        )}
      </div>
    </div>
  )
}


/** Remove one achievement, visible at rest and confirmed once. */
function RemoveAchievement({ title, onRemove }: { title: string; onRemove: () => void }) {
  const [confirming, setConfirming] = useState(false)
  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        aria-label={`Remove ${title}`}
        title={`Remove ${title}`}
        className="shrink-0 mr-2 text-zinc-600 hover:text-rose-300 transition-colors"
      ><X className="size-3.5" /></button>
    )
  }
  return (
    <span className="shrink-0 mr-2 inline-flex items-center gap-1.5 text-[10.5px]">
      <button onClick={onRemove} className="text-rose-300 hover:text-rose-200 transition-colors">delete</button>
      <button onClick={() => setConfirming(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors">keep</button>
    </span>
  )
}


/**
 * `WrittenRungs` lived here: a textarea for "5 pull-ups → 10 → muscle-up",
 * behind an "or write the steps yourself" link. It is gone because
 * `MilestoneBuilder`'s third shape is the same box with a preview, a rung
 * count and the two numeric shapes beside it — one tool where there were two,
 * and the row now offers the whole of it rather than a third of it.
 */
