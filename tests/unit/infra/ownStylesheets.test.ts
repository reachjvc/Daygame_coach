// @vitest-environment node
/**
 * THE HIDDEN REVIEW PAGES BUILD THEIR CLASSES IN THEIR OWN STYLESHEETS.
 *
 * `app/globals.css` skips the quit lab (`app/quit/lab`, `src/quit/lab`) and
 * `/test` (`app/test`), and each of those builds its classes in a stylesheet
 * of its own (`app/quit/lab/lab.css`, `app/test/test.css`), loaded only by its
 * own layout (2026-11-19: they were ~8 KB of the ~47 KB of styles every page
 * downloads). That holds only while nothing else renders their files: a lab
 * component imported into a real page would arrive with none of its classes.
 */
import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = path.resolve(__dirname, "../../..")
const rel = (f: string) => path.relative(root, f).replace(/\\/g, "/")
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const full = path.join(dir, f)
    if (f === "node_modules" || f.startsWith(".")) return []
    return statSync(full).isDirectory() ? walk(full) : /\.(tsx?|mjs|js)$/.test(f) ? [full] : []
  })

/** Folders whose classes globals.css does not build, and the stylesheet that does. */
const OWN = [
  { dirs: ["app/quit/lab/", "src/quit/lab/"], sheet: "app/quit/lab/lab.css", layout: "app/quit/lab/layout.tsx", css: "./lab.css" },
  { dirs: ["app/test/"], sheet: "app/test/test.css", layout: "app/test/layout.tsx", css: "./test.css" },
]
const inside = (file: string, dirs: string[]) => dirs.some((d) => file.startsWith(d))

function importsOf(file: string): string[] {
  const src = readFileSync(file, "utf8")
  const out: string[] = []
  for (const m of src.matchAll(/(?:\bfrom\s+|\bimport\s*\(\s*|^\s*import\s+)["']([^"']+)["']/gm)) {
    const spec = m[1]
    const target = spec.startsWith("@/") ? path.join(root, spec.slice(2)) : spec.startsWith(".") ? path.resolve(path.dirname(file), spec) : null
    if (target) out.push(rel(target))
  }
  return out
}

describe("pages with their own stylesheet", () => {
  const files = ["app", "src", "components"].flatMap((d) => walk(path.join(root, d)))

  for (const own of OWN) {
    it(`${own.dirs.join(" and ")}: globals.css skips them, and nothing outside imports them`, () => {
      const globals = readFileSync(path.join(root, "app/globals.css"), "utf8")
      for (const d of own.dirs) {
        const fromApp = d.startsWith("app/") ? `./${d.slice(4)}` : `../${d}`
        expect(globals, `globals.css should have @source not "${fromApp}**"`).toContain(`@source not "${fromApp}**";`)
      }
      expect(readFileSync(path.join(root, own.layout), "utf8")).toContain(`import "${own.css}"`)
      expect(readFileSync(path.join(root, own.sheet), "utf8")).toContain("@import \"tailwindcss/utilities\"")

      const offenders = files
        .map(rel)
        .filter((f) => !inside(f, own.dirs))
        .flatMap((f) => importsOf(path.join(root, f)).filter((t) => inside(t, own.dirs)).map((t) => `${f} -> ${t}`))
      expect(
        offenders,
        "this file would render without its classes; move what it needs out of the folder, or build it in globals.css",
      ).toEqual([])
    })
  }
})
