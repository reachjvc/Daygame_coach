/**
 * The copy and the templates for the North Star flow (/test/life-mastery).
 *
 * Three tabs: the north star, your life (the areas, the goals in them and the
 * routines under all of it), then the review. Everything a user reads on that
 * page starts here, so the wording can be checked in one file instead of
 * hunted through the components.
 *
 * VOICE RULES for every user-facing string, same as lifeMasteryWhy.ts:
 *   1. Say "you". Second person, direct.
 *   2. One idea per sentence. Short sentences.
 *   3. No em-dashes. Use a period, or "and", or a comma.
 *   4. No "X, not Y". Say the thing you mean and stop.
 *   5. Plain verbs. Write it out. Take the time. Ask yourself. Pick one.
 *   6. Warm, never clever. No aphorisms we invented.
 */

import { LIFE_MASTERY_AREAS } from "./lifeMasteryAreas"
import type {
  NsArea,
  NsReviewPrompt,
  NorthStarTabId,
  RoutineBlueprint,
} from "../types"

export const NORTH_STAR_STORAGE_KEY = "north-star-v1"

/**
 * The id of THIS run of the plan, minted on first use and reminted by
 * "start over".
 *
 * Plan goal ids are `g1`, `g2`, … off a counter that starts again at zero when
 * everything is cleared, so they identify a goal within one run and no further.
 * Pushed goals are tagged with both, and the tag is what stops a fresh `g1`
 * from being matched onto the row of a `g1` from a plan that no longer exists.
 * Its own key rather than a field on the plan: it is about where the plan has
 * been sent, not about the plan, and nothing that reads a saved plan should
 * have to migrate for it.
 */
export const NS_TRACK_RUN_KEY = "north-star-track-run"

/**
 * Step 11's copy.
 *
 * It says what is about to happen to somebody's real goals before it happens,
 * in the words they would use. "Push to the database" is our word for it; what
 * they are doing is starting to tick things off.
 */
/**
 * The schedule on the track step.
 *
 * Says what it is showing and, just as importantly, what it is not: a weekly
 * view that quietly leaves the milestones out looks like a weekly view that
 * forgot them.
 */
/**
 * The today step's copy.
 *
 * Short, because the step is one question asked every day and anything else on
 * it is something to read past. The only long line is the one that explains why
 * a driver cannot be counted yet, which is the only thing here that can leave
 * somebody stuck.
 */
export const TODAY_COPY = {
  help: "Tick off what you have done. Nothing to set up here — this is the plan you already made, on today.",
  loading: "Opening today…",
  empty:
    "Nothing running yet. Once there are routines or drivers in the plan, this is where you say what you did.",
  nothingOn: "Nothing is scheduled for today. Anything you did anyway is below.",
  doneSuffix: "done",
  allDone: "That is today's list, done.",
  notTracked: "not counted yet",
  /* THE COUNT, IN WORDS, NEXT TO THE BUTTON THAT MOVES IT.
     It used to be a bare "+1" at the end of the row with the numbers on the
     line above it in a list of four other facts, so the one control on the
     screen that writes to your real goals read as the least important thing on
     it. Reported from the page: "I hate the +1 thing, it is just not intuitive
     at all." */
  countOne: "Log one",
  countOneAria: (title: string) => `Log one ${title}`,
  countUndo: "Undo one",
  countUndoAria: (title: string) => `Take one back off ${title}`,
  countProgress: (current: number, target: number) => `${current} of ${target} this week`,
  countSoFar: (current: number) => `${current} this week`,
  /* Every row that IS a goal opens the goal. The date, the curve and the rate
     are all on that card, and Today is where you find out they are wrong. */
  openGoal: (title: string) => `Open ${title} to change its date or its numbers`,
  /* The way back to where a thing is edited. Lowercase, like "start over" and
     "not counted yet": it is a way out of this screen, not an action on it. */
  change: "change",
  changeRoutine: (label: string) => `Change the ${label}`,
  changeDrivers: "Change what you are counting each week",
  changeStanding: "Change your milestones and experiences",
  standingTitle: "Not a weekly thing",
  standingHelp:
    "What you are climbing towards and what you want to have done. Neither happens on a Tuesday, so neither counts towards today — but the day you finally do one, this is where you say so.",
  standingMilestone: "a milestone, counted on your goals page",
  standingNoDate: "no date yet",
  standingDoneOn: "done",
  anyDayTitle: "Any day this week",
  anyDayHelp:
    "These say how often and not when — once a week, four times a week — so today is as good a day as any. Tick one off if today was the day. Whether you are behind on them is a question about the week, not about this morning.",
  restTitle: "On other days",
  restHelp:
    "The plan puts these on days that are not today, and you may have done one anyway. A plan that only accepts the sessions it predicted under-counts the weeks you actually had.",
  signedOut:
    "Ticks save on this device. Counting the drivers needs you signed in — they are goals on your account, not notes in a browser.",
  feltTitle: "How today went",
  feltHelp:
    "Rate each area on how it actually felt today, 0 to 10. Same scale as the wheel and the same store, so this is what the rolling average on Your 10s is made of. Skip any of them; click a number again to clear it.",
  noteLabel: "Anything worth remembering about today",
  notePlaceholder: "What happened, what got in the way, what you would do again.",
  noteSaved: "Saves when you click away.",
  /* YOUR OWN QUESTIONS, in your own words. The plan counts and rates; none of
     that holds "one key learning of today", and that line is the one most
     people already keep by hand — usually against the thing that taught it
     rather than against the day. */
  fieldsTitle: "Your own text fields",
  fieldsHelp:
    "A question you answer in words, day after day. Attach one to anything in the plan and it appears on that row; attach one to the day and it sits under the note.",
  fieldsEmpty: "None yet. Add one and it shows up wherever you attach it.",
  fieldAdd: "Add a text field",
  fieldAddHere: "add a text field",
  fieldAddedTo: (title: string) => `Add a text field to ${title}`,
  fieldLabelAria: "What this field asks",
  /* The placeholder SUGGESTS. It is never written into the label: a question
     the user did not ask reads back a month later as one they did. */
  fieldLabelPlaceholder: "One key learning of today",
  fieldUnnamed: "Untitled field",
  fieldPlaceholder: "In your own words.",
  fieldAttachedTo: "Attached to",
  fieldOnTheDay: "The day itself",
  fieldRemove: (label: string) => `Remove ${label} and everything written under it`,
  /* WHICH DIRECTION THE FIELD RUNS. "Write" asks you something; "read" shows
     you something you already wrote — the difference between "one key
     learning of today" and "read your north star out loud". */
  fieldKindLabel: "Kind",
  fieldKindWrite: "Write today",
  fieldKindRead: "Read it back",
  /* THE THIRD DIRECTION. Read quotes the thing here; this one takes you to
     where it lives, which is the only version that also lets you change it. */
  fieldKindGo: "Go to it",
  fieldShows: "Shows",
  fieldShowsNothing: "Pick something to read",
  fieldGoes: "Goes to",
  fieldGoesNothing: "Pick somewhere to go",
  /* Said plainly rather than reading a blank box every morning. */
  fieldSourceMissing: "That is empty, or no longer in your plan. Pick something else.",
  fieldSourceUnset: "Nothing picked to read yet.",
  fieldGoUnset: "Nowhere picked to go yet.",
  fieldOpen: "Open",
  fieldOpenAria: (label: string, where: string) => `${label} — open ${where}`,
  /* A go field carries its OWN tick. A read field sits under a step that
     already has one; a go field can hang on the day itself, where nothing
     else does. */
  fieldGoDoneAria: (label: string) => `Did ${label}`,
  fieldPastOpen: (n: number) => (n === 1 ? "1 earlier day" : `${n} earlier days`),
  fieldPastNone: "Nothing written on any other day yet.",
  /**
   * The way out of a question the row asks you.
   *
   * A step that asks for words arrives with its box, which is the fix. The
   * escape has to be on the box, because somebody who keeps that particular
   * practice on paper will otherwise go looking for it in the routine builder
   * and not find it. It stops the asking and keeps every answer already given —
   * said out loud, because "remove" next to three months of writing is a
   * frightening word.
   */
  askOff: "stop asking this here (what you have written is kept)",
  /**
   * AND THE WAY BACK, which the first build of this forgot.
   *
   * A question that can be turned off and not on is a worse dead end than the
   * one it replaced: silencing "Write three gratitudes" left a row that had
   * been a box and was now a checkbox, with nothing on it saying how to undo
   * that. Every row can be asked to ask something, including the ones our
   * library never gave a question to — somebody whose "Cold shower finish"
   * wants a line about the water temperature is not wrong.
   */
  askOn: "ask me something here",
  askOnAria: (title: string) => `Give ${title} a question to ask you every day`,
  askEdit: "change the question",
  askEditAria: (title: string) => `Change the question ${title} asks`,
  askPlaceholder: "What should this row ask you?",
  askSave: "Ask this",
  askCancel: "Cancel",
  fieldPastAria: (label: string) => `Earlier days for ${label}`,
  /* THE TO-DO LIST UNDER A BIGGER WEEKLY THING. "Gym 5× a week" is the thing
     itself; "create a piece of content" is four things wearing one title. */
  subAdd: "add a step",
  subAddAria: (title: string) => `Add a step to ${title}`,
  subPlaceholder: "What has to happen — Enter to add",
  subTitleAria: (title: string) => `Step: ${title}`,
  subRemove: (title: string) => `Remove the step ${title}`,
  subUp: "Move up",
  subDown: "Move down",
  subDone: (done: number, total: number) => `${done}/${total} steps`,
} as const

/**
 * WHAT A ROW CAN SHOW YOU, named for a picker.
 *
 * The labels are questions and possessives rather than field names, because
 * the person choosing is answering "what do I want to read at 07:00" and not
 * "which property of the plan object".
 */
/**
 * THE BAND AT THE TOP OF THE TRACKING PAGE.
 *
 * The one thing and the season's areas are the two decisions the whole plan
 * hangs off, and they were only visible inside the flow that wrote them — so
 * the page somebody opens every day to log approaches said nothing about what
 * this season is for.
 */
export const SEASON_BAND_COPY = {
  oneThingLabel: "The one thing",
  seasonLabel: "This season",
  noneTitle: "Your plan",
  noneHelp:
    "Your one thing and the areas this season is about show up here once you have set them. Everything else on this page keeps working either way.",
  noFocus: "Nothing named yet",
  noAreas: "No areas picked yet",
  openPlan: "Open your plan",
  openToday: "Today",
  todayProgress: (done: number, total: number) => `${done} of ${total} done today`,
  build: "Build your plan",
} as const

/**
 * The north star paragraph's own element id, so a field can land on it.
 *
 * Here rather than inline in the tab, because two files need to agree on it and
 * a hand-typed string in each is how a link quietly starts scrolling nowhere.
 */
export const STAR_ANCHOR = "north-star-paragraph"

/**
 * The driving force, on the recap page, which is where all five of its parts
 * already are. Named here so the source and the section cannot drift apart.
 */
export const RECAP_DRIVING_ANCHOR = "recap-driving-force"

/**
 * THE RIBBON ON THE SCREEN YOU WERE SENT TO.
 *
 * A jump with no way back is a trapdoor. Today sends you to your north star at
 * 07:00; if arriving means finding your way back through a rail of thirteen
 * steps, the honest thing to do at 07:00 is not click it.
 *
 * So the errand comes with you: what you came to do, the tick for it, and the
 * way back to the row you left.
 */
export const ERRAND_COPY = {
  from: "From today",
  done: "Mark it done",
  isDone: "Done today",
  back: "Back to today",
  backAria: "Back to today, where you came from",
  dismiss: "Stay here",
  dismissAria: "Stop showing this, stay on this step",
} as const

export const READ_COPY = {
  starGroup: "Your star",
  valuesGroup: "Your values",
  areasGroup: "Areas",
  goalsGroup: "Goals",
  starLabel: "Your north star, the paragraph",
  valuesLabel: "Your values, in order",
  areaTen: (area: string) => `What a 10 looks like — ${area}`,
  areaPurpose: (area: string) => `Why ${area} matters to you`,
  areaIdentity: (area: string) => `Who you are when ${area} is handled`,
  /* The goal, not a paragraph of it: the row that means "open this and change
     it" rather than "read this back". */
  goalItself: (goal: string) => `The goal: ${goal}`,
  goalWhy: (goal: string) => `Why: ${goal}`,
  goalSentence: (goal: string) => `As one sentence: ${goal}`,
  goalPain: (goal: string) => `What it costs you to skip: ${goal}`,
  goalReasons: (goal: string) => `Your reasons: ${goal}`,
  /**
   * THE WHOLE DOCUMENT, as one thing you can be sent to.
   *
   * "Read your driving force. Vision, purpose, identity, standards, values" was
   * the one canon row that pointed nowhere, on the reasoning that no single
   * source IS the driving force and aiming it at one of five parts would be a
   * guess. That was right about the guess and wrong about the conclusion: the
   * answer is not to point it at a part, it is to make the whole a source.
   * Composed live from the five pieces, so it can never quote a stale copy.
   */
  drivingLabel: "Your driving force, all five parts",
  /**
   * "Re-read the why under one goal" — and WHICH goal.
   *
   * The row says "one goal" and means it: any of them will do, and the point of
   * the practice is that you re-read a reason rather than a particular reason.
   * A picker would be asking somebody to answer a question the row deliberately
   * leaves open, so it resolves to the goal the plan already puts first, and
   * says which one on the arrow so it is never a mystery door.
   */
  topWhyLabel: (goal: string) => `Why you are doing it: ${goal}`,
  drivingHeadings: {
    star: "The vision",
    why: "Why it matters",
    identity: "Who I am",
    conduct: "What I hold myself to",
    values: "My values, in order",
  },
} as const

/**
 * WHERE THE WRITING GOES, said once.
 *
 * A destination id is either a piece of the plan you READ (`readSources`) or a
 * page of the journal you WRITE. The second kind is prefixed so the two can
 * share one id space and one picker without a step ever having to say which
 * sort it holds.
 */
/**
 * WHEN A STEP SOMEBODY TYPED IS ASKING FOR WORDS.
 *
 * Our own library says so outright — `asks` is authored on the entry. This is
 * for the other half: "Write down what went well", "Journal for ten minutes",
 * "Two lines on the session". Those are not ticks, and a row that offers only a
 * checkbox for them is the same bug the authored field exists to fix.
 *
 * Deliberately narrow, and every phrase is a VERB about writing rather than a
 * topic. "Read ten pages" contains no promise to write anything down;
 * "gratitude" on its own is a subject, not an instruction. A miss leaves a tick,
 * which is honest — a false hit puts a box under a row that never asked for
 * one, and the person then has to work out why it is there.
 */
export const WRITE_PHRASES = ["journal", "write ", "write down", "note down", "two lines", "one line", "jot down", "in writing"] as const

/** What a step somebody typed gets asked, when nothing better is known. */
export const WRITE_FALLBACK_QUESTION = "What do you want to write?"

export const JOURNAL_PREFIX = "journal:"
export const JOURNAL_ALL_ID = "journal:all"

/**
 * THE PAGE THE WRITING STEPS LEAD TO.
 *
 * Reported from the page: *"journal … doesnt lead anywhere (should lead to a
 * page where we journal, like field reports, weekly reviews, and user should be
 * able to write, possibly select standard questions, and see ALL old reports)."*
 *
 * Three things, and the tab is all three: today's questions with a box under
 * each, a library of standard questions to add more, and every entry ever
 * written underneath. Nothing here is a second store — the boxes write to
 * `plan.journal` and the archive reads it back, which is the same pair the
 * Today rows already use.
 */
