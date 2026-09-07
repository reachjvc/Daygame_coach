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
 * WHERE IT RUNS, AND WHAT THAT COVERS: `.github/workflows/ci.yml` on every push
 * and pull request — that is the gate, and it checks the pushed commit.
 * `.husky/pre-push` runs it too, as a fast local warning, but it checks the
 * WORKING TREE, not the commits being pushed: uncommitted work counts, and
 * committed work you have since changed does not. Stashing to fix that is
 * forbidden here (a second agent shares this checkout), so the hook says what it
 * measured and CI remains the thing that decides.
 */

import { spawnSync } from "node:child_process"
import { readFileSync, writeFileSync, existsSync } from "node:fs"

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

/*
 * A CHECKER THAT COULD NOT RUN IS NOT A CHECKER THAT FOUND NOTHING.
 *
 * Three separate ways for that to happen, and all three used to read as a pass:
 * killed by a signal (out of memory is the usual one), exiting with a status tsc
 * never uses for "I found errors" (0 clean, 1 or 2 with errors), or a
 * configuration failure, which tsc reports as an error with no file attached.
 */
if (run.error) {
  console.error(`tsc could not be started: ${run.error.message}`)
  process.exit(1)
}
if (run.signal) {
  console.error(`tsc was killed by ${run.signal} — its report is incomplete, so this is not a pass.`)
  process.exit(1)
}
if (![0, 1, 2].includes(run.status)) {
  console.error(`tsc exited with ${run.status}, which is not a result it uses for "checked, found errors":\n${output.trim()}`)
  process.exit(1)
}
if (run.status !== 0 && lines.length === 0) {
  console.error(`tsc reported a failure but no type errors — refusing to treat that as a pass:\n${output.trim()}`)
  process.exit(1)
}

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

/** file → signature → how many times it occurs */
const current = {}
for (const line of lines) {
  const { file, signature } = parse(line)
  current[file] ??= {}
  current[file][signature] = (current[file][signature] ?? 0) + 1
}
const total = lines.length

function sortDeep(counts) {
  const files = {}
  for (const file of Object.keys(counts).sort()) {
    files[file] = Object.fromEntries(Object.entries(counts[file]).sort(([a], [b]) => a.localeCompare(b)))
  }
  return files
}

/** Everything in `a` that `b` does not cover, as printable lines. */
function excess(a, b) {
  const out = []
  for (const [file, signatures] of Object.entries(a)) {
    for (const [signature, count] of Object.entries(signatures)) {
      const allowed = b[file]?.[signature] ?? 0
      if (count > allowed) out.push(`${file}: ${signature}${count > 1 ? ` (x${count - allowed} more than baselined)` : ""}`)
    }
  }
  return out.sort()
}

/**
 * The baseline, if it is one this version can compare against.
 *
 * An earlier version stored a plain count per file. Comparing signatures against
 * counts makes every error look new, so a baseline without `_format` is treated
 * as absent and rebuilt — once, loudly — rather than refusing to run.
 */
const FORMAT = "signatures-v2"
const stored = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, "utf8")) : null
if (stored && stored._format !== FORMAT) {
  console.warn(`${BASELINE} is in an older format (${stored._format ?? "counts"}); rebuilding it as ${FORMAT}.`)
}
const baseline = stored && stored._format === FORMAT ? stored : null

if (update) {
  if (baseline) {
    const added = excess(current, baseline.files)
    if (added.length && !acceptNew) {
      console.error(
        `Refusing to write a baseline that accepts ${added.length} error(s) the current one does not:\n  ` +
          added.join("\n  ") +
          `\n\nFix them, or say so out loud with --update --accept-new so the decision is visible in the diff.`,
      )
      process.exit(1)
    }
    if (added.length) {
      console.warn(`Accepting ${added.length} NEW type error(s) into the baseline:\n  ` + added.join("\n  "))
    }
  }
  writeFileSync(
    BASELINE,
    JSON.stringify(
      {
        _comment:
          "Type errors that already existed, by file and message. May only shrink. Regenerate with: node scripts/typecheck-ratchet.mjs --update (add --accept-new to bless a new one, deliberately).",
        _format: FORMAT,
        total,
        files: sortDeep(current),
      },
      null,
      2,
    ) + "\n",
  )
  console.log(`baseline written: ${total} errors across ${Object.keys(current).length} files`)
  process.exit(0)
}

if (!baseline) {
  console.error(
    stored
      ? `${BASELINE} is in an older format and cannot be compared against. Rebuild it: node scripts/typecheck-ratchet.mjs --update`
      : `No ${BASELINE}. Create it once with: node scripts/typecheck-ratchet.mjs --update`,
  )
  process.exit(1)
}

const added = excess(current, baseline.files)
if (added.length) {
  console.error(
    `${added.length} type error(s) that are not in ${BASELINE}:\n  ` +
      added.join("\n  ") +
      `\n\nFix them. Do not raise the baseline.`,
  )
  process.exit(1)
}

const fixed = baseline.total - total
if (fixed > 0) {
  console.log(`Type errors: ${total} (baseline ${baseline.total}). ${fixed} fewer — lower the baseline: node scripts/typecheck-ratchet.mjs --update`)
} else {
  console.log(`Type errors: ${total}, none new.`)
}
