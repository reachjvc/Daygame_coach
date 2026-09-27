#!/usr/bin/env node
/**
 * A NEW TEST THAT PASSES AGAINST THE OLD CODE PROVES NOTHING.
 *
 * WHY THIS EXISTS. `memory/stand-in-checking-failure.md` records the same failure
 * fourteen times and opens with a demand: the next instance does not get another
 * worked example, it gets a check that runs. This is that check.
 *
 * The failure, in its test-shaped form: a fix lands, a test lands beside it, the
 * suite is green, and the test would have been green before the fix too. It is not
 * a weak test — it is usually emphatic and well named — it just does not touch the
 * thing that changed. Four of those were written during the timetrack review of
 * 2026-09-27 alone:
 *
 *   - one asserted the shared formatter while the defect was in a local copy of it;
 *   - one asserted the DECLARED table order while the defect was in a re-sort;
 *   - one counted requests when the damage was visible in the queue, so whether it
 *     caught the bug depended on what else happened to trigger a flush;
 *   - one held every request behind a single shared handle, so the request under
 *     test was never the one released — green against the bug AND against two
 *     different fixes for it.
 *
 * Three were caught by hand, one by a reviewer. What actually caught all of them
 * was the same gesture: put the defect back, watch the test go red. That gesture is
 * mechanical, so it should not depend on remembering to do it.
 *
 * WHAT IT DOES. Takes the source as it was at a base commit, lays the CURRENT test
 * files on top of it, and runs them. A test that still passes is reported — because
 * on that old source the behaviour it describes was broken, so a pass means the
 * test is not looking at it.
 *
 * WHAT IT IS NOT. Not a gate, and deliberately not wired into CI or the pre-commit
 * hook. A new test can legitimately pass against old code: it may cover behaviour
 * that already worked and is being pinned so it keeps working, which is a good
 * thing to write. So the output is a list to read, not a verdict — the point is to
 * make the gap unmissable, the way `lint-ratchet` makes an unbaselined error
 * unmissable. Every entry needs one of two answers: "it is a stand-in, rewrite it"
 * or "it pins existing behaviour on purpose, and the file says so".
 *
 * USAGE
 *   node scripts/tests-must-fail-without-the-fix.mjs [<base-ref>] [--filter <substr>]
 *
 * `<base-ref>` defaults to `origin/main`, or the merge base with it. `--filter`
 * narrows to test files whose path contains the substring, which is what you want
 * when a branch has touched several slices.
 */

import { execFileSync } from "node:child_process"
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"

const REPO = resolve(import.meta.dirname, "..")

/** Everything this needs from the repo's own tree to run vitest at all. */
const CONFIG_FILES = ["vitest.config.ts", "tsconfig.json", "package.json", "postcss.config.mjs"]

function git(...args) {
  return execFileSync("git", args, { cwd: REPO, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim()
}

/**
 * The positional arguments, with flag VALUES excluded.
 *
 * The first version of this took "the first argument that is not a flag and is not
 * argv[0]", which picks up `--filter`'s value as the base ref and then asks git to
 * diff a revision called "timetrack". Stated as a list of which flags take a value,
 * so adding one cannot quietly break it again.
 */
const FLAGS_WITH_VALUES = new Set(["--filter"])

function positional(argv) {
  const out = []
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      if (FLAGS_WITH_VALUES.has(argv[i])) i++
      continue
    }
    out.push(argv[i])
  }
  return out
}

function baseRef(argv) {
  const given = positional(argv)[0]
  if (given) return given
  try {
    return git("merge-base", "HEAD", "origin/main")
  } catch {
    // no remote main to compare against: fall back to the previous commit, which
    // at least answers the question for the last thing that landed
    return git("rev-parse", "HEAD~1")
  }
}

function changedFiles(base) {
  return git("diff", "--name-only", `${base}..HEAD`).split("\n").filter(Boolean)
}

const argv = process.argv.slice(2)
const filterAt = argv.indexOf("--filter")
const filter = filterAt >= 0 ? argv[filterAt + 1] : null
const base = baseRef(argv)

const changed = changedFiles(base)
const testFiles = changed
  .filter((f) => /^tests\/unit\/.*\.test\.(ts|tsx)$/.test(f))
  .filter((f) => (filter ? f.includes(filter) : true))
const sourceFiles = changed.filter((f) => f.startsWith("src/") || f.startsWith("app/"))

