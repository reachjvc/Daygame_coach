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
/**
 * Comment lines dropped: a `# - { lane: desktop, shard: 3/4 … }` left behind
 * is a shard nothing runs, and must not count as one that is.
 */
const uncommented = (yaml: string) => yaml.replace(/^\s*#.*$/gm, "")
const ci = uncommented(readFileSync(join(root, ".github/workflows/ci.yml"), "utf8"))
const e2e = uncommented(readFileSync(join(root, ".github/workflows/e2e.yml"), "utf8"))

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
    const installs = body.match(/playwright install(?: --with-deps)? ([\w ]+)/)?.[1].trim() ?? ""
    return { job, lane: m[1], shard: 1, of: 1, browser: installs }
  })
  return [...matrix, ...literal]
}

const e2eJobs = jobs(e2e)
/** The jobs that run Playwright. A new one not named here makes its lanes look like lanes nothing runs. */
const browserJobs = ["e2e-fast", "lanes", "nightly"]
const liveCheckJobs = jobs(uncommented(readFileSync(join(root, ".github/workflows/live-check.yml"), "utf8")))
// The `live` project belongs to live-check.yml (Phase 6 of Plans/tests-catch-what-matters.md), not to e2e.yml.
const SHARDS = browserJobs.flatMap((job) => shardsOf(job, e2eJobs[job] ?? ""))
const LIVE_SHARDS = shardsOf("live-check", liveCheckJobs["live"] ?? "")

describe("the browser tests that CI actually runs", () => {
  test("every browser job is in e2e.yml and runs something", () => {
    for (const job of browserJobs) {
      expect(e2eJobs[job], `e2e.yml has no ${job} job`).toBeTruthy()
      expect(SHARDS.some((s) => s.job === job), `${job} runs no lane`).toBe(true)
    }
  })

  test("the pull-request lanes run on pull requests, and the nightly ones at night", () => {
    // Naming a lane in a job proves nothing if the job's condition never holds:
    // `github.ref == 'refs/heads/main'` is never true on a pull request, whose
    // ref is refs/pull/N/merge, and every lane would skip, green.
    expect(e2eJobs["e2e-fast"]).not.toMatch(/^ {4}if:/m)
    expect(e2eJobs["lanes"]).toMatch(
      /^ {4}if: \$\{\{ github\.event_name != 'push' \|\| github\.ref == 'refs\/heads\/main' \|\| github\.ref == 'refs\/heads\/beta' \}\}$/m,
    )
    expect(e2eJobs["nightly"]).toMatch(
      /^ {4}if: \$\{\{ github\.event_name == 'schedule' \|\| github\.event_name == 'workflow_dispatch' \}\}$/m,
    )
  })

  test("every Playwright project is run by exactly one CI job", () => {
    const runsIn = (name: string) => [...new Set([...SHARDS, ...LIVE_SHARDS].filter((s) => s.lane === name).map((s) => s.job))]
    expect(PROJECT_NAMES.filter((n) => runsIn(n).length === 0), "defined but run by no CI job").toEqual([])
    expect(PROJECT_NAMES.filter((n) => runsIn(n).length > 1), "run by two jobs, doubling the minutes").toEqual([])
  })

  test("every lane named in e2e.yml is a project that exists", () => {
    // Playwright fails the whole run on a name it does not know.
    expect([...new Set([...SHARDS, ...LIVE_SHARDS].map((s) => s.lane))].filter((l) => !PROJECT_NAMES.includes(l))).toEqual([])
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
    // A red shard must not skip the report that says what went red; only a cancelled run may.
    expect(e2eJobs["report"]).toMatch(/if: \$\{\{ !cancelled\(\) \}\}/)
  })

  test("the report job keeps the list of failing tests (e2e-failures) so a red main names its first bad commit", () => {
    const report = e2eJobs["report"] ?? ""
    expect(report).toMatch(/merge-reports --reporter json \.\/all-blob-reports/)
    expect(report).toMatch(/node scripts\/ci\/e2e-failures\.mjs/)
    expect(report).toMatch(/name: e2e-failures/)
    expect(report).toMatch(/retention-days: 14/)
    expect(report).toMatch(/actions: read/)
    expect(report).toMatch(/GH_TOKEN: \$\{\{ github\.token \}\}/)
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
    // Any form: `secrets.X`, `secrets['X']`, `toJSON(secrets)`. Only the
    // workflow's own token may appear.
    const named = e2e.match(/\bsecrets\b[^\n]*/g) ?? []
    expect(named.filter((use) => !/^secrets\.GITHUB_TOKEN\b/.test(use))).toEqual([])
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
    // A lane pattern is matched against "project file describe title tags",
    // so one that matched a project's NAME would select every test in it.
    const patterns = PROJECTS.flatMap((p) => [p.grep, p.grepInvert].flat()).filter((r): r is RegExp => r instanceof RegExp)
    expect(patterns.length, "the lanes select by tag; no pattern found").toBeGreaterThan(5)
    const clashes = patterns.flatMap((r) => PROJECT_NAMES.filter((name) => r.test(name)).map((name) => `${r} matches ${name}`))
    expect(clashes).toEqual([])
    // Production builds register a service worker that local runs never have;
    // left on, CI tests a different app (playwright.config.ts says how it bit).
    expect(playwrightConfig.use?.serviceWorkers, "service workers must stay blocked by default").toBe("block")
    expect(playwrightConfig.globalSetup, "a global setup runs before every lane; the fixtures make what a test needs").toBeUndefined()
  })
})

