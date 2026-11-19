import { readFileSync } from "node:fs"
import { join } from "node:path"
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