export const JOURNAL_COPY = {
  tab: "Journal",
  title: "Your journal",
  help: "Everything you write, in one place. The questions your routines ask, the ones you add yourself, and every answer you have ever given them.",
  todayTitle: "Today",
  todayHelp: "Every question that is being asked of you today. Answering one here is the same tick as answering it on Today.",
  todayEmpty: "Nothing is asking you anything today. Add a question below, or put a routine step that asks one into your week.",
  noteLabel: "The day itself",
  notePlaceholder: "Anything about today that does not belong under a question.",
  fromRoutine: (routine: string) => `from ${routine}`,
  ownQuestion: "your own question",
  addTitle: "Add a question",
  addHelp: "Pick one that is already written, or write your own. It appears here and under the row it belongs to every day from now on.",
  addOwn: "Write your own",
  addOwnPlaceholder: "What do you want to ask yourself?",
  add: "Add",
  added: "Already asked",
  setsTitle: "Or a whole set",
  setsHelp: "Several questions at once, for the reviews people actually keep.",
  addSet: (n: number) => `Add all ${n}`,
  archiveTitle: "Everything you have written",
  archiveHelp: "Newest first. Every question, every day it was answered.",
  archiveEmpty: "Nothing written yet. The first answer you give any question above shows up here.",
  archiveCount: (entries: number, days: number) =>
    `${entries} ${entries === 1 ? "entry" : "entries"} across ${days} ${days === 1 ? "day" : "days"}`,
  archiveFilter: "Show",
  archiveAll: "Every question",
  gone: "a question you have since removed",
  remove: "remove",
  removeAria: (label: string) => `Remove the question “${label}”. Everything already written under it is kept.`,
  removeHelp: "Removing a question stops it being asked. Nothing you have written under it is deleted — it stays in the archive below.",
} as const

/**
 * QUESTIONS THAT ARE ALREADY WRITTEN, so nobody faces a blank field named
 * "label".
 *
 * The complaint that produced the journal was not only that it led nowhere; it
 * was that the way to make it lead somewhere was to invent the question
 * yourself. These are the ones that recur across every journalling practice
 * worth copying, grouped the way somebody picks them: the day, the work, the
 * hard days, the week.
 */
export const JOURNAL_PROMPTS: Array<{ id: string; group: string; question: string }> = [
  { id: "jp-grateful", group: "The day", question: "Three things you are grateful for" },
  { id: "jp-good", group: "The day", question: "One good thing about today" },
  { id: "jp-learn", group: "The day", question: "One key learning of today" },
  { id: "jp-proud", group: "The day", question: "What are you happy, proud and grateful for today?" },
  { id: "jp-mood", group: "The day", question: "How did the day go?" },
  { id: "jp-three", group: "The work", question: "The three that matter today" },
  { id: "jp-mit", group: "The work", question: "What was the most important thing you did?" },
  { id: "jp-avoid", group: "The work", question: "What did you avoid, and why?" },
  { id: "jp-tomorrow", group: "The work", question: "Tomorrow's one important thing" },
  { id: "jp-hard", group: "The hard days", question: "What is actually bothering you?" },
  { id: "jp-story", group: "The hard days", question: "What are you telling yourself about it that may not be true?" },
  { id: "jp-advice", group: "The hard days", question: "What would you tell a friend in this exact position?" },
  { id: "jp-cost", group: "The hard days", question: "What does it cost you to stay here?" },
]

/**
 * THE REVIEWS, as sets rather than single questions.
 *
 * A weekly review is not one box, and offering it as one is how it stops
 * getting done. Each set adds its questions in order; they then live exactly
 * like every other question — asked on their day, answered anywhere, kept in
 * the archive.
 */
export const JOURNAL_SETS: Array<{ id: string; title: string; note: string; questions: string[] }> = [
  {
    id: "weekly-review",
    title: "Weekly review",
    note: "The four that make a week worth looking back at. Once a week, same day.",
    questions: [
      "What went well this week?",
      "What did not, and what was actually in your control?",
      "What did you learn?",
      "What is the one thing that has to happen next week?",
    ],
  },
  {
    id: "field-report",
    title: "Field report",
    note: "For a thing you went out and did. Written the same day, while it is still accurate.",
    questions: [
      "What did you actually do?",
      "What worked?",
      "Where did it go wrong, and at which moment?",
      "What are you doing differently next time?",
    ],
  },
  {
    id: "morning-pages",
    title: "Morning pages",
    note: "One box, no question. Write until you have nothing left, then stop.",
    questions: ["Today's page. Whatever is there."],
  },
]

/**
 * How often something runs, in words.
 *
 * One place, because the Today list and the schedule both say it and a plan
 * that calls the same step "once a week" on one screen and "1× a week" on the
 * other is two plans.
 */
export const CADENCE_COPY = {
  everyDay: "Every day",
  weekdays: "Weekdays",
  onceAWeek: "Once a week",
  timesAWeek: (n: number) => `${n}× a week`,
} as const

export const SCHEDULE_COPY = {
  title: "What you will actually be doing",
  help:
    "Everything in the plan that repeats, and how often. Week by week so you can see what it turns into — an ease-in that starts at two a week and reaches four is a different promise from four a week starting Monday.",
  empty:
    "Nothing repeating in the plan yet. Systems and drivers — the things you do week in week out — show up here once there are some.",
  activityHeader: "What runs",
  totalRow: "Times a week, all in",
  stepsUp: "Goes up this week",
  today: "Today",
  nothingOn: "Nothing on",
  /* The group everything without an hour lands in. A driver says "twenty
     approaches a week" and names no time of day, so it has no place in the
     morning and no place at night — it has a week. */
  driversGroup: "Any time this week",
  groupHint: "Open a routine to tick its steps off.",
  tickHint: "Tick what you have done today.",
  /* What a group's members are called. A routine has steps; the group of
     things that name no hour has goals, and calling those "steps" would name
     twenty approaches a week as a line in a stack. */
  stepNoun: ["step", "steps"],
  goalNoun: ["goal", "goals"],
  /* The two headers the picker needs and the schedule never draws, because
     neither is a weekly rhythm: a milestone is a number you climb and an
     experience is a thing to have had. Both can still have a text field hung
     off them, so both need naming somewhere. */
  milestoneGroup: "Milestones",
  experienceGroup: "Experiences",
  looseTitle: "Runs weekly, no day chosen",
  looseHelp:
    "These say how often and not when, which is a finished answer for most of them. Give them days on Systems if you want them on the calendar.",
  notMilestones:
    "Milestones and one-off experiences are not here on purpose. They are what the above is for, not something you do on a Tuesday — a weekly grid would show you behind on them every week until the week you are not.",
} as const

export const TRACK_COPY = {
  title: "Start tracking these",
  help:
    "Everything up to here saved on this device only. Tick the goals you actually want to count from now on and they become real goals on your account — the same ones the goals page counts, streaks and resets each week. Nothing is sent until you press the button, and pressing it again later picks up whatever is new without touching what is already running.",
  empty: "No goals in the plan yet. Write some on Experiences or Systems and they will show up here.",
  allTracked: "Everything in the plan is being tracked.",
  hubTitle: "This plan, running",
  hubHelp: "The real goals page, showing only what you pushed from this plan. Tick things off here and it counts.",
  hubScoped: "Only this plan's goals are shown here. Everything else on your account is on",
  signedOutTitle: "This step needs you signed in",
  signedOut:
    "The rest of the flow runs in this browser and asks nothing of you. This step cannot: tracking a goal means a row on your account, counted every day, kept when you open the app on your phone. Sign in and the plan is still here when you come back — it is saved on this device, not on the account.",
} as const

/**
 * Four tabs, split by the question each one answers.
 *
 * "Where you are" and "Areas, routines & goals" were once the same screen twice
 * over, so they were merged. Merged, one screen carried the whole assessment
 * (the rating, the 10, the why, the identity, the values) AND every goal in
 * twelve areas, and the assessment work sat underneath a goal editor nobody
 * scrolled past. The split now runs along the honest line:
 *
 *   now  — where you stand, and what already runs underneath.
 *   plan — what you are going to do about it.
 */
/**
 * Six steps, in the order the work actually wants to happen.
 *
 * THE GOALS COME BEFORE THE FOCUS. They were the other way round, which asked
 * somebody to pick the two or three areas of their season before they had
 * written down what they wanted in any of them — choosing between things they
 * had not named yet. You write everything first, then choose. The ordering step
 * on the focus tab only makes sense in that order too: there is nothing to rank
 * until the goals exist.
 *
 * The values exercise moved out of the north star and into its own late step
 * for the same reason: ranking what matters is easier once you can see what you
 * have actually asked your life for.
 */
/**
 * Seven steps, and the third one is a single sentence.
 *
 * "All goals" used to be third, which meant the first thing anybody did after
 * picturing twelve areas was start listing things they wanted in all twelve.
 * Somebody who has just answered "what one change would make the next few
 * years work" lists differently: the list becomes what that change needs,
 * rather than everything that came to mind, area by area.
 */
/**
 * AND THE FOURTH IS A FORK, NOT A STEP.
 *
 * Everything before it is one order because it is one argument. After the one
 * thing the order stops being an argument: wanting first, systems first and
 * one-routine-first are three different people, not three stages, so step four
 * asks which and sends you there. It is in the rail like the rest because a
 * fork you cannot get back to is a gate, and it carries no dot — there is
 * nothing on it to fill in.
 */
/**
 * AND THE TWO HALVES ARE TWO STEPS AGAIN, because the fork asks for them by
 * name.
 *
 * They were merged into one page with a switch under the wheel, on the argument
 * that the same twelve areas and four routines are what both halves are written
 * into. That is still true, and it is why the two steps share a body. What the
 * merge cost is the thing step four now depends on: "brainstorm what you want"
 * and "build the systems" are two different pieces of work, and a door that
 * lands you on one page with a toggle somewhere on it has not taken you
 * anywhere. A step you can be sent to, and be finished with, has to be a step.
 */
/**
 * AND THE CATALOGUE IS A STEP, BEFORE BOTH OF THEM.
 *
 * It was a tab riding on the two build steps, which put "here is what other
 * people set" on the same surface as "write what you want" — and being handed a
 * ready-made list while the box is still empty is how somebody ends up with
 * somebody else's plan. As its own step it is what it actually is: a place you
 * walk through, take what is yours from, and leave. It comes before Systems and
 * Achievements because a browse is the cheapest thing to do first, and it
 * carries no ring — see SCORED_TABS.
 */
/**
 * AND THE WHOLE THING, READ BACK, IS THE LAST STEP.
 *
 * Everything before it asks a question. This one asks nothing: it is the plan
 * itself, laid out — the paragraph, why it matters, who you say you are, what
 * you hold yourself to, your affirmations, your values in order, the twelve
 * areas with the 10 you wrote in each, the goals, the routines and the list of
 * things to have done. A plan you can only re-read by walking twelve steps is
 * a plan nobody re-reads, and it is re-reading that does the work.
 *
 * Last, because it is a mirror: it can only be whole once the steps in front of
 * it are. It carries no ring for the same reason Track carries none — nothing
 * on it is yours until one of the other steps wrote it, and scoring it would be
 * scoring the same work twice.
 */
export const TAB_ORDER: NorthStarTabId[] = ["star", "now", "one", "pick", "templates", "systems", "milestones", "focus", "values", "commit", "track", "today", "journal", "recap"]

/**
 * The steps that are a WORKSHOP rather than a part of the plan.
 *
 * Templates hands you ready-made work and a bench to build your own on. It is
 * not a section of the document the other steps are writing, so it is marked
 * differently in the rail — a different accent, and no progress ring — and "I
 * have not filled this in" never reads as "I am behind on my plan".
 *
 * BUILDING YOUR OWN LIVES INSIDE IT rather than beside it. It was its own step
 * for an afternoon, and that was wrong twice over: it asked somebody to decide
 * between "a program" and "my program" before seeing either, and it put two
 * answers to one question in two different places in the rail.
 */
export const WORKSHOP_TABS: NorthStarTabId[] = ["templates"]

/**
 * The steps that carry a ring on the rail, which is every step but the fork.
 *
 * A ring says how full a step is, and the fork has nothing in it to fill — its
 * three doors write into the steps they open. Scoring somebody on having chosen
 * a door is the sort of tick that made the old green ones meaningless. Kept
 * here rather than as a check in the rail's JSX so that the invariant "every
 * ring can be filled" has one list to run over.
 *
 * The catalogue and the track step are out for the same reason: neither holds
 * anything you wrote. Track is a mirror of the goals the other steps produced,
 * and a ring on it would be scoring the plan twice.
 */
export const SCORED_TABS: NorthStarTabId[] = TAB_ORDER.filter(
  (tab) => tab !== "pick" && tab !== "templates" && tab !== "track" && tab !== "today" && tab !== "journal" && tab !== "recap"
)

export const TAB_LABELS: Record<NorthStarTabId, string> = {
  star: "North star",
  now: "Your 10s",
  one: "The one thing",
  pick: "Where to start",
  templates: "Templates",
  systems: "Systems",
  milestones: "Experiences",
  focus: "Focus & season",
  values: "Values & identity",
  commit: "Commit",
  track: "Track",
  today: "Today",
  journal: "Journal",
  recap: "Everything",
}

export const TAB_BLURBS: Record<NorthStarTabId, string> = {
  star: "The life you are aiming at, why it matters, and who you would have to be.",
  now: "Rate each area on the wheel and picture what a 10 looks like in it.",
  one: "The single change that would make the rest far more likely, and what it needs from you.",
  pick: "Three ways on from here: what you want, what you will do, or one routine.",
  templates: "Ready-made sets, goals and practices for every area. Take what is yours, ignore the rest.",
  systems: "What you actually do about it week in week out, and what each one is pointed at.",
  milestones: "Everything you want to experience and have done, area by area. Loose, greedy, nothing final.",
  focus: "Which areas this season is about, and what comes after it.",
  values: "What you are ranking your life by, in order, and who that makes you.",
  commit: "Read it back, say what could go wrong, and commit to it.",
  track: "Push the goals into your real goals and tick them off day by day.",
  today: "What you can put in for today, and nothing else. Tick off what you did.",
  journal: "Everything you write: the questions your routines ask, the ones you add, and every answer you have given them.",
  recap: "The whole plan on one page: your star, your values, who you are, your areas and your goals. Edit any of it here.",
}

// ---------------------------------------------------------------- tab 1

/**
 * The one question the whole flow hangs off.
 *
 * It is asked as a picture of a person rather than a list of outcomes, because
 * "who are you" produces material that the identity and values work later can
 * actually use. The hint names the four areas so nobody writes a career plan
 * and calls it a life, and it gives explicit permission to be unrealistic,
 * which is the part people need said out loud.
 */
export const NORTH_STAR_SCREEN = {
  question: "Imagine an ideal future. Who are you? What do you do?",
  hint: "Consider health, wealth, relationships, and meaning or spirituality. Let this be bigger than what seems realistic, if that is what feels right to you. Its job is to pull you.",
  placeholder: "Write it in the present tense, as though you are already living it.",
  help: "Write it as one paragraph. Say where you wake up, who is around you, what your days go into, what your body feels like, and what you do that has nothing to do with work.",
  example:
    "I wake up in a small house near the water with my partner and our two kids. I train before the house is up and my body feels light. My days go into a business that earns well without owning my calendar, and I am finished by four. There is a year of costs in the bank and I stop counting at the till. I surf on Tuesdays and take one long trip a year with my oldest friends.",
}

/** Shown under the box once there is something in it. */
export const NORTH_STAR_REREAD =
  "Read this out loud once a day. That is the whole practice, and it is what keeps the rest of this page from going quiet in March."

/**
 * The work that sits under the paragraph.
 *
 * The paragraph says what you want. These say why it matters, who you would
 * have to be to hold it, and what you say to yourself in the meantime. They
 * live on this tab rather than in the review because they belong to the vision,
 * and because the reason is the thing you re-read in March.
 *
 * `become` and `identity_total` keep the ids they had while they were review
 * prompts, so anything already written under them still loads.
 */
