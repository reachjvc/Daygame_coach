import { readFileSync, readdirSync } from "node:fs"
import { join, relative } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * The old name stays off the places every visitor sees (Plans/rebrand-10kdaysclub.md,
 * Phase 1 step 13). The Dating door may still say "daygame"; these files may not.
 */
const ROOT = join(__dirname, "..", "..", "..")
const FILES = [
  "app/layout.tsx",
  "app/manifest.ts",
  "components/AppLogo.tsx",
  "components/BrandMark.tsx",
  "app/auth/login/LoginPageClient.tsx",
  "app/auth/sign-up/page.tsx",
  "app/auth/forgot-password/page.tsx",
  "app/auth/reset-password/page.tsx",
  "app/auth/sign-up-success/SignUpSuccessClient.tsx",
  "src/quit/data/frame.json",
]

describe("the brand name", () => {
  it.each(FILES)("%s does not say daygame", (file) => {
    const text = readFileSync(join(ROOT, file), "utf8")
    expect(text.match(/daygame/gi) ?? []).toEqual([])
  })

  it("the quit tools' site name is the brand name", async () => {
    const { BRAND } = await import("@/src/shared/brand")
    const frame = JSON.parse(readFileSync(join(ROOT, "src/quit/data/frame.json"), "utf8"))
    expect(frame.siteName).toBe(BRAND.name)
  })
})

/**
 * R3. ONE NAME, ONE LOGO (docs/product/look.md).
 * The name is typed in one place and read from `BRAND`; the mark is drawn in one
 * place and rendered as `<BrandMark/>`. A copy anywhere else is a copy the next
 * rename or logo swap misses.
 */
function liveCode(): string[] {
  const out: string[] = []
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name)
      const rel = relative(ROOT, p).split("\\").join("/")
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name === "lab" || rel === "app/test") continue
        walk(p)
      } else if (/\.(tsx?|mjs)$/.test(e.name)) out.push(rel)
    }
  }
  for (const top of ["app", "src", "components"]) walk(join(ROOT, top))
  return out
}

/** The mark's own drawing. Phase 4b replaces it together with BrandMark.tsx. */
const MARK_SIGNATURE = /<circle cx="16" cy="16" r="11"/

describe("R3: one name, one logo", () => {
  it("the name is typed only in src/shared/brand.ts", () => {
    const typed = liveCode().filter((f) => f !== "src/shared/brand.ts" && readFileSync(join(ROOT, f), "utf8").includes("10K Days Club"))
    expect(typed, "Read the name from BRAND in src/shared/brand.ts").toEqual([])
  })

  it("the mark is drawn only in components/BrandMark.tsx", () => {
    const drawn = liveCode().filter((f) => f !== "components/BrandMark.tsx" && MARK_SIGNATURE.test(readFileSync(join(ROOT, f), "utf8")))
    expect(drawn, "Render <BrandMark/> instead of drawing the mark").toEqual([])
    expect(MARK_SIGNATURE.test(readFileSync(join(ROOT, "components/BrandMark.tsx"), "utf8"))).toBe(true)
  })
})

