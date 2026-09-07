/**
 * THE ONE THING — what it is, when it runs out, and what it used to be.
 *
 * Every screen that shows your one thing asks this file, and this file reads
 * the newest row. Nothing anywhere keeps a copy, which is why the header on the
 * tracking page cannot go stale — there is no second place for it to be wrong.
 *
 * Pure functions over rows. The database access is in `lifeAnswerRepo`; the
 * timezone arrives as an argument because a date is a question about somebody's
 * calendar and has no answer without knowing whose.
 */

import { getTodayInTimezone } from "@/src/shared/dateUtils"
import type { LifeAnswerRow } from "@/src/db/lifeAnswerRepo"
import type { LifeChapterRow } from "@/src/db/lifeChapterRepo"

/** How long a one thing runs when nobody says otherwise. */
export const DEFAULT_HORIZON_DAYS = 90

/** The four answers that live inside the one thing's chapter and start again with it. */
export const SUPPORT_KEYS = ["one_why", "one_cost", "one_identity", "one_values"] as const
export type SupportKey = (typeof SUPPORT_KEYS)[number]

export interface OneThing {
  /** The version's own id — the particular wording. */
  id: string
  /** The chapter it belongs to. The chapter owns every date below. */
  chapterId: string
  /** What they wrote, in its newest wording. */
  body: string
  /** The instant that wording was written. */
  answeredAt: string
  /**
   * The day tracking runs FROM, and the reason chapters exist.
   *
   * Amending your wording does not move it. Moving the deadline does not move
   * it either — an extension is a new chapter that carries this across.
   */
  startedOn: string
  /** The day it runs until, YYYY-MM-DD in the user's timezone. */
  dueOn: string
  /** Days left, counted in the user's timezone. Negative once it has lapsed. */
  daysLeft: number
  /** True once `dueOn` is behind today. */
  lapsed: boolean
  /** How many wordings this chapter has had. 1 means it has never been amended. */
  wordings: number
  /** True when this chapter continued an earlier one because a deadline moved. */
  extended: boolean
  /** The supports, newest wording of each, empty string where nothing is written. */
  supports: Record<SupportKey, string>
}

/**
 * WHOLE DAYS BETWEEN TWO CALENDAR DATES.
 *
 * Both sides are YYYY-MM-DD, so this is arithmetic on calendar days and not on
 * elapsed seconds. That matters at a daylight-saving boundary, where 90 × 24
 * hours lands an hour short and quietly moves the date.
 */
export function daysBetween(fromISO: string, toISO: string): number {
  const [fy, fm, fd] = fromISO.split("-").map(Number)
  const [ty, tm, td] = toISO.split("-").map(Number)
  const from = Date.UTC(fy, fm - 1, fd)
  const to = Date.UTC(ty, tm - 1, td)
  return Math.round((to - from) / 86_400_000)
}

