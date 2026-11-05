/**
 * NO TAP IN THE TRACKER WRITES THE WHOLE WORKSPACE BACK.
 *
 * `setState(() => result.state)` ignores the copy React hands the update and
 * puts in place one worked out on the copy the page last drew. Twenty-one taps
 * did that, and each could put the drawn copy back over the account's answer
 * to a check, handed over a moment before and not drawn yet: a stop or a
 * rename from the other device undone, and sent up again as this device's own
 * (`aRenameTypedWhileTheOtherDeviceStopsKeepsTheStop`,
 * `aTapOnTheCopyOnScreenKeepsWhatTheOtherDeviceDid`).
 *
 * A write worked out ahead of time goes through `layOnto(drawn, next)`, and a
 * write worked out inside the update needs nothing. The shape that ignores
 * `current` is the one way back to the bug, and it reads the same in every
 * file, so this looks for it — a new screen added later included.
 */

import * as fs from "fs"
import * as path from "path"
import { describe, expect, test } from "vitest"

const root = path.resolve(__dirname, "../../../src/timetrack")

function sources(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const full = path.join(dir, item.name)
    if (item.isDirectory()) return sources(full)
    return /\.(ts|tsx)$/.test(item.name) ? [full] : []
  })
}

describe("writes to the tracker's workspace", () => {
  test("never ignore the copy React hands them", () => {
    const found = sources(root).flatMap((file) =>
      fs
        .readFileSync(file, "utf8")
        .split("\n")
        .map((line, i) => ({ line, where: `${path.relative(root, file)}:${i + 1}` }))
        // a comment may name the shape it warns about
        .filter(({ line }) => !/^\s*(\*|\/\/)/.test(line) && /\bsetState\(\s*\(\s*\)\s*=>/.test(line))
        .map(({ where, line }) => `${where}  ${line.trim()}`),
    )

    expect(found, "write these with setState(layOnto(drawn, next)) or work them out from `current`").toEqual([])
  })
})
