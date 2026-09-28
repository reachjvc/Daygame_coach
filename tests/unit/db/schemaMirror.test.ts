/**
 * THE TEST DATABASE HAS TO BE THE REAL DATABASE, OR IT PROVES NOTHING.
 *
 * WHAT THE MIRROR IS. The database tests (`npm run test:integration`) start a
 * throwaway Postgres and build it from one hand-written file,
 * `tests/integration/schema.sql`. Production is built from the numbered files in
 * `supabase/migrations/`. Two descriptions of one database, kept in step by
 * hand.
 *
 * WHAT WENT WRONG, and why this file exists. On 2026-09-17 the mirror was
 * missing fifteen row rules — every rule on `workout_logs`, `workout_sets`,
 * `program_enrollments` and `life_answers`. A "row rule" (RLS) is the database's
 * own answer to "whose rows may this person touch". With none of them present,
 * a test asking "is another person refused?" would have passed while the
 * database let everybody through: the right answer for the wrong reason, which
 * is worse than a red test. The finish-a-workout function was absent entirely,
 * and the weight ceiling said 1000 where production says 999.99.
 *
 * WHAT THIS CHECKS. Three things, all of them "does the copy still say what the
 * original says":
 *   1. every row rule production declares — on a table the mirror actually has —
 *      is in the mirror;
 *   2. every database function the app calls by name exists in the mirror;
 *   3. where both places define the same CHECK rule or the same function, the
 *      newest definition in the migrations matches the mirror's, word for word
 *      once spacing, keyword case and comments are set aside.
 *
 * Rule 3 is the one that catches tomorrow's version of this: change a function's
 * parameters in a migration and forget the mirror, and this goes red the same
 * day instead of the mirror quietly testing last month's database.
 *
 * AND RULE 4, ADDED 2026-09-28, WHICH IS ABOUT THIS FILE'S OWN BLIND SPOT.
 *
 * Rule 1 says "on a table the mirror actually has". That clause is an escape
 * hatch the size of a whole slice: a table absent from the mirror has all of its
 * row rules filtered out, so the guard is silent by design about exactly the
 * tables nobody has mirrored yet. Measured today: `grep -ci timetrack
 * tests/integration/schema.sql` = 0, for nineteen tables carrying 76 policies.
 *
 * Worse, the policies those migrations declare are not merely filtered — they are
 * MISREAD. `20260903120000_timetrack.sql` creates them in a loop with
 * `execute format('create policy "%s_select_own" on public.%I …', t, t)`, and
 * rule 1's regex, unable to match `%I`, backtracks and captures the schema name.
 * So this file's model of production contained four policies on a table called
 * `public` in place of 76 on real tables. A guard holding a phantom is worse than
 * a guard holding nothing, because the phantom looks like coverage.
 *
 * Rule 4 therefore refuses both silences: a policy this file cannot parse is an
 * error rather than a row in the model, and a table a migration creates is either
 * mirrored or listed below with a reason. The pattern is the one
 * `auditRlsExpectations.test.ts` already uses — an excuse must not outlive the
 * thing it excuses.
 */

import { describe, test, expect } from "vitest"
import * as fs from "fs"
import * as path from "path"

const root = path.resolve(__dirname, "../../..")
const migrationsDir = path.join(root, "supabase/migrations")
const schema = fs.readFileSync(path.join(root, "tests/integration/schema.sql"), "utf8")

/** Migrations in the order Postgres applies them: by filename. */
const migrations = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => ({ file: f, sql: fs.readFileSync(path.join(migrationsDir, f), "utf8") }))

/**
 * Two pieces of SQL that differ only in spacing, keyword case or comments are
 * the same piece of SQL. Text inside quotes is left exactly as written, because
 * there the case IS the meaning — 'Push' and 'push' are different labels.
 */
