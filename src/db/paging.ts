/**
 * Reading more rows than the database will hand over in one go.
 *
 * WHAT GOES WRONG WITHOUT THIS. Ask for a thousand and one rows and you get a
 * thousand. No error, no warning, no flag — just fewer rows than exist, and
 * every total, chart and list built on them is confidently wrong. Measured
 * against this database twice now: a timetrack table holding 32,126 rows
 * returned exactly 1,000, and a training account holding 2,444 sets returned
 * exactly 1,000. In the training case the missing rows were the later sets of
 * every workout, and the correction screen then saved back the short list it
 * had been given, deleting them for real.
 *
 * WHY IT LIVES HERE. Three repos had each written this loop out by hand and
 * three others had never heard of it. A rule that every reader has to remember
 * is a rule that gets forgotten by the next one. `tests/unit/architecture.test.ts`
 * refuses new unpaged reads, and this is what they are supposed to use instead.
 */

/**
 * Rows per request.
 *
 * PostgREST's `db.max_rows` is the real limit and it is set on the server, not
 * here. 1,000 is the hosted default and it is what this database actually does —
 * measured, not assumed: a request for 2,444 rows returned exactly 1,000.
 *
 * THE TWO NUMBERS HAVE TO STAY IN STEP. The loop below stops on a page that
 * comes back SHORT, because a short page is how the database says "that was the
 * end". If someone lowers `db.max_rows` under this number, every full page
 * arrives short, every paged read stops at the first page, and the silent
 * truncation this file exists to prevent is back everywhere at once. Lower this
 * constant first, or not at all.
 *
 * A full page always costs one more request that comes back empty. That extra
 * request is the price of never guessing whether there was more.
 */
export const PAGE_SIZE = 1000

/** One page of a query: `data` and `error`, exactly as Supabase returns them. */
type Page<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>

/**
 * Every row the query matches, read a page at a time.
 *
 * `page` is called with each window and must build the query afresh — a
 * Supabase builder cannot be re-run with a different range.
 *
 * ORDER BY SOMETHING UNIQUE. Paging is two separate reads of a moving table; if
 * rows tie on the sort key, the database may put the same row in both pages and
 * neither page has the one it displaced. Order by `id`, or by whatever you like
 * with `id` after it, and sort into display order in memory.
 *
 * @param what  named in the error, so a failure says which read broke
 */
export async function readAllRows<T>(
  what: string,
  page: (from: number, to: number) => Page<T>
): Promise<T[]> {
  const all: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`Failed to read ${what}: ${error.message}`)
    const rows = data ?? []
    all.push(...rows)
    if (rows.length < PAGE_SIZE) return all
  }
}

/**
 * How many ids to put in one `in (...)` filter.
 *
 * A different limit from the row cap and a different failure: PostgREST takes
 * these in the URL, and a few thousand uuids is a URL long enough for the proxy
 * in front of the database to reject the whole request. 200 uuids is roughly
 * 7,400 characters.
 */
export const ID_CHUNK = 200

/** `ids` in batches small enough to pass as a filter. */
export function chunkIds<T>(ids: T[], size: number = ID_CHUNK): T[][] {
  const out: T[][] = []
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size))
  return out
}
