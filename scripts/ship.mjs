#!/usr/bin/env node
/**
 * SHIP: PUT YOUR COMMITS ON main, ONLY AFTER CI AND E2E PASSED ON THEM.
 *
 *   node scripts/ship.mjs
 *
 * The rule (CLAUDE.md): main only ever moves to a commit that already passed
 * "CI passed" and "E2E passed". GitHub's branch protection enforces it: a
 * push to main of a commit without those two green checks is refused, for
 * everyone, the owner's account included. This script is the way through:
 *
 *   1. Take the commits on your current branch that main does not have yet.
 *   2. In a throwaway worktree, rebase them onto the newest origin/main (your
 *      own checkout and its unsaved files are never touched).
 *   3. Push the result to a ship-* branch. CI and E2E run on it; Vercel does
 *      not deploy ship-* branches (vercel.json).
 *   4. Wait for both checks. Red: stop, print the failing runs, main is
 *      untouched. Fix the cause (whoever caused it) and run this again.
 *   5. Green: fast-forward main to exactly that commit. If main moved in the
 *      meantime, go back to 2: the combination of your commits and the new
 *      main has not been tested yet, so it is tested again.
 *   6. Move your branch to the new origin/main (git reset --keep, which keeps
 *      unsaved edits and refuses rather than overwrite one).
 *
 * Exit 0: shipped (or nothing to ship). Exit 1: red checks, a rebase
 * conflict, or main kept moving. Takes about 10-15 minutes, mostly waiting.
 * Env: SHIP_TIMEOUT_MINUTES (60), SHIP_POLL_SECONDS (30), SHIP_ATTEMPTS (5).
 */

import { spawnSync } from "node:child_process"
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join } from "node:path"
import { fetchRuns, judge } from "./ci/commit-checks.mjs"

const TIMEOUT_MS = Number(process.env.SHIP_TIMEOUT_MINUTES ?? 60) * 60_000
const POLL_MS = Number(process.env.SHIP_POLL_SECONDS ?? 30) * 1000
const ATTEMPTS = Number(process.env.SHIP_ATTEMPTS ?? 5)

function git(args, opts = {}) {
  const r = spawnSync("git", args, { encoding: "utf8", ...opts })
  return { ok: r.status === 0, out: (r.stdout ?? "").trim(), err: (r.stderr ?? "").trim() }
}
function must(args, opts) {
  const r = git(args, opts)
  if (!r.ok) throw new Error(`git ${args.join(" ")} failed:\n${r.err || r.out}`)
  return r.out
}
const sleep = (ms) => new Promise((res) => setTimeout(res, ms))

const start = must(["rev-parse", "HEAD"])
const branch = git(["symbolic-ref", "--short", "-q", "HEAD"]).out || "detached"
must(["fetch", "-q", "origin", "main"])
const ahead = must(["rev-list", "--count", "--no-merges", "origin/main..HEAD"])
if (ahead === "0") {
  console.log("ship: nothing to ship, main already has every commit here.")
  process.exit(0)
}
console.log(`ship: ${ahead} commit(s) from ${branch} (${start.slice(0, 8)})`)

const tag = `${branch.replace(/[^A-Za-z0-9._-]/g, "-")}-${start.slice(0, 8)}`
const shipBranch = `ship-${tag}`
const wt = join(homedir(), ".cache", "daygame-research", "ship", `${tag}-${Date.now()}`)
mkdirSync(join(wt, ".."), { recursive: true })

function cleanup() {
  git(["worktree", "remove", "--force", wt])
  rmSync(wt, { recursive: true, force: true })
}

async function waitForChecks(sha) {
  const until = Date.now() + TIMEOUT_MS
  let last = ""
  while (Date.now() < until) {
    const runs = fetchRuns(sha)
    if (runs) {
      const { state, lines } = judge(runs)
      const now = lines.join(" | ")
      if (now !== last) console.log(`ship: ${now}`)
      last = now
      if (state !== "pending") return state
    }
    await sleep(POLL_MS)
  }
  console.error(`ship: the checks did not finish within ${TIMEOUT_MS / 60_000} minutes.`)
  return "failure"
}

let shipped = null
let failed = false
try {
  must(["worktree", "add", "-q", "--detach", wt, start])
  // A new worktree has no .husky/_ (npm install writes it), so its pushes would
  // skip .husky/pre-push and with it the secret scan. Copy the main checkout's.
  const hooks = join(dirname(must(["rev-parse", "--path-format=absolute", "--git-common-dir"])), ".husky", "_")
  if (!existsSync(hooks)) {
    throw new Error(`${hooks} is missing, so the secret scan cannot run. Run npm install in the main checkout first.`)
  }
  cpSync(hooks, join(wt, ".husky", "_"), { recursive: true })
  for (let attempt = 1; attempt <= ATTEMPTS && !shipped; attempt++) {
    must(["fetch", "-q", "origin", "main"], { cwd: wt })
    const rebase = git(["rebase", "-q", "origin/main"], { cwd: wt })
    if (!rebase.ok) {
      git(["rebase", "--abort"], { cwd: wt })
      throw new Error(`your commits do not apply cleanly on the newest main. Rebase ${branch} on origin/main, solve the conflict, then ship again.\n${rebase.err}`)
    }
    const sha = must(["rev-parse", "HEAD"], { cwd: wt })
    const base = must(["rev-parse", "origin/main"], { cwd: wt })
    if (sha === base) {
      console.log("ship: main already has these changes.")
      shipped = sha
      break
    }
    console.log(`ship: attempt ${attempt}, testing ${sha.slice(0, 8)} on ${shipBranch}`)
    must(["push", "-q", "--force", "origin", `${sha}:refs/heads/${shipBranch}`], { cwd: wt })
    const state = await waitForChecks(sha)
    if (state !== "success") {
      throw new Error(`checks are red on ${sha.slice(0, 8)}; main is untouched. Fix the cause and ship again. Branch ${shipBranch} keeps the runs.`)
    }
    const push = git(["push", "-q", "origin", `${sha}:refs/heads/main`], { cwd: wt })
    if (push.ok) {
      shipped = sha
      break
    }
    console.log(`ship: main moved while the checks ran, so the combination is tested again.\n${push.err}`)
  }
} catch (e) {
  console.error(`ship: ${e.message}`)
  failed = true
} finally {
  cleanup()
}

if (failed) process.exit(1)
if (!shipped) {
  console.error(`ship: main kept moving for ${ATTEMPTS} attempts; nothing was shipped. Run it again.`)
  process.exit(1)
}
git(["push", "-q", "origin", "--delete", shipBranch])
console.log(`ship: main is now ${shipped.slice(0, 8)}; Vercel deploys it.`)

// Move this checkout onto the new main, unless someone committed here meanwhile.
must(["fetch", "-q", "origin", "main"])
if (must(["rev-parse", "HEAD"]) === start) {
  const keep = git(["reset", "-q", "--keep", "origin/main"])
  console.log(
    keep.ok
      ? `ship: ${branch} moved to origin/main.`
      : `ship: ${branch} was not moved (an unsaved edit is in the way); run git reset --keep origin/main later.`,
  )
} else {
  console.log(`ship: ${branch} got new commits meanwhile, so it was not moved; ship again for those.`)
}
