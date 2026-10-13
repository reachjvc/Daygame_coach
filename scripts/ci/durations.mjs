#!/usr/bin/env node
/**
 * THE DURATION RATCHET: CI's test suites may not quietly get slower.
 *
 *   node scripts/ci/durations.mjs [--branch <name>]
 *
 * Until 2026-10-13 a full browser pass took 3h45m and the unit step 216 s, and
 * nobody had decided either number: each was the sum of a hundred small
 * additions nobody measured. Plans/tests-worth-their-keep.md cut them to
 * minutes; this keeps them there.
 *
 * It reads docs/testing/durations.json — a baseline in seconds for each suite,
 * measured from CI — and the newest SUCCESSFUL run of each suite on the branch
 * (default: GITHUB_REF_NAME, else main) from the GitHub Actions API. It fails
 * when a suite took longer than its baseline plus the file's tolerance, and
 * says so when one ran well under, so the baseline can be lowered. Baselines
 * may only fall. The tolerance is there because a shared CI runner varies by
 * 10–20% between identical runs; a ratchet that failed on noise would be
 * switched off within a week.
 *
 * A suite with no successful run in the last 30 is a failure too, not a
 * pass: a check that cannot find what it checks has checked nothing.
 *
 * Needs `gh`, authenticated (GH_TOKEN in CI). Runs nightly in
 * .github/workflows/nightly.yml.
 */
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const FILE = path.join(ROOT, "docs/testing/durations.json")
const RUNS_TO_SEARCH = 30

function gh(args) {
  return execFileSync("gh", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }).trim()
}
const api = (route) => JSON.parse(gh(["api", route]))
const seconds = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / 1000)

const argAt = process.argv.indexOf("--branch")
const branch = argAt > 0 ? process.argv[argAt + 1] : process.env.GITHUB_REF_NAME || "main"
const repo = process.env.GITHUB_REPOSITORY || gh(["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"])
const { tolerance, suites } = JSON.parse(fs.readFileSync(FILE, "utf8"))

/** Newest first: each completed run of a workflow on the branch, with its jobs fetched once. */
const runsCache = new Map()
function runsOf(workflow) {
  if (!runsCache.has(workflow)) {
    const runs = api(
      `repos/${repo}/actions/workflows/${workflow}/runs?branch=${encodeURIComponent(branch)}&status=completed&per_page=${RUNS_TO_SEARCH}`,
    ).workflow_runs
    runsCache.set(
      workflow,
      runs.map((run) => ({ run, jobs: () => api(`repos/${repo}/actions/runs/${run.id}/jobs?per_page=100`).jobs })),
    )
  }
  return runsCache.get(workflow)
}

/** The suite's duration in its newest successful run, and where it came from. */
function measure(suite) {
  for (const entry of runsOf(suite.workflow)) {
    entry.loaded ??= entry.jobs()
    const job = entry.loaded.find((j) => j.name === suite.job && j.conclusion === "success")
    if (!job) continue
    if (!suite.step) return { took: seconds(job.started_at, job.completed_at), url: job.html_url }
    const step = job.steps.find((s) => s.name === suite.step && s.conclusion === "success")
    if (step) return { took: seconds(step.started_at, step.completed_at), url: job.html_url }
  }
  return null
}

const failures = []
const lower = []
for (const suite of suites) {
  const label = `${suite.workflow} › ${suite.job}${suite.step ? ` › ${suite.step}` : ""}`
  const found = measure(suite)
  if (!found) {
    failures.push(`${label}: no successful run in the last ${RUNS_TO_SEARCH} on ${branch} — renamed, or never green?`)
    continue
  }
  const ceiling = Math.round(suite.seconds * (1 + tolerance))
  const line = `${label}: ${found.took}s (baseline ${suite.seconds}s, fails above ${ceiling}s)`
  console.log(line)
  if (found.took > ceiling) failures.push(`${line}\n    ${found.url}`)
  else if (found.took < suite.seconds * (1 - tolerance)) lower.push(`${label}: ran in ${found.took}s; lower its baseline to that`)
}

if (lower.length) console.log(`\nFaster than its baseline by more than the tolerance:\n  ${lower.join("\n  ")}`)
if (failures.length) {
  console.error(
    `\nTHE DURATION RATCHET FAILED (${FILE.replace(ROOT + "/", "")}):\n  ${failures.join("\n  ")}\n\n` +
      "A suite that got slower: find what did it and take it back out. Raising a baseline to pass is\n" +
      "not a fix. A suite with no green run: make it green, or rename it here in the change that renamed it.",
  )
  process.exit(1)
}