console.log(`Base: ${base} (${git("log", "-1", "--format=%h %s", base)})`)
console.log(`Changed: ${sourceFiles.length} source file(s), ${testFiles.length} unit test file(s)\n`)

if (testFiles.length === 0) {
  console.log("No changed unit tests to check.")
  process.exit(0)
}
if (sourceFiles.length === 0) {
  console.log("No source changed, so there is nothing for these tests to have failed against.")
  process.exit(0)
}

/**
 * The old tree, with the new tests laid on top.
 *
 * `git archive` rather than a worktree or a checkout: this repo is shared with
 * other sessions, and `git checkout` would move the files under them. Nothing here
 * touches the working tree.
 */
const work = mkdtempSync(join(tmpdir(), "must-fail-"))
let failed = 0
try {
  execFileSync("bash", ["-c", `git archive ${base} | tar -x -C ${JSON.stringify(work)}`], { cwd: REPO })
  symlinkSync(join(REPO, "node_modules"), join(work, "node_modules"))
  for (const file of CONFIG_FILES) {
    if (existsSync(join(REPO, file))) cpSync(join(REPO, file), join(work, file))
  }

  // the CURRENT tests, over the OLD source
  for (const file of testFiles) {
    mkdirSync(dirname(join(work, file)), { recursive: true })
    cpSync(join(REPO, file), join(work, file))
  }
  // helpers the tests import are tests too, and may themselves be new
  for (const helper of changed.filter((f) => /^tests\/.*(helpers|support|__mocks__|setup)/.test(f))) {
    if (!existsSync(join(REPO, helper))) continue
    mkdirSync(dirname(join(work, helper)), { recursive: true })
    cpSync(join(REPO, helper), join(work, helper))
  }

  const results = []
  for (const file of testFiles) {
    let output = ""
    let exitCode = 0
    try {
      output = execFileSync("npx", ["vitest", "run", file, "--reporter=dot"], {
        cwd: work,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        maxBuffer: 32 * 1024 * 1024,
        timeout: 180_000,
      })
    } catch (error) {
      exitCode = error.status ?? 1
      output = `${error.stdout ?? ""}${error.stderr ?? ""}`
    }

    /**
     * A file that cannot even be imported against the old source counts as "it
     * noticed", but it is a WEAKER signal than a failed assertion: it may only
     * mean the test imports a function that did not exist yet. Reported apart, so
     * the distinction is not silently flattened.
     */
    const cannotImport = /Failed to load|Cannot find module|does not provide an export|is not a function/i.test(output)
    const assertionsRan = /AssertionError|expected .* to/i.test(output)
    results.push({ file, exitCode, cannotImport, assertionsRan })
  }

  const suspect = results.filter((r) => r.exitCode === 0)
  const proven = results.filter((r) => r.exitCode !== 0 && r.assertionsRan)
  const weak = results.filter((r) => r.exitCode !== 0 && !r.assertionsRan && r.cannotImport)
  const other = results.filter((r) => r.exitCode !== 0 && !r.assertionsRan && !r.cannotImport)

  for (const r of proven) console.log(`  PROVEN   ${r.file} — failed on an assertion against the old source`)
  for (const r of weak) console.log(`  WEAK     ${r.file} — did not run against the old source (missing import). Reach unproven.`)
  for (const r of other) console.log(`  FAILED   ${r.file} — failed for some other reason; read the output.`)
  for (const r of suspect) console.log(`  SUSPECT  ${r.file} — PASSED against the old source.`)

  console.log(
    `\n${proven.length} proven, ${weak.length} unproven (import), ${other.length} other, ${suspect.length} SUSPECT.`,
  )
  if (suspect.length > 0) {
    console.log(
      "\nA SUSPECT file asserts nothing about what changed, or pins behaviour that already\n" +
        "worked. Both are possible; only one is a bug. Decide which, per file, and if it is\n" +
        "the second, say so in the file so the next reader does not have to run this again.",
    )
  }
  if (weak.length > 0) {
    console.log(
      "\nA WEAK file never executed, so it proved nothing either way. Point it at the old\n" +
        "behaviour by hand: restore the defect in the current source and watch it go red.",
    )
  }
  failed = suspect.length
} finally {
  writeFileSync(join(work, ".done"), "")
  rmSync(work, { recursive: true, force: true })
}

// exits 0 either way: this is a report, not a gate. See the header.
process.exit(0)