export const STAR_WORK_INTRO = {
  title: "Under the paragraph",
  help: "The paragraph is what you want. This is why it matters, who you would have to be to hold it, and what would have to matter to you. Answer what you can today and come back to the rest.",
}

/**
 * The why has its own card, directly under the paragraph, so it is the one
 * star prompt the "answered" count on the card below does not include.
 */
export const STAR_WHY_ID = "star_why"

/**
 * The order is his, not ours.
 *
 * He groups four things and calls them the driving force: vision, purpose,
 * identity, code of conduct — read back weekly, "sometimes twice a week if I'm
 * down" (source video 8kco2rjijjE). The values list is read daily and sits
 * between the purpose and the identity, because it is derived from the vision
 * ("once you know your vision, you make the list: what are the values I need to
 * have to create that life") and because the identity is written out of it.
 *
 * So: paragraph → why → values → identity → standards → the gap → affirmations.
 *
 * `become` and `identity_total` keep the ids they were born with, and `conduct`
 * keeps the id it had while it lived on the review tab, so every answer already
 * written still loads.
 *
 * WHY `become` IS LAST AND NOT NEXT TO `identity_total`. They read as the same
 * question and they are not. "Who are you committed to being" is his verbatim
 * identity question, answered in the present tense and conditioned until it is
 * true. "Who do you need to become" never appears in the driving force; it
 * appears attached to an outcome — "who do you need to become to achieve that,
 * in terms of character, skill set, focus, self-discipline, daily habits"
 * (I1MhBE-0zxU). One is a declaration, the other is the gap between here and
 * there, and the gap is the handover into the plan. See
 * docs/research/life-mastery/values-and-identity.md.
 */
export const STAR_PROMPTS: NsReviewPrompt[] = [
  {
    id: STAR_WHY_ID,
    question: "Why is this important to you?",
    help: "This is the part you re-read on a day you do not feel like it, so it is worth more than the wording of the paragraph. Write the reasons that get you up. Then write what it costs you if you never get there.",
    placeholder: "This matters to me because…",
  },
  /**
   * The identity and the standards, and why they are two questions.
   *
   * They read as one question, and the page used to make that worse: both were
   * phrased "committed to", and both are lists of good qualities in the present
   * tense. He blurs it himself, saying of the STANDARDS list "this is who I'm
   * committed to being, this is the standards that I want to live my life by"
   * (8kco2rjijjE).
   *
   * The difference is real and it is visible in his own two lists:
   *
   *   Identity — a self-portrait. "I'm an extraordinarily loving man… I'm an
   *   amazing friend, son, brother, uncle, strategist, marketer, entrepreneur…
   *   I'm an athlete, bodybuilder and fitness model… I'm a Muay Thai fighter."
   *   Nouns as much as adjectives, long, rangy, and about what is TRUE of you.
   *   He conditions it weekly until it is: "when you condition that you start to
   *   become that."
   *
   *   Standards — a bar. "to be fun playful outrageous, to be loving and caring,
   *   to be confident… to be disciplined… to be outgoing social and friendly."
   *   Short by his own account, every line "to be", and the thing you can fall
   *   short of on a Tuesday and come back to.
   *
   * So: what is true of you, and what you hold yourself to. The questions say
   * that now, and each carries a few words of his own answer, because seeing "an
   * amazing friend, son, brother" beside "to be disciplined" settles it faster
   * than any explanation of the difference.
   */
  {
    id: "identity_total",
    question: "Who are you?",
    help: "Your identity, in the present tense, as lines that start with I am. Not who you will be once it works: who you are, read back every week until it is simply true. Put the roles in as well as the qualities. His way in: if you looked your own name up in the dictionary, what would it say about you?",
    placeholder: "I am…",
    example: "His: “I'm an extraordinarily loving man… I'm an amazing friend, son, brother, uncle… I'm an athlete, bodybuilder and fitness model.”",
    list: true,
  },
  {
    id: "conduct",
    question: "What do you hold yourself to?",
    help: "Your standards, and a different thing from the identity above. That one is what is true of you. This is the bar you set: what you can fall short of on a bad Tuesday and come back to. His own list is short and every line starts with to be.",
    placeholder: "To be…",
    example: "His: “to be fun, playful, outrageous. To be loving and caring. To be disciplined. To be outgoing, social and friendly.”",
    list: true,
  },
  {
    id: "become",
    question: "And who do you need to become to have all of this?",
    help: "A different question from the two above. Those are who you are. This is what the person in your paragraph has that you do not have yet: character, skills, focus, self-discipline, daily habits. Whatever you write here is what you go and work on.",
    placeholder: "Character, skills, focus, self-discipline, daily habits",
  },
  {
    id: "affirmations",
    question: "Your affirmations",
    help: "Short lines you say out loud, as though they are already true. Say them daily with your whole body. Reading them in your head does very little. These are the lines the manifestation routine asks you for.",
    placeholder: "One line each\nI am the kind of person who finishes what I start",
    list: true,
  },
]

// ------------------------------------------------------- the values procedure
//
// Not a chip row. The whole exercise, in his order (source video Lp_GOrM16Xc,
// written up in docs/research/life-mastery/values-and-identity.md):
//
//   1. What has been most important to you so far. This is the list that built
//      the life you already have, and asking for it is the diagnosis.
//   2. What would have to be important to create the life in the paragraph.
//   3. Order the second list, because "whatever number one is, everything else
//      is being filtered through that". Ordered by asking, one pair at a time,
//      "is it this one or this one".
//   4. Read the conflicts the order produces.
//
// Both lists accept anything typed. A word that names a thing rather than a
// feeling is not refused; it earns one follow-up question, because "our values
// are just emotions" and "family" or "money" is the means to one.

export const VALUES_INTRO = {
  title: "What matters to you",
  help: "A value is what you fall back on when two things you want will not both fit in the same day. Two lists: what has actually been driving you so far, then what that paragraph would need. They are rarely the same, and the difference is the point. You put them in order later, on the review, once you have seen where you stand.",
  minimum: 7,
  minimumNote: "Seven or more is a good list.",
  daily: "Write the finished list out and keep it somewhere you see it. Redo it every year or two.",
  /** Shown at the bottom of the elicitation half, saying where the rest is. */
  laterHint: "You order this list on the review, after you have rated your areas and written the values each one asks for.",
}

/**
 * Pass 1. His question, and the prompting he does around it.
 *
 * The question is verbatim: "I want you to ask yourself this question, what's
 * been most important to me in my life?" (Lp_GOrM16Xc). An earlier pass here
 * rewrote it, on the theory that it reads as a question about events. It does
 * read that way ON ITS OWN — and the fix is not a better question, because he
 * never asks it on its own. Within seconds of asking he does four things, and
 * all four are what makes it answerable:
 *
 *   1. "what's the first answer that comes up… just trust whatever comes up,
 *      don't think about it too much, don't overanalyze"  → `first`
 *   2. he reads a menu out loud, and it is the actual scaffolding: "security,
 *      has it been being safe, has it been happiness, has it been success, has
 *      it been money, has it been family, has it been love, has it been passion,
 *      has it been friends, has it been travel"           → `MENU`
 *   3. "what else has been important for you in life… and you're going to keep
 *      asking yourself that question, you're going to go deep"  → `again`
 *   4. "try to steer your focus and direction to the emotion, the core emotion
 *      that you've been after to experience"              → `emotion`
 *
 * Nobody produces a value cold. He knows that, and the menu plus the repeated
 * "what else" IS the method. The page asks his question and does his prompting.
 */
export const VALUES_PAST = {
  question: "What has been most important to you in your life?",
  help: "Write the first thing that comes up and do not think about it too hard. The first answer is the honest one. It is one word or a short phrase, not a story: what you have actually been chasing and protecting until now.",
  /** His spoken prompt, and the name of the group that carries his words. */
  first: "Has it been…",
  /** Asked again after every answer. The repetition is the exercise. */
  again: "And what else has been important to you?",
  againNote: "Keep going until nothing else comes up. Most people have more than they think.",
  emotion: "If you write something like family, money or your business, steer it toward the feeling underneath. That is the value.",
  placeholder: "Type whatever comes up first and press enter",
}

/**
 * His menu, in his order, spoken as "has it been X?" while the viewer writes.
 * These come first in the suggestion row on the past list, because they are the
 * prompt rather than our idea of a good starting set.
 *
 * Two words are his spoken form said the library's way: "being safe" is Safety
 * and "friends" is Friendship. Same value either way, and shipping two words for
 * one thing means somebody adds both and then ranks them against each other.
 */
export const VALUES_PAST_MENU = [
  "Security", "Safety", "Happiness", "Success", "Money", "Family", "Love", "Passion", "Friendship", "Travel",
]

export const VALUES_NEEDED = {
  question: "What do your values need to be to create the life you want?",
  /** Names the group of words read back out of the user's own writing. */
  lead: "From your paragraph",
  help: "Read your paragraph again, then answer this. Same shape: one word or a short phrase each. Some of them are already on the list above. The ones that are not are what has to change.",
  placeholder: "Type whatever the paragraph asks of you and press enter",
}

/**
 * The browse panel under both lists, and inside an area.
 *
 * The search box adds as well as filters. Somebody looking for "enjoyment" and
 * not finding it was told "type it in the box above", which is one instruction
 * too many at exactly the wrong moment: they are already typing, in a box, and
 * the box they are typing in did nothing with the word. So a word that is not on
 * the list turns into a button that adds it.
 */
export const VALUES_BROWSE = {
  more: (n: number) => `Show all ${n} values`,
  search: "Search, or type a value of your own",
  add: (q: string) => `Add “${q}”`,
  addNote: "Not on our list is not a problem. Your word is the one that counts.",
  none: "Nothing matches that.",
  note: "Words to pick from, grouped. Anything you type counts the same.",
}

/** Said under the two lists once both have something in them. */
export const VALUES_DIFF = {
  added: "New here, and not something you have been living by:",
  dropped: "You have been living by these and left them off:",
  droppedNote: "That is often the right call. Just worth seeing once.",
}

export const VALUES_ORDER = {
  title: "Put your values in order",
  question: "Now put them in order",
  help: "Whatever is number one, everything else gets filtered through it. Order them by answering one pair at a time.",
  duel: "Which of these two is more important to you?",
  duelNote: "There is no right answer, and you can redo this whenever you like.",
  start: "Order them, one pair at a time",
  restart: "Order them again",
  done: "That is the order.",
  /** Under the list. Says the drag exists and how to do it without a mouse. */
  dragNote: "Drag any value to move it. Keyboard: tab to a value, space to lift it, arrows to move, space to drop.",
  /** Shown when the ordering half has no list to work on yet. */
  empty: "Nothing to order yet. Write your values on the north star tab first, and the values each area asks for as you rate them.",
  /** Above the list, naming where the pool came from. */
  pooled: "Everything you have written: the whole-life list, plus the values each area and each goal asked for.",
  pull: "add the ones I wrote per area",
}

/**
 * The roster of everything already said to matter, and where it was said.
 *
 * By this step somebody has answered "what matters to you" five or six times in
 * five or six different boxes — a menu tapped on the first list, a chip clicked
 * inside Health, a value hung off one goal, a paragraph about waking up near the
 * water with their kids. Every one of those was an answer, and each one used to
 * be thrown away the moment its box closed, so the ordering step opened blank
 * and asked a seventh time. This is that work, handed back.
 *
 * The copy never claims the cued ones were said. "You clicked this" and "we read
 * this out of your paragraph" are different sentences and stay different.
 */
export const VALUES_EVIDENCE = {
  title: "Everything you have already said matters",
  help:
    "Gathered from every box you have filled in so far: both lists, the values each area asked for, the ones you hung on a goal, and the words you kept using in your own writing. Nothing here is on your order unless you put it there.",
  /** The two buckets. */
  missing: "Named, but not on your order yet",
  missingHelp: "You said these somewhere. They are not deciding anything until they are on the list.",
  listed: "On your order",
  listedHelp: "Where each one came from, so the order reads as something you built rather than something you typed once.",
  /** The `where` label for each kind. Areas and goals use their own names. */
  past: "Lived by so far",
  chosen: "Your order",
  oneThing: "The one thing",
  northStar: "Your north star",
  untitledGoal: "An untitled goal",
  /**
   * The magnitude, right-aligned so the column can be ranked without reading.
   *
   * AREAS FIRST, because breadth is the thing worth prioritising by and volume
   * is not: three areas is a value running through three parts of your life,
   * three times inside one area is the same part said loudly. A row named only
   * in the whole-life lists or the north star belongs to no area, and says how
   * many times instead of claiming a nought.
   */
  count: (areas: number, hits: number) => {
    const times = hits === 1 ? "once" : `${hits} times`
    if (areas === 0) return `named ${times}`
    return `${areas === 1 ? "1 area" : `${areas} areas`} · ${times}`
  },
  /** On the dots. Named areas, so a colour nobody memorised still reads. */
  areasIn: (labels: string[]) => `Named in ${labels.join(", ")}`,
  /** Marks the mentions nobody clicked. */
  cued: "read from your writing",
  cuedNote: "Cue words in something you wrote. A guess, not something you said — click it in if it is right.",
  add: "add to my order",
  addAll: "add all of these to my order",
  /** The clip. Five rows is a comparison; thirty is a wall. */
  showAll: (n: number) => `Show all ${n}`,
  showFewer: "Show fewer",
  /** Nothing anywhere yet. */
  empty: "Nothing yet. Rate an area, write your north star or set a goal, and everything you say matters shows up here.",
  jump: (where: string) => `Go to ${where}`,
}

/**
 * The means-to-ends drill.
 *
 * "Often when someone says they value family, which is great, what is the
 * emotion that you're really after? Because at the core of it our values are
 * just emotions… if you say it's money, then what are you really after money
 * for?" It is offered on any item, never enforced, and the typed word is kept
 * whatever the answer, because being wrong about this costs nothing and being
 * told you typed the wrong kind of word costs the exercise.
 */
export const VALUES_MEANS = {
  question: (item: string) => `What is the feeling you are really after from ${item.toLowerCase()}?`,
  help: "Underneath most values there is an emotion. With money, the value is what the money is for. Same with family, a business, a body. Write the feeling and the list gets easier to use.",
  keep: "keep both",
  replace: "replace it",
  skip: "it is already the feeling",
  hint: "worth a second look",
}

/**
 * The ends values: emotional states rather than the things that produce them.
 *
 * Used for two jobs, both advisory. Anything on this list is left alone by the
 * means drill, and anything typed that is not on it gets offered the drill once.
 * A long list on purpose, because a false "worth a second look" on somebody's
 * real value is more annoying than a missed one.
 */
export const VALUE_ENDS_WORDS = [
  "love", "happiness", "happy", "joy", "joyful", "freedom", "free", "peace", "peaceful", "calm",
  "growth", "learning", "mastery", "progress", "adventure", "excitement", "passion", "fun", "play",
  "playfulness", "connection", "intimacy", "belonging", "significance", "certainty", "security",
  "safety", "confidence", "courage", "strength", "vitality", "energy", "health", "wellbeing",
  "gratitude", "abundance", "generosity", "contribution", "service", "impact", "purpose", "meaning",
  "faith", "spirituality", "presence", "integrity", "honesty", "authenticity", "trust", "respect",
  "discipline", "consistency", "responsibility", "achievement", "success", "excellence", "beauty",
  "creativity", "curiosity", "wisdom", "clarity", "focus", "fulfilment", "fulfillment", "kindness",
  "compassion", "humility", "loyalty", "leadership", "independence", "autonomy", "legacy", "pride",
  "acceptance", "forgiveness", "patience", "resilience", "optimism", "hope", "wonder", "flow",
]

/**
 * The conflicts he names, each one a means value ranked above the end it was
 * supposed to serve. Checked against the user's own order and only ever raised
 * when both words are actually on the list, in that order.
 *
 * `above` is the one ranked higher, `below` the one it is crowding out. Matching
 * is on whole words against either, so "financial success" trips the success row.
 */
