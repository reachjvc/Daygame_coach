/**
 * EVERY FUNCTION THAT WRITES USER DATA, DERIVED FROM SOURCE.
 *
 * The failure this feeds, measured 2026-09-07: `completeOnboardingForUser` was
 * the single function that wrote a new user's entire signup profile. It had
 * ZERO tests. Its four small pure helpers -- validateAgeRange, validateRegion,
 * sanitizeArchetypes, getInitialLevelFromExperience -- had 55 between them.
 *
 * That is the shape to catch: the pleasant-to-test pure functions get covered,
 * the awkward one that actually touches the database does not, and the total
 * ("4,470 passing") reads as though everything is covered. Two real defects
 * lived in the untested one -- a blank profile could be saved, and `level` was
 * written from a formula nothing else agreed with.
 *
 * Enumerated from source rather than listed, so a new write function has to be
 * classified the day it is written.
 */

import * as fs from "fs"
import * as path from "path"

const root = path.resolve(__dirname, "../..")

/** A Supabase write. `.select()` and `.eq()` are reads and filters, not writes. */
const WRITE_CALL = /\.(insert|update|upsert|delete)\s*\(/

export interface WriteFn {
  /** Repo-relative file path. */
  file: string
  /** Exported function name. */
  fn: string
  /** `${file}:${fn}` — the key used by the registry. */
  key: string
}

/** Files that own data access or business logic, per the architecture rules. */
function candidateFiles(): string[] {
  const out: string[] = []
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === "node_modules") continue
        walk(full)
      } else if (/(Service|Repo)\.ts$/.test(entry.name)) {
        out.push(full)
      }
    }
  }
  walk(path.join(root, "src"))
  return out.sort()
}


/**
 * Source with its comments and string literals blanked out.
 *
 * THE SCANNER READ PROSE AS CODE. A comment containing the words "this
 * function is expected to write the value back" was matched by the
 * declaration regex as a function named `is`, and the body taken for it was
 * the real code that followed — which writes. `is` therefore entered the set
 * of writer names, and because the propagation matches by name, every Supabase
 * read filtering with `.is("ended_at", null)` was swept in as a write path,
 * `getLiveWorkout` among them.
 *
 * A prompt string reading "his first message is (or contains) a guess" did the
 * same. Blanking both leaves the structure intact — quotes and comment markers
 * stay, so offsets and brace matching are unchanged — while nothing inside them
 * can be mistaken for code.
 */
function stripNonCode(src: string): string {
  const out = src.split("")
  let i = 0
  const blank = (from: number, to: number) => {
    for (let k = from; k < to && k < out.length; k++) if (out[k] !== "\n") out[k] = " "
  }
  while (i < src.length) {
    const two = src.slice(i, i + 2)
    if (two === "//") {
      const end = src.indexOf("\n", i)
      blank(i, end === -1 ? src.length : end)
      i = end === -1 ? src.length : end
    } else if (two === "/*") {
      const end = src.indexOf("*/", i + 2)
      blank(i, end === -1 ? src.length : end + 2)
      i = end === -1 ? src.length : end + 2
    } else if (src[i] === '"' || src[i] === "'" || src[i] === "`") {
      const quote = src[i]
      let j = i + 1
      while (j < src.length && src[j] !== quote) j += src[j] === "\\" ? 2 : 1
      blank(i + 1, j)
      i = j + 1
    } else {
      i++
    }
  }
  return out.join("")
}

/**
 * The body of a function, by brace matching from its opening `{`.
 *
 * A fixed-size window was tried first and was wrong: it read past the end of
 * short functions into the next one, so pure readers like `getProfile` and
 * `listValues` were reported as writers because a write appeared 40 lines
 * below them. Counting braces is the difference between "a write is nearby"
 * and "this function writes" -- the same proxy-versus-thing distinction this
 * whole guard exists for.
 *
 * THE BODY STARTS AFTER THE SIGNATURE, NOT AT THE FIRST BRACE. A return type
 * can contain braces of its own — `Promise<{ updated: number }>` — and taking
 * the first one made the "body" the return type, three words long and
 * containing no write. The function then vanished from this guard silently,
 * which is the exact failure the guard exists to prevent: a check that passes
 * while checking nothing. The opening brace is the one that follows the
 * signature's closing parenthesis at depth zero.
 */
/** The index of the "}" that closes the "{" at `open`. */
function skipBraces(src: string, open: number): number {
  let depth = 0
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++
    else if (src[i] === "}") {
      depth--
      if (depth === 0) return i
    }
  }
  return src.length
}

