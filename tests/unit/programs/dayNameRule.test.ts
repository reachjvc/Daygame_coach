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

/** The renames that trim, and so must never be wired to a keystroke. */
const TRIMMING_RENAMES = /\b(renameDay|renameSplitDay)\s*\(/

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
        if (!TRIMMING_RENAMES.test(line)) return
        // The definition itself, and any call that is not inside a handler.
        if (/^\s*(export\s+)?function\s+(renameDay|renameSplitDay)\b/.test(line)) return

        // On the same line as an onChange is the exact shape that was wrong.
        if (/onChange/.test(line)) {
          found.push(`${rel}:${i + 1} — renames on every keystroke (onChange)`)
          return
        }
        // Otherwise it must be reached through a commit: this line or one of
        // the three above it names onCommit.
        const context = lines.slice(Math.max(0, i - 3), i + 1).join("\n")
        if (!/onCommit/.test(context)) return
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
        "Use DraftInput from components/ui/draft-input.tsx and commit on blur:\n" +
        found.join("\n")
    ).toEqual([])
  })

  /**
   * THIS USED TO ASSERT THAT ALL THREE BOXES WERE A `DraftInput`, and that was
   * a test of the MECHANISM rather than of the rule.
   *
   * On 2026-09-23 two of the three stopped being boxes at all: the rename moved
   * behind a row's ⋮ into a dialog with a Save button, which satisfies the rule
   * more strongly than `DraftInput` did — nothing is committed until Save, and
   * a blank name is refused with something to READ rather than by the trim
   * quietly doing nothing. The old assertion went red for a change that made
   * the thing it was protecting better, which is what a proxy assertion does.
   *
   * So it asks the two questions that actually matter instead: the rename is
   * still REACHABLE from each of these screens (a control nobody can find is
   * the other way to pass "nothing renames per keystroke"), and no keystroke
   * event of any name reaches it. `onChange` is the shape that was wrong and
   * the test above owns it; `onInput` and `onKeyUp` are the two ways the same
   * mistake would be made next.
   */
  test("each screen can still rename a day, and no keystroke event reaches the rename", () => {
    const screens = [
      "src/programs/components/ProgramEditor.tsx",
      "src/programs/components/CustomProgramBuilder.tsx",
      "src/goals/components/north-star/RoutineCard.tsx",
    ]

    /**
     * The handler form too: `RoutineCard` never calls `renameSplitDay` — it
     * calls `handlers.onRenameSplitDay`, and the flow above it calls the
     * trimming function. Looking only for the direct call said the control had
     * been lost when it had merely been passed down, which is a test failing
     * for a spelling rather than for a fact.
     */
    const REACHES_A_RENAME = /\b(?:on)?(?:R|r)ename(?:Day|SplitDay)\s*\(/
    const unreachable = screens.filter((rel) => {
      const src = fs.readFileSync(path.join(projectRoot, rel), "utf-8")
      return !REACHES_A_RENAME.test(src)
    })
    expect(
      unreachable,
      "These no longer rename a training day at all — the control was lost, not fixed:\n" +
        unreachable.join("\n")
    ).toEqual([])

    const keystroke: string[] = []
    for (const rel of screens) {
      const code = fs
        .readFileSync(path.join(projectRoot, rel), "utf-8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/[^\n]*/g, "")
      for (const [block] of code.matchAll(/on(?:Input|KeyUp|KeyDown)=\{[\s\S]{0,200}?\}/g)) {
        if (/\b(?:on)?(?:R|r)ename(?:Day|SplitDay)\s*\(/.test(block)) {
          keystroke.push(`${rel} — renames inside a keystroke handler`)
        }
      }
    }
    expect(
      keystroke,
      "A rename reached from a keystroke makes a two-word day name untypeable:\n" +
        keystroke.join("\n")
    ).toEqual([])
  })
})