export const VALUE_CONFLICTS: Array<{ above: string[]; below: string[]; note: string }> = [
  {
    above: ["success", "achievement", "money", "wealth", "business", "career", "ambition"],
    below: ["happiness", "happy", "joy", "fulfilment", "fulfillment", "peace"],
    note: "With success above happiness you only let yourself feel good once you are winning, and the bar keeps moving. He lived that way for years and says it is the thing he would change first.",
  },
  {
    above: ["fitness", "physique", "aesthetics", "performance"],
    below: ["health", "vitality", "energy", "wellbeing", "longevity"],
    note: "He put fitness above health for a while, did two fitness competitions, and was the most ripped and the least healthy he has ever been. Fitness is what your body can do today. Health is whether it is still there in twenty years.",
  },
  {
    above: ["business", "work", "career", "money", "wealth", "success"],
    below: ["love", "family", "connection", "intimacy", "relationship", "friendship"],
    note: "Work is sitting above the people. His version of this: if you check email first thing in the morning, you are valuing the business above everything else on the list.",
  },
]

/**
 * Value words we can read out of what the user has already written.
 *
 * The suggestion row used to be twenty words we picked. Somebody who has just
 * written a paragraph about waking up near the water with their kids should be
 * offered freedom and family off their own page, not off ours. Each entry is a
 * value and the words in their own writing that imply it.
 */
export const VALUE_CUES: Array<{ value: string; cues: string[] }> = [
  { value: "Freedom", cues: ["freedom", "free", "own terms", "nobody tells me", "anywhere", "my own hours", "my calendar", "independent"] },
  { value: "Family", cues: ["family", "kids", "children", "my son", "my daughter", "wife", "husband", "partner", "parents"] },
  { value: "Love", cues: ["love", "loving", "in love", "affection", "adore"] },
  { value: "Health", cues: ["health", "healthy", "energy", "vitality", "sleep", "well", "illness", "longevity"] },
  { value: "Fitness", cues: ["fit", "fitness", "strong", "strength", "train", "training", "gym", "lift", "muscle", "body fat"] },
  { value: "Adventure", cues: ["adventure", "travel", "trip", "explore", "surf", "mountain", "abroad", "the world"] },
  { value: "Growth", cues: ["grow", "growth", "learn", "learning", "better", "improve", "read", "study", "master"] },
  { value: "Contribution", cues: ["give", "giving", "help", "serve", "service", "impact", "difference", "charity", "volunteer", "teach"] },
  { value: "Abundance", cues: ["abundance", "abundant", "plenty", "generous", "never worry about money", "stop counting"] },
  { value: "Security", cues: ["security", "secure", "safe", "stable", "in the bank", "savings", "runway", "protected"] },
  { value: "Peace", cues: ["peace", "peaceful", "calm", "quiet", "still", "unhurried", "no rush"] },
  { value: "Fun", cues: ["fun", "play", "laugh", "silly", "enjoy", "playful"] },
  { value: "Creativity", cues: ["create", "creative", "build", "make", "write", "design", "art"] },
  { value: "Connection", cues: ["friends", "friendship", "community", "people around", "belong", "together", "close"] },
  { value: "Faith", cues: ["god", "faith", "spiritual", "prayer", "pray", "creator", "soul", "meditat"] },
  { value: "Discipline", cues: ["discipline", "disciplined", "consistent", "every day", "never miss", "habit", "routine"] },
  { value: "Confidence", cues: ["confident", "confidence", "certain", "sure of myself", "self-belief"] },
  { value: "Achievement", cues: ["achieve", "achievement", "win", "best", "top", "prove", "goal"] },
  { value: "Presence", cues: ["present", "presence", "in the moment", "attention", "phone down"] },
  { value: "Gratitude", cues: ["grateful", "gratitude", "thankful", "appreciate"] },
]

/** The ladder, for anyone who cannot start from a blank paragraph. */
export const LADDER_INTRO = {
  title: "Stuck on the blank box?",
  help: "Answer these one at a time and your paragraph assembles itself underneath. Nothing appears in it that you did not write.",
  assemble: "Use these as my north star",
}

// ---------------------------------------------------------------- tab 2

/**
 * The four areas the flow opens with.
 *
 * Colours come from the wheel palette that was validated as a set (colour-vision
 * separation plus contrast on the dark surface). Green, amber, rose and violet
 * sit far apart in that set, and identity is carried by the direct labels and
 * the sector gaps as well as by colour.
 */
/**
 * The twelve areas of life, from the Blueprint taxonomy in `lifeMasteryAreas.ts`.
 *
 * Derived rather than retyped, so the labels, the sub-labels and the palette
 * (validated as a set for colour-vision separation and contrast on the dark
 * surface) have exactly one home. Health and Fitness are separate, and so are
 * Family and Friends, because they fail independently: a strong body with no
 * energy, or a close family and no friends, are different problems.
 *
 * They stay editable. Rename any of them, drop the ones you are not working on,
 * add your own.
 */
export const DEFAULT_AREAS: NsArea[] = LIFE_MASTERY_AREAS.map((a) => ({
  id: a.id,
  label: a.label,
  sublabel: a.sublabel,
  color: a.color,
  custom: false,
}))

/**
 * Colours for areas the user adds. Same validated palette, in an order that
 * keeps the near-miss pairs apart as the wheel grows.
 */
export const AREA_COLOR_POOL = ["#0ea5e9", "#14b8a6", "#ec4899", "#84cc16", "#6366f1", "#f97316", "#eab308", "#a855f7"]

/**
 * Which framework library an area browses for its common goals.
 *
 * Read off each Blueprint area's own `pillarIds`, first one wins, so the two
 * taxonomies are joined in one place instead of by a hand-typed table that
 * would drift. An area the user added has no entry and picks a library by hand.
 */
export const AREA_LIBRARY_PILLAR: Record<string, string> = Object.fromEntries(
  LIFE_MASTERY_AREAS.filter((a) => a.pillarIds.length > 0).map((a) => [a.id, a.pillarIds[0]]),
)

export const LIBRARY_COPY = {
  title: "Common goals",
  help: "Pick from the ones people actually set in this area. Each one arrives with its numbers and its shape already filled in, and everything stays editable.",
  templateTitle: "Or take a whole set",
  templateHelp: "A template turns on several goals at once, sized to where you are starting from. Nothing is locked; remove any of them afterwards.",
  levelHelp: "Pick the level that matches where you are today, and the numbers come in at that size.",
  pillarPrompt: "This is your own area, so pick the library that fits it best.",
  added: "already added",
  /** The peek controls, in place of the disclosures these used to be. */
  more: (n: number) => `Show all ${n} goals`,
  moreSets: (n: number) => `Show all ${n} sets`,
  sets: (n: number) => `${n} sets`,
}

/** Suggestions for a new area, so the button is not another blank box. */
export const AREA_SUGGESTIONS = ["Fun & adventure", "Mind & learning", "Emotions", "Home & environment", "Craft", "Contribution"]

export const AREAS_INTRO = {
  title: "The parts of your life",
  /** Shown while the Edit toggle is on. */
  help: "Rename them, add your own, and remove the ones you are not working on. Removing an area moves its goals rather than deleting them.",
  /** Shown the rest of the time, when this is a picture rather than a form. */
  resting: "The twelve areas of life. The fill is how you rated each one. Press Edit to rename them or add your own.",
  wheelHint: "The fill is your latest rating, once you have made one.",
}

export const ROUTINES_INTRO = {
  /**
   * A routine is neither half, and saying so is the point.
   *
   * It was labelled "Systems · what you do", which made it a third thing to
   * categorise and justify. A routine is the background: it runs, it lifts
   * every area a bit, and it does not need a milestone pointed at it to be
   * worth doing. What it ADDS UP TO can be a milestone, and that is offered
   * separately.
   */
  systemsLabel: "The background",
  systemsNote: "Not an achievement and not a system — it just runs, and it lifts every area a little. Nothing here needs justifying.",
  title: "What runs underneath",
  /** Shown while the Edit toggle is on. */
  help: "Open one and cut what is not yours. Editing something down is far easier than writing it from nothing.",
  /** Shown the rest of the time. */
  resting: "Your ordinary Tuesday, whether you feel like it or not.",
  /** Beside the goals wheel, where the four live. */
  beside: "The part of the plan that runs whether or not you open this page. Click one to build it.",
}

/**
 * The routine templates.
 *
 * Morning, night and manifestation are sequences: an ordered stack you walk top
 * to bottom, sized in minutes. Workouts, work and social are weekly: a set of
 * habits each with its own days per week. The split designer belongs only to
 * the workout routine.
 */
