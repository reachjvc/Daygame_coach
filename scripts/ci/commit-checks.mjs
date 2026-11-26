#!/usr/bin/env node
/**
 * DID THIS COMMIT PASS THE CHECKS MAIN REQUIRES?
 *
 *   node scripts/ci/commit-checks.mjs <sha>
 *
 * Prints one line per required check and exits 0 only when every one of them
 * finished with success on that exact commit. Exit 1: a check failed or is
 * missing. Exit 2: a check is still running, or GitHub could not be asked.
 *
 * The required checks are the two gate jobs, "CI passed" (ci.yml) and
 * "E2E passed" (e2e.yml). GitHub's branch protection on main requires the
 * same two names, so a push to main is refused unless this says yes. Used by
 * scripts/ship.mjs (waits for it) and .husky/pre-push (refuses early, with a
 * clearer message than GitHub's).
 */

import { spawnSync } from "node:child_process"
import { pathToFileURL } from "node:url"

export const REQUIRED_CHECKS = ["CI passed", "E2E passed"]

/**
 * @param {Array<{ name: string, status: string, conclusion: string | null, started_at?: string, html_url?: string }>} runs
 * @returns {{ state: "success" | "failure" | "pending", lines: string[] }}
 */
export function judge(runs) {
  const lines = []
  let state = "success"
  for (const name of REQUIRED_CHECKS) {
    // A rerun adds a new check run with the same name: the newest one counts.
    // One not started yet (no `started_at`) is the newest of all: sorted last, it
    // let an older pass on the same commit stand in for a run still queued.
    const mine = runs
      .filter((r) => r && r.name === name)
      .sort((a, b) => String(b.started_at ?? "\uffff").localeCompare(String(a.started_at ?? "\uffff")))
    const run = mine[0]
    if (!run) {
      lines.push(`${name}: not started`)
      if (state === "success") state = "pending"
    } else if (run.status !== "completed") {
      lines.push(`${name}: ${run.status}`)
      if (state === "success") state = "pending"
    } else if (run.conclusion === "success") {
      lines.push(`${name}: passed`)
    } else {
      lines.push(`${name}: ${run.conclusion} ${run.html_url ?? ""}`.trim())
      state = "failure"
    }
  }
  return { state, lines }
}

/** @param {string} sha */
export function fetchRuns(sha) {
  const r = spawnSync(
    "gh",
    ["api", `repos/{owner}/{repo}/commits/${sha}/check-runs?per_page=100`, "--paginate", "--jq", ".check_runs[]"],
    { encoding: "utf8", timeout: 30_000 },
  )
  if (r.status !== 0) return null
  return r.stdout
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l))
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const sha = process.argv[2]
  if (!sha) {
    console.error("usage: node scripts/ci/commit-checks.mjs <sha>")
    process.exit(2)
  }
  const runs = fetchRuns(sha)
  if (!runs) {
    console.error("commit-checks: GitHub could not be asked (gh api failed)")
    process.exit(2)
  }
  const { state, lines } = judge(runs)
  for (const l of lines) console.log(l)
  process.exit(state === "success" ? 0 : state === "failure" ? 1 : 2)
}
