/**
 * A BUTTON THAT WILL DO NOTHING IS NOT AN ENABLED BUTTON.
 *
 * Found in a browser on 2026-09-28. Three "type a name, press Add" controls — Manage →
 * Clients, Manage → Tags and Reports → Save report — sat fully enabled with the name
 * box empty, and pressing them did nothing at all: no row, no toast, no complaint. On
 * screen that is indistinguishable from a broken button, and the Save one is a
 * full-width primary in a dropdown, so it is the most confident-looking control on the
 * panel. None of the three handled Enter either, though two `autoFocus` the box, so
 * the natural way to finish typing a name was the one gesture with no effect.
 *
 * Reading the source afterwards found SIX, not three — the same handler shape copied
 * into Projects → Add task, Manage → Team groups and Settings → Webhooks. The browser
 * found the half that happened to be on the screens that were driven, which is the
 * argument for scanning the source once a browser has shown you what to scan for.
 *
 * `useAddField` owns both halves now (disabled while blank, Enter submits) and this
 * fails on the next handler written the old way. It scans the SOURCE, for the reason
 * `aDateInputCannotSendNothing` gives: a rendered sweep sees the screens somebody
 * thought to render.
 */

import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, test } from "vitest"

const COMPONENTS = join(process.cwd(), "src/timetrack/components")

function componentSources(): { file: string; source: string }[] {
  return readdirSync(COMPONENTS)
    .filter((f) => f.endsWith(".tsx"))
    .map((file) => ({ file, source: readFileSync(join(COMPONENTS, file), "utf8") }))
}

/**
 * The tell is a handler that opens by returning on a blank value: whatever decided the
 * button was pressable did not consult the same condition, or the guard would be
 * unreachable. Matched on `.trim()` because that is what all six wrote.
 */
const SILENT_RETURN = /if\s*\(\s*![A-Za-z0-9_.[\]]+\.trim\(\)\s*\)\s*return\b/g

describe("a control that refuses blank input", () => {
  const sources = componentSources()

  test("there are components to scan, so the rest of this asserts something", () => {
    expect(sources.length, "no .tsx found — has the folder moved?").toBeGreaterThan(5)
  })

  test("does not do it by returning silently from an enabled button", () => {
    const offenders = sources.flatMap(({ file, source }) =>
      [...source.matchAll(SILENT_RETURN)].map(({ index }) => {
        const line = source.slice(0, index).split("\n").length
        return `${file}:${line}`
      }),
    )
    expect(
      offenders,
      "Use `useAddField`: it disables the button while the value is blank and submits on Enter. " +
        "A handler that opens `if (!x.trim()) return` means the button was pressable when pressing it could not work.",
    ).toEqual([])
  })

  test("and the hook the others use really does both halves", () => {
    /**
     * The scan above only proves nobody wrote the OLD shape. It cannot see whether the
     * replacement works, and a hook that disabled nothing would satisfy it completely —
     * so the behaviour is asserted here rather than assumed.
     */
    const hook = readFileSync(join(process.cwd(), "src/timetrack/hooks/useAddField.ts"), "utf8")
    expect(hook, "the button must be disabled while the value is blank").toContain("disabled: !ready")
    expect(hook, "Enter must submit").toContain('event.key !== "Enter"')
    expect(hook, "a rejected submit must keep the text").toContain("=== false) return")
  })

  test("every call site takes the button props from the hook rather than its own onClick", () => {
    /**
     * A call site could spread `inputProps` for the Enter handling and still wire its
     * own always-enabled `onClick`, which the first test would pass. So: wherever
     * `useAddField` is used, its `buttonProps` are used too.
     */
    const mismatched = sources
      .filter(({ source }) => source.includes("useAddField("))
      .filter(({ source }) => {
        const uses = [...source.matchAll(/const (\w+) = useAddField\(/g)].map((m) => m[1])
        return uses.some((name) => !source.includes(`{...${name}.buttonProps}`))
      })
      .map(({ file }) => file)
    expect(mismatched, "every useAddField must reach a button via {...field.buttonProps}").toEqual([])
  })
})