export const ROUTINE_BLUEPRINTS: RoutineBlueprint[] = [
  {
    id: "morning",
    label: "Morning routine",
    kind: "sequence",
    why: "How you start the day decides how the day goes. Win the first hour and the rest argues with you less.",
    areaSeedId: null,
    servesAreaIds: ["lm_mindset", "lm_emotions", "lm_health", "lm_spirituality"],
    daysPerWeek: 7,
    split: false,
    defaultStepIds: ["water", "bed", "star", "gratitude", "breath", "plan"],
    defaultSplitId: null,
    presets: [
      { id: "15", label: "15 min", note: "The floor. Small enough that you still win it on a bad morning.", stepIds: ["water", "bed", "star", "gratitude", "breath", "plan"] },
      { id: "30", label: "30 min", note: "Adds sitting still and writing it down.", stepIds: ["water", "bed", "star", "gratitude", "meditate", "journal", "plan"] },
      { id: "60", label: "60 min", note: "Adds moving your body and reading.", stepIds: ["water", "bed", "star", "gratitude", "meditate", "move", "read", "journal", "plan"] },
      {
        id: "full",
        label: "The full ritual",
        // The hour as taught, in its documented order (source video PliFBr__T7Y:
        // smile, stretch, breathe, water, rebounder, incantations, empowering
        // questions, driving force, ten pages, RPM plan). "Rebounder" is written
        // as plain movement because almost nobody owns one.
        note: "The whole hour, in the order the program teaches it. Nothing added, nothing reordered.",
        stepIds: ["smile", "stretch", "breath", "water", "move", "incantations", "questions", "driving-force", "read", "plan"],
      },
    ],
    library: [
      { id: "smile", title: "Smile, before you are even out of bed", minutes: 1, daysPerWeek: 7, dimension: "spirit" },
      { id: "stretch", title: "Stretch while you are still lying down", minutes: 2, daysPerWeek: 7, dimension: "body" },
      { id: "water", title: "Big glass of water", minutes: 1, daysPerWeek: 7, dimension: "body" },
      { id: "bed", title: "Make your bed", minutes: 2, daysPerWeek: 7, dimension: "body" },
      { id: "star", title: "Read your north star out loud", minutes: 2, daysPerWeek: 7, dimension: "spirit" },
      { id: "driving-force", title: "Read your driving force. Vision, purpose, identity, standards, values", minutes: 5, daysPerWeek: 7, dimension: "spirit", goesTo: "driving" },
      { id: "questions", title: "Ask yourself what you are happy, proud and grateful for", minutes: 5, daysPerWeek: 7, dimension: "mind", asks: "What are you happy, proud and grateful for today?" },
      { id: "incantations", title: "Speak your incantations out loud, with your whole body", minutes: 5, daysPerWeek: 7, dimension: "spirit" },
      { id: "gratitude", title: "Write three gratitudes", minutes: 3, daysPerWeek: 7, dimension: "spirit", asks: "Three things you are grateful for" },
      { id: "breath", title: "Breathwork", minutes: 5, daysPerWeek: 7, dimension: "body" },
      { id: "meditate", title: "Meditate", minutes: 10, daysPerWeek: 7, dimension: "spirit" },
      { id: "move", title: "Move. Stretch, walk, or a quick workout", minutes: 10, daysPerWeek: 6, dimension: "body" },
      { id: "read", title: "Read ten pages", minutes: 15, daysPerWeek: 6, dimension: "mind" },
      { id: "journal", title: "Journal", minutes: 5, daysPerWeek: 7, dimension: "mind", asks: "Today's page. Whatever is there.", goesTo: "journal:all" },
      { id: "plan", title: "Plan the day. Pick the three that matter", minutes: 5, daysPerWeek: 7, dimension: "mind", asks: "The three that matter today" },
      { id: "cold", title: "Cold shower finish", minutes: 3, daysPerWeek: 5, dimension: "body" },
      { id: "sun", title: "Daylight on your face", minutes: 10, daysPerWeek: 7, dimension: "body" },
      { id: "nophone", title: "No phone for the first thirty minutes", minutes: 1, daysPerWeek: 7, dimension: "mind" },
    ],
  },
  {
    id: "night",
    label: "Evening routine",
    kind: "sequence",
    why: "Good days are set up the night before. Wind down, reset the room, protect your sleep.",
    areaSeedId: "lm_health",
    servesAreaIds: ["lm_mindset", "lm_emotions"],
    daysPerWeek: 7,
    split: false,
    defaultStepIds: ["tomorrow", "cleanup", "screens", "good-thing"],
    defaultSplitId: null,
    presets: [
      { id: "15", label: "15 min", note: "The floor. Tomorrow decided, the room reset.", stepIds: ["tomorrow", "cleanup", "screens", "good-thing"] },
      { id: "30", label: "30 min", note: "Adds the wind-down and something to read.", stepIds: ["tomorrow", "cleanup", "screens", "layout", "stretch", "good-thing", "read-bed"] },
      { id: "60", label: "60 min", note: "Adds looking back at the day and a fixed bedtime.", stepIds: ["tomorrow", "cleanup", "screens", "layout", "stretch", "reflect", "good-thing", "read-bed", "bedtime"] },
    ],
    library: [
      { id: "tomorrow", title: "Write down tomorrow's one important thing", minutes: 3, daysPerWeek: 7, dimension: "mind", asks: "Tomorrow's one important thing" },
      { id: "cleanup", title: "Ten minute reset of the space", minutes: 10, daysPerWeek: 7, dimension: "body" },
      { id: "screens", title: "Screens off an hour before bed", minutes: 1, daysPerWeek: 7, dimension: "mind" },
      { id: "layout", title: "Lay out clothes and gym bag", minutes: 3, daysPerWeek: 6, dimension: "body" },
      { id: "stretch", title: "Wind down stretch", minutes: 5, daysPerWeek: 6, dimension: "body" },
      { id: "reflect", title: "Two lines on how the day went", minutes: 5, daysPerWeek: 7, dimension: "mind", asks: "How did the day go?" },
      { id: "good-thing", title: "One good thing about today", minutes: 2, daysPerWeek: 7, dimension: "spirit", asks: "One good thing about today" },
      { id: "read-bed", title: "Read in bed", minutes: 15, daysPerWeek: 6, dimension: "mind" },
      { id: "bedtime", title: "Same bedtime", minutes: 1, daysPerWeek: 7, dimension: "body" },
      { id: "gratitude-night", title: "Say thank you for one person", minutes: 2, daysPerWeek: 7, dimension: "spirit", asks: "Who you said thank you for, and what for" },
    ],
  },
  {
    id: "manifestation",
    label: "Manifestation routine",
    kind: "sequence",
    why: "Your north star is only worth writing if you keep meeting it. This is the routine that puts it back in front of you and makes you feel it.",
    areaSeedId: "lm_spirituality",
    servesAreaIds: ["lm_mindset", "lm_emotions", "lm_mission"],
    daysPerWeek: 7,
    split: false,
    defaultStepIds: ["read-star", "see-scene", "incantations", "act-as-if"],
    defaultSplitId: null,
    presets: [
      { id: "15", label: "15 min", note: "Read it, see it, say it, act on it once today.", stepIds: ["read-star", "see-scene", "incantations", "act-as-if"] },
      { id: "30", label: "30 min", note: "Adds feeling it and saying who you are.", stepIds: ["read-star", "see-scene", "feel-it", "incantations", "identity-lines", "act-as-if"] },
      { id: "60", label: "60 min", note: "Adds gratitude you sit with and the why under a goal.", stepIds: ["read-star", "see-scene", "feel-it", "incantations", "identity-lines", "gratitude-deep", "why-read", "act-as-if"] },
    ],
    library: [
      { id: "read-star", title: "Read your north star out loud", minutes: 3, daysPerWeek: 7, dimension: "spirit" },
      { id: "see-scene", title: "Close your eyes and see one scene from it", minutes: 5, daysPerWeek: 7, dimension: "spirit", goesTo: "star" },
      { id: "feel-it", title: "Feel it as though it already happened", minutes: 5, daysPerWeek: 7, dimension: "spirit", goesTo: "star" },
      { id: "incantations", title: "Speak your incantations out loud, with your whole body", minutes: 5, daysPerWeek: 7, dimension: "spirit" },
      { id: "identity-lines", title: "Say your identity lines. The ones that start with I am", minutes: 3, daysPerWeek: 7, dimension: "mind" },
      { id: "why-read", title: "Re-read the why under one goal", minutes: 3, daysPerWeek: 7, dimension: "mind", goesTo: "why:top" },
      { id: "gratitude-deep", title: "Sit with three things you are grateful for until you feel them", minutes: 5, daysPerWeek: 7, dimension: "spirit", asks: "The three you sat with until you felt them" },
      { id: "act-as-if", title: "Pick one thing that person would do today, and do it", minutes: 2, daysPerWeek: 7, dimension: "mind", asks: "The one thing that person would do today, that you did" },
      { id: "future-letter", title: "Write two lines from the version of you who already has it", minutes: 5, daysPerWeek: 3, dimension: "mind", asks: "Two lines from the version of you who already has it" },
      { id: "visual-board", title: "Look at your pictures of it", minutes: 3, daysPerWeek: 7, dimension: "spirit" },
    ],
  },
  {
    id: "workout",
    label: "Training week",
    kind: "weekly",
    why: "A body you are proud of is built from sessions you do not skip. Name the days and the week stops being a decision.",
    areaSeedId: "lm_fitness",
    servesAreaIds: ["lm_health", "lm_emotions"],
    daysPerWeek: 4,
    split: true,
    defaultStepIds: ["strength", "cardio", "mobility"],
    defaultSplitId: "fullbody",
    presets: [
      { id: "three", label: "3 days", note: "Full body three times. The one that survives an unpredictable week.", stepIds: ["strength", "steps", "mobility"] },
      { id: "four", label: "4 days", note: "Lifting four times with cardio alongside it.", stepIds: ["strength", "cardio", "steps", "mobility"] },
      { id: "six", label: "6 days", note: "For a season where training is the priority.", stepIds: ["strength", "cardio", "steps", "mobility", "sport", "protein"] },
    ],
    library: [
      { id: "strength", title: "Strength session", minutes: 60, daysPerWeek: 3, dimension: "body" },
      { id: "cardio", title: "Cardio. Run, bike or swim", minutes: 40, daysPerWeek: 2, dimension: "body" },
      { id: "steps", title: "Ten thousand steps", minutes: 60, daysPerWeek: 6, dimension: "body" },
      { id: "mobility", title: "Mobility and stretching", minutes: 10, daysPerWeek: 4, dimension: "body" },
      { id: "protein", title: "Hit your protein target", minutes: 5, daysPerWeek: 7, dimension: "body" },
      { id: "sport", title: "Play a sport", minutes: 90, daysPerWeek: 1, dimension: "body" },
      { id: "weigh", title: "Morning weigh-in", minutes: 1, daysPerWeek: 7, dimension: "body" },
    ],
  },
  {
    id: "work",
    label: "Business routine",
    kind: "weekly",
    why: "Output compounds from a few protected habits. Everything else is noise with a calendar invite.",
    areaSeedId: "lm_mission",
    servesAreaIds: ["lm_money", "lm_mindset"],
    daysPerWeek: 5,
    split: false,
    defaultStepIds: ["mit", "deep", "shutdown"],
    defaultSplitId: null,
    presets: [
      { id: "light", label: "Light", note: "One thing that matters, and a clean finish.", stepIds: ["mit", "shutdown"] },
      { id: "standard", label: "Standard", note: "Adds a protected block and a weekly look back.", stepIds: ["mit", "deep", "shutdown", "weekly-review"] },
      { id: "deep", label: "Deep", note: "For a season where the work is the point.", stepIds: ["mit", "deep", "shutdown", "weekly-review", "craft", "ship", "no-social", "money-day"] },
    ],
    library: [
      { id: "mit", title: "One most important task, done first", minutes: 90, daysPerWeek: 5, dimension: "mind", asks: "The most important thing you did today" },
      { id: "deep", title: "Ninety minutes of deep work", minutes: 90, daysPerWeek: 5, dimension: "mind" },
      { id: "shutdown", title: "Daily shutdown. Clear the inbox, plan tomorrow", minutes: 15, daysPerWeek: 5, dimension: "mind" },
      { id: "money-day", title: "Thirty minutes with your numbers, same day each week", minutes: 30, daysPerWeek: 1, dimension: "mind" },
      { id: "weekly-review", title: "Weekly review", minutes: 30, daysPerWeek: 1, dimension: "mind", goesTo: "journal:weekly-review" },
      { id: "craft", title: "Sharpen your craft", minutes: 30, daysPerWeek: 3, dimension: "mind" },
      { id: "ship", title: "Ship one visible thing", minutes: 60, daysPerWeek: 2, dimension: "mind" },
      { id: "no-social", title: "No social media before noon", minutes: 1, daysPerWeek: 5, dimension: "mind" },
    ],
  },
  {
    /**
     * The one that is made of things you do NOT do.
     *
     * Every other routine here adds something to the week. This one takes
     * something out, and it is usually the faster lift: dropping one thing moves
     * mind, emotions, health and money at once, which is exactly the shape the
     * season-focus question is looking for. Each line is a day you stay clean of
     * it, so seven days a week is the line held all week.
     */
    id: "vices",
    label: "Vices",
    kind: "weekly",
    why: "The fastest way to lift four areas at once is usually to stop doing one thing. Name what you are quitting and how many days a week you hold it.",
    areaSeedId: "lm_mindset",
    servesAreaIds: ["lm_health", "lm_emotions", "lm_spirituality"],
    daysPerWeek: 7,
    split: false,
    defaultStepIds: ["no-phone-bed", "no-scroll-am"],
    defaultSplitId: null,
    presets: [
      { id: "screens", label: "Screens", note: "The phone ones. Start here if you are not sure.", stepIds: ["no-phone-bed", "no-scroll-am", "no-social-noon"] },
      { id: "substances", label: "Substances", note: "Drink, smoke, weed.", stepIds: ["no-drink-week", "no-smoke", "no-weed"] },
      { id: "hard", label: "The hard reset", note: "For a season where the point is to stop.", stepIds: ["no-porn", "no-drink-week", "no-scroll-am", "no-phone-bed", "no-junk", "no-gaming-week"] },
    ],
    library: [
      { id: "no-phone-bed", title: "No phone in bed", minutes: 0, daysPerWeek: 7, dimension: "mind" },
      { id: "no-scroll-am", title: "No scrolling in the first hour", minutes: 0, daysPerWeek: 7, dimension: "mind" },
      { id: "no-social-noon", title: "No social media before noon", minutes: 0, daysPerWeek: 5, dimension: "mind" },
      { id: "no-porn", title: "No porn", minutes: 0, daysPerWeek: 7, dimension: "spirit" },
      { id: "no-drink-week", title: "No drinking on weeknights", minutes: 0, daysPerWeek: 5, dimension: "body" },
      { id: "no-smoke", title: "No smoking or vaping", minutes: 0, daysPerWeek: 7, dimension: "body" },
      { id: "no-weed", title: "No weed", minutes: 0, daysPerWeek: 7, dimension: "body" },
      { id: "no-junk", title: "No junk food", minutes: 0, daysPerWeek: 6, dimension: "body" },
      { id: "no-gaming-week", title: "No gaming on weeknights", minutes: 0, daysPerWeek: 5, dimension: "mind" },
      { id: "no-gambling", title: "No betting", minutes: 0, daysPerWeek: 7, dimension: "mind" },
      { id: "no-spend", title: "Nothing bought on impulse", minutes: 0, daysPerWeek: 7, dimension: "mind" },
      { id: "no-snooze", title: "No snooze button", minutes: 0, daysPerWeek: 7, dimension: "body" },
    ],
  },
  {
    id: "social",
    label: "People routine",
    kind: "weekly",
    why: "Relationships compound like money, on small consistent deposits. Nobody drifts into a good one.",
    areaSeedId: "lm_friends",
    servesAreaIds: ["lm_family", "lm_relationship", "lm_fun"],
    daysPerWeek: 4,
    split: false,
    defaultStepIds: ["reach-out", "family-call", "plan-social"],
    defaultSplitId: null,
    presets: [
      { id: "light", label: "Light", note: "One friend and one call home. Hard to fail.", stepIds: ["reach-out", "family-call"] },
      { id: "standard", label: "Standard", note: "Adds something in the diary and a word said out loud.", stepIds: ["reach-out", "family-call", "plan-social", "compliment"] },
      { id: "full", label: "Full", note: "For a season where the people are the priority.", stepIds: ["reach-out", "family-call", "plan-social", "compliment", "date", "host", "voice-note"] },
    ],
    library: [
      { id: "reach-out", title: "Reach out to one friend", minutes: 10, daysPerWeek: 3, dimension: "spirit" },
      { id: "family-call", title: "Call family with no agenda", minutes: 20, daysPerWeek: 1, dimension: "spirit" },
      { id: "date", title: "Go on, or plan, a date", minutes: 120, daysPerWeek: 1, dimension: "spirit" },
      { id: "host", title: "Invite someone over", minutes: 120, daysPerWeek: 1, dimension: "spirit" },
      { id: "compliment", title: "Give one genuine compliment", minutes: 1, daysPerWeek: 5, dimension: "spirit" },
      { id: "plan-social", title: "Put one social thing in the diary", minutes: 10, daysPerWeek: 1, dimension: "mind" },
      { id: "voice-note", title: "Send a voice note instead of a text", minutes: 3, daysPerWeek: 3, dimension: "spirit" },
      { id: "stranger", title: "Start one conversation with a stranger", minutes: 5, daysPerWeek: 3, dimension: "mind" },
    ],
  },
  {
    id: "mind",
    label: "Mind routine",
    kind: "weekly",
    why: "A calm, growing mind is the base layer under every other goal here.",
    areaSeedId: "lm_mindset",
    servesAreaIds: ["lm_emotions", "lm_spirituality", "lm_health"],
    daysPerWeek: 4,
    split: false,
    defaultStepIds: ["reading", "nature", "breath-long"],
    defaultSplitId: null,
    presets: [
      { id: "light", label: "Light", note: "Read, and get outside without headphones.", stepIds: ["reading", "nature"] },
      { id: "standard", label: "Standard", note: "Adds a skill you are building and a long sit.", stepIds: ["reading", "learn", "nature", "breath-long"] },
      { id: "full", label: "Full", note: "Adds writing and one evening away from a screen.", stepIds: ["reading", "learn", "nature", "breath-long", "write", "low-screen"] },
    ],
    library: [
      { id: "reading", title: "Read non-fiction", minutes: 20, daysPerWeek: 4, dimension: "mind" },
      { id: "learn", title: "Half an hour learning a skill", minutes: 30, daysPerWeek: 3, dimension: "mind" },
      { id: "nature", title: "Time outside with no headphones", minutes: 30, daysPerWeek: 2, dimension: "spirit" },
      { id: "write", title: "Write two hundred words about anything", minutes: 20, daysPerWeek: 3, dimension: "mind", asks: "Two hundred words" },
      { id: "low-screen", title: "One low-screen evening", minutes: 120, daysPerWeek: 2, dimension: "mind" },
      { id: "breath-long", title: "Long breathwork or meditation sit", minutes: 20, daysPerWeek: 2, dimension: "spirit" },
    ],
  },
]

export const ROUTINE_BLUEPRINT_MAP = new Map(ROUTINE_BLUEPRINTS.map((b) => [b.id, b]))

/**
 * The four that ship in the stack beside the wheel, in order.
 *
 * Morning and evening bracket the day, business is where the output comes from,
 * and vices is the one made of things you stop. Manifestation is still in the
 * library and one click away; it was cut from the default four because reading
 * the north star out loud is already a step in the morning routine.
 */
export const DEFAULT_ROUTINE_IDS = ["morning", "night", "work", "vices"]

/** Standard split templates for the training week. */
export const NS_SPLITS: Array<{ id: string; label: string; days: string[]; perWeek: number }> = [
  { id: "fullbody", label: "Full body", days: ["Full Body A", "Full Body B", "Full Body C"], perWeek: 3 },
  { id: "upper-lower", label: "Upper / Lower", days: ["Upper A", "Lower A", "Upper B", "Lower B"], perWeek: 4 },
  { id: "ppl", label: "Push / Pull / Legs", days: ["Push", "Pull", "Legs"], perWeek: 3 },
  { id: "ppl6", label: "Push / Pull / Legs ×6", days: ["Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B"], perWeek: 6 },
  { id: "bodypart", label: "Body part split", days: ["Chest", "Back", "Legs", "Shoulders", "Arms"], perWeek: 5 },
  { id: "custom", label: "Custom", days: ["Day A", "Day B"], perWeek: 2 },
]

// ---------------------------------------------------------------- tab 3

/** The three shapes a goal can take, in one place so every screen agrees. */
export const NS_GOAL_TYPES: Array<{ type: "milestone_ladder" | "habit_ramp" | "achievement"; icon: string; label: string; hint: string }> = [
  { type: "milestone_ladder", icon: "🎯", label: "Target", hint: "A number you climb to by a date. 100 kg, ten thousand a month, twelve percent body fat." },
  { type: "habit_ramp", icon: "🔁", label: "Practice", hint: "An ongoing weekly practice. You never finish it, you just keep it." },
  { type: "achievement", icon: "🏁", label: "Finish line", hint: "You either did it or you did not. A first muscle-up, a licence, a book out." },
]

export const GOALS_INTRO = {
  title: "What you are actually doing about it",
  help: "Write the goal, then the reason under it. The reason is the part you re-read on a day you do not feel like it, so it is worth more than the wording of the goal.",
  shapes: "A number becomes a target with a date. Something you do every week becomes a practice. Something you either do or do not becomes a finish line. Flip any goal between them at any time.",
}

/**
 * Every goal arrives with a date on it, a year out.
 *
 * A goal with no date is a wish, and a picker that starts empty means every goal
 * added from the library needs twelve clicks in a calendar before it means
 * anything. A year is his own default horizon for a goal ("typically a year or
 * less; when you go beyond a year it becomes a lot harder to manage and
 * measure"), and it is the number people move off rather than the number they
 * have to invent. Moving it is one click on a chip.
 */
export const DEFAULT_GOAL_MONTHS = 12

/** The dates people actually pick, so the calendar is the fallback not the tool. */
export const GOAL_DATE_PRESETS: Array<{ id: string; label: string; months: number | null; note: string }> = [
  { id: "m3", label: "3 months", months: 3, note: "A sprint. Close enough that this week counts." },
  { id: "m6", label: "6 months", months: 6, note: "Long enough for a real change in a body or a balance." },
  { id: "m12", label: "1 year", months: 12, note: "His own default. Past a year a goal gets hard to measure." },
  { id: "m24", label: "2 years", months: 24, note: "For something that genuinely cannot be done sooner." },
  { id: "eoy", label: "End of this year", months: null, note: "The 31st of December." },
]

/**
 * Goals the site can score for you.
 *
 * You already rate the twelve areas day to day on this page. A goal like "raise
 * my average emotional state to an 8" is measured by exactly that number, so
 * asking the user to type their own progress into it would be asking them to
 * copy a figure the page is already holding. Wiring it means the goal's current
 * value is the rolling average and the progress bar moves on its own.
 */
