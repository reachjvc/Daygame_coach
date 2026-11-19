#!/usr/bin/env node
/**
 * SESSION-START WARNING: IS main RED?
 *
 *   node scripts/ci/main-status.mjs
 *
 * Prints one line per red workflow (CI, E2E Tests, Nightly checks, Live check) when the newest finished
 * push run on main failed, for example
 *   main is red since 2026-11-18: CI checks (run 44383715199)
 * and nothing when both are green. Always exits 0, within 5 s, also offline or
 * without `gh` (then it prints nothing). It only warns; it never blocks.
 *
 * API cost: one `gh run list` per workflow (asking for finished runs only, so
 * a burst of pushes cannot hide them; run in parallel), plus at most one
 * `gh run view` per red workflow. When every finished run in view is red, the
 * date says "since at least": the red streak may be older than the window.
 * Tests may set MAIN_STATUS_FIXTURE=<file with the run list JSON>; that skips
 * `gh` entirely; MAIN_STATUS_FAILURES_FIXTURE=<failures.json> stands in for the
 * downloaded e2e-failures artifact.
 *
 * For a red E2E run the artifact `e2e-failures` (scripts/ci/e2e-failures.mjs, written by
 * the report job of e2e.yml) adds at most 3 lines grouped by the commit the tests first went
 * red at, and one flaky line. Missing or slow artifact: nothing is added. When the list before
 * sat several commits back (cancelled runs between), the line names the range instead:
 *   15 tests first red between c38e0657 and d75c752f "…" (8 commits) (e.g. x.spec.ts:12)
 */

import { spawn } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

// CI and E2E Tests judge push runs; the nightly runs on a schedule. The live check runs when Vercel
// reports a deploy (`deployment_status`), whose ref is the deployed commit, not `main`, so it is not
// filtered by branch; a Preview deploy leaves a skipped run, which findRed ignores, hence the wider window.
const WORKFLOWS = [
  { name: "CI", event: "push" },
  { name: "E2E Tests", event: "push" },
  { name: "Nightly checks", event: "schedule" },
  { name: "Live check", event: "deployment_status", anyBranch: true, limit: 100 },
]
const WINDOW = 30
// startup_failure: the run never started (a broken workflow file). action_required
// is a run waiting for approval, which is neither red nor green.
const RED = new Set(["failure", "timed_out", "startup_failure"])
const BUDGET_MS = 4500
const ARTIFACT_MS = 3000
const MAX_GROUPS = 3
const FLAKY_MIN = 2

/**
 * @typedef {{ databaseId: number, workflowName: string, event: string, status: string, conclusion: string, createdAt: string }} Run
 * @param {Run[]} runs newest first, as `gh run list` returns them
 * @returns {Array<{ workflow: string, runId: number, since: string, atLeast: boolean }>} one entry per red workflow
 */
export function findRed(runs) {
  if (!Array.isArray(runs)) return []
  const red = []
  for (const { name: workflow, event, limit } of WORKFLOWS) {
    // Only finished runs of the right event count; a cancelled or skipped run is neither red nor green.
    const finished = runs.filter(
      (r) =>
        r &&
        r.workflowName === workflow &&
        r.event === event &&
        r.status === "completed" &&
        r.conclusion !== "cancelled" &&
        r.conclusion !== "skipped",
    )
    if (finished.length === 0 || finished[0].conclusion === "success") continue
    if (!RED.has(finished[0].conclusion)) continue
    let oldest = finished[0]
    let sawSuccess = false
    for (const r of finished) {
      if (r.conclusion === "success") {
        sawSuccess = true
        break
      }
      oldest = r
    }
    // No green run in view and the window was full: the streak may reach further back.
    red.push({
      workflow,
      runId: finished[0].databaseId,
      since: String(oldest.createdAt).slice(0, 10),
      atLeast: !sawSuccess && finished.length >= WINDOW && limit === undefined,
    })
  }
  return red
}

/** @param {{ workflow: string, runId: number, since: string, atLeast?: boolean }} red @param {string} [job] */
export function formatLine(red, job) {
  return `main is red since ${red.atLeast ? "at least " : ""}${red.since}: ${red.workflow}${job ? ` ${job}` : ""} (run ${red.runId})`
}

/** @param {unknown} jobsJson parsed `gh run view --json jobs` @returns {string|undefined} */
export function firstFailedJob(jobsJson) {
  const jobs = jobsJson && typeof jobsJson === "object" && Array.isArray(/** @type {any} */ (jobsJson).jobs) ? /** @type {any} */ (jobsJson).jobs : []
  const failed = jobs.find((j) => j && j.conclusion === "failure")
  return failed && typeof failed.name === "string" ? failed.name : undefined
}

/** "dir/file.spec.ts:191 title" -> "file.spec.ts:191" */
function shortId(id) {
  const loc = String(id).split(" ")[0]
  return loc.split("/").pop()
}

function clip(text, max = 37) {
  const t = String(text ?? "")
  return t.length > max + 1 ? `${t.slice(0, max)}…` : t
}

/**
 * @param {any} failures parsed e2e-failures artifact
 * @returns {string[]} at most MAX_GROUPS lines grouped by first red commit (biggest group first), then one flaky line
 */
