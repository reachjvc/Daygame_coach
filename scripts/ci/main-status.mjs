#!/usr/bin/env node
/**
 * SESSION-START WARNING: IS main RED?
 *
 *   node scripts/ci/main-status.mjs
 *
 * Prints one line per red workflow (CI, E2E Tests, Nightly checks) when the newest finished
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
 * `gh` entirely.
 */

import { spawn } from "node:child_process"
import { readFileSync } from "node:fs"
import { pathToFileURL } from "node:url"

// CI and E2E Tests judge push runs; the nightly runs on a schedule.
const WORKFLOWS = [
  { name: "CI", event: "push" },
  { name: "E2E Tests", event: "push" },
  { name: "Nightly checks", event: "schedule" },
]
const WINDOW = 30
// startup_failure: the run never started (a broken workflow file). action_required
// is a run waiting for approval, which is neither red nor green.
const RED = new Set(["failure", "timed_out", "startup_failure"])
const BUDGET_MS = 4500

/**
 * @typedef {{ databaseId: number, workflowName: string, event: string, status: string, conclusion: string, createdAt: string }} Run
 * @param {Run[]} runs newest first, as `gh run list` returns them
 * @returns {Array<{ workflow: string, runId: number, since: string, atLeast: boolean }>} one entry per red workflow
 */
export function findRed(runs) {
  if (!Array.isArray(runs)) return []
  const red = []
  for (const { name: workflow, event } of WORKFLOWS) {
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
      atLeast: !sawSuccess && finished.length >= WINDOW,
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
      WORKFLOWS.map(({ name, event }) =>
        gh(
          ["run", "list", "--branch", "main", "--workflow", name, "--event", event, "--status", "completed", "--limit", String(WINDOW), "--json", "databaseId,workflowName,event,status,conclusion,createdAt"],
          Math.min(3000, left()),
        ),
      ),
    )
    runs = lists.flatMap((l) => (Array.isArray(l) ? l : []))
  }
  const found = findRed(runs)
  const jobs = await Promise.all(found.map((red) => (fixture ? undefined : gh(["run", "view", String(red.runId), "--json", "jobs"], left()))))
  return found.map((red, i) => formatLine(red, fixture ? undefined : firstFailedJob(jobs[i])))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    for (const line of await main()) console.log(line)
  } catch {
    // a warning must never fail a session start
  }
  process.exit(0)
}
