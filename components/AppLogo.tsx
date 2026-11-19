"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BrandMark } from "@/components/BrandMark"
import { BRAND } from "@/src/shared/brand"
import { FACET_LABEL, facetFor } from "@/src/shared/facets"

/**
 * The name, or inside a part its lockup: "10K Days · Life" with the part's name
 * in the part's colour (look C, Plans/rebrand-10kdaysclub.md, Phase 3). The part
 * comes from the address, like the page's colour. Phase 4b adds the part badge.
 */
export function PartLockup() {
  const facet = facetFor(usePathname() ?? "/")
  if (facet === "brand") return <span>{BRAND.name}</span>
  return (
    <span data-testid="part-lockup">
      {BRAND.short}
      <span className="text-primary"> · {FACET_LABEL[facet]}</span>
    </span>
  )
}

/**
 * The logo and name, linking home. One copy for the public home page's header
 * (`AppHeader`) and the signed-in app's frame (`AppFrame`). `shrink-0` so a
 * crowded laptop header scrolls its links rather than squeezing the name.
 */
export function AppLogo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2 font-bold text-xl text-foreground">
      <BrandMark size={24} />
      <PartLockup />
    </Link>
  )
}
