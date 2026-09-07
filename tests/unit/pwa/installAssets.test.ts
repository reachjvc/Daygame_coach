/**
 * EVERYTHING THE INSTALLABLE APP POINTS AT MUST ACTUALLY SHIP.
 *
 * The failure this prevents: `.gitignore` ignores every `.png`, and the four
 * icons that `app/manifest.ts` and `public/sw.js` reference were created on one
 * machine on 2026-09-03 and never tracked. They looked fine locally and did not
 * exist in any clean checkout — so on CI or a deploy every one of them was a
 * 404, and Chrome will not offer "Add to Home Screen" without at least one icon
 * it can download.
 *
 * "Exists on disk" is not the check, because that is exactly what was true and
 * exactly what misled. The check is "git ships it".
 */

import { describe, it, expect } from "vitest"
import { execFileSync } from "node:child_process"
import * as fs from "node:fs"
import * as path from "node:path"

const root = path.resolve(__dirname, "../../..")

function referencedAssets(file: string): string[] {
  const src = fs.readFileSync(path.join(root, file), "utf8")
  // "/icon-192.png", '/apple-icon.png' — any root-relative image path in the file
  return [...src.matchAll(/["'](\/[\w./-]+\.(?:png|svg|ico))["']/g)].map((m) => m[1])
}

function tracked(): Set<string> {
  const out = execFileSync("git", ["ls-files", "--", "public"], { cwd: root, encoding: "utf8" })
  return new Set(out.split("\n").filter(Boolean))
}

describe("install assets are shipped, not merely present", () => {
  const shipped = tracked()

  it.each(["app/manifest.ts", "public/sw.js", "app/layout.tsx"])("%s references only tracked files", (file) => {
    const refs = referencedAssets(file)
    expect(refs.length, `${file} references no assets — did the pattern stop matching?`).toBeGreaterThan(0)
    const missing = refs.filter((ref) => !shipped.has(`public${ref}`))
    expect(
      missing,
      `${file} points at files git does not track: ${missing.join(", ")} — check .gitignore (\`*.png\`) and \`git add\` them`
    ).toEqual([])
  })
})
