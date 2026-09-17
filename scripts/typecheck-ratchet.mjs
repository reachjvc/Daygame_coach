#!/usr/bin/env node
/**
 * TYPE ERRORS MAY ONLY GO DOWN.
 *
 * WHY THIS EXISTS: next.config.mjs told the build to ignore type errors, with
 * a comment saying "type checking runs in CI (npm test)". It did not — the unit
 * runner has no type-check step, CI ran no `tsc`, and nothing else did either.
 * On 2026-09-07 there were 119 errors, 14 of them in one product file whose
 * imports did not exist (src/goals/oneThingServer.ts, half of a rebuild that
 * was never finished). The page it served threw on every load. Nobody saw it
 * because nothing ran the checker.
 *
 * Making `tsc` blocking outright would have meant fixing all 119 first. This is
 * the honest middle: every error that exists today is written down in
 * tsc-baseline.json and the check fails on anything that is not already in it.
 *
 * IT RECORDS ERRORS, NOT COUNTS. The first version of this file counted errors
 * per file, and a review found the hole in ten minutes: fix two errors in a file
 * and introduce two others, and the count is unchanged, so a brand-new type
 * error passes. Line and column are dropped (they move whenever anything above
 * them is edited); the file, the TS code and the message are kept, because those
 * three are what make it the same error.
 *
 * AND IT CANNOT BE RAISED BY ACCIDENT. `--update` refuses to write a baseline
 * that contains anything the current one does not — it will only ever shrink.
 * Genuinely accepting a new error takes `--update --accept-new`, which prints
 * every error it is about to bless so that it shows up in review as a decision
 * somebody made rather than a number that drifted.
 *
 * THE MACHINERY IS SHARED. Everything here that is not about tsc specifically —
 * the comparison, the refusal to raise a baseline, the checker-did-not-run
 * guards — lives in scripts/lib/ratchet.mjs, because scripts/lint-ratchet.mjs
 * needs exactly the same thing and two copies of it would drift apart silently.
 *
 * WHERE IT RUNS, AND WHAT THAT COVERS: `.github/workflows/ci.yml` on every push
 * and pull request — that is the gate, and it checks the pushed commit.
 * `.husky/pre-push` runs it too, as a fast local warning, but it checks the
 * WORKING TREE, not the commits being pushed: uncommitted work counts, and
 * committed work you have since changed does not. Stashing to fix that is
 * forbidden here (a second agent shares this checkout), so the hook says what it
 * measured and CI remains the thing that decides.
 */

import { spawnSync } from "node:child_process"
import { applyRatchet, assertCheckerRan, tally } from "./lib/ratchet.mjs"

const BASELINE = "tsc-baseline.json"
const update = process.argv.includes("--update")
const acceptNew = process.argv.includes("--accept-new")

const run = spawnSync("npx", ["tsc", "--noEmit", "--pretty", "false"], {
  encoding: "utf8",
  shell: process.platform === "win32",
})

// `\r` on Windows, where tsc writes CRLF: without stripping it every path ends
// in a carriage return, matches nothing in the baseline, and all 105 errors
// read as new.
const output = (run.stdout + run.stderr).replace(/\r/g, "")
const lines = output.split("\n").filter((l) => /error TS\d+/.test(l))

assertCheckerRan(run, {
  tool: "tsc",
  // 0 clean, 1 or 2 with errors. Anything else is not a result tsc uses.
  okStatuses: [0, 1, 2],
  found: lines.length,
  output,
})

/**
 * One error, as the thing that makes it the same error next time.
 *
 * `app/x.ts(12,5): error TS2339: Property 'a' does not exist on type 'B'.`
 * becomes `app/x.ts` → `TS2339: Property 'a' does not exist on type 'B'.`
 * Line and column are dropped on purpose: they move when anything above them is
 * edited, and a baseline that churns on every unrelated edit gets regenerated
 * blindly, which is the same as not having one.
 */
function parse(line) {
  const match = line.match(/^(.*?)\((\d+),(\d+)\): (error TS\d+: .*)$/)
  if (!match) return { file: "<unparsed>", signature: line.trim() }
  return { file: match[1].trim(), signature: normalise(match[4].replace(/^error /, "").trim()) }
}

/**
 * The same error, spelled the same way every run.
 *
 * tsc does not promise a stable order for the members of a union in its
 * messages, and it does not deliver one: the same unchanged file produced
 * `SetStateAction<"daily" | ... | "custom">` on one run and
 * `SetStateAction<"custom" | "daily" | ...>` on the next, which made this script
 * report two files as newly broken when nothing had been touched. A gate that
 * fails at random is a gate people learn to skip, so runs of quoted members are
 * sorted before they are compared or written down.
 */
function normalise(message) {
  return message.replace(/(["'][^"']*["'](?:\s*\|\s*["'][^"']*["'])+)/g, (run) =>
    run
      .split("|")
      .map((part) => part.trim())
      .sort()
      .join(" | "),
  )
}

const findings = lines.map(parse)
const total = findings.length

applyRatchet({
  path: BASELINE,
  format: "signatures-v2",
  comment:
    "Type errors that already existed, by file and message. May only shrink. Regenerate with: node scripts/typecheck-ratchet.mjs --update (add --accept-new to bless a new one, deliberately).",
  current: tally(findings),
  total,
  noun: "type error",
  label: "Type errors",
  update,
  acceptNew,
  regenerate: "node scripts/typecheck-ratchet.mjs --update",
})
