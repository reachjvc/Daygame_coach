/**
 * NO BROWSER FILE CARRIES THE WHOLE CATALOGUE.
 *
 * The catalogue is about 200 profiles bundled as JSON (D1). A client component
 * that imports `catalog.ts`, `councilService.ts` or the data folder ships every
 * profile to every visitor of that page; at 200 people that is megabytes on a
 * phone. Client code takes card fields as props, or the council API's answer.
 */
import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

const root = path.resolve(__dirname, "../../..")
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const full = path.join(dir, f)
    if (f === "node_modules" || f.startsWith(".")) return []
    return statSync(full).isDirectory() ? walk(full) : /\.tsx?$/.test(f) ? [full] : []
  })

const HEAVY_DIR = path.join(root, "src/role-models")
const isHeavy = (target: string) => {
  const rel = path.relative(HEAVY_DIR, target).replace(/\\/g, "/")
  return rel === "catalog" || rel === "councilService" || rel.startsWith("data/")
}

/** Each value import in `src` that resolves to the catalogue, the council service or the data. */
function heavyImports(file: string, src: string): string[] {
  const out: string[] = []
  for (const m of src.matchAll(/^\s*import\s+(?!type\b)[^"']*?from\s+["']([^"']+)["']/gm)) {
    const spec = m[1]
    const target = spec.startsWith("@/") ? path.join(root, spec.slice(2)) : spec.startsWith(".") ? path.resolve(path.dirname(file), spec) : null
    if (target && isHeavy(target.replace(/\.(tsx?|json)$/, ""))) out.push(spec)
  }
  return out
}

describe("client components and the role model catalogue", () => {
  it("no 'use client' file imports the catalogue, the council service or the data", () => {
    const offenders = [...walk(path.join(root, "src")), ...walk(path.join(root, "app")), ...walk(path.join(root, "components"))]
      .filter((f) => /^\s*["']use client["']/.test(readFileSync(f, "utf8")))
      .flatMap((f) => heavyImports(f, readFileSync(f, "utf8")).map((spec) => `${path.relative(root, f)} -> ${spec}`))
    expect(offenders).toEqual([])
  })

  it("would catch one", () => {
    const here = path.join(HEAVY_DIR, "components/X.tsx")
    expect(heavyImports(here, 'import { shownPeople } from "../catalog"')).toEqual(["../catalog"])
    expect(heavyImports(here, 'import { PEOPLE } from "@/src/role-models/data/index.generated"')).toHaveLength(1)
    expect(heavyImports(here, 'import { filterCards } from "../format"')).toEqual([])
    expect(heavyImports(here, 'import type { RoleModelPerson } from "../catalog"')).toEqual([])
    expect(heavyImports(path.join(root, "src/goals/components/A.tsx"), 'import { X } from "../data/northStar"')).toEqual([])
  })
})
