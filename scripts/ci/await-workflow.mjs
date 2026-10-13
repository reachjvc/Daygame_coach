#!/usr/bin/env node
/**
 * WAIT FOR ANOTHER WORKFLOW'S RUN ON THIS COMMIT, AND PASS ONLY IF IT PASSED.
 *
 * The staging image job in ci.yml must not publish a commit the browser tests
 * rejected, but those tests live in e2e.yml, a separate workflow owned by
 * another plan. GitHub's cross-workflow trigger (`workflow_run`) fires only
 * from the default branch's copy of a workflow, which on this repository means
 * never (Plans/caddy-deploy-and-cicd.md, C1 and Q2). So the job asks the API
 * instead: it polls until e2e.yml's run for the same commit has finished.
 *
 *   node scripts/ci/await-workflow.mjs
 *
 * Reads GITHUB_REPOSITORY, GITHUB_SHA, GITHUB_TOKEN (needs `actions: read`),
 * and optionally WORKFLOW_PATH (default .github/workflows/e2e.yml),
 * TIMEOUT_MINUTES (45) and POLL_SECONDS (30).
 *
 * The workflow is matched by its file path, not its name, so renaming it does
 * not break this. Exit 0 only for a run that finished with `success`; a
 * failure, a cancellation, no run at all, or the timeout exit 1.
 */

import { pathToFileURL } from "node:url"

/**
 * @param {Array<{path: string, head_sha: string, status: string, conclusion: string|null, created_at: string, html_url: string, event: string}>} runs
 * @param {{ sha: string, path: string }} want
 * @returns {{ state: "none" | "wait" | "pass" | "fail", detail: string }}
 */
export function decide(runs, { sha, path }) {
  const mine = runs
    .filter((r) => r.path === path && r.head_sha === sha)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
  if (mine.length === 0) return { state: "none", detail: `no run of ${path} for ${sha} yet` }
  const run = mine[0]
  if (run.status !== "completed") return { state: "wait", detail: `${path} is ${run.status}: ${run.html_url}` }
  if (run.conclusion === "success") return { state: "pass", detail: `${path} passed: ${run.html_url}` }
  return { state: "fail", detail: `${path} finished with ${run.conclusion}: ${run.html_url}` }
}

async function fetchRuns({ repository, sha, token }) {
  const url = `https://api.github.com/repos/${repository}/actions/runs?head_sha=${sha}&per_page=100`
  const res = await fetch(url, {
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
    },
  })
  if (!res.ok) throw new Error(`GitHub API answered ${res.status} for ${url}`)
  const body = await res.json()
  if (!Array.isArray(body.workflow_runs)) throw new Error("GitHub API answer has no workflow_runs")
  return body.workflow_runs
}

/**
 * @param {object} o
 * @param {() => Promise<Array<object>>} o.getRuns
 * @param {{ sha: string, path: string }} o.want
 * @param {number} o.timeoutMs
 * @param {number} o.pollMs
 * @param {(ms: number) => Promise<void>} o.sleep
 * @param {() => number} o.now
 * @param {(line: string) => void} o.log
 * @returns {Promise<boolean>}
 */
export async function awaitWorkflow({ getRuns, want, timeoutMs, pollMs, sleep, now, log }) {
  const deadline = now() + timeoutMs
  let apiFailures = 0
  let last = ""
  for (;;) {
    let verdict
    try {
      verdict = decide(await getRuns(), want)
      apiFailures = 0
    } catch (error) {
      apiFailures += 1
      log(`could not ask GitHub (${error.message}); attempt ${apiFailures} of 3`)
      if (apiFailures >= 3) return false
      verdict = { state: "wait", detail: "retrying" }
    }
    if (verdict.detail !== last) log(verdict.detail)
    last = verdict.detail
    if (verdict.state === "pass") return true
    if (verdict.state === "fail") return false
    if (now() + pollMs > deadline) {
      log(`gave up after ${Math.round(timeoutMs / 60000)} minutes: ${verdict.detail}`)
      return false
    }
    await sleep(pollMs)
  }
}

async function main() {
  const { GITHUB_REPOSITORY: repository, GITHUB_SHA: sha, GITHUB_TOKEN: token } = process.env
  if (!repository || !sha || !token) {
    console.error("await-workflow: GITHUB_REPOSITORY, GITHUB_SHA and GITHUB_TOKEN must be set.")
    process.exit(1)
  }
  const path = process.env.WORKFLOW_PATH || ".github/workflows/e2e.yml"
  const ok = await awaitWorkflow({
    getRuns: () => fetchRuns({ repository, sha, token }),
    want: { sha, path },
    timeoutMs: Number(process.env.TIMEOUT_MINUTES || 45) * 60_000,
    pollMs: Number(process.env.POLL_SECONDS || 30) * 1000,
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    now: () => Date.now(),
    log: (line) => console.log(`await-workflow: ${line}`),
  })
  process.exit(ok ? 0 : 1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
