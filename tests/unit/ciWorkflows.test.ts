// @vitest-environment node
/**
 * WHAT THE ROBOT ACTUALLY RUNS WHEN YOU PUSH.
 *
 * THE FAULT THIS CATCHES. `playwright.config.ts` once defined 42 browser
 * "projects" — a project is one set of tests on one device or engine — and ten
 * of them were named by no CI command, so they ran on nobody's machine. Nothing
 * was red; they simply never ran, which looks exactly like passing.
 *
 * Since Phase 9 of Plans/tests-worth-their-keep.md the projects are lanes, and
 * e2e.yml runs each one in a matrix of shards. A lane missing from the matrix,
 * a shard missing from a lane (`2/4` gone: a quarter of the lane never runs),
 * or a lane installed with the wrong engine all fail here.
 *
 * WHY IT READS THE YAML AS TEXT. The workflow files are the only statement of
 * what CI does, so this reads them the way GitHub does and compares against
 * the real project list imported from `playwright.config.ts`.
 */

import { describe, test, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import playwrightConfig from "../../playwright.config"

const root = resolve(__dirname, "../..")
const ci = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8")
const e2e = readFileSync(join(root, ".github/workflows/e2e.yml"), "utf8")

const PROJECTS = playwrightConfig.projects ?? []
const PROJECT_NAMES = PROJECTS.map((p) => p.name as string)

/** Split a workflow file into its jobs, keyed by job name. */
function jobs(yaml: string): Record<string, string> {
  const out: Record<string, string> = {}
  const lines = yaml.split("\n")
  let inJobs = false
  let current: string | null = null
  for (const line of lines) {
    if (/^jobs:\s*$/.test(line)) {
      inJobs = true
      continue
    }
    if (!inJobs) continue
    if (/^\S/.test(line) && line.trim() !== "") {
      inJobs = false
      current = null
      continue
    }
    const header = line.match(/^ {2}([A-Za-z0-9_-]+):\s*$/)
    if (header) {
      current = header[1]
      out[current] = ""
      continue
    }
    if (current) out[current] += line + "\n"
  }
  return out
}

interface Shard {
  job: string
  lane: string
  shard: number
  of: number
  browser: string
}

/** Every `- { lane: x, shard: i/n, browser: y }` matrix entry, and every literal `--project=x` (one shard of one). */
function shardsOf(job: string, body: string): Shard[] {
  const matrix = [...body.matchAll(/- \{ lane: ([\w-]+), shard: (\d+)\/(\d+), browser: (\w+) \}/g)].map((m) => ({
    job,
    lane: m[1],
    shard: Number(m[2]),
    of: Number(m[3]),
    browser: m[4],
  }))
  const literal = [...body.matchAll(/--project=([\w-]+)/g)].map((m) => {
    const installs = body.match(/playwright install --with-deps ([\w ]+)/)?.[1].trim() ?? ""
    return { job, lane: m[1], shard: 1, of: 1, browser: installs }
  })
  return [...matrix, ...literal]
}

const e2eJobs = jobs(e2e)
/** The jobs that run Playwright. A new one not named here makes its lanes look like lanes nothing runs. */
const browserJobs = ["e2e-fast", "lanes", "nightly"]
const SHARDS = browserJobs.flatMap((job) => shardsOf(job, e2eJobs[job] ?? ""))

describe("the browser tests that CI actually runs", () => {
  test("every browser job is in e2e.yml and runs something", () => {
    for (const job of browserJobs) {
      expect(e2eJobs[job], `e2e.yml has no ${job} job`).toBeTruthy()
      expect(SHARDS.some((s) => s.job === job), `${job} runs no lane`).toBe(true)
    }
  })

  test("every Playwright project is run by exactly one CI job", () => {
    const runsIn = (name: string) => [...new Set(SHARDS.filter((s) => s.lane === name).map((s) => s.job))]
    expect(PROJECT_NAMES.filter((n) => runsIn(n).length === 0), "defined but run by no CI job").toEqual([])
    expect(PROJECT_NAMES.filter((n) => runsIn(n).length > 1), "run by two jobs, doubling the minutes").toEqual([])
  })

  test("every lane named in e2e.yml is a project that exists", () => {
    // Playwright fails the whole run on a name it does not know.
    expect([...new Set(SHARDS.map((s) => s.lane))].filter((l) => !PROJECT_NAMES.includes(l))).toEqual([])
  })

  test("every sharded lane runs every one of its shards, once", () => {
    const broken: string[] = []
    for (const lane of new Set(SHARDS.map((s) => s.lane))) {
      const mine = SHARDS.filter((s) => s.lane === lane)
      const totals = new Set(mine.map((s) => s.of))
      const numbers = mine.map((s) => s.shard).sort((a, b) => a - b)
      const expected = Array.from({ length: mine[0].of }, (_, i) => i + 1)
      if (totals.size !== 1 || JSON.stringify(numbers) !== JSON.stringify(expected)) {
        broken.push(`${lane}: shards ${numbers.join(",")} of ${[...totals].join("/")}`)
      }
    }
    expect(broken, "a missing shard is a slice of the lane that never runs").toEqual([])
  })

  test("each lane installs the engine its device runs on", () => {
    const wrong: string[] = []
    for (const shard of SHARDS) {
      const project = PROJECTS.find((p) => p.name === shard.lane)
      const engine = project?.use?.defaultBrowserType ?? project?.use?.browserName
      if (engine && !shard.browser.split(" ").includes(engine)) {
        wrong.push(`${shard.job} ${shard.lane}: installs ${shard.browser}, runs on ${engine}`)
      }
    }
    expect(wrong).toEqual([])
  })

  test("every shard keeps a uniquely named report, and one job merges them whatever happened", () => {
    // Without a name per shard, merging overwrites shard 1 of one lane with another's.
    expect(e2eJobs["lanes"]).toMatch(/PLAYWRIGHT_BLOB_OUTPUT_NAME: report-\$\{\{ matrix\.lane \}\}-\$\{\{ strategy\.job-index \}\}\.zip/)
    expect(e2eJobs["report"]).toMatch(/needs: \[e2e-fast, lanes, nightly\]/)
    // `always()`: a red shard must not skip the report that says what went red.
    expect(e2eJobs["report"]).toMatch(/if: \$\{\{ always\(\) \}\}/)
  })

  test("no browser job is handed a Supabase key or an account's password", () => {
    /**
     * Since Phase 8 the browser suite runs against a throwaway local backend
     * that playwright.config.ts starts, and every account it signs in as is one
     * the fixtures made there. A production key in this file can only be used
     * for something it should not be: the service-role key opens every row in
     * the live database, and CI's logs and artifacts on this public repo are
     * downloadable.
     */
    expect(e2e).not.toMatch(/secrets\.(?:NEXT_PUBLIC_SUPABASE|SUPABASE_|TEST_USER)/)
  })

  test("no Playwright project waits on another or loads a saved sign-in", () => {
    /**
     * Chains and saved states were how three shared accounts were kept apart
     * (33 projects, most of them for that). Each worker has an account of its
     * own now, so a `dependencies` edge is an order nothing needs, and a
     * failing upstream project SKIPS its dependants — which reads as green.
     */
    const chained = PROJECTS.filter(
      (p) => (p.dependencies ?? []).length > 0 || typeof p.use?.storageState === "string",
    ).map((p) => p.name)
    expect(chained).toEqual([])
    expect(playwrightConfig.globalSetup, "a global setup runs before every lane; the fixtures make what a test needs").toBeUndefined()
  })
})

describe("when CI runs at all", () => {
  test("CI runs on a push to any branch", () => {
    for (const [name, yaml] of [
      ["ci.yml", ci],
      ["e2e.yml", e2e],
    ] as const) {
      const push = yaml.match(/on:\n(?:[^\n]*\n)*?\s*push:\n\s*branches:\s*(\[[^\]]*\])/)
      expect(push, `${name} has no push trigger`).not.toBeNull()
      expect(push![1], `${name} only checks some branches, so a working branch is never checked`).toMatch(
        /'\*\*'|"\*\*"/,
      )
      expect(yaml, `${name} cannot be re-run by hand`).toMatch(/^\s*workflow_dispatch:/m)
    }
  })

  test("the database tests are a CI step", () => {
    // They start a real backend in Docker. Until this line existed, every
    // schema rule they check was checked on laptops only.
    expect(ci).toContain("npm run test:integration")
  })

  test("CI builds the test backend with the same Supabase CLI as everyone else", () => {
    // The CLI picks the Postgres, auth and API images, so another version is
    // another backend. scripts/db/test-stack.mjs refuses any version but its
    // constant locally; this holds CI to the same one. Read as text: importing
    // the script would run it.
    const script = readFileSync(join(root, "scripts/db/test-stack.mjs"), "utf8")
    const pinned = script.match(/export const SUPABASE_CLI_VERSION = "([\d.]+)"/)?.[1]
    expect(pinned, "scripts/db/test-stack.mjs no longer declares SUPABASE_CLI_VERSION").toBeTruthy()

    const setup = ci.match(/- uses: supabase\/setup-cli@v\d+\n\s+with:\n\s+version: ([\d.]+)/)
    expect(setup, "ci.yml no longer installs the Supabase CLI with a pinned version").not.toBeNull()
    expect(setup![1], "ci.yml's Supabase CLI differs from scripts/db/test-stack.mjs").toBe(pinned)

    // And before the step that needs it.
    expect(ci.indexOf("supabase/setup-cli")).toBeLessThan(ci.indexOf("npm run test:integration"))

    /**
     * THE BROWSER JOBS TOO. playwright.config.ts starts the same test backend
     * when it loads, so a browser job without this CLI fails before its first
     * test — and one with another version runs against another backend.
     */
    for (const job of browserJobs) {
      // `nightly` reuses `lanes`' steps through a YAML anchor (`steps: *lane-steps`).
      const steps = /steps: \*lane-steps/.test(e2eJobs[job] ?? "") ? e2eJobs["lanes"] : (e2eJobs[job] ?? "")
      const browserCli = steps.match(/- uses: supabase\/setup-cli@v\d+\n\s+with:\n\s+version: ([\d.]+)/)
      expect(browserCli, `e2e.yml's ${job} does not install the Supabase CLI`).not.toBeNull()
      expect(browserCli![1], `e2e.yml's ${job} installs another Supabase CLI than the test stack`).toBe(pinned)
      expect(steps.indexOf("supabase/setup-cli"), `${job} installs the CLI after Playwright needs it`).toBeLessThan(
        steps.indexOf("npx playwright test"),
      )
    }
  })
})
