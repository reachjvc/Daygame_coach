#!/usr/bin/env node
/**
 * WHICH E2E TESTS ARE RED ON main, AND SINCE WHICH COMMIT.
 *
 *   node scripts/ci/e2e-failures.mjs <merged.json> [previous failures.json] [--out failures.json]
 *
 * <merged.json> is `npx playwright merge-reports --reporter json` output. The result is
 *   { sha, subject, runId,
 *     failed: [{ id: "<file>:<line> <title>", project, firstSha, firstSubject, firstRunId }],
 *     flaky:  [{ id, project, last5: [bool] }] }
 *
 * failed: a test red in this run and in the previous file keeps the previous first* fields; a
 * test red only now gets this run's commit; a test that passed drops out. Without a previous
 * file first* is null: "red since before tracking began".
 * flaky: last5 holds one bool per run, oldest first, true when Playwright called the test
 * flaky (failed, then passed on retry). The window is carried forward from the previous file,
 * an entry with no true left drops out.
 *
 * Run context comes from E2E_SHA / E2E_SUBJECT / E2E_RUN_ID (else GITHUB_SHA, git, GITHUB_RUN_ID).
 */
import { execFileSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"
import { pathToFileURL } from "node:url"

export const FLAKY_WINDOW = 5

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

/**
 * @param {any} report @param {any} [previous] the previous failures.json, if any
 * @param {{ sha: string, subject: string, runId: string|number }} ctx
 */
export function buildFailures(report, previous, ctx) {
  const now = collectTests(report)
  const prevFailed = new Map((Array.isArray(previous?.failed) ? previous.failed : []).map((f) => [key(f), f]))
  const failed = now.failed.map((t) => {
    const was = prevFailed.get(key(t))
    return was
      ? { ...t, project: t.project, firstSha: was.firstSha ?? null, firstSubject: was.firstSubject ?? null, firstRunId: was.firstRunId ?? null }
      : // No previous file at all: unknown start. A previous file without the test: new red.
        previous
        ? { ...t, firstSha: ctx.sha, firstSubject: ctx.subject, firstRunId: ctx.runId }
        : { ...t, firstSha: null, firstSubject: null, firstRunId: null }
  })
  const history = new Map()
  for (const f of Array.isArray(previous?.flaky) ? previous.flaky : []) history.set(key(f), { id: f.id, project: f.project, last5: Array.isArray(f.last5) ? f.last5 : [] })
  for (const t of now.flaky) history.set(key(t), { ...t, last5: history.get(key(t))?.last5 ?? [] })
  const flakyNow = new Set(now.flaky.map(key))
  const flaky = []
  for (const [k, h] of history) {
    const last5 = [...h.last5, flakyNow.has(k)].slice(-FLAKY_WINDOW)
    if (last5.some(Boolean)) flaky.push({ id: h.id, project: h.project, last5 })
  }
  return { sha: ctx.sha, subject: ctx.subject, runId: ctx.runId, failed, flaky }
}

/** A short markdown table for $GITHUB_STEP_SUMMARY. */
export function summaryTable(result) {
  const lines = [`### E2E failures tracked on main`, ""]
  if (result.failed.length === 0) lines.push("No failed tests.")
  else {
    lines.push("| test | project | first red |", "| --- | --- | --- |")
    for (const f of result.failed) {
      const first = f.firstSha ? `${f.firstSha.slice(0, 8)} ${f.firstSubject ?? ""}`.trim() : "before tracking began"
      lines.push(`| ${f.id.replace(/\|/g, "\\|")} | ${f.project} | ${first.replace(/\|/g, "\\|")} |`)
    }
  }
  const often = result.flaky.filter((f) => f.last5.filter(Boolean).length >= 2)
  if (often.length) lines.push("", `Flaky (2+ of last ${FLAKY_WINDOW} runs): ` + often.map((f) => f.id).join(", "))
  return lines.join("\n") + "\n"
}

function main(argv, env) {
  const args = argv.slice()
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
  const result = buildFailures(report, previous, { sha, subject, runId: env.E2E_RUN_ID || env.GITHUB_RUN_ID || "" })
  writeFileSync(out, JSON.stringify(result, null, 2) + "\n")
  if (env.GITHUB_STEP_SUMMARY) writeFileSync(env.GITHUB_STEP_SUMMARY, summaryTable(result), { flag: "a" })
  return result
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = main(process.argv.slice(2), process.env)
  console.log(`${r.failed.length} failed, ${r.flaky.length} flaky tracked`)
}
