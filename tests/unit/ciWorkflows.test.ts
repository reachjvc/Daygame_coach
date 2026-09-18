// @vitest-environment node
/**
 * WHAT THE ROBOT ACTUALLY RUNS WHEN YOU PUSH.
 *
 * THE FAULT THIS CATCHES. `playwright.config.ts` defines 42 browser "projects"
 * — a project is one set of tests on one device or engine, say the route sweep
 * on a phone. Ten of them were listed in neither of the two CI commands, so
 * they ran on nobody's machine: the route sweep, the time-tracker sync, the
 * four Toggl engines, the crash reporter. Nothing was red; they simply never
 * ran, which looks exactly like passing.
 *
 * The other half is the two browser jobs. They sign in as the same test
 * accounts, and the training tests delete that account's programs while they
 * run. With no ordering between the jobs, one could wipe the data the other was
 * halfway through reading — a failure that only shows up sometimes, which is
 * the worst kind to chase.
 *
 * WHY IT READS THE YAML AS TEXT. The GitHub workflow files are the only
 * statement of what CI does; there is no other copy to check them against. So
 * this test reads them the way GitHub does and compares against the real
 * project list imported from `playwright.config.ts`.
 */

import { describe, test, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import playwrightConfig from "../../playwright.config"

const root = resolve(__dirname, "../..")
const ci = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8")
const e2e = readFileSync(join(root, ".github/workflows/e2e.yml"), "utf8")

const PROJECT_NAMES = (playwrightConfig.projects ?? []).map((p) => p.name as string)

/**
 * The login projects save a signed-in browser for everything after them, and
 * Playwright runs a project's dependencies whatever else was asked for, so
 * naming them in both jobs is honest rather than duplicated work.
 * `training-setup` is Phase 10 step 5's login for the third account.
 */
const MAY_APPEAR_IN_BOTH = new Set(["setup", "setup-user-b", "training-setup"])

/**
 * Does a `--project=` argument name this project?
 *
 * The commands use shell globs (`--project='goals-*'`), which Playwright itself
 * expands, so a plain string comparison would silently match nothing. Only `*`
 * is supported, which is all the workflows use; everything else is compared
 * literally.
 */
function namesProject(arg: string, project: string): boolean {
  if (!arg.includes("*")) return arg === project
  const pattern = arg
    .split("*")
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("[^\\s]*")
  return new RegExp(`^${pattern}$`).test(project)
}

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

/** Every `--project=` name in a job, quotes stripped. */
function projectArgs(job: string): string[] {
  return [...job.matchAll(/--project=('([^']+)'|"([^"]+)"|([^\s'"]+))/g)].map((m) => m[2] ?? m[3] ?? m[4])
}

const e2eJobs = jobs(e2e)
const browserJobs = ["e2e-chromium", "e2e-cross-browser"]

describe("the browser tests that CI actually runs", () => {
  test("every Playwright project is run by exactly one CI job", () => {
    const runsIn: Record<string, string[]> = Object.fromEntries(PROJECT_NAMES.map((n) => [n, []]))
    for (const job of browserJobs) {
      for (const arg of projectArgs(e2eJobs[job])) {
        for (const name of PROJECT_NAMES) {
          // A '*' in the command is a glob GitHub passes straight to Playwright,
          // so it has to be expanded against the real names, not matched as text.
          if (namesProject(arg, name)) runsIn[name].push(job)
        }
      }
    }
    const neverRun = PROJECT_NAMES.filter((n) => runsIn[n].length === 0)
    expect(neverRun, "these Playwright projects are defined but run in no CI job").toEqual([])

    const runTwice = PROJECT_NAMES.filter((n) => runsIn[n].length > 1 && !MAY_APPEAR_IN_BOTH.has(n))
    expect(runTwice, "these run in both jobs, doubling the minutes and the account contention").toEqual([])
  })

  test("every project named in a CI command is a project that exists", () => {
    const dangling: string[] = []
    for (const job of browserJobs) {
      for (const arg of projectArgs(e2eJobs[job])) {
        const matched = PROJECT_NAMES.some((name) => namesProject(arg, name))
        // Playwright fails the whole run on a name it does not know, so a
        // rename in playwright.config.ts has to reach the workflow too.
        if (!matched) dangling.push(`${job}: ${arg}`)
      }
    }
    expect(dangling, "no Playwright project answers to this name").toEqual([])
  })

  test("the job that shares the training account waits for the other and still reports", () => {
    expect(e2eJobs["e2e-cross-browser"]).toMatch(/^\s*needs:\s*e2e-chromium\s*$/m)
    // Without always(), a red chromium job skips this one, and a skipped job
    // reads as a check that had nothing to say.
    expect(e2eJobs["e2e-cross-browser"]).toMatch(/^\s*if:\s*\$\{\{\s*always\(\)\s*\}\}\s*$/m)
  })

  test("the training account's secrets reach both browser jobs", () => {
    for (const job of browserJobs) {
      expect(e2eJobs[job], `${job} cannot sign in as the training account`).toContain("TEST_USER_TRAINING_EMAIL")
      expect(e2eJobs[job], `${job} cannot sign in as the training account`).toContain("TEST_USER_TRAINING_PASSWORD")
    }
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
    // They start a real Postgres in Docker. Until this line existed, every rule
    // in tests/integration/schema.sql was checked on laptops only.
    expect(ci).toContain("npm run test:integration")
  })
})
