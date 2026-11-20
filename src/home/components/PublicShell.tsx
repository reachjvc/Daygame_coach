import Link from "next/link"
import type { ReactNode } from "react"
import { AppFrame } from "@/components/AppFrame"
import { AppHeader } from "@/components/AppHeader"
import { BRAND } from "@/src/shared/brand"
import { ROUTES } from "@/src/shared/routes"

/**
 * THE FRAME OF THE PUBLIC PAGES: the front page, its three doors' own pages and
 * Prices (Plans/rebrand-10kdaysclub.md, Phase 5).
 *
 * Signed in, a page wears the app's frame like every other page, so its
 * navigation cannot drift from the tab bar's; signed out, it has the sales
 * header (sign in, get started). Every one ends on the same footer (W14).
 */
export function PublicShell({ isLoggedIn, children }: { isLoggedIn: boolean; children: ReactNode }) {
  const page = (
    <div className="min-h-dvh bg-background">
      {!isLoggedIn && <AppHeader />}
      {children}
      <footer className="border-t border-border bg-card py-8" data-testid="public-footer">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 text-sm text-muted-foreground">
          <span>&copy; 2026 {BRAND.name}</span>
          <Link href={ROUTES.pricing} className="inline-flex min-h-11 min-w-11 items-center justify-center text-foreground underline underline-offset-4">Prices</Link>
          <Link href="/privacy" className="inline-flex min-h-11 items-center text-foreground underline underline-offset-4">Privacy</Link>
        </div>
      </footer>
    </div>
  )
  return isLoggedIn ? <AppFrame>{page}</AppFrame> : page
}