function sqlNormalise(sql: string): string {
  let out = ""
  let i = 0
  while (i < sql.length) {
    const c = sql[i]
    if (c === "'") {
      let j = i + 1
      while (j < sql.length) {
        if (sql[j] === "'" && sql[j + 1] === "'") {
          j += 2
          continue
        }
        if (sql[j] === "'") {
          j++
          break
        }
        j++
      }
      out += sql.slice(i, j)
      i = j
      continue
    }
    if (c === "-" && sql[i + 1] === "-") {
      const nl = sql.indexOf("\n", i)
      i = nl < 0 ? sql.length : nl
      out += " "
      continue
    }
    out += c.toLowerCase()
    i++
  }
  return out.replace(/\s+/g, " ").trim()
}

/** The text from an opening bracket to the bracket that closes it. */
function bracketed(text: string, open: number): string | null {
  let depth = 0
  for (let i = open; i < text.length; i++) {
    if (text[i] === "(") depth++
    else if (text[i] === ")") {
      depth--
      if (depth === 0) return text.slice(open, i + 1)
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Row rules
// ---------------------------------------------------------------------------

interface Policy {
  table: string
  name: string
  where: string
}

/**
 * Policies created inside a `do $$ … $$` loop over a list of table names.
 *
 * `20260903120000_timetrack.sql` declares all 76 of its policies as
 * `execute format('create policy "%s_select_own" on public.%I …', t, t)` inside
 * `foreach t in array array['timetrack_workspaces', …]`. The plain regex below cannot
 * match `%I`, so it backtracked and captured the SCHEMA name — recording four
 * policies on a table called `public` in place of 76 on real tables. A guard holding a
 * phantom is worse than one holding nothing, because the phantom looks like coverage.
 *
 * `20260922100000_life_plan_tables.sql` uses the same shape for 100 policies across 25
 * tables, so this is not one migration's quirk.
 */
function loopPoliciesIn(sql: string, where: string): Policy[] {
  const found: Policy[] = []
  for (const [, block] of sql.matchAll(/do\s+\$\$([\s\S]*?)\$\$\s*;/gi)) {
    const listMatch = /in\s+array\s+array\s*\[([\s\S]*?)\]/i.exec(block)
    if (!listMatch) continue
    const tables = [...listMatch[1].matchAll(/'([a-z0-9_]+)'/gi)].map((m) => m[1].toLowerCase())
    if (tables.length === 0) continue
    // the policy NAME is a format string: `"%s_select_own"` becomes `<table>_select_own`
    for (const [, nameTemplate] of block.matchAll(/create\s+policy\s+"%s([a-z0-9_]+)"/gi)) {
      for (const table of tables) found.push({ name: `${table}${nameTemplate}`, table, where })
    }
  }
  return found
}

function policiesIn(sql: string, where: string): Policy[] {
  // Case-insensitive on purpose: 20260827000000_create_life_answers.sql writes
  // `create policy ... on public.life_answers` in lower case, and an earlier
  // version of this check missed all three of its rules because of it.
  /**
   * QUOTED OR NOT. A policy name is an SQL identifier, and quoting it is optional —
   * `20260923120000_vice_black_box_tables.sql` writes
   * `CREATE POLICY vice_attempts_select_own ON vice_attempts`, which is the more
   * common style. This pattern required the quotes, so eight policies across the two
   * vice tables were invisible: the tables that hold relapse records, which is the
   * most private data in the app.
   */
  const direct = [
    ...sql.matchAll(/create\s+policy\s+(?:"([^"]+)"|([a-z][a-z0-9_]*))\s+on\s+(?:public\.)?([a-z0-9_]+)/gi),
  ].map((m) => ({
    name: m[1] ?? m[2],
    table: m[3].toLowerCase(),
    where,
  }))
  /**
   * A match whose table came out as `public` is the loop form misread — the regex
   * could not match `%I` and fell back to the schema name. Those are dropped and the
   * loop parser handles them properly; the test below asserts none survive, so the
   * drop cannot hide a form neither parser understands.
   */
  return [...direct.filter((policy) => policy.table !== "public"), ...loopPoliciesIn(sql, where)]
}

function policyDropsIn(sql: string): Array<{ table: string; name: string }> {
  return [...sql.matchAll(/drop\s+policy\s+(?:if\s+exists\s+)?"([^"]+)"\s+on\s+(?:public\.)?([a-z0-9_]+)/gi)].map(
    (m) => ({ name: m[1], table: m[2].toLowerCase() }),
  )
}

/** Tables the mirror actually declares — it does not try to hold every table. */
const mirroredTables = new Set(
  [...schema.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z0-9_]+)/gi)].map((m) =>
    m[1].toLowerCase(),
  ),
)