/** Add calendar days to a YYYY-MM-DD, staying on the calendar. */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number)
  const next = new Date(Date.UTC(y, m - 1, d + days))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(
    next.getUTCDate()
  ).padStart(2, "0")}`
}

/** The default deadline for something written today, in the user's timezone. */
export function defaultDueOn(timezone: string, horizonDays = DEFAULT_HORIZON_DAYS): string {
  return addDays(getTodayInTimezone(timezone), horizonDays)
}

/**
 * ONE CHAPTER, READ BACK: its newest wording, its dates, and its supports.
 *
 * `rows` is every version the person has, newest first. The chapter picks out
 * its own; nothing is looked up twice and nothing is cached.
 *
 * Returns null for a chapter with no wording of the sentence itself. That is a
 * real state — a chapter is opened and the sentence written in the same request,
 * but a delete can leave the chapter standing — and drawing an empty headline is
 * worse than drawing nothing.
 */
function toOneThing(chapter: LifeChapterRow, rows: LifeAnswerRow[], today: string): OneThing | null {
  const mine = rows.filter((r) => r.chapter_id === chapter.id)
  const sentences = mine.filter((r) => r.answer_key === "one_thing")
  if (sentences.length === 0) return null

  const newest = (key: string) => mine.find((r) => r.answer_key === key)?.body ?? ""
  const daysLeft = daysBetween(today, chapter.due_on)

  return {
    id: sentences[0].id,
    chapterId: chapter.id,
    body: sentences[0].body,
    answeredAt: sentences[0].answered_at,
    startedOn: chapter.started_on,
    dueOn: chapter.due_on,
    daysLeft,
    lapsed: daysLeft < 0,
    wordings: sentences.length,
    extended: chapter.continues_id != null,
    supports: Object.fromEntries(
      SUPPORT_KEYS.map((k) => [k, newest(k)]),
    ) as Record<SupportKey, string>,
  }
}

/**
 * WHAT MY ONE THING IS: the newest chapter, in its newest wording.
 *
 * `chapters` and `rows` both arrive newest-first from the repo. "Current" is not
 * a stored flag and never can be — a flag is a second fact that can disagree
 * with the first, and there is deliberately no column on either table that could
 * hold one.
 *
 * A chapter with no sentence in it is skipped rather than shown blank, so a
 * half-deleted chapter cannot hide the one you are actually on.
 */
export function currentOneThing(
  chapters: LifeChapterRow[],
  rows: LifeAnswerRow[],
  timezone: string,
): OneThing | null {
  const today = getTodayInTimezone(timezone)
  for (const chapter of chapters) {
    const one = toOneThing(chapter, rows, today)
    if (one) return one
  }
  return null
}

/**
 * WHAT IT USED TO BE: the chapters before the current one, newest first.
 *
 * CHAPTERS, NOT WORDINGS. The list a person browses is the list of things they
 * committed to — four or five a year — not every time they reworded one. The
 * wordings inside a chapter are reachable through `wordingsOf`, folded away,
 * because "all of these I wouldn't care to have different versions of" was the
 * whole point of separating the two.
 */
export function pastOneThings(
  chapters: LifeChapterRow[],
  rows: LifeAnswerRow[],
  timezone: string,
): OneThing[] {
  const today = getTodayInTimezone(timezone)
  const all = chapters.map((c) => toOneThing(c, rows, today)).filter((o): o is OneThing => o !== null)
  return all.slice(1)
}

/** Every wording of one chapter's sentence, newest first. The folded-away level. */
export function wordingsOf(chapterId: string, rows: LifeAnswerRow[]): LifeAnswerRow[] {
  return rows.filter((r) => r.chapter_id === chapterId && r.answer_key === "one_thing")
}

/**
 * WHETHER WRITING THIS WOULD CHANGE ANYTHING.
 *
 * Saving the same words again must not append a version, or a page that saves on
 * blur turns one afternoon of typing into forty entries of history. Compared on
 * the trimmed text, because a trailing space is not a new answer.
 *
 * Words only. The deadline used to be half of this comparison and is not any
 * more: it no longer lives on the row. It belongs to the chapter, and moving it
 * is a different act with its own name — see `planOneThingWrite`.
 */
export function isSameAsCurrent(rows: LifeAnswerRow[], body: string, key = "one_thing"): boolean {
  const newest = rows.find((r) => r.answer_key === key)
  return newest ? newest.body.trim() === body.trim() : false
}

/** The furthest ahead a one thing may run. A season, not a decade. */
export const MAX_HORIZON_YEARS = 5

/** The longest a written answer may be. Mirrors the CHECK in the migration. */
export const MAX_BODY_LENGTH = 2000

/**
 * IS THIS A DAY THAT EXISTS?
 *
 * `/^\d{4}-\d{2}-\d{2}$/` says yes to 2026-13-45, which then reached Postgres,
 * failed there, and came back to the person as "That did not save" — the right
 * refusal for the wrong reason, with nothing they could act on. Round-tripping
 * through the calendar is the only check that knows February has 28 days.
 */
export function isRealDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  const [y, m, d] = iso.split("-").map(Number)
  const back = new Date(Date.UTC(y, m - 1, d))
  return back.getUTCFullYear() === y && back.getUTCMonth() === m - 1 && back.getUTCDate() === d
}

/**
 * WHY THIS DEADLINE WILL NOT DO, in words the person can act on, or null.
 *
 * A deadline in the past saved perfectly happily and the header then said "this
 * one has run its course" about a sentence written ten seconds ago. Nothing
 * refused it and nothing explained it. `today` is the caller's day in the
 * USER's timezone — a deadline is a question about somebody's calendar and the
 * server's UTC day is not an answer to it.
 */
export function dueOnProblem(dueOn: string, today: string): string | null {
  if (!isRealDate(dueOn)) return "That is not a date on the calendar — pick a day."
  if (daysBetween(today, dueOn) < 0) return "That day has already been. Pick one that is still ahead of you."
  if (daysBetween(today, dueOn) > MAX_HORIZON_YEARS * 366) {
    return `A one thing runs for a season, not a decade — pick a day within ${MAX_HORIZON_YEARS} years.`
  }
  return null
}

/**
 * THE THREE THINGS A PERSON CAN DO, AND WHAT EACH ONE COSTS.
 *
 * These are different acts and the whole design turns on keeping them apart:
 *
 *   amend  — you reworded it. Same commitment, same clock, a new wording added
 *            to the chapter. This is the common one, and it is why nothing here
 *            can move a date: `addLifeAnswer` has no parameter for one.
 *   extend — the words stand, the deadline moves. A new chapter that CONTINUES
 *            the old one and carries its `started_on` across, so the countdown
 *            changes and the "running since" does not.
 *   start  — a new commitment. A new chapter, starting today.
 */
export type OneThingAct = "amend" | "extend" | "start"

export type OneThingWrite =
  | { kind: "reject"; reason: string }
  /** Nothing to do: the words already say this, in this chapter. */
  | { kind: "unchanged" }
  /** Add a wording to a chapter that already exists. No date moves. */
  | { kind: "amend"; chapterId: string; key: string; body: string }
  /**
   * Open a chapter and write the sentence into it. `continuesId` is set for an
   * extension, and `startedOn` is then the ORIGINAL start, not today.
   */
  | { kind: "open"; startedOn: string; dueOn: string; continuesId: string | null; body: string }

/**
 * WHAT WRITING THIS SHOULD DO.
 *
 * One function, because the answers depend on each other and were three
 * separate ifs in a route before. `current` is what the person is on now, or
 * null when they have never written one.
 */
export function planOneThingWrite(
  current: OneThing | null,
  rows: LifeAnswerRow[],
  act: OneThingAct,
  rawBody: unknown,
  askedDueOn: unknown,
  timezone: string,
  key = "one_thing",
): OneThingWrite {
  const body = typeof rawBody === "string" ? rawBody.trim() : ""
  if (!body || body.length > MAX_BODY_LENGTH) {
    return { kind: "reject", reason: `Write something, and keep it under ${MAX_BODY_LENGTH} characters` }
  }

  const today = getTodayInTimezone(timezone)
  const asked = typeof askedDueOn === "string" ? askedDueOn : null

  /* NOTHING TO AMEND OR EXTEND YET. The first thing anybody writes opens a
     chapter whatever they meant to do, rather than failing on a distinction
     that has no meaning until there is something to distinguish it from. */
  if (!current) {
    /* A SUPPORT CANNOT COME FIRST. `open` writes its body as the sentence, so
       without this a stray "one_why" arriving before anything else had been
       written would be stored as the person's one thing — their reason showing
       up as their commitment, on every screen. */
    if (key !== "one_thing") {
      return { kind: "reject", reason: "Write your one thing first — this answer is about it" }
    }
    const dueOn = asked ?? defaultDueOn(timezone)
    const problem = dueOnProblem(dueOn, today)
    if (problem) return { kind: "reject", reason: problem }
    return { kind: "open", startedOn: today, dueOn, continuesId: null, body }
  }

  if (act === "amend") {
    /* A DEADLINE ARRIVING WITH AN AMEND IS IGNORED, DELIBERATELY — see the test
       "does not judge the deadline when all that changed is the words". A review
       proposed refusing the contradiction instead. That would refuse a reworded
       sentence because of a stale date sitting in a field the person never
       touched, and rewording is the one act that is meant to be free. The box
       above chooses `extend` itself whenever the date really moved. */
    const mine = rows.filter((r) => r.chapter_id === current.chapterId)
    if (isSameAsCurrent(mine, body, key)) return { kind: "unchanged" }
    return { kind: "amend", chapterId: current.chapterId, key, body }
  }

  const dueOn = asked ?? defaultDueOn(timezone)
  const problem = dueOnProblem(dueOn, today)
  if (problem) return { kind: "reject", reason: problem }

  if (act === "extend") {
    // Same deadline AND same words is a no-op; either one differing is a real
    // extension, because "the same sentence, three weeks longer" is a change.
    if (dueOn === current.dueOn && isSameAsCurrent(rows.filter((r) => r.chapter_id === current.chapterId), body, key)) {
      return { kind: "unchanged" }
    }
    /* AND THE SAME HORIZON THE DATABASE MEASURES.
       `dueOnProblem` counts five years from TODAY; `life_chapters_dates_sane`
       counts `due_on <= started_on + 1830` from the day the chapter began, and
       an extension carries that start across. A deadline four years out on a
       chapter that started a year ago passes here and is refused by the
       database, which reaches the person as "That did not save" and no reason —
       the right refusal for the wrong reason, which is the thing the migration
       comment says was eliminated. Same 1830 days, stated once on each side. */
    if (daysBetween(current.startedOn, dueOn) > MAX_HORIZON_YEARS * 366) {
      return {
        kind: "reject",
        reason: `Counting from the day this one began, that is more than ${MAX_HORIZON_YEARS} years. Start a new one instead.`,
      }
    }
    /* THE ORIGINAL START DATE, CARRIED. This single line is the request: "when I
       change something, I would still want it to be the tracking from the
       initial first date." */
    return { kind: "open", startedOn: current.startedOn, dueOn, continuesId: current.chapterId, body }
  }

  return { kind: "open", startedOn: today, dueOn, continuesId: null, body }
}

/**
 * CARRYING OUT A DECISION, without knowing what a database is.
 *
 * The writers are handed in. That keeps every rule in this file — including the
 * one that is easiest to get wrong and hardest to see, that an EXTENSION must
 * carry the supports across — testable without a database, and it keeps the API
 * route a thin wrapper, which is what `tests/unit/architecture.test.ts` is for.
 *
 * Returns what was written, or null for "nothing needed doing".
 */
export interface OneThingWriters {
  addAnswer: (key: string, body: string, chapterId: string) => Promise<{ id: string }>
  /** Undo an `openChapter` whose sentence never landed. See `applyOneThingWrite`. */
  dropChapter: (chapterId: string) => Promise<void>
  openChapter: (startedOn: string, dueOn: string, continuesId: string | null) => Promise<{ id: string }>
}

export async function applyOneThingWrite(
  write: OneThingWrite,
  current: OneThing | null,
  writers: OneThingWriters,
): Promise<{ id: string; chapterId: string } | null> {
  if (write.kind === "reject" || write.kind === "unchanged") return null

  if (write.kind === "amend") {
    const row = await writers.addAnswer(write.key, write.body, write.chapterId)
    return { id: row.id, chapterId: write.chapterId }
  }

  const chapter = await writers.openChapter(write.startedOn, write.dueOn, write.continuesId)

  /* A CHAPTER WITH NO SENTENCE IN IT IS INVISIBLE AND UNDELETABLE.
     These are two writes. If the second fails — a dropped connection, the
     2000-character CHECK on the body — the first has already succeeded, and
     `toOneThing` skips a chapter that holds no sentence, so it never appears in
     the history and there is no row the person can point at to delete. It also
     becomes the newest chapter, which is what "current" means, so the page
     would go blank. Undo it and report the original failure. */
  let row: { id: string }
  try {
    row = await writers.addAnswer("one_thing", write.body, chapter.id)
  } catch (e) {
    await writers.dropChapter(chapter.id).catch(() => {
      // The compensation itself failing is worth knowing about; it does not
      // change what the caller is told, which is why the write failed.
      console.error("Could not remove the empty chapter left by a failed write:", chapter.id)
    })
    throw e
  }

  /* AN EXTENSION KEEPS THE ANSWERS THAT ARE STILL TRUE.
     Moving a deadline opens a new chapter, and without this the why, the cost,
     the identity and the values would all be blank underneath an unchanged
     sentence — somebody would look at their own page and think three weeks of
     writing had been thrown away because they added a fortnight to a date.
     A fresh start does NOT carry them: that is the difference between the two. */
  if (write.continuesId && current) {
    for (const key of SUPPORT_KEYS) {
      const text = current.supports[key]
      if (text.trim()) await writers.addAnswer(key, text, chapter.id)
    }
  }

  return { id: row.id, chapterId: chapter.id }
}

/**
 * THE DEADLINE A FORM SHOULD OPEN ON.
 *
 * The saved one while it still has road left — so a picker reflects what is
 * actually committed to — and a fresh horizon once it has run out. Following a
 * lapsed deadline is a trap: the page asks for the next one thing, the form
 * posts the date that has already been, and the server refuses it, correctly,
 * leaving somebody in a loop with a refusal and no way out of it.
 *
 * `lapsed` was decided on the server in the user's own timezone, so this does
 * not re-open the date question in a browser that may be set to anything.
 */
export function nextDueOn(current: OneThing | null, freshDefault: string): string {
  return current && !current.lapsed ? current.dueOn : freshDefault
}

/**
 * HOW MUCH ROAD IS LEFT, as the one fact every screen asks about.
 *
 * The tracking header and the step both drew their own countdown and their own
 * wording, which is two places for one rule and therefore two places to get it
 * wrong. This is that rule.
 *
 * `ending` exists because the request was to prompt people as the dates shift.
 * A one thing that runs out on Friday and says nothing until Saturday leaves
 * somebody with no season and no warning; a fortnight is long enough to think
 * about what comes next and short enough that it is not nagging from day one.
 */
export const ENDING_SOON_DAYS = 14

export type OneThingStage = "none" | "running" | "ending" | "lapsed"

export function oneThingStage(current: OneThing | null): OneThingStage {
  if (!current) return "none"
  if (current.lapsed) return "lapsed"
  return current.daysLeft <= ENDING_SOON_DAYS ? "ending" : "running"
}

/** The day a date falls on, written the way every screen writes it. */
export function formatDueDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
}

/**
 * WHAT THE COUNTDOWN SAYS, wherever it is drawn.
 *
 * Always carries the day itself, not only the number of sleeps: "120 days left"
 * is not something anybody can put in a calendar, and the date was typed on the
 * form by the person reading this.
 */
export function oneThingCountdown(current: OneThing | null): string {
  if (!current) return ""
  const day = formatDueDate(current.dueOn)
  const n = Math.abs(current.daysLeft)
  const days = n === 1 ? "day" : "days"
  if (current.lapsed) return `Ran out ${day}, ${n} ${days} ago — name the next one`
  if (current.daysLeft === 0) return `Last day — it runs out today, ${day}`
  return `${current.daysLeft} ${days} left, until ${day}`
}

/**
 * HOW LONG YOU HAVE BEEN ON THIS, which amending must never reset.
 *
 * Shown beside the countdown once a chapter has been amended or extended,
 * because that is exactly when somebody would otherwise wonder whether their
 * clock had been restarted by a typo fix.
 */
export function runningSince(current: OneThing | null): string | null {
  if (!current) return null
  if (current.wordings <= 1 && !current.extended) return null
  return `Running since ${formatDueDate(current.startedOn)}`
}

/**
 * WHETHER TO ASK FOR THE NEXT ONE, and nothing else.
 *
 * Separate from the countdown because the countdown is always shown and this is
 * not: a prompt on a one thing with three months to run is noise, and noise is
 * how a real prompt gets ignored three months later.
 */
export function oneThingPrompt(current: OneThing | null): string | null {
  const stage = oneThingStage(current)
  if (stage === "lapsed") return "This season is over. Write the one thing for the next one."
  if (stage === "ending") return "This one is nearly up — worth deciding now what comes after it."
  return null
}

/** What the header says when there is nothing to show. */
export type OneThingState = "set" | "lapsed" | "none"

export function oneThingState(current: OneThing | null): OneThingState {
  if (!current) return "none"
  return current.lapsed ? "lapsed" : "set"
}