export const GOAL_METRIC_COPY = {
  label: "Score this from my daily ratings",
  help: (area: string) =>
    `Your rolling ${NS_DAILY_WINDOW}-day average for ${area} becomes this goal's current number. Rate the area each day and the progress moves on its own.`,
  on: "Scored from your daily ratings",
  off: "Track it yourself",
  unit: "/10 average",
  noData: "Rate this area on a few days and the number starts filling in.",
  reading: (avg: number, days: number) => `${avg}/10 average over ${days} ${days === 1 ? "day" : "days"}`,
}

/** Said over a set of goals that just arrived together from a template. */
export const TEMPLATE_ADDED_COPY = {
  title: (n: number, label: string) => `${n} ${n === 1 ? "goal" : "goals"} added from ${label}`,
  help: "They all arrived with a date a year out and their own shape. Open any of them to move the date, drag the climb, or change the ramp.",
  shape: "Shape them",
  dismiss: "got it",
}

export const TEMPLATE_PREVIEW_COPY = {
  show: "what is in it",
  hide: "hide",
  levelNote: (level: string) => `Numbers shown at ${level}.`,
}

/** The nudge that replaces gating. Nothing is ever blocked; it is just listed. */
export const TODO_COPY = {
  title: "Still to fill in",
  help: "None of this stops you moving on. A date or a why can wait a week. It is listed here so you can find it again.",
  none: "Nothing outstanding.",
}

/** Common things that stop people, offered so the box is not blank. */
export const OBSTACLE_PRESETS = [
  "I run out of time",
  "I lose motivation after a few weeks",
  "Work eats the hours I planned for this",
  "I get ill or injured and never restart",
  "The people around me pull me the other way",
  "I start too big and burn out",
  "I forget it exists",
  "Money gets in the way",
]

/** The counter is the half people skip, so it gets its own question. */
export const OBSTACLE_COUNTER_QUESTION = "And what will you do when that happens?"

/**
 * The belief procedure, compressed to the four steps a goal card can hold.
 *
 * The second step is the one that does the work. It refuses to argue about
 * whether the belief is true and asks only whether it is useful, which is how
 * you drop a belief without having to win an argument with yourself.
 */
export const BELIEF_STEP_COPY = {
  old: { label: "The belief in the way", placeholder: "I am… / I can't… / I don't have the…" },
  useful: { label: "Set aside whether it is true. Does it serve you?", yes: "It serves me", no: "It does not serve me" },
  evidence: { label: "Who has done this with your exact disadvantage? And when have you already done something like it?", placeholder: "The counter-evidence" },
  replacement: { label: "The replacement. Same subject, believable and useful", placeholder: "I have an abundance of time for whatever I am committed to" },
  usefulNote: "Saying it serves you is a real answer. If it does, leave it alone and work on something else.",
  conditionNote: "Say the replacement out loud, with your body, every day for a month. Deciding once does not change a belief.",
}

/** Rotated one at a time, because nobody gets three reasons from one angle. */
export const NS_WHY_ANGLES: Array<{ id: string; label: string; question: string }> = [
  { id: "daily", label: "The daily texture", question: "What is an ordinary Tuesday like once you have this? Name the small things." },
  { id: "identity", label: "Who you become", question: "Who are you once this is true, and what does that person do differently?" },
  { id: "cost", label: "The cost of not", question: "What does another five years without this take from you?" },
  { id: "others", label: "Who else feels it", question: "Whose life is different because you did this?" },
  { id: "unlocks", label: "What it unlocks", question: "What becomes possible after this that is not possible now?" },
  { id: "proof", label: "The proof", question: "What would this prove to you. And to whom?" },
  { id: "feeling", label: "The feeling", question: "What do you get to stop feeling? What do you get to start feeling?" },
  { id: "body", label: "The body", question: "What does this give you physically. Energy, sleep, how you feel in your own skin?" },
]

export const NS_PAIN_WHY_QUESTION = "What will it cost you if you do not do this?"

/** Belief and desire both get a 0-10, and both have to clear this. */
export const NS_QUALIFY_THRESHOLD = 7

// ---------------------------------------------------------------- tab 4

export const NOW_INTRO = {
  title: "Where you are, area by area",
  help: "Before you decide where you are going, be honest about where you are standing. Open an area and write what a 10 looks like, rate yourself against it, then say why it matters, who you are in it, and what it asks of you.",
  order: "Write the 10 first. A rating with no picture behind it is a mood, and somebody else's 10 in your health is not yours. You do not have to do all twelve.",
  next: "Now say what you will do →",
}

/** Tab 3. The goals, and nothing else. */
export const PLAN_INTRO = {
  /** Written at step 3; shown here as what the list is for. */
  oneEcho: "This year is for",
  oneNeeds: (n: number) => `${n} ${n === 1 ? "goal is" : "goals are"} already on this page because of it:`,
  oneNothingYet: "What has to happen for it? Each line becomes a real goal, filed where it belongs.",
  oneNeedsPlaceholder: "Something that has to be true",
  oneNeedsAdd: "Add",
  oneEdit: "Change it at step 3",

  /** One per step: there are no routines on the milestones step to click. */
  wheelHint: "Click an area to write what you want in it.",
  wheelHintSystems: "Click an area to say what you will do in it, or click a routine to build it.",
  wheelFill: "The fill is your rating. The line under each name is what you have aimed at it.",
  tenReminder: "Your 10 here:",
  identityReminder: "Who you are here:",
  valuesReminder: "This area asks you to value",
  valuesAdd: "add one",
  /** Under the chips, because a drag nobody notices is a drag nobody uses. */
  valuesDrag: "Drag to reorder — the first one wins when two of them collide.",
  doneTitle: "This step is done",
  doneHelp: "Every goal has a date and something you will actually do, every area you pictured has something aimed at it, and your routines have something in them.",
  openTitle: "Before you move on",
  openHelp: "None of this blocks you. It is what is still open here, and this step is the one where everything gets written down — choosing between it comes next.",
  openNoGoals: "No goals written yet",
  openGaps: (n: number) => `${n} ${n === 1 ? "area you pictured has" : "areas you pictured have"} nothing aimed at ${n === 1 ? "it" : "them"}`,
  openDates: (n: number) => `${n} ${n === 1 ? "goal has" : "goals have"} no date`,
  openActions: (n: number) => `${n} ${n === 1 ? "goal names" : "goals name"} an outcome with nothing you would do`,
  openRoutines: "Nothing in any routine yet",
  nextAnyway: "Move on anyway →",
  moreWays: "Other ways to add goals",
  moreWaysHelp: "Paste a list, start from your 10, describe a day, block out a week — and the questions still open on what you have written.",
  title: "What you are going to do about it",
  help: "One area at a time. Its 10 and its rating come with it, so every goal is written against the picture it is supposed to close. The routines beside the wheel are the part that runs every week whatever else happens.",
  order: "Write the goal, then the reason under it. The reason is what you re-read on a day you do not feel like it.",
  empty: "Nothing written yet. Open an area and add the first one.",
  next: "Now check them against your 10 →",
  /** Said on an area that has a 10 written and nothing aimed at it. */
  gap: (names: string) => `Pictured but nothing aimed at it yet: ${names}.`,
}

/**
 * Only said once every area has a number.
 *
 * It used to appear the moment a single area was rated, so rating Emotions first
 * produced "Under the floor right now: Emotions. That is where the attention goes
 * this season" off one data point and eleven blanks. You cannot know what is
 * lowest until you have looked at all of them, and telling somebody where their
 * season goes before they have decided anything is the app doing the deciding.
 *
 * So: nothing until all twelve are rated, and then an observation rather than an
 * instruction. What to do about it is the next screen's job.
 */
export const FLOOR_LINE = {
  waiting: (rated: number, total: number) =>
    `${total - rated} ${total - rated === 1 ? "area" : "areas"} still unrated. Once they all have a number this will tell you which are under the floor.`,
  under: (names: string) => `Under a seven right now: ${names}.`,
  none: "Nothing under a seven right now.",
  note: "Seven is the floor. Which of these you work on this season is your call, and two or three areas carry most years.",
}

/**
 * One person's 10 in each area, offered as a starting point.
 *
 * Every area used to open on an empty box under "What would a 10 look like
 * here?", with only his three-word sub-label ("Energy, Vitality, Well-Being") to
 * say what the area even covered. Twelve blank boxes is eleven more than anyone
 * fills in, and the first question the box has to answer is what the area means.
 *
 * Written in the first person and in the same register as the north star
 * example, so it can be edited into the user's own rather than read as a target.
 * Never inserted automatically: it is a placeholder plus a button.
 */
export const AREA_TEN_EXAMPLES: Record<string, string> = {
  lm_health:
    "I wake up before the alarm and I am awake all day without needing coffee to get going. I sleep seven or eight hours most nights. Nothing hurts, my bloods are clean, and I have not been properly ill in a year.",
  lm_fitness:
    "I train four times a week without negotiating with myself about it. I am strong enough to carry anything I need to carry, I can run for the bus without thinking, and I like what I see in the mirror.",
  lm_mindset:
    "My default thought about a hard thing is that I will work it out. I catch myself in a spiral within minutes instead of days. I do not need anyone to agree with me to feel steady.",
  lm_emotions:
    "Most days I feel good for no particular reason. When something knocks me, it lasts hours rather than weeks. I am grateful without having to be reminded, and the people near me can tell.",
  lm_relationship:
    "We are close, we want each other, and we can say hard things without it turning into a fight. I look forward to seeing them at the end of the day.",
  lm_mission:
    "The work matters to me and I would still do a version of it if the money were handled. I am good at it and getting better, and I finish most weeks knowing what I moved.",
  lm_money:
    "No debt I am uncomfortable with, a year of costs saved, and money coming in that does not depend on my hours. I stop looking at prices for ordinary things.",
  lm_family:
    "I talk to them because I want to, not out of duty. Nothing important is unsaid. When something goes wrong for one of us, everyone knows within a day.",
  lm_friends:
    "Three or four people I could call at 2am, and I see them often enough that we do not have to catch up. My weeks have people in them without me organising anything.",
  lm_fun:
    "Something in the week is purely for the pleasure of it and I do not have to justify it. A few trips a year. I am still learning things that are no use to anyone.",
  lm_contribution:
    "I give money or time regularly, on a schedule, not when I remember. At least one person is better off this year because of something I did and will not be repaid for.",
  lm_spirituality:
    "I have a practice I keep. I feel part of something larger than my own week, and my decisions come from that rather than from whatever I am anxious about.",
}

export const REVIEW_INTRO = {
  title: "Does the plan point at your 10?",
  help: "You wrote your 10 in each area and rated where you stand. Now read the goals against that picture, and answer the questions that decide whether you keep going in February.",
  dailyNote: "The ratings and the 10s live on the Where you are tab. This tab reads them back beside the goals in that area.",
  floorNote: "Seven is the floor, and it is not the aim. Anything under a seven is the area asking for attention this season.",
}

/** The score below which an area is asking for attention. */
export const NS_FLOOR = 7

/**
 * What the two numbers being apart actually means.
 *
 * The old line said "one of the two is telling the truth, and it is worth a
 * minute deciding which", which reads as being told your own rating is wrong.
 * Nothing in the material says that. What he says about rating is only that
 * measuring makes you aware and lets you act ("when you see my energy is a six,
 * you can do something about it"). The two numbers come from different places
 * and are supposed to differ, so this now says what the difference is made of
 * and stops.
 */
export const RATING_VARIANCE_NOTE = {
  above: "Your fortnight number is higher than your daily average. Looking back tends to round up, and the daily numbers were made in the moment. Both are real readings.",
  below: "Your fortnight number is lower than your daily average. Memory weights the worst days heavily. Both are real readings.",
  gap: 1.5,
}

/**
 * The one thing for the season.
 *
 * Ranking twenty goals tells you what order to work through them. It does not
 * tell you which one, if it happened, would make half the list easier or
 * unnecessary. That is a different question and it is worth asking on its own,
 * because the answer is usually not the goal at rank one.
 */
export const SEASON_FOCUS_COPY = {
  title: "Your one thing this season",
  help: "Of everything on this page, which one, if it happened, would make the rest easier? Often it is not the biggest goal. Quitting one thing, or getting one habit in place, can move four areas at once.",
  empty: "Nothing picked yet.",
  pick: "Make this my one thing",
  clear: "not this one",
  banner: (label: string) => `This season: ${label}`,
  bannerNote: "If a week goes badly, this is the one that still gets done.",
  areaOption: "Or pick a whole area, if you have not written the goal yet.",
}

/** Marking what a goal or a routine lifts beyond the box it is filed under. */
export const SERVES_COPY = {
  goal: {
    label: "What else does this lift?",
    help: "Some goals move more than one part of your life. Sleeping properly, or dropping one thing, lifts several at once. Tick them and this goal shows up inside each of those areas.",
  },
  routine: {
    label: "Which areas does this routine carry?",
    help: "A morning routine is not filed under one part of your life. Say which parts it holds up and each of them will show it.",
  },
  /** Shown inside an area, listing what already runs there from elsewhere. */
  inArea: "Also working on this area:",
  none: "Nothing from elsewhere reaches this area yet.",
}

/**
 * Goals that are really an in-app tool.
 *
 * The business template ships "Weekly Review", which is exactly the thing this
 * page's review tab does. Leaving it as a bare goal with a 1-per-week ramp means
 * the user tracks a review they then have nowhere to run. Matched on title,
 * case-insensitively, because these arrive from the framework catalogue by
 * label.
 */
export const GOAL_TOOL_LINKS: Array<{ match: string[]; label: string; tab: NorthStarTabId; note: string }> = [
  {
    match: ["weekly review", "weekly reflection"],
    label: "Run it on the Review tab",
      tab: "commit",
    note: "This page has the review built in. The Review tab reads every area's 10 back beside its goals and asks whether they still aim at it.",
  },
  {
    match: ["morning ritual", "morning routine"],
    label: "Build it in your Morning routine",
    tab: "now",
    note: "Your morning routine is already on this page, with the full hour as a preset. Build it there and this goal is just the promise to keep it.",
  },
]

/**
 * Milestone celebrations, on a finish-line goal.
 *
 * A finish line pays out once, at the end. "Bench 36 kg dumbbells for 6 reps" is
 * correctly a finish line — you did it or you did not — and it is also obviously
 * a climb, and the climb is where the year actually happens. So the number comes
 * out of the title, the rungs are generated at even intervals, and each one has
 * a place to write what you do when you get there.
 */
/**
 * Step 4 says what it is for, in four short lines beside the wheel.
 *
 * Somebody who does not know the difference between this step and the next one
 * writes half a plan on each. The line about coming back is load-bearing: a
 * step that feels final gets the safe answer rather than the true one.
 */
/**
 * Step 5 says what a system is, and what it is not.
 *
 * The distinction is the point of splitting the step in two: a milestone is
 * what you want, a system is what runs. People arrive knowing the first and
 * having never written the second, and the page is only worth the extra click
 * if it says so plainly.
 */
/**
 * The switch between the two halves, and the one line each that says which is
 * which. People do not arrive knowing the difference, and the difference is
 * the only reason the two halves are labelled at all.
 */