/**
 * Tables production creates that the mirror deliberately does not have yet.
 *
 * Every entry needs a reason and an owner-visible consequence, because each one is
 * a set of row rules no database test can check. Remove an entry the day its table
 * is mirrored — the assertion below fails if an excuse outlives the thing it
 * excuses.
 */
/**
 * Tables production creates that the mirror does not have yet, each with the reason
 * and what it costs.
 *
 * Every entry is a set of row rules no database test can check. MEASURED on
 * 2026-09-28: 63 tables exist in production and 52 are mirrored, and of the 56
 * policies this file can parse, **34 are discarded** by rule 1's "on a table the
 * mirror actually has" clause — so 22 of them are actually checked. The nineteen
 * timetrack tables are worse than discarded: their policies are created in a loop
 * this file cannot read at all, and were being recorded as four phantoms on a table
 * called `public`.
 *
 * Remove an entry the day its table is mirrored; the third test below fails if an
 * excuse outlives the thing it excuses.
 *
 * KNOWN LIMIT, stated rather than left to be discovered: `tablesInProduction()` reads
 * `create table` out of the migration text, so a table created inside a `do $$` block
 * is invisible to it the same way those policies were. Seven parsed policies point at
 * two tables this scan does not see as created (`program_session_logs`,
 * `workout_templates`), which is that gap rather than a missing table.
 */
const NOT_MIRRORED_YET: Record<string, string> = {
  // 76 policies, created in a loop this file cannot parse. Their primary keys are one
  // global namespace across ALL users, so RLS is the only thing refusing another
  // person's row — and nothing proves it is on.
  ...Object.fromEntries(
    [
      "timetrack_workspaces", "timetrack_clients", "timetrack_projects", "timetrack_project_rates",
      "timetrack_project_alerts", "timetrack_alert_events", "timetrack_tasks", "timetrack_tags",
      "timetrack_entries", "timetrack_entry_tags", "timetrack_favorites", "timetrack_saved_reports",
      "timetrack_approvals", "timetrack_webhooks", "timetrack_webhook_log",
      "timetrack_autotracker_rules", "timetrack_timeline", "timetrack_calendars", "timetrack_settings",
    ].map((table) => [
      table,
      "timetrack: 76 policies in a loop this file cannot read, none checked by any test. " +
        "Ids are one global namespace across users, so RLS is the only lock.",
    ]),
  ),
  weight_logs: "health: 4 policies, unchecked. Holds a person's body weight.",
  sleep_logs: "health: 4 policies, unchecked.",
  nutrition_logs: "health: 4 policies, unchecked.",
  body_measurements: "health: 4 policies, unchecked. Holds body measurements.",
  life_chapters: "life: 3 policies, unchecked. Holds what somebody wrote about their life.",
  dashboard_widgets: "dashboard: 4 policies, unchecked. Layout only.",
  vice_attempts: "vice: RLS enabled, policies not parsed here. Holds relapse records — the " +
    "most private data in the app.",
  vice_reports: "vice: RLS enabled, policies not parsed here.",
  error_reports: "diagnostics: written by the app, read by nobody in-product.",
  embeddings_test: "a test fixture table, not user data.",
}