describe("the live-site check stays out of the pull-request lanes", () => {
  const live = PROJECTS.find((p) => p.name === "live")
  const ignored = (p: (typeof PROJECTS)[number]) => [p.testIgnore ?? []].flat().some((r) => r instanceof RegExp && r.test("tests/e2e/live/live-smoke.spec.ts"))

  test("exists, selects only tests/e2e/live, and every other project ignores that folder", () => {
    expect(live, "no `live` project").toBeTruthy()
    expect((live?.testMatch as RegExp).test("tests/e2e/live/live-smoke.spec.ts")).toBe(true)
    expect((live?.testMatch as RegExp).test("tests/e2e/audit.spec.ts")).toBe(false)
    const open = PROJECTS.filter((p) => p.name !== "live" && !ignored(p) && !(p.testMatch instanceof RegExp && !p.testMatch.test("tests/e2e/live/live-smoke.spec.ts")))
    expect(open.map((p) => p.name), "projects that would also run the live spec").toEqual([])
  })

  test("is run by live-check.yml alone, never by e2e.yml", () => {
    expect(LIVE_SHARDS.map((s) => s.lane)).toEqual(["live"])
    expect(SHARDS.filter((s) => s.lane === "live")).toEqual([])
  })
})

describe("which phone and how many workers (Plans/tests-green-and-fast.md, Phase 5)", () => {
  const lanesIn = (job: string) => new Set(SHARDS.filter((s) => s.job === job).map((s) => s.lane))
  const project = (name: string) => PROJECTS.find((p) => p.name === name)

  test("every push runs the Android phone; the iPhone runs at night", () => {
    // D1: the owner's phone is Android and Chromium is faster in CI.
    expect(project("android")?.use?.defaultBrowserType).toBe("chromium")
    expect(project("timing-android")?.use?.defaultBrowserType).toBe("chromium")
    expect([...lanesIn("lanes")].filter((l) => /android|phone/.test(l)).sort()).toEqual(["android", "sweep-android", "timing-android"])
    expect([...lanesIn("nightly")].filter((l) => /android|phone/.test(l)).sort()).toEqual(["phone", "sweep-phone", "timing-phone"])
    expect(project("phone")?.use?.defaultBrowserType).toBe("webkit")
  })

  test("the Chromium lanes run three workers in CI, and a broken lane stops after 15 failures", () => {
    expect(playwrightConfig.workers).toBe(process.env.CI ? 3 : undefined)
    expect(project("desktop")?.workers, "desktop takes the config's three").toBeUndefined()
    expect(project("android")?.workers, "android takes the config's three").toBeUndefined()
    // D3: stop a red lane early instead of retrying each test for 19 minutes.
    expect(playwrightConfig.maxFailures).toBe(process.env.CI ? 15 : undefined)
  })

  test("every browser job caches the Next build and the Playwright browsers", () => {
    for (const job of browserJobs) {
      const steps = /steps: \*lane-steps/.test(e2eJobs[job] ?? "") ? e2eJobs["lanes"] : (e2eJobs[job] ?? "")
      expect(steps, `${job}: no Next build cache`).toContain("path: .next-e2e/cache")
      expect(steps, `${job}: Next cache key`).toContain(
        "key: next-${{ runner.os }}-${{ hashFiles('package-lock.json') }}-${{ github.sha }}",
      )
      expect(steps, `${job}: no browser cache`).toContain("path: ~/.cache/ms-playwright")
      expect(steps.indexOf("path: ~/.cache/ms-playwright"), `${job}: browsers cached after the install`).toBeLessThan(
        steps.indexOf("npx playwright install"),
      )
    }
  })

  test("system libraries are installed only when the browser will not start without them, and then for sure", () => {
    // apt's mirror was throttled to 67 kB/s under load (E2E 44405093527), so the
    // install is a fallback; but a browser that cannot start must never be run.
    for (const job of browserJobs) {
      const steps = /steps: \*lane-steps/.test(e2eJobs[job] ?? "") ? e2eJobs["lanes"] : (e2eJobs[job] ?? "")
      // Either `launch(...) || install-deps`, or `if ! launch(...); then ... install-deps` (the lanes, which
      // restore and save the downloaded .deb files around it).
      expect(steps, `${job}: no launch check with an install-deps fallback`).toMatch(
        /\.launch\(\)[^\n]*\|\| npx playwright install-deps |if ! node -e [^\n]*\.launch\(\)[^\n]*; then\n(?:[^\n]*\n)*?\s*npx playwright install-deps /,
      )
    }
  })

  test("main push runs share one group, so a newer push replaces a pending run and never a running one", () => {
    // B8: a dozen main pushes in an hour queued a dozen eleven-job runs.
    // GitHub cancels only the PENDING run of a group when cancel-in-progress
    // is false; ci.yml's staging job treats such a cancellation as superseded.
    const group = e2e.match(/^ {2}group: (.*)$/m)?.[1] ?? ""
    expect(group).toBe("e2e-${{ github.event_name }}-${{ github.ref }}")
    expect(group, "a per-run id in the group makes every main run its own group, so none is replaced").not.toContain("run_id")
    const cancel = e2e.match(/^ {2}cancel-in-progress: (.*)$/m)?.[1] ?? ""
    expect(cancel, "main runs that have started must finish").toContain("github.ref != 'refs/heads/main'")
  })
})

