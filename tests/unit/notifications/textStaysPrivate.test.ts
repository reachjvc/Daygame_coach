// @vitest-environment node
/**
 * WHAT SOMEBODY TYPED NEVER REACHES A LOG OR A CRASH REPORT (Plans/thought.md,
 * Phase 9 step 5; now guarding the notifications code, and the audit's code
 * once Phase 4 adds it). These are among the most private words in the app.
 *
 * Two doors, two checks:
 *   1. SERVER LOGS. Every log line in the notifications code is a
 *      fixed tag plus an Error's message or a status code, nothing else. A
 *      Postgres error's `message` names the rule that was broken; its
 *      `details` and `hint` carry the row itself ("Failing row contains (…,
 *      I am bad, …)", "Key (user_id, norm)=(…, i am bad)"), so those two are
 *      never read in this code at all.
 *   2. CRASH REPORTS come from the browser and pass `scrubText` on the way in,
 *      which removes anything quoted — the form in which a page would echo
 *      what somebody typed.
 */
import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { scrubText } from "@/src/shared/errorScrubService"

const ROOT = path.resolve(__dirname, "../../..")

function files(dir: string): string[] {
  const full = path.join(ROOT, dir)
  if (!fs.existsSync(full)) return []
  if (fs.statSync(full).isFile()) return [dir]
  return fs.readdirSync(full, { withFileTypes: true }).flatMap((e) => {
    const rel = path.join(dir, e.name)
    if (e.isDirectory()) return e.name === "components" || e.name === "hooks" ? [] : files(rel)
    return /\.tsx?$/.test(e.name) ? [rel] : []
  })
}

const SERVER_CODE = [
  "src/db/notificationsRepo.ts",
  "src/notifications",
  "app/api/notifications",
].flatMap(files)

/** The full argument list of every console call, however many lines it spans. */
function consoleCalls(source: string): string[] {
  const out: string[] = []
  for (const m of source.matchAll(/console\.(log|error|warn|info|debug)\(/g)) {
    let depth = 1
    let i = (m.index ?? 0) + m[0].length
    const start = i
    while (i < source.length && depth > 0) {
      if (source[i] === "(") depth++
      else if (source[i] === ")") depth--
      i++
    }
    out.push(source.slice(start, i - 1).replace(/\s+/g, " ").trim())
  }
  return out
}

/** A fixed tag, then an Error's message (or "unknown"), a status code, or nothing. */
/** Measured 2026-11-08: 9 console calls in 12 files. The floor sits just under. */
const CALLS_FLOOR = 6

const ALLOWED_LOG = /^"\[[a-z ]+\][^"]*"(, (error|e) instanceof Error \? (error|e)\.message : "unknown"|, \(error as \{ statusCode\?: number \}\)\.statusCode \?\? "no answer")?$/

describe("server logs", () => {
  it("finds the code it guards", () => {
    // Measured 2026-11-08 after Thoughts was deleted: 12 files. Raise as the audit's paths are added.
    expect(SERVER_CODE.length).toBeGreaterThan(8)
    const calls = SERVER_CODE.flatMap((f) => consoleCalls(fs.readFileSync(path.join(ROOT, f), "utf8"))).length
    // Measured at the same time; see the count printed on failure.
    expect(calls).toBeGreaterThan(CALLS_FLOOR)
  })

  it("logs only a fixed tag and an error's message or status, never data", () => {
    const offending = SERVER_CODE.flatMap((f) =>
      consoleCalls(fs.readFileSync(path.join(ROOT, f), "utf8"))
        .filter((args) => !ALLOWED_LOG.test(args))
        .map((args) => `${f}: console(${args})`),
    )
    expect(offending).toEqual([])
  })

  it("never reads a database error's details or hint, which carry the row", () => {
    const offending = SERVER_CODE.filter((f) => /\.(details|hint)\b/.test(fs.readFileSync(path.join(ROOT, f), "utf8")))
    expect(offending).toEqual([])
  })

  it("would catch a log line that carries a thought", () => {
    const planted = `console.error("[thoughts] add failed", text)`
    expect(consoleCalls(planted).every((a) => ALLOWED_LOG.test(a))).toBe(false)
  })
})

describe("crash reports", () => {
  it("lose anything quoted, which is how a typed thought would ride along", () => {
    expect(scrubText('Could not save "I am bad" for later')).toBe("Could not save [text] for later")
    expect(scrubText("Could not save 'nobody likes me'")).toBe("Could not save [text]")
  })
})
