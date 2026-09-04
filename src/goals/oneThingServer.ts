/**
 * THE ONE THING, ON THE SERVER: reading it, and writing it.
 *
 * Split from `oneThingService.ts` for one concrete reason. That file is imported
 * by client components — the tracking header reads its countdown wording — and
 * it therefore must never pull database code into the browser bundle. It holds
 * the rules and touches nothing; this holds the two round trips and the order
 * they happen in.
 *
 * The route above it is a wrapper: check who is asking, call one of these, turn
 * the answer into JSON.
 */

import { getLifeAnswers, addLifeAnswer, type LifeAnswerKey } from "@/src/db/lifeAnswerRepo"
import { getChapters, openChapter } from "@/src/db/lifeChapterRepo"
import { getUserTimezone } from "@/src/db/settingsRepo"
import {
  applyOneThingWrite,
  currentOneThing,
  pastOneThings,
  planOneThingWrite,
  type OneThing,
  type OneThingAct,
} from "./oneThingService"

/**
 * EVERYTHING ONE SCREEN NEEDS, IN ONE READ.
 *
 * Chapters, every wording, and the timezone, fetched together. Separately they
 * arrive at different moments, and a page that has the chapters but not yet the
 * wordings draws a headline with no sentence in it.
 */
export async function readOneThing(userId: string): Promise<{ current: OneThing | null; past: OneThing[] }> {
  const [chapters, rows, tz] = await Promise.all([
    getChapters(userId, "one_thing"),
    getLifeAnswers(userId),
    getUserTimezone(userId),
  ])
  return { current: currentOneThing(chapters, rows, tz), past: pastOneThings(chapters, rows, tz) }
}

export type WriteOutcome =
  | { ok: false; reason: string }
  | { ok: true; unchanged: true }
  | { ok: true; unchanged: false; id: string; chapterId: string }

/**
 * Decide, then do. The decision is `planOneThingWrite` and lives in the rules
 * file; this supplies it with what the account currently says and hands it the
 * two writers it needs.
 */
export async function writeOneThing(
  userId: string,
  key: LifeAnswerKey,
  act: OneThingAct,
  body: unknown,
  dueOn: unknown,
): Promise<WriteOutcome> {
  const [chapters, rows, tz] = await Promise.all([
    getChapters(userId, "one_thing"),
    getLifeAnswers(userId),
    getUserTimezone(userId),
  ])
  const current = currentOneThing(chapters, rows, tz)
  const write = planOneThingWrite(current, rows, act, body, dueOn, tz, key)
  if (write.kind === "reject") return { ok: false, reason: write.reason }

  const saved = await applyOneThingWrite(write, current, {
    addAnswer: (k, text, chapterId) => addLifeAnswer(userId, k as LifeAnswerKey, text, chapterId),
    openChapter: (from, to, continues) => openChapter(userId, "one_thing", from, to, continues),
  })
  return saved ? { ok: true, unchanged: false, ...saved } : { ok: true, unchanged: true }
}
