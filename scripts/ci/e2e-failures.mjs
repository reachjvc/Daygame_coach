#!/usr/bin/env node
/**
 * WHICH E2E TESTS ARE RED ON main, AND SINCE WHICH COMMIT.
 *
 *   node scripts/ci/e2e-failures.mjs <merged.json> [previous failures.json] [--out failures.json]
 *
 * <merged.json> is `npx playwright merge-reports --reporter json` output. The result is
 *   { sha, subject, runId,
 *     failed: [{ id: "<file>:<line> <title>", project, firstSha, firstSubject, firstRunId,
 *                afterSha?, afterRunId?, commits? }],
 *     flaky:  [{ id, project, last5: [bool] }],
 *     previous: { sha, runId } | null }
 *
 * failed: a test red in this run and in the previous file keeps the previous first* (and after*)
 * fields; a test red only now gets this run's commit; a test that passed drops out. Without a
 * previous file first* is null: "red since before tracking began".
 * A range, not one commit: most main runs are cancelled by the next push, so the previous file
 * can be several commits back. A new failure then broke somewhere after the previous file's
 * commit, up to and including this one: it also gets afterSha / afterRunId (the previous file's
 * commit and run) and commits (how many commits that range holds, null when unknown). Only when
 * the range is exactly one commit are the after* fields left out.
 *
 *   node scripts/ci/e2e-failures.mjs --previous-runs <runs.json> <this run id>
 *
 * prints, one per line, the runs whose e2e-failures artifact to try as the previous file:
 * <runs.json> is the `actions/workflows/e2e.yml/runs` API answer; see previousRunCandidates.
 * flaky: last5 holds one bool per run, oldest first, true when Playwright called the test
 * flaky (failed, then passed on retry). The window is carried forward from the previous file,
 * an entry with no true left drops out.
 *
 * Run context comes from E2E_SHA / E2E_SUBJECT / E2E_RUN_ID (else GITHUB_SHA, git, GITHUB_RUN_ID),
 * and E2E_RANGE_COMMITS (commits from the previous file's commit to this one, if known).
 */
import { execFileSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"
import { pathToFileURL } from "node:url"

export const FLAKY_WINDOW = 5
/** How many finished earlier runs to try for the previous file. */
export const LOOK_BACK = 5
// Conclusions of runs whose report job ran (it is `if: !cancelled()`), so the artifact may exist.
// cancelled (superseded by a newer push), skipped and startup_failure never wrote one.
const FINISHED = new Set(["success", "failure", "timed_out"])

/**
 * Which earlier runs may hold the previous failures list, newest first. The API list holds
 * every completed run, and on a busy main most of them are cancelled with no artifact; those
 * are skipped, so they cannot use up the look-back. Runs newer than this one are skipped too:
 * their list describes later commits.
 * @param {any} runsJson the `actions/workflows/<file>/runs` answer (or its workflow_runs array)
 * @param {number|string} currentRunId
 * @param {number} [max]
 * @returns {number[]}
 */
export function previousRunCandidates(runsJson, currentRunId, max = LOOK_BACK) {
  const runs = Array.isArray(runsJson) ? runsJson : Array.isArray(runsJson?.workflow_runs) ? runsJson.workflow_runs : []
  const current = Number(currentRunId)
  return runs
    .filter((r) => r && Number.isFinite(Number(r.id)) && Number(r.id) < current && r.status === "completed" && FINISHED.has(r.conclusion))
    .map((r) => Number(r.id))
    .sort((a, b) => b - a)
    .slice(0, max)
}

// The line is for display only: a test that moved lines is still the same test.
const stripLine = (id) => String(id).replace(/^(\S+?):\d+ /, "$1 ")
const key = (t) => `${t.project}\u0000${stripLine(t.id)}`

/** @param {any} report Playwright JSON report @returns {{ failed: Array<{id:string,project:string}>, flaky: Array<{id:string,project:string}> }} */
export function collectTests(report) {
  const failed = new Map()
  const flaky = new Map()
  const walk = (suite) => {
    for (const spec of suite.specs ?? []) {
      for (const t of spec.tests ?? []) {
        const entry = { id: `${spec.file}:${spec.line} ${spec.title}`, project: t.projectName ?? "" }
        if (t.status === "unexpected") failed.set(key(entry), entry)
        else if (t.status === "flaky") flaky.set(key(entry), entry)
      }
    }
    for (const s of suite.suites ?? []) walk(s)
  }
  for (const s of report?.suites ?? []) walk(s)
  return { failed: [...failed.values()], flaky: [...flaky.values()] }
}

/** Every test the report mentions, whatever its status (passed, skipped, failed...): keys only. */
export function collectSeen(report) {
  const seen = new Set()
  const walk = (suite) => {
    for (const spec of suite.specs ?? []) {
      for (const t of spec.tests ?? []) seen.add(key({ id: `${spec.file}:${spec.line} ${spec.title}`, project: t.projectName ?? "" }))
    }
    for (const s of suite.suites ?? []) walk(s)
  }
  for (const s of report?.suites ?? []) walk(s)
  return seen
}

const AFTER_FIELDS = ["afterSha", "afterRunId", "commits"]

/**
 * @param {any} report @param {any} [previous] the previous failures.json, if any
 * @param {{ sha: string, subject: string, runId: string|number, rangeCommits?: number|null }} ctx
 *   rangeCommits: commits from previous.sha (exclusive) to ctx.sha (inclusive); null/undefined when unknown
 */
export function buildFailures(report, previous, ctx) {
  const now = collectTests(report)
  const prevFailed = new Map((Array.isArray(previous?.failed) ? previous.failed : []).map((f) => [key(f), f]))
  const range = Number.isInteger(ctx.rangeCommits) ? ctx.rangeCommits : null
  // The previous file sits more than one commit back (or we cannot tell): name the range.
  const after =
    previous && previous.sha && previous.sha !== ctx.sha && range !== 1
      ? { afterSha: previous.sha, afterRunId: previous.runId ?? null, commits: range }
      : {}
  const failed = now.failed.map((t) => {
    const was = prevFailed.get(key(t))
    if (was) {
      const carried = { ...t, project: t.project, firstSha: was.firstSha ?? null, firstSubject: was.firstSubject ?? null, firstRunId: was.firstRunId ?? null }
      for (const k of AFTER_FIELDS) if (was[k] !== undefined) carried[k] = was[k]
      return carried
    }
    // No previous file at all: unknown start. A previous file without the test: new red.
    return previous
      ? { ...t, firstSha: ctx.sha, firstSubject: ctx.subject, firstRunId: ctx.runId, ...after }
      : { ...t, firstSha: null, firstSubject: null, firstRunId: null }
  })
  // A previous failure whose test is absent from this report entirely (a missing shard, not run)
  // neither passed nor failed: carry it forward unchanged, or it would come back later as "new red".
  const seen = collectSeen(report)
  const nowKeys = new Set(now.failed.map(key))
  for (const [k, f] of prevFailed) if (!nowKeys.has(k) && !seen.has(k)) failed.push(f)
  const history = new Map()
  for (const f of Array.isArray(previous?.flaky) ? previous.flaky : []) history.set(key(f), { id: f.id, project: f.project, last5: Array.isArray(f.last5) ? f.last5 : [] })
  for (const t of now.flaky) history.set(key(t), { ...t, last5: history.get(key(t))?.last5 ?? [] })
  const flakyNow = new Set(now.flaky.map(key))
  const flaky = []
  for (const [k, h] of history) {
    const last5 = [...h.last5, flakyNow.has(k)].slice(-FLAKY_WINDOW)
    if (last5.some(Boolean)) flaky.push({ id: h.id, project: h.project, last5 })
  }
  const prevRef = previous ? { sha: previous.sha ?? null, runId: previous.runId ?? null } : null
  return { sha: ctx.sha, subject: ctx.subject, runId: ctx.runId, previous: prevRef, failed, flaky }
}

/** "first red" text for one failure: one commit, a range, or unknown. */
export function firstRedText(f) {
  if (!f.firstSha) return "before tracking began"
  const at = `${String(f.firstSha).slice(0, 8)} ${f.firstSubject ?? ""}`.trim()
  if (!f.afterSha) return at
  const n = Number.isInteger(f.commits) ? ` (${f.commits} commits)` : ""
  return `between ${String(f.afterSha).slice(0, 8)} and ${at}${n}`
}

/** A short markdown table for $GITHUB_STEP_SUMMARY. */
export function summaryTable(result) {
  const lines = [`### E2E failures tracked on main`, ""]
  if (result.failed.length === 0) lines.push("No failed tests.")
  else {
    lines.push("| test | project | first red |", "| --- | --- | --- |")
    for (const f of result.failed) {
      const first = firstRedText(f)
      lines.push(`| ${f.id.replace(/\|/g, "\\|")} | ${f.project} | ${first.replace(/\|/g, "\\|")} |`)
    }
  }
  const often = result.flaky.filter((f) => f.last5.filter(Boolean).length >= 2)
  if (often.length) lines.push("", `Flaky (2+ of last ${FLAKY_WINDOW} runs): ` + often.map((f) => f.id).join(", "))
  return lines.join("\n") + "\n"
}

function main(argv, env) {
  const args = argv.slice()
  const pr = args.indexOf("--previous-runs")
  if (pr >= 0) {
    const [, runsPath, currentId] = args.slice(pr)
    if (!runsPath || !currentId) throw new Error("usage: e2e-failures.mjs --previous-runs <runs.json> <this run id>")
    return { candidates: previousRunCandidates(JSON.parse(readFileSync(runsPath, "utf8")), currentId) }
  }
  let out = "failures.json"
  const o = args.indexOf("--out")
  if (o >= 0) out = args.splice(o, 2)[1]
  const [mergedPath, prevPath] = args
  if (!mergedPath) throw new Error("usage: e2e-failures.mjs <merged.json> [previous failures.json] [--out file]")
  const report = JSON.parse(readFileSync(mergedPath, "utf8"))
  let previous
  if (prevPath) {
    try {
      previous = JSON.parse(readFileSync(prevPath, "utf8"))
    } catch {
      previous = undefined
    }
  }
  const sha = env.E2E_SHA || env.GITHUB_SHA || ""
  let subject = env.E2E_SUBJECT
  if (subject === undefined) {
    try {
      subject = execFileSync("git", ["log", "-1", "--format=%s", sha || "HEAD"], { encoding: "utf8" }).trim()
    } catch {
      subject = ""
    }
  }
  const range = /^\d+$/.test(String(env.E2E_RANGE_COMMITS ?? "").trim()) ? Number(env.E2E_RANGE_COMMITS) : null
  const result = buildFailures(report, previous, { sha, subject, runId: env.E2E_RUN_ID || env.GITHUB_RUN_ID || "", rangeCommits: range })
  writeFileSync(out, JSON.stringify(result, null, 2) + "\n")
  if (env.GITHUB_STEP_SUMMARY) writeFileSync(env.GITHUB_STEP_SUMMARY, summaryTable(result), { flag: "a" })
  return result
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = main(process.argv.slice(2), process.env)
  if (r.candidates) for (const id of r.candidates) console.log(id)
  else console.log(`${r.failed.length} failed, ${r.flaky.length} flaky tracked` + (r.previous ? `, previous list from run ${r.previous.runId} (${String(r.previous.sha).slice(0, 8)})` : ", no previous list"))
}
