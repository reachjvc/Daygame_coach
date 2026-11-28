#!/usr/bin/env node
/**
 * THE TIME LOG'S GUARD TESTS CHANGE ONLY WITH THE OWNER'S YES.
 *
 * His question and answer, 2026-11-28: "lock the Time Log tests, so no session
 * can change them without a commit line quoting his yes?" ... "yes".
 *
 * A commit that changes a locked file must carry a line
 *
 *   Owner-approved: "<his own words, quoted>" (date)
 *
 * in its message. Only he gives that yes; a session never writes the line
 * without it. One change needs no line: deleting a `test.fail` mark once its
 * bug is fixed (docs/tech.md section 6 says to). That is a commit whose locked
 * files only lose one-line marks (`test.fail(true, '...')`, `test.fail()`) or
 * turn `test.fail(` / `it.fails(` into `test(` / `it(`, and nothing else.
 *
 *   node scripts/ci/timelog-lock.mjs --staged <commit message file>   (.husky/commit-msg)
 *   node scripts/ci/timelog-lock.mjs --range <from>..<to>             (ci.yml, job `static`)
 *
 * Exit 0: allowed. Exit 1: refused, with the files and the way through.
 * The hook can be skipped with --no-verify; CI cannot, and "CI passed" keeps a
 * refused commit off main.
 */

import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { pathToFileURL } from "node:url"

/** What is locked: the guard tests, their photos, the clock traps, and this lock itself */
export const LOCKED = [
  "tests/e2e/timelog-guard/",
  "tests/unit/timetrack/clock-traps/",
  "scripts/ci/timelog-lock.mjs",
  "tests/unit/infra/timelogLock.test.ts",
  ".husky/commit-msg",
]

export const isLocked = (path) => LOCKED.some((p) => (p.endsWith("/") ? path.startsWith(p) : path === p))

/** The owner's yes, quoted, on a line of its own */
export const hasOwnerApproval = (message) => /^Owner-approved:\s*["“].{3,}["”]/m.test(message)

