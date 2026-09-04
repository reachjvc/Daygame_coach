/**
 * IS THE LIST OF WRITTEN ANSWERS ACTUALLY COMPLETE?
 *
 * ## The failure this exists to prevent
 *
 * Asked how many written answers the Life Mastery flow holds, the answer given
 * was "five". The real number was eighty-seven. It was not a lie and it was not
 * carelessness — it was a count done by reading, offered as if it were a fact.
 * Asked a second time, the count was redone properly. Nothing stopped it going
 * stale the day after.
 *
 * The keys reach `plan.answers` from three different directions, which is why
 * counting them by eye fails:
 *
 *   1. named constants          — COMMIT_KEY, ONE_ANSWERS.why, …
 *   2. a generator over a list  — STARTER_KEY(q.id) for every starter question
 *   3. bare strings in a component — answerOf(plan, "vision")
 *
 * So this test does not take anybody's word for it. It rebuilds the list from
 * the running code and from a scan of the source, and fails if either finds a
 * key that `ANSWER_INVENTORY` has not classified.
 *
 * ## What it cannot see
 *
 * A key built at runtime from something this scan cannot read — a key assembled
 * out of a variable, or one arriving from the database. There are none today.
 * If one is ever added, this test will not notice it, and that is the honest
 * limit of the guarantee: it catches the three ways keys are actually written
 * here, not every way a key could conceivably be written.
 */

import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { ANSWER_INVENTORY, WRITTEN_ELSEWHERE, answerEntry, chapterOf, rootStatements, totalStatements } from "@/src/goals/data/answerInventory"
import { ONE_ANSWERS, STARTER_QUESTIONS, STARTER_KEY, COMMIT_KEY, COMMIT_DATE_KEY, IDEAL_DAY_KEY, NEXT_SEASON_KEY, ONE_THING_KEY } from "@/src/goals/data/northStarStart"
import { STAR_WHY_ID, REVIEW_PROMPTS } from "@/src/goals/data/northStar"

/** Every .ts/.tsx file under a directory, so nothing is missed by listing files by hand. */
function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) sourceFiles(path, out)
    else if (/\.tsx?$/.test(name)) out.push(path)
  }
  return out
}

/**
 * Keys written into the source as bare strings.
 *
 * This is direction 3 above, and it is the one nobody remembers: four answers
 * are stored under "vision", "why", "become" and "cost" with no constant
 * anywhere, which is why they went uncounted the first time.
 */
function literalKeysInSource(): Set<string> {
  const found = new Set<string>()
  const call = /\b(?:answerOf|setAnswer)\(\s*\w+\s*,\s*"([^"]+)"/g
  for (const file of [...sourceFiles("src/goals"), ...sourceFiles("src/tracking")]) {
    const text = readFileSync(file, "utf8")
    for (const m of text.matchAll(call)) found.add(m[1])
  }
  return found
}

/** Keys reachable through the exported constants and generators. */
function declaredKeys(): Set<string> {
  return new Set<string>([
    ...Object.values(ONE_ANSWERS),
    ONE_THING_KEY, NEXT_SEASON_KEY, COMMIT_KEY, COMMIT_DATE_KEY, IDEAL_DAY_KEY,
    STAR_WHY_ID,
    ...STARTER_QUESTIONS.map((q) => STARTER_KEY(q.id)),
    ...REVIEW_PROMPTS.map((p) => p.id),
  ])
}