export const HALVES_COPY = {
  /**
   * ACHIEVEMENTS, NOT MILESTONES, in everything the person reads.
   *
   * "Milestone" was doing two jobs on one page: the thing you want to have
   * done, and the dated rungs on the way up to it — so "16 milestones" under a
   * list of 5 milestones was correct twice and legible neither time. The thing
   * you want is an achievement; the rungs inside it stay milestones. The code
   * keeps `milestone_ladder`, `milestoneGoals` and the `milestones` step id,
   * because renaming a model to follow a label is how the two words got mixed
   * in the first place.
   */
  milestones: {
    label: "Experiences",
    line: "What you want to have experienced and achieved. Numbers, things, moments — the half that pulls you.",
  },
  systems: {
    label: "Systems",
    line: "What you actually do, week in week out. The half that moves it. Your routines are always systems.",
  },
  /**
   * THE CATALOGUE IS A TAB, NOT A FOOTNOTE.
   *
   * It spent a while at the bottom of the page inside a closed disclosure, and
   * hidden entirely until the plan had a goal in it — so the one person who
   * most needs a ready-made set, somebody staring at an empty area, was the one
   * person who could not see that 26 of them exist. It sits beside the two
   * halves it feeds, because that is what it is: the third way to fill them.
   */
  templates: {
    label: "Templates",
    line: "Ready-made sets, single goals and practices for every area, sized Beginner to Advanced. A set arrives with its numbers, its dates and the routine that keeps it. Pick instead of writing, then edit anything.",
  },
  /** The other step, from each of them. */
  toSystems: "what moves it →",
  toMilestones: "← what it is for",
  derivedTitle: "What your routines already add up to",
  derivedHelp:
    "A routine is a system, never an experience — the total is: 400 hours of deep work, 90 days in a row. Counted from the routine you built.",
  derivedAdd: "make this one of them",
  derivedFrom: (routine: string) => `from your ${routine.toLowerCase()}`,
} as const

export const SYSTEMS_COPY = {
  title: "What actually moves it",
  help:
    "The last step was what you want. This one is what you do: the routines, the weekly rates, the thing you do on a Tuesday you do not feel like it. Something you want with nothing running at it never happens, and something you do every week that is pointed at nothing is a chore.",
  back: "Nothing here is final either. Go back a step whenever you want to add something you have thought of since.",

  linkTitle: "What is running at what",
  linkHelp: "Point each system at what it moves. Nothing links itself — a routine step and a goal can share an area and have nothing to do with each other.",
  linkAdd: "link one",
  nothingRunning: "Nothing is running at this yet.",
  nothingToLink: "Nothing to link yet. Add a routine step above, or write a weekly rate below.",
  noMilestones: "Nothing written on the Experiences step yet. That is where they go.",
  kind: { step: "routine", driver: "weekly", action: "action" } as Record<string, string>,

  wishesTitle: (n: number) => `${n} ${n === 1 ? "thing you want has" : "things you want have"} nothing running at ${n === 1 ? "it" : "them"}`,
  wishesHelp: "Which makes them wishes rather than plans. Either point something at them, or let them be — a wish you have named is still worth having.",
  orphansTitle: (n: number) => `${n} ${n === 1 ? "system is" : "systems are"} pointed at nothing`,
  orphansHelp: "Not wrong — plenty of good habits serve nothing in particular. Worth a look, though: this is where the busy weeks come from.",

  writeTitle: "Write a system of your own",
  writeHelp: "Something you will do, at a rate you will hold: four sessions a week, thirty minutes on a Sunday. It lands in the area you pick.",
} as const

export const MILESTONES_COPY = {
  noteTitle: "What this step is",
  noteBody:
    "Everything you want to have achieved, area by area. Numbers you want to hit, things you want to own, things you want to have done. This is the motivating half — it is meant to pull you.",
  noteNext:
    "Write it all down, including the ones you would not say out loud. It is far easier to cut a list than to invent one.",
  noteBack:
    "What you will actually DO about any of it is the next step, and nothing here is final — you can come back and change it whenever you like.",
  tabCount: (n: number) => `${n} written`,
  /**
   * The whole list, on the page that writes it, before an area is picked.
   *
   * The wheel is the way into an area and it was also the only thing on this
   * step until you clicked one, so what you had already written was invisible
   * from the page that writes it — twelve areas to open to find out whether you
   * had said something twice.
   */
  allTitle: "Everything you have written so far",
  allHelp: "Across every area, in no order — putting them in order is the focus step, and there is no rush to. Click one to open it, or an area to keep writing there.",
  allCount: (n: number) => `${n} in total`,
  tabCountSystems: (n: number) => `${n} running`,
  tabCountTemplates: (n: number) => `${n} sets on offer`,
  experiencesHelp:
    "The ones that are not goals: a car, a country, a night you want to have had. Write them anyway — they pull as hard as the numbers, and harder on a bad week.",
} as const

export const MILESTONE_COPY = {
  title: "Milestone celebrations",
  help: "This one has a number in it, so it has a climb underneath it. Set the rungs and say what you do when you reach each one. A finish line that only pays out at the end is a long time to work with nothing to feel.",
  from: "From",
  to: "To",
  count: "Rungs",
  unit: "Unit",
  make: "Set the milestones",
  remake: "Redo the milestones",
  replaceNote: (n: number) => `This replaces the ${n} ${n === 1 ? "milestone" : "milestones"} already here. Checkpoints you wrote yourself stay.`,
  celebrate: "What you do when you get here",
  celebratePlaceholder: "Tell someone. Take the night off. Buy the thing.",
  celebrateHint: "Small and soon beats big and never. It only counts if you actually do it.",
  none: "No number in this goal's title, so there is nothing to space out. Write the checkpoints yourself below.",
  offer: "Turn this into a climb",
  /** Same offer where the title holds no number to space out. */
  offerOwn: "Write the steps to this",

  /**
   * Weight alone is not a progression, and no generated ladder knows that a
   * muscle-up is what comes after ten pull-ups.
   */
  shapeReps: "Weight and reps",
  shapeWeight: "Weight only",
  shapeOwn: "Write my own",
  repsNote: "How lifts actually go up: hold the weight until the top set is easy, then take the jump and lose the reps again.",
  sets: "Sets",
  repsLow: "Reps after a jump",
  repsHigh: "Reps before the next one",
  ownAsk: "Your progression, in order",
  /**
   * THE EXAMPLE COMES FROM THE AREA, never from this file.
   *
   * It illustrated a written ladder with "5 pull-ups → 10 pull-ups →
   * muscle-up" in all twelve areas, which was fine while this tool only opened
   * inside the goal dialog and became Money being shown pull-ups the moment
   * the achievements step started offering it. Same rule as `AREA_GOAL_EXAMPLES`
   * and the same test enforces it.
   */
  ownNote: (rungs: string[]) =>
    `One rung per line, or separate them with arrows. They do not have to be numbers: "${rungs.join(" → ")}" is a ladder.`,
  ownPlaceholder: (rungs: string[]) => rungs.join("\n"),
  ownMake: "Use these rungs",
  weeksNote: (weeks: number) => `Paced across the ${weeks} weeks to your date.`,
}

/** Said on a goal whose title already exists as a step in one of the routines. */
export const GOAL_IN_ROUTINE = (routine: string, step: string) =>
  `Already in your ${routine}, as "${step}". Keeping the goal is fine; the routine is where it actually happens.`

/** How many days of daily ratings roll into the average shown beside the review. */
export const NS_DAILY_WINDOW = 14

export const AREA_REVIEW_COPY = {
  ten: { question: "What would a 10 look like here?", help: "Your 10, in your words. Somebody else's 10 in this area is not yours, and a rating with nothing behind it is a mood.", placeholder: "A 10 in this area is…" },
  tenExample: "Not sure what this area covers? Here is one person's 10, to edit or ignore.",
  tenUse: "start from this",
  tenReplace: "replace what I wrote?",
  tenKeep: "keep mine",
  /**
   * The guidance that stops the 10 being useless.
   *
   * Both halves are his. "The 10 is whatever you define it to be, so my 10
   * might be different than your 10. Financially your 10 might be a
   * billionaire, and so you might feel like a 2, because that's the standard
   * and that's the goal that you have for yourself" — and, about himself, "I
   * would never say 10, it would always be nine, or nine and a half, because I
   * always thought if it's a 10 then it's perfect", which he no longer does:
   * he rates finances, career and relationship a 10 at this stage of his life.
   * So the 10 moves as you do (QZjdmXreWd0, I-SoCQvNi9A).
   *
   * The last sentence is our reading rather than a quote, and it is the useful
   * part: a 10 pinned twenty years out reads a 2 every week and teaches you
   * nothing.
   */
  tenGuide: [
    "Your 10 is yours. His 10 for his body is 170 pounds at 6 percent body fat and six hours of sleep. Somebody else's is being pain free with energy all day. Both are fine.",
    "It moves. A 10 at this stage of your life will not be a 10 in ten years. Rewrite it as you grow.",
    "Write the version of this area you could be living inside a year or two. If you set it at billionaire, you will rate yourself a 2 every week for a decade and learn nothing from it.",
  ],
  tenGuideTitle: "What counts as a 10?",
  /**
   * The purpose, per area. His structure, and the piece we did not have.
   *
   * "I've got my vision here, I've got my purpose for my relationship, and then
   * I've got my goals, my one-year goals, my three-month goals, my monthly goals
   * in that area. So I do that for each area of my life" (Rw2qaMltFcY).
   */
  purpose: {
    question: "Why does this area matter to you?",
    help: "Your reason for this one part of your life. It is what you read when you do not feel like doing the goals underneath it.",
    placeholder: "This part of my life matters because…",
  },
  snapshot: {
    question: "Where are you right now, in a sentence or two?",
    help: "Optional. The number says it was a 4. This says what a 4 felt like, which you will not remember in six months.",
    placeholder: "Right now, honestly…",
  },
  /** The two dialogs are one area split in half, so each points at the other. */
  toGoals: (label: string) => `Write the goals for ${label} →`,
  toGoalsHelp: "The goals live on the next tab. This one is the picture they are aimed at.",
  fromGoals: "Your 10 in this area",
  fromGoalsEdit: "edit the picture",
  fromGoalsEmpty: "No 10 written for this area yet. Write it first, on Where you are, and the goals have something to aim at.",
  /** The footer, so you can leave an area without clicking into empty space. */
  done: "Done",
  next: (label: string) => `Next: ${label}`,
  autosave: "Saved as you type.",
  rating: { question: "Over the last two weeks, where have you been?", help: "Against the 10 you just wrote. Be honest rather than kind." },
  goalsAim: { question: "Do your goals here actually move you toward that 10?", help: "Read your goals in this area against the picture. If the answer is no, that is useful. Change the goals." },
  values: { question: "What would you have to value to live at that 10?", help: "One word or a short phrase per line. These are the ones this area asks for." },
  /** Names the short row read off their own writing, above the full library. */
  valuesLead: (label: string) => `For ${label.toLowerCase()}`,
  identity: { question: "Who are you when this area is handled?", help: "Present tense, starting with I am. You will not outperform who you believe you are." },
  blockers: { question: "What might stop you here?", help: "Name it now, while it is theoretical and cheap. It is much harder to think clearly about it in the middle of week six." },
}

/**
 * The whole-life questions, under the per-area ones.
 *
 * The values list and the standards used to live here. Both moved to the north
 * star tab, where the rest of the driving force is, keeping their ids so nothing
 * already written is lost. What is left is what genuinely belongs to looking
 * back rather than to the vision.
 */
export const REVIEW_PROMPTS: NsReviewPrompt[] = [
  {
    id: "stoppers",
    question: "What might stop you overall?",
    help: "Not in one area. The pattern that has ended things for you before.",
    placeholder: "What has actually stopped you before",
  },
  {
    id: "support",
    question: "Who needs to know, and who could help?",
    help: "The people around you hold your beliefs up. Tell someone, and the plan stops being private.",
    placeholder: "Who you will tell, and what you will ask for",
  },
]

/**
 * The full value list, grouped, to browse.
 *
 * Twenty words in a chip row was the whole pool, and twelve of them fitted on
 * screen. Twelve words is not a list you can find yourself in: the point of
 * offering words at all is that naming a value is a recall problem, and recall
 * needs a big enough field to recognise something in.
 *
 * MEANS VALUES ARE IN HERE ON PURPOSE. Family, money, fitness and status are not
 * emotions, and they are what people actually say. Refusing them, or leaving
 * them off the list, is the thing that ends the exercise. They earn the "worth a
 * second look" question when they land in the ordered list, which is his own
 * correction and is a question rather than a rejection.
 *
 * Groups are for scanning, nothing more. No value is filed anywhere twice.
 */
export const NS_VALUE_GROUPS: Array<{ label: string; color: string; values: string[] }> = [
  {
    label: "Freedom",
    color: "#38bdf8",
    values: ["Freedom", "Independence", "Autonomy", "Flexibility", "Simplicity", "Space", "Balance", "Self-reliance", "Adventure", "Travel"],
  },
  {
    label: "People",
    color: "#f43f5e",
    values: ["Love", "Connection", "Intimacy", "Family", "Friendship", "Belonging", "Loyalty", "Community", "Partnership", "Being liked", "Generosity", "Forgiveness"],
  },
  {
    label: "Growth",
    color: "#6366f1",
    values: ["Growth", "Learning", "Mastery", "Curiosity", "Wisdom", "Progress", "Craft", "Competence", "Self-awareness", "Reading"],
  },
  {
    label: "Body",
    color: "#22c55e",
    values: ["Health", "Vitality", "Energy", "Strength", "Fitness", "Looking strong", "Rest", "Longevity", "Sleep", "Sobriety"],
  },
  {
    label: "Work and money",
    color: "#84cc16",
    values: ["Achievement", "Success", "Ambition", "Excellence", "Winning", "Wealth", "Money", "Security", "Stability", "Recognition", "Status", "Reputation", "Hard work", "Results"],
  },
  {
    label: "Meaning",
    color: "#eab308",
    values: ["Purpose", "Meaning", "Contribution", "Service", "Impact", "Legacy", "Justice", "Mentorship", "Leaving things better"],
  },
  {
    label: "Spirit",
    color: "#c084fc",
    values: ["Faith", "Spirituality", "Peace", "Presence", "Mindfulness", "Stillness", "Solitude", "Nature", "Gratitude", "Acceptance", "Devotion", "Hope"],
  },
  {
    label: "Joy",
    color: "#ec4899",
    values: ["Joy", "Enjoyment", "Happiness", "Contentment", "Satisfaction", "Fun", "Play", "Humour", "Passion", "Ease", "Novelty", "Spontaneity", "Beauty", "Pleasure", "Excitement", "Wonder"],
  },
  {
    label: "Character",
    color: "#14b8a6",
    values: ["Integrity", "Honesty", "Authenticity", "Courage", "Discipline", "Consistency", "Determination", "Responsibility", "Humility", "Respect", "Fairness", "Trust", "Kindness", "Compassion", "Empathy", "Patience", "Resilience", "Optimism", "Self-respect"],
  },
  {
    label: "Making things",
    color: "#f97316",
    values: ["Creativity", "Self-expression", "Imagination", "Originality", "Vision", "Building things", "Order", "Clarity", "Focus"],
  },
  {
    label: "Standing",
    color: "#94a3b8",
    values: ["Confidence", "Leadership", "Influence", "Boldness", "Certainty", "Control", "Being needed", "Approval", "Safety", "Comfort"],
  },
]

/** The colour a value carries wherever it is shown, from the group it is in. */
export const VALUE_COLOR = new Map(
  NS_VALUE_GROUPS.flatMap((g) => g.values.map((v) => [v.toLowerCase(), g.color] as const)),
)

/**
 * The values each of the twelve areas usually asks for.
 *
 * A generic twenty-word row under "what would you have to value to live at that
 * 10 in Money?" offered Adventure and Faith and left out Security, which is the
 * one nearly everybody writes. The area knows what it is about; the short list
 * should too.
 *
 * These are only the fallback. `areaValueSuggestions` reads the user's own 10,
 * purpose and north star first, so somebody who wrote "a year of costs in the
 * bank and I stop counting at the till" is offered Security and Abundance off
 * their own paragraph before any of this.
 */
