#!/usr/bin/env node
/**
 * A DEPENDENCY MAY NOT ARRIVE WITH A KNOWN HOLE IN IT.
 *
 * WHY A RATCHET AND NOT `npm audit`. On 2026-10-13 `npm audit` reported 22
 * advisories, most of them in development tools or in libraries that need a
 * major upgrade to fix. A gate that fails on all of them is red on its first
 * day, and a gate that is always red teaches everyone to ignore red. So, the
 * same bargain as the lint and type ratchets: what is already there is written
 * down in `audit-baseline.json`, and what is new fails.
 *
 * WHAT COUNTS AS NEW, AND WHO IS TO BLAME FOR IT. An advisory can appear in two
 * ways, and only one of them is a commit's fault:
 *   - the lockfile ADDED or CHANGED a package version that carries an advisory.
 *     That is the commit's doing, so it FAILS.
 *   - an advisory was newly PUBLISHED against a version nobody touched. No
 *     commit did that, and failing would turn the whole repository red
 *     overnight, staging publishing with it. So it WARNS, in the run summary.
 * "Added or changed" is measured against the lockfile that the baseline was
 * written from: the one committed with `audit-baseline.json` (or the working
 * one, while the baseline itself has uncommitted edits). Until the baseline is
 * updated, a vulnerable version stays red on every push, not only the first.
 *
 * ONE ABSOLUTE RULE. A critical advisory in what ships (`--omit=dev`) fails
 * whether or not it is baselined.
 *
 * "COULD NOT CHECK" IS NEVER A PASS. If `npm audit` cannot run (no network,
 * registry down) it is retried once and then fails.
 *
 *   npm run audit:ratchet                                        compare
 *   node scripts/audit-ratchet.mjs --update                      rewrite the baseline
 *   node scripts/audit-ratchet.mjs --update --accept-new         ...accepting new advisories, visibly
 */

import { execFileSync, spawnSync } from "node:child_process"
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs"
import { pathToFileURL } from "node:url"

export const BASELINE = "audit-baseline.json"
export const FORMAT = "npm-audit-advisories-v1"
const REGENERATE = "node scripts/audit-ratchet.mjs --update"

/** `node_modules/a/node_modules/@s/b` → `@s/b`. */
function nameAt(path) {
  return path.slice(path.lastIndexOf("node_modules/") + "node_modules/".length)
}

/**
 * Every `name@version` the lockfile installs.
 * @param {string} lockText package-lock.json (lockfile v2 or v3)
 * @returns {Set<string>}
 */
export function lockedVersions(lockText) {
  const lock = JSON.parse(lockText)
  if (!lock || typeof lock.packages !== "object") throw new Error("package-lock.json has no `packages` map (lockfile v2 or later is needed)")
  const out = new Set()
  for (const [path, pkg] of Object.entries(lock.packages)) {
    if (path === "" || !pkg.version) continue
    out.add(`${nameAt(path)}@${pkg.version}`)
  }
  return out
}

/**
 * Read `npm audit --json` into `name@version → advisory IDs`, plus the critical ones.
 * Throws on anything that is not a complete audit report, because a report
 * that could not be read is not a report that found nothing.
 *
 * @param {string} auditText
 * @param {string} lockText
 * @returns {{ advisories: Record<string, string[]>, critical: string[] }}
 */
export function readAudit(auditText, lockText) {
  if (!auditText || !auditText.trim()) throw new Error("npm audit printed nothing")
  let report
  try {
    report = JSON.parse(auditText)
  } catch {
    throw new Error(`npm audit did not print JSON: ${auditText.trim().slice(0, 200)}`)
  }
  if (report.error) {
    throw new Error(`npm audit failed: ${report.error.summary ?? report.error.code ?? "unknown error"}`)
  }
  if (report.auditReportVersion !== 2 || typeof report.vulnerabilities !== "object" || !report.metadata) {
    throw new Error("npm audit printed JSON that is not an audit report (auditReportVersion 2)")
  }
  const packages = JSON.parse(lockText).packages ?? {}
  /** @type {Record<string, Set<string>>} */
  const found = {}
  const critical = new Set()
  for (const [name, vuln] of Object.entries(report.vulnerabilities)) {
    // `via` holds advisories against this package (objects) and the names of
    // vulnerable packages it merely depends on (strings). Only the objects are
    // this package's own advisories; the strings are recorded under their own name.
    const own = (vuln.via ?? []).filter((v) => v && typeof v === "object")
    if (own.length === 0) continue
    const ids = own.map((v) => (v.url ? v.url.split("/").pop() : `npm-${v.source}`))
    for (const node of vuln.nodes ?? []) {
      const version = packages[node]?.version
      if (!version) throw new Error(`npm audit names ${node}, which package-lock.json does not install`)
      const key = `${name}@${version}`
      found[key] ??= new Set()
      for (const id of ids) found[key].add(id)
      if (own.some((v) => v.severity === "critical")) critical.add(key)
    }
  }
  const advisories = Object.fromEntries(
    Object.keys(found)
      .sort()
      .map((k) => [k, [...found[k]].sort()]),
  )
  return { advisories, critical: [...critical].sort() }
}

/**
 * The whole decision, with no I/O.
 *
 * @param {object} o
 * @param {Record<string, string[]>} o.current     advisories now, all dependencies
 * @param {string[]} o.shippedCritical             critical name@version in `--omit=dev`
 * @param {Record<string, string[]>} o.baseline    advisories written down
 * @param {Set<string>} o.reference                name@version the baseline's lockfile installed
 * @returns {{ failures: string[], warnings: string[], stale: string[] }}
 */