describe("every written answer is accounted for", () => {
  it("has classified every key the constants and generators can produce", () => {
    const missing = [...declaredKeys()].filter((k) => !answerEntry(k))
    expect(
      missing,
      `These keys can be written to plan.answers and are not in ANSWER_INVENTORY. ` +
      `Add them with a class — "statement" if a person wrote it in words and its ` +
      `earlier versions are worth reading back, "structured" if it is a date or a ` +
      `list of ids that rides along with a statement.`,
    ).toEqual([])
  })

  it("has classified every key typed into the source as a bare string", () => {
    const missing = [...literalKeysInSource()].filter((k) => !answerEntry(k))
    expect(
      missing,
      "A key was typed straight into a component instead of being declared. " +
      "Give it a constant and add it to ANSWER_INVENTORY.",
    ).toEqual([])
  })

  /**
   * The reverse direction. An inventory that lists answers nothing writes is a
   * different kind of wrong: it makes a migration build history for a question
   * that no longer exists, and it makes this file look complete while being
   * about a flow that has moved on.
   */
  it("lists nothing that the code cannot actually write", () => {
    const real = new Set([...declaredKeys(), ...literalKeysInSource()])
    const ghosts = ANSWER_INVENTORY.filter((e) => !real.has(e.key)).map((e) => e.key)
    expect(ghosts, "In the inventory, written by nothing. Delete it or wire it up.").toEqual([])
  })

  it("gives every answer exactly one entry", () => {
    const seen = new Map<string, number>()
    for (const e of ANSWER_INVENTORY) seen.set(e.key, (seen.get(e.key) ?? 0) + 1)
    expect([...seen].filter(([, n]) => n > 1).map(([k]) => k)).toEqual([])
  })
})

describe("the chapters an answer belongs to", () => {
  /**
   * The why, the cost, the identity and the values are about the CURRENT one
   * thing. Giving each its own independent history would leave you reading a
   * reason written for a season that ended two one-things ago, with nothing
   * saying so. Starting a new one thing has to start new ones of these.
   */
  it("keeps the one thing's supports tied to the one thing", () => {
    const chapter = chapterOf(ONE_ANSWERS.oneThing).map((e) => e.key)
    expect(chapter).toContain(ONE_ANSWERS.why)
    expect(chapter).toContain(ONE_ANSWERS.cost)
    expect(chapter).toContain(ONE_ANSWERS.identity)
    expect(chapter).toContain(ONE_ANSWERS.values)
  })

  it("never points a chapter at something that is not in the inventory", () => {
    const orphans = ANSWER_INVENTORY
      .filter((e) => e.belongsTo && !answerEntry(e.belongsTo))
      .map((e) => `${e.key} -> ${e.belongsTo}`)
    expect(orphans).toEqual([])
  })

  it("never nests a chapter inside a chapter", () => {
    // One level only. A support whose parent is itself a support means "start a
    // new one" has to walk a tree to know what it is starting, and the first
    // time that tree has a cycle the flow hangs.
    const nested = ANSWER_INVENTORY
      .filter((e) => e.belongsTo && answerEntry(e.belongsTo)?.belongsTo)
      .map((e) => e.key)
    expect(nested).toEqual([])
  })

  it("names the statements a person can start a new one of", () => {
    const roots = rootStatements().map((e) => e.key)
    expect(roots).toContain(ONE_ANSWERS.oneThing)
    // A support is never a root: you do not start a new "why" on its own.
    expect(roots).not.toContain(ONE_ANSWERS.why)
  })
})

describe("what the inventory says the job is", () => {
  /**
   * Not an assertion about a number for its own sake. This is the number that
   * decides how big the migration is, and it was wrong by a factor of seventeen
   * the first time it was given. If it changes, that is a fact worth being told
   * about rather than discovering halfway through the work.
   */
  it("reports how much is still living only in the browser", () => {
    const statements = ANSWER_INVENTORY.filter((e) => e.class === "statement")
    const onTheAccount = [ONE_THING_KEY]
    const stillLocal = statements.filter((e) => !onTheAccount.includes(e.key))
    expect(statements.length).toBe(20)
    expect(stillLocal.length).toBe(19)
  })

  /**
   * THE WHOLE JOB, NOT THE PART THAT WAS EASY TO COUNT.
   *
   * `plan.answers` is one shelf of four. The north star, the seven ladder rungs
   * and five boxes per area are the same class of thing kept elsewhere, and
   * leaving them out of the total is how a migration gets scoped at a quarter of
   * its real size. 20 + 1 + 7 + 60 = 88.
   */
  it("counts the answers kept on the other three shelves too", () => {
    expect(totalStatements()).toBe(88)
    expect(WRITTEN_ELSEWHERE.map((s) => s.where)).toEqual([
      "plan.northStar",
      "plan.rungs",
      "plan.review[areaId]",
    ])
  })
})
