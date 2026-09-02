/**
 * A stand-in for the Supabase query builder: enough of it to run a repo's real
 * select / update / upsert chains against in-memory tables.
 *
 * WHY THIS EXISTS RATHER THAN A MOCKED REPO: the bugs these tests pin are in
 * what the repo writes — which columns a rollover zeroes, which row an UPDATE's
 * guard matches. A mocked repo asserts that a function was called; this asserts
 * the value that comes back out of the row, which is what the page would show.
 */

export type Row = Record<string, unknown>

export interface FakeSupabaseOptions {
  /** Identity for upsert conflict resolution. Defaults to the row's `id`. */
  upsertKey?: (row: Row) => string
}

class FakeQuery {
  private filters: ((r: Row) => boolean)[] = []
  private mode: "select" | "update" | "upsert" | "insert" = "select"
  private payload: Row | Row[] = {}
  private one = false
  private headCount = false

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
  order() {
    return this
  }
  limit() {
    return this
  }
  single() {
    this.one = true
    return this
  }
  maybeSingle() {
    this.one = true
    return this
  }

  private rows() {
    return this.tables[this.table] ?? (this.tables[this.table] = [])
  }

  private matched() {
    return this.rows().filter((r) => this.filters.every((f) => f(r)))
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
    const data = this.one ? (hits[0] ? { ...hits[0] } : null) : hits.map((r) => ({ ...r }))
    const error = this.one && !hits[0] ? { message: "no rows", code: "PGRST116" } : null
    return resolve({ data, error })
  }
}

/** A client whose `from` reads and writes the tables object you pass in. */
export function createFakeSupabase(
  tables: Record<string, Row[]>,
  options: FakeSupabaseOptions = {}
) {
  return { from: (table: string) => new FakeQuery(table, tables, options) }
}
