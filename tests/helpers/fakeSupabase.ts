/**
 * A stand-in for the Supabase query builder: enough of it to run a repo's real
 * select / update / upsert chains against in-memory tables.
 *
 * WHY THIS EXISTS RATHER THAN A MOCKED REPO: the bugs these tests pin are in
 * what the repo writes — which columns a rollover zeroes, which row an UPDATE's
 * guard matches. A mocked repo asserts that a function was called; this asserts
 * the value that comes back out of the row, which is what the page would show.
 */

import { PAGE_SIZE } from "@/src/db/paging"

export type Row = Record<string, unknown>

export interface FakeSupabaseOptions {
  /** Identity for upsert conflict resolution. Defaults to the row's `id`. */
  upsertKey?: (row: Row) => string
}

/** One call to a database function, recorded so a test can read the payload. */
export interface RpcCall {
  name: string
  args: Record<string, unknown>
}

class FakeQuery {
  private filters: ((r: Row) => boolean)[] = []
  private mode: "select" | "update" | "upsert" | "insert" = "select"
  private payload: Row | Row[] = {}
  private one = false
  private headCount = false
  private window: { from: number; to: number } | null = null
  private emptyIsFine = false
  private sorts: { col: string; ascending: boolean }[] = []
  private cap: number | null = null