export function compare({ current, shippedCritical, baseline, reference }) {
  const failures = []
  const warnings = []
  for (const [key, ids] of Object.entries(current)) {
    const known = new Set(baseline[key] ?? [])
    const unknown = ids.filter((id) => !known.has(id))
    if (unknown.length === 0) continue
    if (!reference.has(key)) {
      failures.push(`${key} was added or changed by the lockfile and carries ${unknown.join(", ")}`)
    } else {
      warnings.push(`${key} did not change, but ${unknown.join(", ")} was published against it since the baseline`)
    }
  }
  for (const key of shippedCritical) {
    failures.push(`${key} ships to production with a critical advisory (${(current[key] ?? []).join(", ")})`)
  }
  const stale = []
  for (const [key, ids] of Object.entries(baseline)) {
    const now = new Set(current[key] ?? [])
    const gone = ids.filter((id) => !now.has(id))
    if (gone.length === ids.length) stale.push(`delete the line "${key}" from ${BASELINE}: it no longer has an advisory`)
    else if (gone.length) stale.push(`delete ${gone.join(", ")} from "${key}" in ${BASELINE}: no longer reported`)
  }
  return { failures, warnings, stale }
}

/** `npm audit --json`, retried once. Throws if both attempts could not produce a report. */
function runAudit(args, lockText) {
  let lastError
  for (let attempt = 1; attempt <= 2; attempt++) {
    const run = spawnSync("npm", ["audit", "--json", ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
    try {
      if (run.error) throw new Error(`npm could not be started: ${run.error.message}`)
      if (run.signal) throw new Error(`npm audit was killed by ${run.signal}`)
      return readAudit(run.stdout, lockText)
    } catch (error) {
      lastError = error
      if (attempt === 1) console.error(`npm audit ${args.join(" ")} could not check (${error.message}); retrying once.`)
    }
  }
  throw lastError
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
}

/** The lockfile the baseline describes. */
function referenceLock(currentLock) {
  if (!existsSync(BASELINE) || git(["status", "--porcelain", "--", BASELINE]).trim() !== "") {
    return { text: currentLock, from: "the working tree (the baseline has uncommitted edits)" }
  }
  const commit = git(["log", "-1", "--format=%H", "--", BASELINE]).trim()
  if (!commit) throw new Error(`${BASELINE} has no commit in this clone's history. CI needs \`fetch-depth: 0\`.`)
  return { text: git(["show", `${commit}:package-lock.json`]), from: `commit ${commit.slice(0, 12)}` }
}

function summary(lines) {
  if (process.env.GITHUB_STEP_SUMMARY && lines.length) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Dependency audit\n\n${lines.map((l) => `- ${l}`).join("\n")}\n`)
  }
}

function main() {
  const update = process.argv.includes("--update")
  const acceptNew = process.argv.includes("--accept-new")
  const lockText = readFileSync("package-lock.json", "utf8")

  let all, shipped
  try {
    all = runAudit([], lockText)
    shipped = runAudit(["--omit=dev"], lockText)
  } catch (error) {
    console.error(`Dependency audit could not check, so this is a failure, not a pass: ${error.message}`)
    summary([`**Could not check:** ${error.message}`])
    process.exit(1)
  }

  const stored = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, "utf8")) : null
  if (stored && stored._format !== FORMAT) {
    console.error(`${BASELINE} is in format ${stored._format}; this script reads ${FORMAT}. Regenerate: ${REGENERATE}`)
    process.exit(1)
  }
  const baseline = stored?.advisories ?? {}

  if (update) {
    const added = Object.entries(all.advisories).flatMap(([key, ids]) =>
      ids.filter((id) => !(baseline[key] ?? []).includes(id)).map((id) => `${key} ${id}`),
    )
    if (stored && added.length && !acceptNew) {
      console.error(
        `Refusing to write a baseline that accepts ${added.length} advisory(ies) the current one does not:\n  ` +
          added.join("\n  ") +
          "\n\nUpgrade the package, or say so out loud with --update --accept-new so the decision is visible in the diff.",
      )
      process.exit(1)
    }
    writeFileSync(
      BASELINE,
      JSON.stringify(
        {
          _comment:
            "Advisories already present when this was written. A NEW one fails `npm run audit:ratchet` when the lockfile added or changed the version; one published against an unchanged version only warns. Regenerate: " +
            REGENERATE,
          _format: FORMAT,
          advisories: all.advisories,
        },
        null,
        2,
      ) + "\n",
    )
    console.log(`baseline written: ${Object.keys(all.advisories).length} vulnerable package versions`)
    return
  }

  let reference
  try {
    reference = referenceLock(lockText)
  } catch (error) {
    console.error(`Dependency audit could not find the baseline's lockfile: ${error.message}`)
    process.exit(1)
  }
  const { failures, warnings, stale } = compare({
    current: all.advisories,
    shippedCritical: shipped.critical,
    baseline,
    reference: lockedVersions(reference.text),
  })

  for (const line of stale) console.log(`Fixed upstream: ${line}`)
  for (const line of warnings) console.warn(`Warning: ${line}`)
  summary([...failures.map((l) => `**Fails:** ${l}`), ...warnings.map((l) => `Warning: ${l}`), ...stale])
  if (failures.length) {
    console.error(
      `Dependency audit: ${failures.length} new problem(s), compared with the lockfile from ${reference.from}:\n  ` +
        failures.join("\n  ") +
        `\n\nUpgrade or replace the package. To accept it on purpose: ${REGENERATE} --accept-new`,
    )
    process.exit(1)
  }
  const count = Object.keys(all.advisories).length
  console.log(`Dependency audit: ${count} vulnerable package version(s), none new.`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
