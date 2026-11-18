#!/usr/bin/env node
/**
 * SESSION-START WARNING: IS main RED?
 *
 *   node scripts/ci/main-status.mjs
 *
 * Prints one line per red workflow (CI, E2E Tests) when the newest finished
 * push run on main failed, for example
 *   main is red since 2026-11-18: CI checks (run 44383715199)
 * and nothing when both are green. Always exits 0, within 5 s, also offline or
 * without `gh` (then it prints nothing). It only warns; it never blocks.
 *
 * API cost: one `gh run list`, plus at most one `gh run view` per red workflow.
 * Tests may set MAIN_STATUS_FIXTURE=<file with the run list JSON>; that skips
 * `gh` entirely.
 */

import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { pathToFileURL } from "node:url"

const WORKFLOWS = ["CI", "E2E Tests"]
const BUDGET_MS = 4500

/**
 * @typedef {{ databaseId: number, workflowName: string, event: string, status: string, conclusion: string, createdAt: string }} Run
 * @param {Run[]} runs newest first, as `gh run list` returns them
 * @returns {Array<{ workflow: string, runId: number, since: string }>} one entry per red workflow
 */
export function findRed(runs) {
  if (!Array.isArray(runs)) return []
  const red = []
  for (const workflow of WORKFLOWS) {
    // Only finished push runs count; a cancelled or skipped run is neither red nor green.
    const finished = runs.filter(
      (r) =>
        r &&
        r.workflowName === workflow &&
        r.event === "push" &&
        r.status === "completed" &&
        r.conclusion !== "cancelled" &&
        r.conclusion !== "skipped",
    )
    if (finished.length === 0 || finished[0].conclusion === "success") continue
    if (finished[0].conclusion !== "failure" && finished[0].conclusion !== "timed_out") continue
    let oldest = finished[0]
    for (const r of finished) {
      if (r.conclusion === "success") break
      oldest = r
    }
    red.push({ workflow, runId: finished[0].databaseId, since: String(oldest.createdAt).slice(0, 10) })
  }
  return red
}

/** @param {{ workflow: string, runId: number, since: string }} red @param {string} [job] */
export function formatLine(red, job) {
  return `main is red since ${red.since}: ${red.workflow}${job ? ` ${job}` : ""} (run ${red.runId})`
}

/** @param {unknown} jobsJson parsed `gh run view --json jobs` @returns {string|undefined} */
export function firstFailedJob(jobsJson) {
  const jobs = jobsJson && typeof jobsJson === "object" && Array.isArray(/** @type {any} */ (jobsJson).jobs) ? /** @type {any} */ (jobsJson).jobs : []
  const failed = jobs.find((j) => j && j.conclusion === "failure")
  return failed && typeof failed.name === "string" ? failed.name : undefined
}

function gh(args, timeout) {
  if (timeout < 300) return undefined
  const res = spawnSync("gh", args, { encoding: "utf8", timeout, stdio: ["ignore", "pipe", "ignore"] })
  if (res.error || res.status !== 0) return undefined
  try {
    return JSON.parse(res.stdout)
  } catch {
    return undefined
  }
}

export function main(env = process.env) {
  const started = Date.now()
  const left = () => BUDGET_MS - (Date.now() - started)
  const fixture = env.MAIN_STATUS_FIXTURE
  const runs = fixture
    ? JSON.parse(readFileSync(fixture, "utf8"))
    : gh(
        ["run", "list", "--branch", "main", "--limit", "20", "--json", "databaseId,workflowName,event,status,conclusion,createdAt"],
        Math.min(3500, left()),
      )
  const lines = []
  for (const red of findRed(runs)) {
    const job = fixture ? undefined : firstFailedJob(gh(["run", "view", String(red.runId), "--json", "jobs"], left()))
    lines.push(formatLine(red, job))
  }
  return lines
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    for (const line of main()) console.log(line)
  } catch {
    // a warning must never fail a session start
  }
  process.exit(0)
}
