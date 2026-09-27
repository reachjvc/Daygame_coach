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
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
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

  /**
   * PER TEST, NOT PER FILE — AND THAT DISTINCTION IS NOT A REFINEMENT.
   *
   * The first version of this reported one verdict per file and answered PROVEN
   * whenever the file failed at all. On the day it was written it cleared
   * `aRefusalTheBrowserCannotMatch.test.tsx` — a file whose three tests included one
   * that passed identically against the broken hook, because its two assertions were
   * "at least one POST happened" and "the state is truthy", and the button it clicked
   * queued a row in a different table from the one the test was about. Two real tests
   * beside it failed, so the file failed, so the check said PROVEN.
   *
   * A reviewer found that test by extracting the old hook and running the test's
   * assertions against both. The check that was supposed to make that unnecessary had
   * reported all clear — which is the same failure one level up, in the instrument.
   * So it reads vitest's JSON per-assertion results now.
   */
  const results = []
  for (const file of testFiles) {
    const jsonAt = join(work, "must-fail-result.json")
    let exitCode = 0
    let output = ""
    try {
      output = execFileSync(
        "npx",
        ["vitest", "run", file, "--reporter=json", `--outputFile=${jsonAt}`],
        { cwd: work, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 32 * 1024 * 1024, timeout: 180_000 },
      )
    } catch (error) {
      exitCode = error.status ?? 1
      output = `${error.stdout ?? ""}${error.stderr ?? ""}`
    }

    let tests = []
    try {
      const report = JSON.parse(readFileSync(jsonAt, "utf8"))
      for (const suite of report.testResults ?? []) {
        for (const assertion of suite.assertionResults ?? []) {
          tests.push({ name: assertion.fullName ?? assertion.title, status: assertion.status })
        }
      }
    } catch {
      tests = []
    }

    /**
     * No per-test results at all means the file never executed — usually because it
     * imports something the old source did not have. That is a WEAKER signal than a
     * failed assertion, so it is reported apart rather than counted as proof.
     */
    const cannotImport =
      tests.length === 0 && /Failed to load|Cannot find module|does not provide an export|is not a function/i.test(output)
    results.push({ file, exitCode, tests, cannotImport })
  }

  /**
   * ONLY THE TESTS THAT ARE NEW, OR THIS DROWNS IN ITS OWN OUTPUT.
   *
   * A file's other tests were there before and pass against the old source BECAUSE
   * THEY SHOULD — that is what a regression suite is. The first per-test version of
   * this reported 72 suspects, 67 of which were pre-existing tests in files that had
   * merely been touched, and a check nobody can read is a check nobody runs.
   *
   * So the titles present at the base commit are excluded. Where a test was RENAMED
   * rather than added it will be reported as new, which is the right way round: a
   * renamed test is one somebody has just edited.
   */
  const titlesAtBase = new Map()
  for (const file of testFiles) {
    let before = ""
    try {
      before = git("show", `${base}:${file}`)
    } catch {
      before = "" // the file is new, so every test in it is new
    }
    const titles = new Set()
    for (const [, title] of before.matchAll(/(?:^|\s)(?:test|it)(?:\.each\([\s\S]*?\))?\s*\(\s*[`"']([^`"']+)[`"']/g)) {
      titles.add(title.trim())
    }
    titlesAtBase.set(file, titles)
  }

  /** Did this test exist, by name, before the change? */
  const existedBefore = (file, fullName) => {
    for (const title of titlesAtBase.get(file) ?? []) {
      // vitest reports describe + test concatenated, and `test.each` substitutes its
      // arguments into the title, so a suffix match on the declared title is the
      // honest comparison here
      const declared = title.replace(/%[sdifjo#%]/g, "").trim()
      if (declared.length > 0 && fullName.includes(declared)) return true
    }
    return false
  }

  const suspectTests = []
  const provenTests = []
  const carried = []
  const weakFiles = []
  for (const r of results) {
    if (r.tests.length === 0) {
      weakFiles.push(r)
      continue
    }
    for (const t of r.tests) {
      if (existedBefore(r.file, t.name)) {
        carried.push({ file: r.file, name: t.name, status: t.status })
        continue
      }
      if (t.status === "failed") provenTests.push({ file: r.file, name: t.name })
      else if (t.status === "passed") suspectTests.push({ file: r.file, name: t.name })
    }
  }

  const byFile = new Map()
  for (const t of suspectTests) byFile.set(t.file, [...(byFile.get(t.file) ?? []), t.name])

  for (const r of weakFiles) {
    console.log(
      `  WEAK     ${r.file} — never executed against the old source${r.cannotImport ? " (missing import)" : ""}. Reach unproven.`,
    )
  }
  for (const [file, names] of byFile) {
    console.log(`  SUSPECT  ${file}`)
    for (const name of names) console.log(`             passed against the old source: ${name}`)
  }

  console.log(
    `\n${provenTests.length} new test(s) proven, ${suspectTests.length} SUSPECT across ${byFile.size} file(s), ` +
      `${weakFiles.length} file(s) never ran, ${carried.length} pre-existing test(s) ignored.`,
  )
  if (suspectTests.length > 0) {
    console.log(
      "\nEach SUSPECT test either asserts nothing about what changed, or pins behaviour that\n" +
        "already worked. Both are possible; only one is a bug. Decide per TEST — a file is not\n" +
        "cleared by its neighbours failing — and where it is the second, say so in the test so\n" +
        "nobody has to run this again to find out.",
    )
  }
  if (weakFiles.length > 0) {
    console.log(
      "\nA WEAK file proved nothing either way. Point it at the old behaviour by hand:\n" +
        "restore the defect in the current source and watch it go red.",
    )
  }
} finally {
  writeFileSync(join(work, ".done"), "")
  rmSync(work, { recursive: true, force: true })
}

// exits 0 either way: this is a report, not a gate. See the header.
process.exit(0)