/** Every table a migration creates and no later migration drops. */
function tablesInProduction(): Set<string> {
  const live = new Set<string>()
  for (const { sql } of migrations) {
    for (const m of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z0-9_]+)/gi)) {
      live.add(m[1].toLowerCase())
    }
    for (const m of sql.matchAll(/drop\s+table\s+(?:if\s+exists\s+)?(?:public\.)?([a-z0-9_]+)/gi)) {
      live.delete(m[1].toLowerCase())
    }
  }
  return live
}

describe("the mirror's own blind spots are written down", () => {
  test("no policy is recorded against a table called `public`, which means it could not be read", () => {
    /**
     * `execute format('create policy "%s_x" on public.%I …')` cannot be parsed by a
     * regex over the file, and rule 1's pattern silently captured the schema name
     * instead of failing. Four such phantoms stood in for 76 real policies.
     *
     * This is the check on the check: a model of production that contains a table
     * named `public` is a model that failed to read something, and it has to say so.
     */
    /**
     * Read with the RAW regex, not through `policiesIn` — which now drops these and
     * lets `loopPoliciesIn` handle them. Asserting on the filtered output would be
     * asserting that the filter ran, which is not the question. The question is
     * whether every such declaration is accounted for by the loop parser.
     */
    const unreadable: string[] = []
    for (const { file, sql } of migrations) {
      /**
       * `on public.%I` — a schema qualifier followed by something that is NOT a plain
       * identifier, which is what a format placeholder looks like. The first version
       * of this used `on\s+public(?![a-z0-9_.])`, whose lookahead excluded the very
       * `.` it needed to see, so it matched nothing and the test asserted nothing.
       * Caught by disabling the loop parser and watching it stay green.
       */
      const rawPhantoms = [...sql.matchAll(/create\s+policy\s+"([^"]+)"\s+on\s+public\.(?![a-z0-9_])/gi)]
      if (rawPhantoms.length === 0) continue
      const recovered = loopPoliciesIn(sql, file)
      if (recovered.length === 0) {
        for (const m of rawPhantoms) unreadable.push(`${file}: "${m[1]}" — and the loop parser found nothing`)
      }
    }
    expect(
      unreadable.sort(),
      "these policies are declared in a form this file cannot read, so rule 1 is blind to them:\n  " +
        unreadable.join("\n  ") +
        "\nParse the loop form, or assert the count from `pg_policies` the way " +
        "20260922100000_life_plan_tables.sql does.",
    ).toEqual([])
  })

  test("every table production creates is mirrored, or listed with a reason", () => {
    const unaccounted = [...tablesInProduction()]
      .filter((table) => !mirroredTables.has(table) && !(table in NOT_MIRRORED_YET))
      .sort()

    expect(
      unaccounted,
      "these tables exist in production and not in the mirror, so no database test can " +
        "check a single one of their row rules. Mirror them, or add each to " +
        "NOT_MIRRORED_YET with the reason:\n  " + unaccounted.join("\n  "),
    ).toEqual([])
  })

  test("a table with row security on has policies this file can see, or is listed as deny-all", () => {
    /**
     * The general form of the phantom, and the one that catches a declaration style
     * nobody has thought of yet. Turning RLS on with NO policies is a legitimate
     * design — it means deny-all, which is right for a table whose rows are earned or
     * computed rather than typed in (`CLAUDE.md`'s RLS stop sign). What is not
     * legitimate is not knowing which of the two you have.
     *
     * So each table with row security on must either have a policy this file can read,
     * or be named below with which it is.
     */
    const DENY_ALL_BY_DESIGN: Record<string, string> = {
      user_xp: "earned, not typed in — system-only by design, see CLAUDE.md's RLS stop sign",
      beta_invites: "administered outside the app",
      waitlist_emails: "administered outside the app",
      error_reports: "written by the app, read by nobody in-product",
      embeddings_test: "a test fixture table, not user data",
      core_values: "life_plan: policies created as `CREATE POLICY %I ON %I` with variables, " +
        "which no text parser can resolve. That migration asserts its own counts from " +
        "`pg_policies` instead — the pattern the timetrack migration should copy.",
      plan_snapshots: "life_plan: same `%I` form as core_values.",
    }

    const rlsOn = new Set<string>()
    const withPolicies = new Set<string>()
    for (const { sql, file } of migrations) {
      for (const m of sql.matchAll(
        /alter\s+table\s+(?:only\s+)?(?:public\.)?([a-z0-9_]+)\s+enable\s+row\s+level\s+security/gi,
      )) {
        rlsOn.add(m[1].toLowerCase())
      }
      for (const p of policiesIn(sql, file)) withPolicies.add(p.table)
    }

    const unexplained = [...rlsOn]
      .filter((table) => !withPolicies.has(table) && !(table in DENY_ALL_BY_DESIGN))
      .sort()

    expect(
      unexplained,
      "these tables have row security on and no policy this file can read. Either they are " +
        "deny-all on purpose — add them above with the reason — or their policies are " +
        "declared in a form this file cannot parse, which is the phantom problem again:\n  " +
        unexplained.join("\n  "),
    ).toEqual([])
  })

  test("and an excuse does not outlive the thing it excuses", () => {
    /**
     * The companion half, which this repo requires of every allowlist: an entry whose
     * table has since been mirrored, or dropped, is a free pass waiting to be used.
     */
    const live = tablesInProduction()
    const stale = Object.keys(NOT_MIRRORED_YET)
      .filter((table) => mirroredTables.has(table) || !live.has(table))
      .sort()

    expect(
      stale,
      "these are mirrored or gone — remove them from NOT_MIRRORED_YET:\n  " + stale.join("\n  "),
    ).toEqual([])
  })
})