export function formatFailures(failures) {
  if (!failures || typeof failures !== "object") return []
  const lines = []
  const groups = new Map()
  for (const f of Array.isArray(failures.failed) ? failures.failed : []) {
    if (!f || typeof f.id !== "string") continue
    // A range (the previous list sat several commits back) is its own group: same end, other start.
    const k = `${f.firstSha ?? ""} ${f.firstSha ? (f.afterSha ?? "") : ""}`
    const g = groups.get(k) ?? { sha: f.firstSha ?? null, subject: f.firstSubject, after: f.firstSha ? (f.afterSha ?? null) : null, commits: f.commits, ids: [] }
    g.ids.push(f.id)
    groups.set(k, g)
  }
  const sorted = [...groups.values()].sort((a, b) => b.ids.length - a.ids.length)
  for (const g of sorted.slice(0, MAX_GROUPS)) {
    const n = g.ids.length
    const what = `${n} test${n === 1 ? "" : "s"}`
    const eg = `(e.g. ${shortId(g.ids[0])})`
    const at = `${String(g.sha).slice(0, 8)} "${clip(g.subject)}"`
    const span = Number.isInteger(g.commits) ? ` (${g.commits} commits)` : ""
    lines.push(
      !g.sha
        ? `  ${what} red since before tracking began ${eg}`
        : g.after
          ? `  ${what} first red between ${String(g.after).slice(0, 8)} and ${at}${span} ${eg}`
          : `  ${what} first red at ${at} ${eg}`,
    )
  }
  const flaky = (Array.isArray(failures.flaky) ? failures.flaky : [])
    .filter((f) => f && typeof f.id === "string" && Array.isArray(f.last5))
    .map((f) => ({ id: f.id, n: f.last5.filter(Boolean).length, of: f.last5.length }))
    .filter((f) => f.n >= FLAKY_MIN)
    .sort((a, b) => b.n - a.n)
  if (flaky.length) lines.push(`  flaky on main: ${flaky.slice(0, 2).map((f) => `${shortId(f.id)} (${f.n} of ${f.of} runs)`).join(", ")}`)
  return lines
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"))
  } catch {
    return undefined
  }
}

/** Download the run's e2e-failures artifact into a temp dir and parse it; undefined on any trouble. */
async function downloadFailures(runId, timeout) {
  if (timeout < 300) return undefined
  let dir
  try {
    dir = mkdtempSync(join(tmpdir(), "e2e-failures-"))
    const ok = await new Promise((resolve) => {
      let child
      try {
        child = spawn("gh", ["run", "download", String(runId), "--name", "e2e-failures", "--dir", dir], { stdio: ["ignore", "ignore", "ignore"] })
      } catch {
        return resolve(false)
      }
      const timer = setTimeout(() => {
        child.kill()
        resolve(false)
      }, Math.min(ARTIFACT_MS, timeout))
      child.on("error", () => {
        clearTimeout(timer)
        resolve(false)
      })
      child.on("close", (code) => {
        clearTimeout(timer)
        resolve(code === 0)
      })
    })
    return ok ? JSON.parse(readFileSync(join(dir, "failures.json"), "utf8")) : undefined
  } catch {
    return undefined
  } finally {
    if (dir) rmSync(dir, { recursive: true, force: true })
  }
}

function gh(args, timeout) {
  if (timeout < 300) return Promise.resolve(undefined)
  return new Promise((resolve) => {
    let out = ""
    let child
    try {
      child = spawn("gh", args, { stdio: ["ignore", "pipe", "ignore"] })
    } catch {
      return resolve(undefined)
    }
    const timer = setTimeout(() => {
      child.kill()
      resolve(undefined)
    }, timeout)
    child.stdout.on("data", (d) => (out += d))
    child.on("error", () => {
      clearTimeout(timer)
      resolve(undefined)
    })
    child.on("close", (code) => {
      clearTimeout(timer)
      if (code !== 0) return resolve(undefined)
      try {
        resolve(JSON.parse(out))
      } catch {
        resolve(undefined)
      }
    })
  })
}

export async function main(env = process.env) {
  const started = Date.now()
  const left = () => BUDGET_MS - (Date.now() - started)
  const fixture = env.MAIN_STATUS_FIXTURE
  let runs
  if (fixture) runs = JSON.parse(readFileSync(fixture, "utf8"))
  else {
    // One query per workflow: a push burst fills one shared list with unfinished runs.
    const lists = await Promise.all(
      WORKFLOWS.map(({ name, event, anyBranch, limit }) =>
        gh(
          ["run", "list", ...(anyBranch ? [] : ["--branch", "main"]), "--workflow", name, "--event", event, "--status", "completed", "--limit", String(limit ?? WINDOW), "--json", "databaseId,workflowName,event,status,conclusion,createdAt"],
          Math.min(3000, left()),
        ),
      ),
    )
    runs = lists.flatMap((l) => (Array.isArray(l) ? l : []))
  }
  const found = findRed(runs)
  // The failed-job lookup and the artifact download run side by side: in series they ate the budget.
  const extras = await Promise.all(
    found.map(async (red) => {
      const [jobs, failures] = await Promise.all([
        fixture ? undefined : gh(["run", "view", String(red.runId), "--json", "jobs"], left()),
        red.workflow !== "E2E Tests"
          ? undefined
          : env.MAIN_STATUS_FAILURES_FIXTURE
            ? readJson(env.MAIN_STATUS_FAILURES_FIXTURE)
            : fixture
              ? undefined
              : downloadFailures(red.runId, left()),
      ])
      return { jobs, failures }
    }),
  )
  const out = []
  for (const [i, red] of found.entries()) {
    out.push(formatLine(red, fixture ? undefined : firstFailedJob(extras[i].jobs)))
    try {
      out.push(...formatFailures(extras[i].failures))
    } catch {
      // the extra lines are a bonus
    }
  }
  return out
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    for (const line of await main()) console.log(line)
  } catch {
    // a warning must never fail a session start
  }
  process.exit(0)
}
