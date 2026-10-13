/**
 * NO DAY-NAME BOX COMMITS PER KEYSTROKE.
 *
 * `renameDay` and `renameSplitDay` both trim. Wired to `onChange` that makes a
 * two-word day name impossible to type: the space after "Upper" is deleted the
 * moment it is typed, so "Upper Body" can never be entered in any of the three
 * places the app offers. One of them additionally snapped the old name back
 * when the box was cleared, via a `|| day.label` guard.
 *
 * Trimming belongs on commit. `DraftInput` is the one box that does that, and
 * this is what stops a fourth rename box being added the old way — which is how
 * there came to be three.
 *
 * There is no allowlist on purpose. The count is zero and there is no reason
 * for it ever to be anything else.
 */

import { describe, test, expect } from "vitest"
import fs from "fs"
import path from "path"

const projectRoot = path.resolve(__dirname, "../../..")

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue
      out.push(...sourceFiles(full))
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full)
    }
  }
  return out
}

/**
 * The renames that trim, and so must never be wired to a keystroke — called
 * directly, or through the handler a screen is given for them
 * (`handlers.onRenameSplitDay(…)` in `RoutineCard`, which `NorthStarFlow`
 * wires to `renameSplitDay`).
 */
const TRIMMING_RENAMES = /\b(?:on)?(?:R|r)ename(?:Day|SplitDay)\s*\(/

/**
 * What a commit looks like in this codebase: `DraftInput`'s `onCommit`, a
 * Save button's `save…`/`commit…` function, or the `onRename…` handler itself,
 * whose own callers this same rule checks.
 */
const COMMIT_POINT = /^(?:onCommit|onRename(?:Day|SplitDay)|save\w*|commit\w*)$/

/** A function, an arrow assigned to a name, an object handler or a JSX prop. */
const HANDLER_HEAD =
  /\bfunction\s+(\w+)|\b(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?\(|\b(\w+)\s*:\s*(?:async\s*)?\(|\b(on\w+)=\{/g

/**
 * The name of the nearest handler that opens above the call: on the call's own
 * line (before the call), or on one of the lines above it. Null when none is
 * found within reach, which the rule reports rather than forgives.
 */
function enclosingHandler(lines: string[], i: number, callAt: number): string | null {
  for (let j = i; j >= Math.max(0, i - 40); j--) {
    const text = j === i ? lines[j].slice(0, callAt) : lines[j]
    const heads = [...text.matchAll(HANDLER_HEAD)]
    const last = heads[heads.length - 1]
    if (last) return last[1] ?? last[2] ?? last[3] ?? last[4] ?? null
  }
  return null
}

function offenders(): string[] {
  const found: string[] = []
  for (const dir of ["src", "components", "app"]) {
    for (const file of sourceFiles(path.join(projectRoot, dir))) {
      const rel = path.relative(projectRoot, file).replace(/\\/g, "/")
      // Comments blanked: a sentence about the rule is not the rule.
      const code = fs
        .readFileSync(file, "utf-8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/[^\n]*/g, "")
      const lines = code.split("\n")
      lines.forEach((line, i) => {
        const call = TRIMMING_RENAMES.exec(line)
        if (!call) return
        // The definition itself.
        if (/^\s*(export\s+)?function\s+(renameDay|renameSplitDay)\b/.test(line)) return

        // On the same line as an onChange is the exact shape that was wrong.
        if (/onChange/.test(line)) {
          found.push(`${rel}:${i + 1} — renames on every keystroke (onChange)`)
          return
        }
        // Otherwise it must be reached through a commit: the handler it sits
        // in is one. `onInput`, `onKeyUp` and an unnamed callback are not.
        const owner = enclosingHandler(lines, i, call.index)
        if (!owner || !COMMIT_POINT.test(owner)) {
          found.push(`${rel}:${i + 1} — renames from ${owner ?? "no named handler"}, which is not a commit`)
        }
      })
      // A multi-line onChange handler wrapping one of the renames.
      const multiline = code.matchAll(/onChange=\{[\s\S]{0,200}?\}/g)
      for (const [block] of multiline) {
        if (TRIMMING_RENAMES.test(block)) {
          found.push(`${rel} — renames inside a multi-line onChange`)
        }
      }
    }
  }
  return found
}

describe("day names are trimmed on commit, never per keystroke", () => {
  test("no day-name input renames on every keystroke", () => {
    const found = offenders()
    expect(
      found,
      "These trim on every keystroke, which makes a two-word day name untypeable.\n" +
        "Rename from a commit — DraftInput's onCommit, or a save…/commit… function\n" +
        "behind a Save button — never from onChange, onInput or a key handler:\n" +
        found.join("\n")
    ).toEqual([])
  })
})
