import Link from "next/link"
import { BrandMark } from "@/components/BrandMark"
import { BRAND } from "@/src/shared/brand"

/**
 * The logo and name, linking home. One copy for the public home page's header
 * (`AppHeader`) and the signed-in app's frame (`AppFrame`). `shrink-0` so a
 * crowded laptop header scrolls its links rather than squeezing the name.
 */
export function AppLogo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2 font-bold text-xl text-foreground">
      <BrandMark size={24} />
      <span>{BRAND.name}</span>
    </Link>
  )
}
