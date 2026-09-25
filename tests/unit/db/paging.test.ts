/**
 * THE LOOP THAT STOPS EVERY LIST IN THIS APP BEING QUIETLY SHORT.
 *
 * `readAllRows` exists because asking this database for more than a thousand
 * rows returns exactly a thousand, with no error and no flag. Its own docstring
 * records both times that was measured the hard way: a timetrack table holding
 * 32,126 rows returned 1,000, and a training account holding 2,444 sets returned
 * 1,000 — and in the training case the correction screen then saved the short
 * list back, deleting the missing sets for real.
 *
 * **It had no test.** `tests/unit/architecture.test.ts` refuses new unpaged
 * reads, so the rule that you must use this is enforced; what this function then
 * DOES was covered by nothing. Every paged read in the app — the plan's twenty
 * tables, a year of days, every workout set — is one bug in these ten lines away
 * from the silent truncation it was written to end.
 *
 * `page` is given as a fake here rather than a database. That is the right level:
 * the thing under test is the loop's arithmetic and its stopping rule, and both
 * are decided entirely by what the page callback returns.
 */

import { describe, it, expect, vi } from "vitest"
import { PAGE_SIZE, chunkIds, readAllRows, ID_CHUNK } from "@/src/db/paging"

/** A fake table of `total` rows, answering ranges the way PostgREST does. */
function table(total: number) {
  const rows = Array.from({ length: total }, (_, i) => ({ id: i }))
  const windows: Array<[number, number]> = []
  const page = (from: number, to: number) => {
    windows.push([from, to])
    return Promise.resolve({ data: rows.slice(from, to + 1), error: null })
  }
  return { rows, windows, page }
}

describe("reading every row rather than the first thousand", () => {
  it("makes one request when the first page is short", async () => {
    const t = table(3)
    expect(await readAllRows("rows", t.page)).toEqual(t.rows)
    expect(t.windows, "a short page IS the end, and asking again is waste").toEqual([[0, PAGE_SIZE - 1]])
  })

  it("returns nothing, and asks once, for an empty table", async () => {
    const t = table(0)
    expect(await readAllRows("rows", t.page)).toEqual([])
    expect(t.windows).toHaveLength(1)
  })

  /**
   * THE CASE THE WHOLE FILE EXISTS FOR. Exactly one full page is
   * indistinguishable from a truncated read until you ask again, so it asks
   * again — and the docstring is explicit that the extra empty request is the
   * price of never guessing.
   */
  it("asks again after a FULL page, even when that page was the lot", async () => {
    const t = table(PAGE_SIZE)
    const got = await readAllRows("rows", t.page)

    expect(got).toHaveLength(PAGE_SIZE)
    expect(t.windows, "the second request is what proves there was no more").toEqual([
      [0, PAGE_SIZE - 1],
      [PAGE_SIZE, PAGE_SIZE * 2 - 1],
    ])
  })

  it("walks as many pages as it takes, in order, with nothing dropped or repeated", async () => {
    const total = PAGE_SIZE * 2 + 7
    const t = table(total)
    const got = await readAllRows<{ id: number }>("rows", t.page)

    expect(got).toHaveLength(total)
    expect(got.map((r) => r.id), "in order, and every id exactly once").toEqual(t.rows.map((r) => r.id))
    expect(t.windows).toEqual([
      [0, PAGE_SIZE - 1],
      [PAGE_SIZE, PAGE_SIZE * 2 - 1],
      [PAGE_SIZE * 2, PAGE_SIZE * 3 - 1],
    ])
  })

  /**
   * A YEAR OF ONE PERSON'S RATINGS is past the first page on its own — twelve
   * areas rated daily is about 4,380 rows — which is why the day tables were
   * paged from the day they were written. Asserted at that real volume rather
   * than at a token one.
   */
  it("reads a year of ratings whole", async () => {
    const t = table(365 * 12)
    expect(await readAllRows("your ratings", t.page)).toHaveLength(4_380)
    expect(t.windows, "five requests: four full pages' worth plus the short one").toHaveLength(5)
  })

  it("stops on a short page, which is the contract the page size depends on", async () => {
    /* The docstring's warning, pinned: the loop treats a SHORT page as the end.
       So if `db.max_rows` on the server is ever lower than PAGE_SIZE, every full
       page arrives short, every read stops at page one, and the silent
       truncation is back everywhere at once. Nothing in this repo can see the
       server's setting; what it can do is state the dependency out loud. */
    const short = vi.fn(async () => ({ data: [{ id: 1 }], error: null }))
    expect(await readAllRows("rows", short)).toHaveLength(1)
    expect(short, "one page, because it came back short").toHaveBeenCalledTimes(1)
  })
})

describe("when a page fails", () => {
  it("throws, and names the read so the failure says which one broke", async () => {
    const page = vi.fn(async () => ({ data: null, error: { message: "connection reset" } }))
    await expect(readAllRows("your days", page)).rejects.toThrow("Failed to read your days: connection reset")
  })

  /**
   * AND IT THROWS ON A LATER PAGE TOO, rather than returning what it has.
   * Returning the first page of a failed read is the truncation this function
   * exists to prevent, arriving as a success.
   */
  it("throws on page two rather than returning page one", async () => {
    let n = 0
    const page = async () => {
      n += 1
      return n === 1
        ? { data: Array.from({ length: PAGE_SIZE }, (_, i) => ({ id: i })), error: null }
        : { data: null, error: { message: "gone" } }
    }
    await expect(readAllRows("rows", page)).rejects.toThrow("Failed to read rows: gone")
  })

  it("treats a null payload with no error as the end, not as a crash", async () => {
    const page = vi.fn(async () => ({ data: null, error: null }))
    expect(await readAllRows("rows", page)).toEqual([])
  })
})

describe("splitting ids into filters a URL can carry", () => {
  /**
   * A different limit and a different failure from the row cap: PostgREST takes
   * these in the URL, so a few thousand uuids is a request the proxy in front of
   * the database rejects outright.
   */
  it("keeps every id, once, in order", () => {
    const ids = Array.from({ length: ID_CHUNK * 2 + 5 }, (_, i) => i)
    const chunks = chunkIds(ids)

    expect(chunks).toHaveLength(3)
    expect(chunks.flat(), "nothing lost and nothing duplicated").toEqual(ids)
    expect(chunks.every((c) => c.length <= ID_CHUNK)).toBe(true)
  })

  it("is one chunk below the limit and no chunks for nothing", () => {
    expect(chunkIds([1, 2, 3])).toEqual([[1, 2, 3]])
    expect(chunkIds([]), "no ids is no requests, not one empty filter").toEqual([])
  })

  it("takes a smaller size when a caller has a shorter URL to spend", () => {
    expect(chunkIds([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })
})