describe("the duration ratchet watches what CI runs", () => {
  /**
   * scripts/ci/durations.mjs fails a suite that has no green run, but only at
   * night, and only for the suites docs/testing/durations.json names. A lane
   * added without a baseline would never be timed, and a renamed one would
   * fail every night until someone noticed. Both are caught here, on commit.
   */
  const { suites, tolerance } = JSON.parse(readFileSync(join(root, "docs/testing/durations.json"), "utf8")) as {
    tolerance: unknown
    suites: { workflow: string; job: string; step?: string; seconds: number }[]
  }
  const workflows: Record<string, string> = { "ci.yml": ci, "e2e.yml": e2e }

  test("every suite it names is a job, or a step of one, that CI has", () => {
    const missing: string[] = []
    for (const s of suites) {
      const yaml = workflows[s.workflow]
      if (!yaml) {
        missing.push(`${s.workflow}: not a workflow this test reads`)
        continue
      }
      const shard = SHARDS.find((x) => `${x.lane} ${x.shard}/${x.of}` === s.job)
      const unitShard = s.workflow === "ci.yml" && /^unit [12]\/2$/.test(s.job)
      const plain = unitShard ? jobs(yaml)["unit"] : jobs(yaml)[s.job]
      if (!shard && plain === undefined) missing.push(`${s.workflow} › ${s.job}: no such job`)
      if (s.step && !(plain ?? "").includes(`- name: ${s.step}\n`)) missing.push(`${s.workflow} › ${s.job} › ${s.step}: no such step`)
      if (!(s.seconds > 0)) missing.push(`${s.workflow} › ${s.job}: no baseline`)
    }
    expect(missing).toEqual([])
  })

  test("its numbers are numbers", () => {
    // A missing or quoted tolerance makes every comparison false: everything passes.
    expect(typeof tolerance).toBe("number")
    expect(tolerance as number).toBeGreaterThan(0)
    expect(tolerance as number).toBeLessThan(1)
    expect(suites.filter((s) => typeof s.seconds !== "number" || !(s.seconds > 0))).toEqual([])
  })

  test("the names it looks for are the names GitHub shows", () => {
    // The ratchet matches the API's display name: `lane shard` for a matrix
    // job, from this exact template, and the job key for a job with no `name:`.
    for (const job of ["lanes", "nightly"]) {
      expect(e2eJobs[job]).toMatch(/^ {4}name: \$\{\{ matrix\.lane \}\} \$\{\{ matrix\.shard \}\}$/m)
    }
    expect(e2eJobs["e2e-fast"]).not.toMatch(/^ {4}name:/m)
    // ci.yml: a job with no `name:` shows as its key; `unit` is a matrix of two shards.
    for (const job of ["static", "database"]) expect(jobs(ci)[job]).not.toMatch(/^ {4}name:/m)
    expect(jobs(ci)["unit"]).toMatch(/^ {4}name: unit \$\{\{ matrix\.shard \}\}$/m)
    expect(jobs(ci)["unit"]).toMatch(/shard: \['1\/2', '2\/2'\]/)
  })

  test("every browser shard has a baseline", () => {
    const named = new Set(suites.filter((s) => s.workflow === "e2e.yml").map((s) => s.job))
    const shards = SHARDS.filter((x) => x.job !== "e2e-fast").map((x) => `${x.lane} ${x.shard}/${x.of}`)
    expect([...shards, "e2e-fast"].filter((name) => !named.has(name))).toEqual([])
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

  test("every job that starts the test backend first keeps its ports from being handed out", () => {
    /**
     * The backend's ports sit inside Linux's ephemeral range (32768-60999), so
     * an outbound connection made just before — the image pulls — can hold one
     * when the stack binds it: run 38731303670 lost a shard to "0.0.0.0:55324 …
     * address already in use". Each job reserves the range as its first step,
     * before checkout or npm ci can take one; the range is read from
     * config.toml, so moving a port moves the check with it.
     */
    const toml = readFileSync(join(root, "tests/db/supabase/config.toml"), "utf8")
    const ports = [...toml.matchAll(/^\s*(?:shadow_)?port\s*=\s*(\d+)/gm)].map((m) => Number(m[1]))
    expect(ports.length, "no ports read from config.toml").toBeGreaterThan(3)
    const range = `${Math.min(...ports)}-${Math.max(...ports)}`

    const starters: [string, string][] = [
      ["ci.yml database", jobs(ci)["database"] ?? ""],
      ...browserJobs.map((job): [string, string] => [
        `e2e.yml ${job}`,
        /steps: \*lane-steps/.test(e2eJobs[job] ?? "") ? e2eJobs["lanes"] : (e2eJobs[job] ?? ""),
      ]),
    ]
    for (const [name, body] of starters) {
      expect(body, `${name} does not reserve ${range}`).toContain(`ip_local_reserved_ports=${range}`)
      // FIRST: a port taken by checkout or npm ci before the reservation stays
      // taken (run 38858666954 reserved after npm ci and still lost 55322).
      expect(body.indexOf("ip_local_reserved_ports"), `${name} reserves the ports after something used the network`).toBeLessThan(
        body.indexOf("actions/checkout"),
      )
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