/** A whole line that only marks the test it is in as expected to fail: `test.fail()` or `test.fail(true, '<one string>')` */
const MARK_LINE = /^\s*test\.fail\(\s*(true\s*,\s*(['"`])(?:\\.|(?!\2)[^\\])*\2\s*)?\)\s*;?\s*$/
/** A test declared as expected to fail, and the plain declaration it becomes */
const MARKED_DECLARATIONS = [
  ["test.fail(", "test("],
  ["it.fails(", "it("],
  ["test.fails(", "test("],
]

/**
 * Hunks of a `git diff -U0` of one file: the lines each removes and adds.
 * @param {string} diff
 * @returns {{ removed: string[], added: string[] }[]}
 */
export function hunksOf(diff) {
  const hunks = []
  let current = null
  for (const line of diff.split("\n")) {
    if (line.startsWith("@@")) {
      current = { removed: [], added: [] }
      hunks.push(current)
    } else if (!current) {
      // the file's header lines ("---", "+++", "index ...") come before its first hunk
      continue
    } else if (line.startsWith("-")) {
      current.removed.push(line.slice(1))
    } else if (line.startsWith("+")) {
      current.added.push(line.slice(1))
    }
  }
  return hunks
}

/** `removed` became `added` only by losing its expected-to-fail mark */
function unmarked(removed, added) {
  return MARKED_DECLARATIONS.some(([marked, plain]) => removed.includes(marked) && removed.replace(marked, plain) === added)
}

/**
 * The diff of one changed file only deletes `test.fail` marks. Anything this
 * cannot read as that (a new or deleted file, a photo, a moved line) is not.
 * @param {string} diff `git diff -U0` of the file
 */
export function onlyRemovesFailMarks(diff) {
  const hunks = hunksOf(diff)
  if (hunks.length === 0) return false
  return hunks.every(({ removed, added }) => {
    if (removed.length === 0) return false
    if (added.length === 0) return removed.every((line) => MARK_LINE.test(line))
    return removed.length === added.length && removed.every((line, i) => unmarked(line, added[i]))
  })
}

/**
 * @param {{ message: string, files: { path: string, status: string, diff: string }[] }} commit
 *   status: git's letter (A added, M changed, D deleted); diff: `git diff -U0` of that file
 * @returns {{ ok: boolean, locked: string[], reason: string }}
 */
export function judgeCommit({ message, files }) {
  const locked = files.filter((f) => isLocked(f.path))
  if (locked.length === 0) return { ok: true, locked: [], reason: "touches no locked file" }
  const paths = locked.map((f) => f.path)
  if (hasOwnerApproval(message)) return { ok: true, locked: paths, reason: "carries the owner's yes" }
  if (locked.every((f) => f.status === "M" && onlyRemovesFailMarks(f.diff))) {
    return { ok: true, locked: paths, reason: "only deletes test.fail marks" }
  }
  return { ok: false, locked: paths, reason: "changes locked Time Log tests without the owner's yes" }
}

function git(args) {
  const run = spawnSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
  if (run.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${run.stderr}`)
  return run.stdout
}

/**
 * `--name-status -z` output: status and path NUL-separated, so a path git would
 * otherwise quote (non-ASCII, quotes) is read as it is. Renames arrive as a
 * delete plus an add (`--no-renames`), so both paths are judged.
 */
function filesFrom(nameStatusZ, diffOf) {
  const parts = nameStatusZ.split("\0").filter(Boolean)
  const files = []
  for (let i = 0; i + 1 < parts.length; i += 2) {
    const status = parts[i]
    const path = parts[i + 1]
    files.push({ path, status: status[0], diff: isLocked(path) ? diffOf(path) : "" })
  }
  return files
}

function stagedCommit(messageFile) {
  const message = readFileSync(messageFile, "utf8")
  const files = filesFrom(git(["diff", "--cached", "--name-status", "--no-renames", "-z"]), (path) =>
    git(["diff", "--cached", "-U0", "--no-renames", "--", path]),
  )
  return { message, files }
}

function rangeCommits(range) {
  const shas = git(["rev-list", "--no-merges", "--reverse", range]).split("\n").filter(Boolean)
  return shas.map((sha) => {
    const message = git(["log", "-1", "--format=%B", sha])
    const files = filesFrom(git(["diff-tree", "--root", "--no-commit-id", "-r", "--name-status", "--no-renames", "-z", sha]), (path) =>
      git(["diff", "-U0", "--no-renames", `${sha}^`, sha, "--", path]),
    )
    return { sha, message, files }
  })
}

function refuse(where, verdict) {
  console.error(`timelog-lock: ${where} ${verdict.reason}:`)
  for (const path of verdict.locked) console.error(`  ${path}`)
  console.error(`
  These are the Time Log's guard tests (docs/tech.md section 6). The owner said,
  on 2026-11-28, that no session changes them without his yes. The way through:
  show him the change and ask; once he says yes in his own words, add this line
  to the commit message, quoting him:

    Owner-approved: "<his exact words>" (YYYY-MM-DD)

  Never write that line without his yes. Deleting a test.fail mark whose bug is
  fixed needs no line, when the commit does nothing else to these files.`)
}

function main(argv) {
  const [mode, arg] = argv
  if (mode === "--staged" && arg) {
    // a merge brings in commits that were judged on their own
    if (spawnSync("git", ["rev-parse", "-q", "--verify", "MERGE_HEAD"]).status === 0) return 0
    const verdict = judgeCommit(stagedCommit(arg))
    if (verdict.ok) return 0
    refuse("this commit", verdict)
    return 1
  }
  if (mode === "--range" && arg) {
    let status = 0
    for (const commit of rangeCommits(arg)) {
      const verdict = judgeCommit(commit)
      console.log(`${commit.sha.slice(0, 8)} ${verdict.ok ? "ok" : "REFUSED"}: ${verdict.reason}`)
      if (!verdict.ok) {
        refuse(`commit ${commit.sha.slice(0, 8)}`, verdict)
        status = 1
      }
    }
    return status
  }
  console.error("usage: timelog-lock.mjs --staged <message file> | --range <from>..<to>")
  return 2
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exit(main(process.argv.slice(2)))