describe("the test schema mirrors production", () => {
  test("every policy production declares on a table the test schema also declares is in the test schema", () => {
    const live = new Map<string, Policy>()
    for (const { file, sql } of migrations) {
      for (const p of policiesIn(sql, file)) live.set(`${p.table}|${p.name}`, p)
      // A policy dropped by a later migration is gone from production too.
      for (const d of policyDropsIn(sql)) live.delete(`${d.table}|${d.name}`)
    }

    const mirrored = new Set(policiesIn(schema, "schema.sql").map((p) => `${p.table}|${p.name}`))
    const missing = [...live.values()]
      .filter((p) => mirroredTables.has(p.table) && !mirrored.has(`${p.table}|${p.name}`))
      .map((p) => `${p.table}: "${p.name}" (${p.where})`)

    expect(
      missing.sort(),
      "the database tests would pass without these rules being enforced — copy them into tests/integration/schema.sql",
    ).toEqual([])
  })

  /**
   * Functions the app calls with `.rpc("name")`. If the mirror does not have
   * one, no database test can exercise it, which is how `finish_program_workout`
   * — the guard against finishing a workout twice — went untested for a fortnight.
   */
  test("every database function the app calls by name exists in the test schema", () => {
    const called = new Set<string>()
    for (const file of fs.readdirSync(path.join(root, "src/db")).filter((f) => f.endsWith(".ts"))) {
      const text = fs.readFileSync(path.join(root, "src/db", file), "utf8")
      for (const m of text.matchAll(/\.rpc\(\s*["'`]([a-zA-Z0-9_]+)["'`]/g)) called.add(m[1])
    }

    // pgvector's similarity search cannot be modelled in a plain Postgres
    // container. This set may only shrink: the day the container gains the
    // extension, delete the entry rather than adding a new excuse beside it.
    const PGVECTOR_ONLY = new Set(["match_embeddings", "match_embeddings_test"])

    const missing = [...called]
      .filter((name) => !PGVECTOR_ONLY.has(name))
      .filter((name) => !new RegExp(`function\\s+(?:public\\.)?${name}\\s*\\(`, "i").test(schema))

    expect(missing.sort(), "the app calls these; the test database has never heard of them").toEqual([])
    expect(called.size, "no .rpc( call found at all — the search above has stopped working").toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Latest definition wins
// ---------------------------------------------------------------------------

/** Every `CONSTRAINT <name> CHECK (…)`, inline or added later, by name. */
function checksIn(sql: string): Map<string, string> {
  const found = new Map<string, string>()
  const re = /(?:add\s+)?constraint\s+([a-z0-9_]+)\s+check\s*\(/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(sql))) {
    const expression = bracketed(sql, re.lastIndex - 1)
    if (expression) found.set(m[1].toLowerCase(), sqlNormalise(expression))
  }
  return found
}

/** Every function definition, from CREATE to the end of its quoted body. */
function functionsIn(sql: string): Map<string, string> {
  const found = new Map<string, string>()
  const re = /create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?([a-z0-9_]+)\s*\(/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(sql))) {
    const rest = sql.slice(m.index)
    // The body is wrapped in a dollar-quote whose tag is whatever the author
    // chose ($$, $fn$). Find the tag, then its closing twin.
    const tag = rest.match(/\sAS\s+(\$[a-z_]*\$)/i)
    if (!tag) continue
    const bodyStart = rest.indexOf(tag[1]) + tag[1].length
    const bodyEnd = rest.indexOf(tag[1], bodyStart)
    if (bodyEnd < 0) continue
    const definition = sqlNormalise(rest.slice(0, bodyEnd + tag[1].length))
      // The tag itself, "or replace", and a public. prefix are spelling, not
      // meaning: the same function is the same function however it is written.
      .replace(/\$[a-z_]*\$/g, "$$$$")
      .replace(/^create or replace function /, "create function ")
      .replace(/^create function public\./, "create function ")
    found.set(m[1].toLowerCase(), definition)
  }
  return found
}

describe("where both places define the same thing, they say the same thing", () => {
  const latestChecks = new Map<string, { sql: string; file: string }>()
  const latestFunctions = new Map<string, { sql: string; file: string }>()
  for (const { file, sql } of migrations) {
    for (const [name, text] of checksIn(sql)) latestChecks.set(name, { sql: text, file })
    for (const [name, text] of functionsIn(sql)) latestFunctions.set(name, { sql: text, file })
  }
  const mirrorChecks = checksIn(schema)
  const mirrorFunctions = functionsIn(schema)

  test("the latest definition of every CHECK constraint named in both places matches", () => {
    const drifted: string[] = []
    for (const [name, mirrored] of mirrorChecks) {
      const production = latestChecks.get(name)
      if (!production) continue
      if (production.sql !== mirrored) {
        drifted.push(`${name}\n    ${production.file}: ${production.sql}\n    schema.sql: ${mirrored}`)
      }
    }
    expect(drifted.sort(), "the test database enforces a different rule from production").toEqual([])
    // If the parser ever stops finding constraints, everything above passes by
    // comparing nothing. This is the floor that says it is still looking.
    expect([...mirrorChecks.keys()].filter((n) => latestChecks.has(n)).length).toBeGreaterThanOrEqual(9)
  })

  test("the latest definition of every function named in both places matches", () => {
    const drifted: string[] = []
    for (const [name, mirrored] of mirrorFunctions) {
      const production = latestFunctions.get(name)
      if (!production) continue
      if (production.sql !== mirrored) {
        drifted.push(`${name}\n    ${production.file}:\n      ${production.sql}\n    schema.sql:\n      ${mirrored}`)
      }
    }
    expect(
      drifted.sort(),
      "a migration changed a function and the test schema still has the old one — copy the newest definition across",
    ).toEqual([])
    expect([...mirrorFunctions.keys()].filter((n) => latestFunctions.has(n)).length).toBeGreaterThanOrEqual(5)
  })
})