  constructor(
    private table: string,
    private tables: Record<string, Row[]>,
    private options: FakeSupabaseOptions
  ) {}

  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (opts?.head) this.headCount = true
    return this
  }
  update(values: Row) {
    this.mode = "update"
    this.payload = values
    return this
  }
  insert(values: Row | Row[]) {
    this.mode = "insert"
    this.payload = values
    return this
  }
  upsert(rows: Row[]) {
    this.mode = "upsert"
    this.payload = rows
    return this
  }
  eq(col: string, val: unknown) {
    /**
     * `eq("workout_sets.exercise", …)` — a filter on an EMBEDDED table, which
     * PostgREST applies to the join. Paired with `select("*, workout_sets!inner(…)")`
     * it narrows the PARENT rows to those having a matching child.
     *
     * Understood explicitly for the one relationship this fake knows, and
     * thrown for anything else. Without it the filter silently matched nothing
     * — the mirror of the `or()` hazard this file already guards against, and
     * it makes a filtered read look empty rather than wrong.
     */
    if (col.includes(".")) {
      const [child, childCol] = col.split(".")
      if (this.table !== "workout_logs" || child !== "workout_sets") {
        throw new Error(
          `fakeSupabase.eq does not know the relationship "${this.table} → ${child}" — teach it rather than guessing`
        )
      }
      this.filters.push((parent) =>
        (this.tables[child] ?? []).some(
          (row) => row.log_id === parent.id && row[childCol] === val
        )
      )
      return this
    }
    this.filters.push((r) => r[col] === val)
    return this
  }
  neq(col: string, val: unknown) {
    this.filters.push((r) => r[col] !== val)
    return this
  }
  /** Only `is(col, null)` is meaningful here, and it is the roll's guard. */
  is(col: string, val: unknown) {
    this.filters.push((r) => (r[col] ?? null) === val)
    return this
  }
  /**
   * Strictly greater than. The delta read in `viceRepo` uses it, and the
   * boundary is the point: `gte` would hand a client back the row it already
   * has on every sync forever, so a test that cannot tell `gt` from `gte`
   * cannot pin the behaviour that keeps a quiet page quiet.
   */
  gt(col: string, val: string) {
    this.filters.push((r) => String(r[col]) > val)
    return this
  }

  lt(col: string, val: string) {
    this.filters.push((r) => String(r[col]) < val)
    return this
  }
  gte(col: string, val: string) {
    this.filters.push((r) => String(r[col]) >= val)
    return this
  }
  in(col: string, vals: unknown[]) {
    this.filters.push((r) => vals.includes(r[col]))
    return this
  }
  not(col: string, op: string, val: unknown) {
    if (op === "is" && val === null) this.filters.push((r) => (r[col] ?? null) !== null)
    return this
  }
  /**
   * `or("ended_at.not.is.null,started_at.is.null")` — the shape `finishedWorkouts`
   * builds, and the only shape this understands.
   *
   * It THROWS on anything else rather than matching everything. A filter this
   * did not understand would silently widen the read, and a test would then
   * assert against rows the real database would never have returned — which is
   * worse than no test.
   */
  or(filter: string) {
    const terms = filter.split(",").map((term) => {
      const isNull = term.match(/^([a-z_]+)\.is\.null$/)
      if (isNull) return (r: Row) => (r[isNull[1]] ?? null) === null
      const notNull = term.match(/^([a-z_]+)\.not\.is\.null$/)
      if (notNull) return (r: Row) => (r[notNull[1]] ?? null) !== null
      throw new Error(`fakeSupabase.or does not understand "${term}" — teach it rather than guessing`)
    })
    this.filters.push((r) => terms.some((t) => t(r)))
    return this
  }
  /**
   * ORDER IS REAL NOW, and it has to be.
   *
   * It was a no-op, which is fine for a read whose caller sorts afterwards and
   * wrong for one whose whole answer is "the newest row before this instant" —
   * `readHistoryMonths` probes for exactly that, and against a no-op it would
   * have read whichever row happened to be first in the array and passed.
   *
   * Applied in the order the calls arrive, like PostgREST: the first `.order()`
   * is the primary key, and later ones break its ties.
   */
  order(col?: string, opts?: { ascending?: boolean }) {
    if (col) this.sorts.push({ col, ascending: opts?.ascending !== false })
    return this
  }
  /** Taken after the sort, as the database does. */
  limit(n?: number) {
    if (typeof n === "number") this.cap = n
    return this
  }
  /** `range(from, to)` is inclusive at both ends, as PostgREST's is. */
  range(from: number, to: number) {
    this.window = { from, to }
    return this
  }
  single() {
    this.one = true
    return this
  }
  /**
   * `maybeSingle` is NOT `single`: zero rows is an answer, not an error.
   *
   * The real client returns `{ data: null, error: null }` here and only
   * `single()` raises PGRST116. This used to raise for both, so every caller
   * that treats a failed read as "I could not check" — which is the right way to
   * treat one — read an empty table as a broken database.
   */
  maybeSingle() {
    this.one = true
    this.emptyIsFine = true
    return this
  }

  private rows() {
    return this.tables[this.table] ?? (this.tables[this.table] = [])
  }

  private matched() {
    const hits = this.rows().filter((r) => this.filters.every((f) => f(r)))
    if (this.sorts.length === 0) return hits
    return [...hits].sort((a, b) => {
      for (const { col, ascending } of this.sorts) {
        const left = String(a[col] ?? "")
        const right = String(b[col] ?? "")
        if (left === right) continue
        return (left < right ? -1 : 1) * (ascending ? 1 : -1)
      }
      return 0
    })
  }

  then(resolve: (v: { data: unknown; error: unknown; count?: number }) => void) {
    const keyOf = this.options.upsertKey ?? ((r: Row) => String(r.id))

    if (this.mode === "upsert") {
      for (const row of this.payload as Row[]) {
        const table = this.rows()
        const at = table.findIndex((r) => keyOf(r) === keyOf(row))
        if (at >= 0) table[at] = { ...row }
        else table.push({ ...row })
      }
      return resolve({ data: null, error: null })
    }

    if (this.mode === "insert") {
      const incoming = Array.isArray(this.payload) ? this.payload : [this.payload]
      for (const row of incoming) this.rows().push({ ...row })
      const data = this.one ? { ...incoming[0] } : incoming.map((r) => ({ ...r }))
      return resolve({ data, error: null })
    }

    const hits = this.matched()
    if (this.mode === "update") {
      for (const row of hits) Object.assign(row, this.payload)
    }
    if (this.headCount) {
      return resolve({ data: null, error: null, count: hits.length })
    }
    /**
     * THE 1,000-ROW CAP IS MODELLED, because it is the bug.
     *
     * The real database returns at most `PAGE_SIZE` rows per request and says
     * nothing about it: no error, no flag, just fewer rows than exist. A fake
     * that hands back everything makes an unpaged read look correct in tests and
     * wrong in production, which is the opposite of what a test is for.
     */
    const bounded = this.cap === null ? hits : hits.slice(0, this.cap)
    const page = this.window
      ? bounded.slice(this.window.from, this.window.to + 1)
      : bounded.slice(0, PAGE_SIZE)
    const data = this.one ? (bounded[0] ? { ...bounded[0] } : null) : page.map((r) => ({ ...r }))
    const error =
      this.one && !bounded[0] && !this.emptyIsFine ? { message: "no rows", code: "PGRST116" } : null
    return resolve({ data, error })
  }
}

/**
 * A client whose `from` reads and writes the tables object you pass in.
 *
 * `rpc` RECORDS RATHER THAN RUNS. The program writes are database functions now,
 * and what a unit test can prove about one is the payload the app hands it —
 * which columns, which state, which session count. Whether the function itself
 * keeps its promise is a question for a real Postgres, and
 * `tests/integration/db/programRepo.integration.test.ts` asks it there.
 *
 * `rpcResult` decides what each call answers: a function name mapped to the
 * `{ data, error }` the test wants back. An unmapped name answers
 * `{ data: null, error: null }`.
 */
export function createFakeSupabase(
  tables: Record<string, Row[]>,
  options: FakeSupabaseOptions & {
    calls?: RpcCall[]
    rpcResult?: (call: RpcCall) => { data: unknown; error: unknown }
  } = {}
) {
  return {
    from: (table: string) => new FakeQuery(table, tables, options),
    rpc: async (name: string, args: Record<string, unknown>) => {
      const call = { name, args }
      options.calls?.push(call)
      return options.rpcResult?.(call) ?? { data: null, error: null }
    },
  }
}