function bodyBrace(src: string, startIndex: number): number {
  // Walk the parameter list to its matching ")", then take the next "{".
  const paren = src.indexOf("(", startIndex)
  if (paren === -1) return src.indexOf("{", startIndex)
  let depth = 0
  for (let i = paren; i < src.length; i++) {
    const ch = src[i]
    if (ch === "(") depth++
    else if (ch === ")") {
      depth--
      if (depth === 0) {
        /**
         * Everything between here and the body is the return type, and it can
         * contain both braces and semicolons of its own —
         * `Promise<{ updated: number; failed: Record<string, string> }>`. So an
         * object type inside a generic is skipped whole, and the body is the
         * first "{" that is not inside one.
         */
        let angle = 0
        for (let j = i + 1; j < src.length; j++) {
          const c = src[j]
          if (c === "<") angle++
          else if (c === ">") angle = Math.max(0, angle - 1)
          else if (c === "{") {
            if (angle === 0) return j
            j = skipBraces(src, j)
          } else if (c === ";" && angle === 0) break
        }
        return -1
      }
    }
  }
  return src.indexOf("{", startIndex)
}

function functionBody(src: string, startIndex: number): string {
  const open = bodyBrace(src, startIndex)
  if (open === -1) return ""

  let depth = 0
  for (let i = open; i < src.length; i++) {
    const ch = src[i]
    if (ch === "{") depth++
    else if (ch === "}") {
      depth--
      if (depth === 0) return src.slice(open, i + 1)
    }
  }
  return src.slice(open)
}

/**
 * Every exported function that writes user data — directly, through a local
 * helper, or through a repo.
 *
 * THREE THINGS IT HAS TO HANDLE, and each was found by this guard failing to
 * catch the one function it was written because of:
 *
 *   1. A DIRECT write: the function calls .insert/.update/.upsert/.delete.
 *      That finds the repositories.
 *   2. A write through a LOCAL HELPER. `completeOnboardingForUser` calls
 *      `updateProfileDb`, which is not exported, which calls `updateProfile`.
 *      A version that only propagated through exported names missed it — the
 *      exact function whose 0 tests started all of this.
 *   3. A write through an IMPORTED repo function, one or more hops away. The
 *      architecture rules put database access in repos and business logic in
 *      services, so this is the normal shape, not the exception.
 *
 * So: build the set of ALL function names (exported or not) that write, and
 * grow it until it stops growing. Then report the exported ones.
 */
export function writeFunctions(): WriteFn[] {
  interface Fn {
    rel: string
    name: string
    body: string
    exported: boolean
  }

  const all: Fn[] = []

  for (const file of candidateFiles()) {
    // Comments and strings blanked first: prose that reads like code was being
    // scanned as code, and one sentence created a phantom function named `is`.
    const src = stripNonCode(fs.readFileSync(file, "utf-8"))
    const rel = path.relative(root, file).replace(/\\/g, "/")

    for (const match of src.matchAll(/(export\s+)?(?:async\s+)?function\s+(\w+)/g)) {
      all.push({
        rel,
        name: match[2],
        body: functionBody(src, match.index ?? 0),
        exported: Boolean(match[1]),
      })
    }
  }

  // Seed: anything performing a Supabase write itself.
  const writers = new Set(all.filter((f) => WRITE_CALL.test(f.body)).map((f) => f.name))

  // Grow: anything calling a known writer becomes one. Repeat until stable, so
  // a chain of any depth is followed.
  let grew = true
  while (grew) {
    grew = false
    for (const fn of all) {
      if (writers.has(fn.name)) continue
      /**
       * A CALL, NOT A METHOD OF THE SAME NAME.
       *
       * `\b` matches straight after a dot, so a helper named `is` — and there
       * is one — made every Supabase read that filters with `.is("ended_at",
       * null)` look like a call to it. Five pure readers were swept in that
       * way, including `getLiveWorkout`, whose whole job is a SELECT. The
       * lookbehind requires the name to stand on its own.
       */
      const calls = [...writers].some((w) => new RegExp(`(?<![.\\w$])${w}\\s*\\(`).test(fn.body))
      if (calls) {
        writers.add(fn.name)
        grew = true
      }
    }
  }

  const out: WriteFn[] = []
  const seen = new Set<string>()
  for (const fn of all) {
    if (!fn.exported || !writers.has(fn.name)) continue
    const key = `${fn.rel}:${fn.name}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ file: fn.rel, fn: fn.name, key })
  }

  return out.sort((a, b) => a.key.localeCompare(b.key))
}

/**
 * Does any test file mention this function by name?
 *
 * A weak check on purpose, and it is worth being explicit about what it does
 * and does not prove. It proves nobody wrote "tested" next to a function no
 * test has ever heard of. It does NOT prove the test asserts on the payload —
 * that cannot be decided from source, and pretending otherwise would be the
 * same proxy error again. The registry's reason strings carry the real claim.
 */
export function isMentionedInTests(fn: string): boolean {
  const testDirs = [path.join(root, "tests")]
  let found = false

  const walk = (dir: string) => {
    if (found || !fs.existsSync(dir)) return
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (found) return
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".auth") continue
        walk(full)
      } else if (/\.(test|spec)\.tsx?$/.test(entry.name)) {
        if (new RegExp(`\\b${fn}\\b`).test(fs.readFileSync(full, "utf-8"))) found = true
      }
    }
  }

  walk(testDirs[0])
  return found
}
