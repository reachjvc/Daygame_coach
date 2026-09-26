/**
 * PAGING IS ONLY CORRECT IF THE SORT KEY IS UNIQUE, AND NOTHING CHECKED THAT.
 *
 * `readAllRows` reads a table in windows of a thousand. Its own docstring states
 * the precondition in capitals — **order by something unique** — because paging
 * is two separate reads of a moving table: if rows tie on the sort key, the
 * database may put the same row in both pages, and the row it displaced appears
 * in neither. That is not a crash. It is a list that is quietly wrong, which is
 * the whole failure class `paging.ts` exists to end, arriving through the door
 * it left open.
 *
 * `architecture.test.ts` refuses a read with no `.range()`. Nothing asked
 * whether the `.order()` on it was unique. So this reads the repo's own paged
 * reads out of the source, and asks POSTGRES whether each one's sort key is
 * backed by a unique index.
 *
 * **Why this rather than a volume test.** The named gap was "does `readDayRows`
 * page correctly at four thousand rows". A volume test samples one number and
 * says nothing about the next; this proves the property that makes paging
 * correct at ANY volume, and it covers every paged read in both repos rather
 * than the one somebody thought to seed. It also fails for the right reason if
 * a unique constraint is ever dropped, which a volume test on today's data
 * would not notice.
 *
 * What it cannot see: a read built somewhere other than these two files, or one
 * whose `.order()` is assembled from a variable. There are none today; the
 * honest limit is that this catches the way these reads are actually written.
 */

import { describe, test, expect } from "vitest"
import { readFileSync } from "node:fs"
import { getClient } from "../setup"

/** The repos whose paged reads this covers. */
const REPOS = ["src/db/lifePlanDayRepo.ts", "src/db/lifePlanRepo.ts"]

interface PagedRead {
  file: string
  table: string
  order: string[]
}

/**
 * Every `.from(...) … .order(...) … .range(...)` chain in a file.
 *
 * Anchored on `.range(` deliberately: that is what makes a read PAGED, so a
 * write or a single-row read cannot wander into this and be asked to justify an
 * ordering it does not need.
 */
function pagedReads(file: string): PagedRead[] {
  const src = readFileSync(file, "utf8")
  const out: PagedRead[] = []

  // Shape one: the chain written out, as `lifePlanDayRepo` writes it.
  const chain = /\.from\("([a-z_]+)"\)([\s\S]{0,600}?)\.range\(/g
  for (const m of src.matchAll(chain)) {
    const order = [...m[2].matchAll(/\.order\("([a-z_]+)"/g)].map((o) => o[1])
    out.push({ file, table: m[1], order })
  }

  /**
   * Shape two, and it is the MAJORITY — twenty of the twenty-five reads.
   *
   * `lifePlanRepo` funnels every table through one `all(table, on, order)`
   * helper, so inside the helper the table and the columns are VARIABLES and the
   * first pattern cannot see them. The first version of this file matched five
   * reads and I nearly shipped it believing it covered both repos; the count
   * assertion below is what caught it, which is the only reason it is there.
   *
   * The call sites are literal, so they are what gets read:
   *   all<NodeRow>("life_plan_nodes", "plan", ["id"]),
   */
  const viaHelper = /\ball\s*<[^>]*>\s*\(\s*"([a-z_]+)"\s*,\s*"[a-z]+"\s*,\s*\[([^\]]*)\]/g
  for (const m of src.matchAll(viaHelper)) {
    const order = [...m[2].matchAll(/"([a-z_]+)"/g)].map((o) => o[1])
    out.push({ file, table: m[1], order })
  }

  return out
}

/** Every unique index on a table, as its column list. */
async function uniqueIndexes(table: string): Promise<string[][]> {
  const db = await getClient()
  const got = await db.query(
    `SELECT array_agg(a.attname::text ORDER BY k.ord) AS cols
       FROM pg_index x
       JOIN pg_class i ON i.oid = x.indexrelid
       JOIN pg_class t ON t.oid = x.indrelid
       JOIN unnest(x.indkey) WITH ORDINALITY k(attnum, ord) ON TRUE
       JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
      WHERE t.relname = $1 AND x.indisunique
      GROUP BY i.relname`,
    [table],
  )
  return got.rows.map((r) => r.cols as string[])
}

describe("every paged read orders by something unique", () => {
  test("the scan finds the reads at all, before anything is concluded from it", () => {
    const found = REPOS.flatMap(pagedReads)

    /* A regex that matched nothing would make every assertion below pass over an
       empty list — the strongest possible green, over no reads. Counted PER
       REPO, because the two write their reads in different shapes and a scan
       that silently stops seeing one of them would still find plenty. */
    const byRepo = REPOS.map((r) => found.filter((f) => f.file === r).length)
    expect(byRepo[0], `${REPOS[0]}: the day reads went unseen`).toBeGreaterThanOrEqual(5)
    expect(byRepo[1], `${REPOS[1]}: the plan's twenty tables went unseen`).toBeGreaterThanOrEqual(19)
    expect(
      found.filter((r) => r.order.length === 0),
      "a paged read with no ordering at all: paging it is undefined, never mind unique",
    ).toEqual([])
  })

  test("and Postgres agrees each sort key is backed by a unique index", async () => {
    const problems: string[] = []

    for (const read of REPOS.flatMap(pagedReads)) {
      const uniques = await uniqueIndexes(read.table)
      if (uniques.length === 0) {
        problems.push(`${read.table} (${read.file}) has no unique index at all`)
        continue
      }
      /* The sort key is unique when it CONTAINS every column of some unique
         index. Containment rather than equality, because ordering by
         (on_date, id) is perfectly unique — `id` alone settles every tie, and
         the extra column is there for display order. */
      const settled = uniques.some((cols) => cols.every((c) => read.order.includes(c)))
      if (!settled) {
        problems.push(
          `${read.table} (${read.file}) pages ordered by [${read.order.join(", ")}], ` +
            `which no unique index covers — its uniques are ${uniques.map((c) => `[${c.join(", ")}]`).join(" ")}`,
        )
      }
    }

    expect(
      problems,
      "Paging is two reads of a moving table. On a tie the same row can land in\n" +
        "both pages and the row it displaced in neither — a list that is quietly\n" +
        "short, which is the failure readAllRows exists to prevent:\n" +
        problems.join("\n"),
    ).toEqual([])
  })

  /**
   * THE GUARD PROVES ITSELF. A non-unique ordering has to actually be refused,
   * or the test above is a shape that passes because nothing was ever wrong.
   */
  test("a non-unique ordering would be refused", async () => {
    const uniques = await uniqueIndexes("life_plan_day_ratings")
    // `rating` is a 0-10 number; a thousand rows tie on it constantly.
    const pretend = ["rating"]

    expect(
      uniques.some((cols) => cols.every((c) => pretend.includes(c))),
      "ordering by a rating would be accepted, so the check above means nothing",
    ).toBe(false)
  })
})