export const AREA_VALUE_SUGGESTIONS: Record<string, string[]> = {
  lm_health: ["Health", "Vitality", "Energy", "Rest", "Sleep", "Longevity", "Discipline", "Sobriety"],
  lm_fitness: ["Strength", "Fitness", "Discipline", "Consistency", "Looking strong", "Determination", "Resilience", "Energy"],
  lm_mindset: ["Clarity", "Focus", "Growth", "Learning", "Optimism", "Resilience", "Self-awareness", "Wisdom"],
  lm_emotions: ["Happiness", "Joy", "Gratitude", "Peace", "Contentment", "Acceptance", "Presence", "Enjoyment"],
  lm_relationship: ["Love", "Intimacy", "Passion", "Trust", "Loyalty", "Honesty", "Partnership", "Patience"],
  lm_mission: ["Purpose", "Meaning", "Mastery", "Craft", "Impact", "Excellence", "Contribution", "Ambition"],
  lm_money: ["Security", "Freedom", "Wealth", "Stability", "Independence", "Generosity", "Discipline", "Simplicity"],
  lm_family: ["Family", "Love", "Connection", "Loyalty", "Presence", "Patience", "Trust", "Belonging"],
  lm_friends: ["Friendship", "Connection", "Belonging", "Community", "Fun", "Loyalty", "Generosity", "Humour"],
  lm_fun: ["Fun", "Play", "Adventure", "Novelty", "Spontaneity", "Enjoyment", "Travel", "Wonder"],
  lm_contribution: ["Contribution", "Service", "Generosity", "Impact", "Kindness", "Compassion", "Legacy", "Justice"],
  lm_spirituality: ["Faith", "Spirituality", "Peace", "Presence", "Stillness", "Gratitude", "Devotion", "Acceptance"],
}

/** Every value in the library, flat, for search and for counting. */
export const NS_VALUE_LIBRARY = NS_VALUE_GROUPS.flatMap((g) => g.values)

/**
 * The short row shown inline, to prime recall before anybody opens the browser.
 * The rest of the library is one click away.
 */
export const NS_VALUE_SUGGESTIONS = [
  "Freedom", "Growth", "Family", "Love", "Health", "Contribution", "Faith",
  "Adventure", "Security", "Creativity", "Connection", "Achievement",
  "Integrity", "Fun", "Peace", "Learning", "Legacy", "Discipline", "Honesty", "Courage",
]

/** Said once, under the wheel, when an area has a 10 and no goals. */
export const GAP_WARNING = "You have written a 10 here and no goal that aims at it. Either add one, or accept that this area is holding its floor this season."


// ---------------------------------------------------------------- tab 3, focus

/**
 * Focus, and why it is a tab rather than a step inside the goals.
 *
 * "Where you are" hands you twelve rated areas, and the goals tab used to open
 * on all twelve at once with a catalogue under them. Somebody looking at that
 * is not being asked to write goals, they are being asked to hold their whole
 * life in their head and start somewhere — and the first person through said
 * exactly that: too much is preselected, I feel overwhelmed.
 *
 * Choosing is the work this tab does. Three questions, in the order they can
 * actually be answered: which two or three areas is this season about, what is
 * the ONE thing, and — once there are goals — what order do they go in.
 */
/**
 * The two halves of the plan, named where they are read back together.
 *
 * One list called "your goals" put "See the northern lights" and "Train four
 * times a week" in the same column under the same word, and they do opposite
 * jobs: the first is there to be recognised and to pull — its only question is
 * whether what you run will actually get you there — the second is what runs.
 */
/**
 * The plan, editable, on the page that asks you to sign it.
 *
 * Reading it back whole is when somebody sees the goal they no longer want, the
 * one they forgot, and the driver pointed at nothing. Sending them four steps
 * back to act on any of it is how a plan gets signed and quietly abandoned.
 */
export const COMMIT_EDIT_COPY = {
  title: "Change anything, here",
  help: "Reading it back is when you notice what is wrong with it. Add what is missing, drop what you do not want, and point the things you do every week at what they are for — all of it saves the same as it does anywhere else.",
  add: "Add",
  addArea: "Which area",
  addPlaceholder: "Something you have just remembered",
  empty: "Nothing in the plan yet. Add the first thing here, or walk back through the steps.",
} as const

/**
 * The last step's words: the plan, whole, with nothing being asked of you.
 *
 * Every other step is a form. This one is a document, and the copy has to say
 * so — no question marks, no counts of what is missing, no "you have not
 * finished this". The outstanding list already lives under every tab and does
 * that job; a page you go to in order to remember who you decided to be should
 * not open by telling you what you owe it.
 *
 * `openHint` is the one instruction on the page, and it says the two things
 * that are not obvious: the collapsed cards open, and everything is editable
 * where it stands rather than four steps back.
 */
/**
 * THE PARTS OF THE PLAN THAT ARE ALSO A DAILY PRACTICE.
 *
 * Reading your north star is a step in the morning stack. Saying your identity
 * lines and your affirmations are steps in the manifestation stack. Reading the
 * whole driving force is a step too. All four already exist in the routine
 * libraries and are already ticked off on Today — and until now, somebody who
 * had just READ the paragraph on the recap page had to leave it, open Today,
 * find the stack, unfold it and tick a line whose whole content they had just
 * finished doing. The doing and the ticking were two screens apart.
 *
 * So each block that IS a practice carries the tick for it.
 *
 * `candidates` is where the practice lives in the libraries, best first: the
 * one whose routine somebody already has wins, and only if they have none of
 * them does saying yes create a routine. `phrases` is the second way in — a
 * step somebody wrote in their own words ("Read my north star before work")
 * never has a library id, and offering to add a second copy of a thing they
 * already track would be the page failing to see its own plan. A phrase is
 * distinctive enough to be a match rather than a guess.
 */
export const RECAP_PRACTICES: Record<
  "star" | "identity" | "affirmations" | "whole",
  { candidates: Array<{ blueprintId: string; stepId: string }>; phrases: string[] }
> = {
  star: {
    candidates: [
      { blueprintId: "morning", stepId: "star" },
      { blueprintId: "manifestation", stepId: "read-star" },
    ],
    phrases: ["north star"],
  },
  identity: {
    candidates: [{ blueprintId: "manifestation", stepId: "identity-lines" }],
    phrases: ["identity line"],
  },
  affirmations: {
    candidates: [
      { blueprintId: "morning", stepId: "incantations" },
      { blueprintId: "manifestation", stepId: "incantations" },
    ],
    phrases: ["affirmation", "incantation"],
  },
  whole: {
    candidates: [{ blueprintId: "morning", stepId: "driving-force" }],
    phrases: ["driving force"],
  },
}

/**
 * WHICH PIECE OF THE PLAN A PRACTICE IS FOR, so a row can send you to it.
 *
 * `RECAP_PRACTICES` already knows which library steps practise which block, and
 * which distinctive phrases recognise a step somebody wrote in their own words
 * ("Read my north star before bed"). This is the other half of that pair: the
 * `readSources` id each one should land on. One list, so the recap's offer and
 * the Today row's door can never come to disagree about what "read your north
 * star" means.
 *
 * `whole` is the whole document — vision, purpose, identity, standards, values.
 * It pointed nowhere for a while, because no single source is it and aiming the
 * row at one of five parts would have been a guess. The way out was not to
 * guess: `readSources` composes the five into one source, `driving`, so this
 * row goes to the thing it names like every other row does.
 */
export const PRACTICE_DESTINATIONS: Record<keyof typeof RECAP_PRACTICES, string | null> = {
  star: "star",
  identity: "answer:identity_total",
  affirmations: "answer:affirmations",
  /**
   * The whole document, and it took a second look to see it was a destination.
   *
   * This was null, on the reasoning that no single source IS the driving force
   * and pointing the row at one of its five parts would be a guess. The guess
   * was the mistake, not the pointing: the driving force is the recap page,
   * which is those five parts in order, so it composes into a source of its own
   * and the row goes to the thing it names like every other row.
   */
  whole: "driving",
}

/**
 * WHERE A ROW GOES, said on the row.
 *
 * Reported from the page (2026-08-23): *"i still dont go there when i click it
 * on the today page… and i cant see where i would change it."* The control
 * existed and lived at the bottom of Today in a section called "Your own text
 * fields", which is the wrong name for it and the wrong place: somebody looking
 * at a row that says "read your north star out loud" is not going to go and
 * build a second thing to sit next to it.
 */
export const GOES_TO_COPY = {
  /* The arrow carries the meaning; the label says what is at the other end. */
  prefix: "goes to",
  open: "Open",
  openAria: (title: string, where: string) => `${title} — open ${where}`,
  set: "send this somewhere",
  setAria: (title: string) => `Send ${title} somewhere — pick what it opens`,
  change: "change",
  changeAria: (title: string) => `Change where ${title} sends you`,
  pick: "Goes to",
  nowhere: "Nowhere — just a tick",
  /* A destination that names something still empty. Said, rather than drawn as
     a door onto a blank page. */
  missing: "What this points at is empty, or no longer in your plan.",
  done: "Close",
} as const

export const RECAP_COPY = {
  title: "Everything, in one place",
  help: "Your plan as one document. Read it back when you need reminding what you decided and who you said you were.",
  openHint: "Click any heading to open it. Anything you can read here you can change here.",
  edit: "edit",
  done: "done",
  empty: "Nothing written yet. Start on the north star and this page fills itself in.",

  starTitle: "My north star",
  starHorizon: (years: number) => `${years} years out`,
  starEmpty: "No paragraph yet.",
  whyTitle: "Why it matters",

  oneTitle: "The one thing this season",
  oneEmpty: "Not chosen yet.",

  identityTitle: "Who I am",
  identityHelp: "Read out loud, in the present tense, until it is simply true.",

  valuesTitle: "My values, in order",
  valuesHelp: "Whatever is first, everything else is filtered through it.",
  valuesPast: "What I have been living by",
  valuesAdded: "New on the list",
  valuesDropped: "No longer on it",
  valuesEmpty: "No values chosen yet.",

  areasTitle: "My areas",
  areasHelp: "The 10 you wrote for each, and where you said you were.",
  areaTen: "A 10 here",
  areaPurpose: "Why it matters",
  areaIdentity: "Who I am here",
  areaValues: "Asks me to value",
  areaOpen: "open this area",
  areaUnrated: "not rated",

  goalsTitle: "My goals",
  routinesTitle: "My routines",
  routinesEmpty: "Nothing running weekly yet.",
  experiencesTitle: "Things to have done",
  experiencesEmpty: "Nothing on the list yet.",
  experiencesAdd: "One per line",

  /**
   * The tick, and what it must not overclaim.
   *
   * "I read it today" and not "done": the tick records the practice, and the
   * practice is the reading. It writes to the same day's log the Today step
   * writes to, so the two screens never disagree about whether it happened.
   */
  practiceTick: "I read it today",
  practiceDone: "Read today",
  practiceStart: "Track this",
  practiceStartHelp: "Adds it to a routine and ticks off today.",
  practiceWhere: (routine: string) => `in ${routine}`,
  practiceAdds: (routine: string) => `will start a ${routine.toLowerCase()}`,
  wholeTitle: "You have read the whole thing",
  wholeHelp: "The paragraph, the reason, who you are, what you hold yourself to, your values. That is the driving force, and reading it is the practice.",

  closingTitle: "What I said about the rest",
  commitTitle: "What I committed to",
  commitOn: (date: string) => `Committed ${date}`,
  commitNone: "Not committed to yet.",
} as const

export const OVERVIEW_COPY = {
  wantedTitle: "What you want to experience",
  wantedHelp:
    "Nothing here is a plan and none of it is meant to be. It is the pull — the reason any of the rest is worth doing. The one question to ask of it: is anything you actually do going to get you there?",
  wantedCount: (n: number, carried: number) => `${n} · ${carried} with something running at ${carried === 1 ? "it" : "them"}`,
  /**
   * Said on the closed heading, so folding it away never hides the finding.
   *
   * The one thing worth knowing without opening the list is how much of what
   * you want has nothing pointed at it — which is the whole question this page
   * asks of it.
   */
  wantedClosed: (unserved: number) =>
    unserved > 0
      ? `Closed, because this step is about what runs. ${unserved} of ${unserved === 1 ? "them has" : "them have"} nothing running at ${unserved === 1 ? "it" : "them"} — open it to see which.`
      : "Closed, because this step is about what runs. Everything in it has something running at it. Open it to read them back.",
  drivingTitle: "What drives them",
  drivingHelp:
    "The rates you hold and the things you do on an ordinary week — your own, and every step in your routines. These are what move the list below, and the order here is the order your energy goes in.",
  drivingCount: (n: number) => `${n} running`,
  /** The header on a routine's block of steps: what it is and what it costs. */
  routineRate: (steps: number, daysPerWeek: number | null) =>
    daysPerWeek != null
      ? `${steps} ${steps === 1 ? "step" : "steps"} · ${daysPerWeek} ${daysPerWeek === 1 ? "day" : "days"} a week`
      : `${steps} ${steps === 1 ? "step" : "steps"}`,
} as const

export const FOCUS_COPY = {
  intro: "Twelve areas is a picture of a life. Two or three is a season. This is where you say which ones, and what the single most important thing is.",
  areasTitle: "What is this season about?",
  areasHelp: "Pick two or three. Not because the rest do not matter, but because a season spent on nine areas is a season spent on none, and the others hold where they are while you work on these.",
  areasNone: "Nothing picked yet, so the build steps are still showing you all twelve.",
  areasPicked: (n: number) => `${n} picked, in the order they matter`,
  areasTooMany: "That is a lot for one season. It will still work, you will just be thinner across all of them.",
  wheelHint: "Click a slice to make it one of this season's areas. Click it again to drop it.",
  areasAdd: "None of these? Add your own",
  areasAddPlaceholder: "e.g. Dating, Business, Morning routine",

  oneTitle: "And the one thing?",
  oneHelp: "Not your most important goal — the one that, if it happened, would make several of the others easier or unnecessary. The one you would keep if you had to drop everything else this quarter.",

  oneWrite: "Say it in your own words",
  oneFromYou: "Or take one of these — they are your own words, from the pages before this:",
  onePlaceholder: "If only one thing changes this year, it is…",
  onePick: "Or point at one of these",
  oneNone: "Nothing named yet",
  /** Shown here, written at step 3. */
  oneEcho: "Your one thing",
  oneEchoEdit: "change it at step 3",
  oneClear: "not this one",
  oneAreas: "Areas",
  oneGoals: "Goals",

  orderTitle: "What you want, and what will get you there",
  orderHelp: "Two lists, on purpose. The first is what you want to experience — it is there to be recognised and to pull, and its only question is whether anything you run reaches it. The second is what runs, in the order your energy goes in.",
  orderEmpty: "Nothing written yet. Once you have named some of what you want, this is where you say which comes first.",
  orderGo: "Write what you want →",

  next: "Now write the goals →",
}


// ------------------------------------------------------------- the last step

/**
 * Commit, and why it is a step rather than a full stop.
 *
 * A plan that ends when the last box is filled ends without anybody saying yes
 * to it. The difference between a document and a decision is that somebody
 * signed the second one — so the last thing this flow does is read the whole
 * plan back, ask what could go wrong, and take the commitment in the person's
 * own words with the date on it.
 */
export const COMMIT_COPY = {
  title: "This is what you have built",
  help: "Read it once, whole, before you say yes to it. Everything here came from something you wrote.",
  summary: (goals: number, milestones: number, hours: number) =>
    `${goals} ${goals === 1 ? "goal" : "goals"}, ${milestones} dated ${milestones === 1 ? "milestone" : "milestones"}, and about ${hours} hours a week of routines.`,
  read: "Read the whole plan →",
  hide: "Close it",

  commitTitle: "Commit to it",
  commitHelp: "In your own words: what are you actually saying yes to, and until when? This is the sentence you re-read in March on a day you do not feel like it.",
  commitPlaceholder: "I am committing to…",
  notYet: "Not committed yet.",
  committed: (date: string) => `Committed on ${date}.`,
  commit: "I commit to this",
  uncommit: "Take it back",
}
