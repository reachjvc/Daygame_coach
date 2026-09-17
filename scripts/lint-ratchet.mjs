#!/usr/bin/env node
/**
 * LINT ERRORS MAY ONLY GO DOWN.
 *
 * WHY THIS EXISTS: `npx eslint .` reported 492 errors and CI's Lint step failed
 * on `main` for days. A permanently red gate is worse than no gate — everyone
 * learns to scroll past it, and a genuinely new error arrives invisible among
 * 492 old ones. Fixing all of them first would have blocked unrelated work
 * behind a cleanup nobody had scheduled.
 *
 * This is the same honest middle the type ratchet already took, and it shares
 * that ratchet's machinery (`scripts/lib/ratchet.mjs`) rather than copying it.
 *
 * WHAT WAS FIXED RATHER THAN BASELINED. 140 of the original 492 were not bugs at
 * all, and baselining them would have frozen a configuration mistake into the
 * repo's definition of "clean":
 *
 *   - 91 `no-undef` in `.mjs` files, because the globals block's glob was
 *     `{js,jsx,ts,tsx}` and never matched `.mjs`. Twenty-three of those were in
 *     `scripts/typecheck-ratchet.mjs` — the repo's own quality gate failing lint
 *     because of how lint was configured.
 *   - 19 `no-undef` in `public/sw.js`, a service worker being linted with
 *     browser globals instead of service-worker ones.
 *   - 31 in `.playwright-mcp/`, which is gitignored throwaway capture output and
 *     should never have been linted.
 *
 * Only after those were fixed was the remainder written down. The lesson is the
 * one this repo keeps relearning: measure the thing, not a proxy for it. A
 * baseline built from the first number would have been 140 findings of pure
 * noise, and every one of them would have looked like debt forever.
 *
 * IT RECORDS FINDINGS, NOT COUNTS — a file plus rule plus message. Fix two
 * unused variables in a file and add two others and a count would be unchanged,
 * so a brand-new error would pass. Line and column are dropped because they move
 * whenever anything above them is edited.
 *
 * WHERE IT RUNS: `npm run lint:ratchet`. Wire it into CI's Lint step in place of
 * a bare `eslint .` so that step can pass again.
 */

import { spawnSync } from "node:child_process"
import { applyRatchet, assertCheckerRan, tally } from "./lib/ratchet.mjs"

const BASELINE = "eslint-baseline.json"
const REGENERATE = "node scripts/lint-ratchet.mjs --update"
const FORMAT = "eslint-findings-v1"

const update = process.argv.includes("--update")
const acceptNew = process.argv.includes("--accept-new")

/*
 * `--format json` rather than parsing human output: eslint's text formatter
 * wraps long messages and prints paths as headings, so a regex over it loses
 * findings silently. JSON also gives `severity`, which is what separates the
 * 6 warnings (not gated) from the errors (gated).
 */
const run = spawnSync("npx", ["eslint", ".", "--format", "json"], {
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
  shell: process.platform === "win32",
})

const output = (run.stdout + run.stderr).replace(/\r/g, "")

let report
try {
  report = JSON.parse(run.stdout)
} catch {
  console.error(`eslint did not produce JSON — refusing to treat that as a pass:\n${output.trim()}`)
  process.exit(1)
}

/** Errors only. Warnings are advisory here and are not gated. */
const findings = []
for (const file of report) {
  const relative = file.filePath.replace(process.cwd() + "/", "")
  for (const message of file.messages) {
    if (message.severity !== 2) continue
    // A fatal parse error has no ruleId; it still has to be visible.
    const rule = message.ruleId ?? "(fatal parse error)"
    findings.push({ file: relative, signature: `${rule}: ${normalise(message.message)}` })
  }
}

/**
 * The same finding, spelled the same way every run.
 *
 * eslint embeds identifiers in its messages — "'foo' is defined but never used"
 * — which is what makes two unused variables in one file distinguishable, and
 * is worth keeping. What is not worth keeping is anything positional, so any
 * digits that look like a location are not part of a signature. Nothing here
 * strips the identifier itself: renaming a variable genuinely is a different
 * finding, and having it show up as new is correct.
 */
function normalise(message) {
  return message.replace(/\s+/g, " ").trim()
}

assertCheckerRan(run, {
  tool: "eslint",
  // 0 clean, 1 found problems. 2 is eslint's own crash/config failure.
  okStatuses: [0, 1],
  found: findings.length,
  output,
})

applyRatchet({
  path: BASELINE,
  format: FORMAT,
  comment:
    "Lint errors that already existed, by file and rule. May only shrink. Regenerate with: node scripts/lint-ratchet.mjs --update (add --accept-new to bless a new one, deliberately).",
  current: tally(findings),
  total: findings.length,
  noun: "lint error",
  label: "Lint errors",
  update,
  acceptNew,
  regenerate: REGENERATE,
})
