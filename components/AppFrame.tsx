"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import { signOut } from "@/app/actions/auth"
import { forgetOfflineCopies } from "@/src/shared/offlineCopies"
import { AppLogo } from "@/components/AppLogo"
import { MobileTabBar } from "@/components/MobileTabBar"
import { Button } from "@/components/ui/button"
import { HIDDEN_ROUTE_PREFIXES, MORE_ITEMS, TABS, isActive } from "@/components/navTabs"
import { ROUTES, isUnder } from "@/src/shared/routes"

/** The e2e helpers find these (tests/e2e/helpers/selectors.ts). Same IDs AppHeader used. */
const TEST_IDS: Record<string, string> = {
  [ROUTES.dashboard]: "header-dashboard-link",
  [ROUTES.plan]: "header-life-mastery-link",
  [ROUTES.settings]: "header-settings-link",
}

const ITEMS = [...TABS, ...MORE_ITEMS].map((item) => ({ ...item, exact: "exact" in item ? item.exact : false }))

/**
 * THE SIGNED-IN APP'S NAVIGATION, ON EVERY PAGE, AT EVERY WIDTH.
 *
 * Each page used to decide for itself whether to draw a header and a tab bar.
 * On a laptop the tab bar does not exist (it is `sm:hidden`), and the header
 * was mounted on five pages, so Tracking, Training and Preferences had no way
 * out but the browser's Back button, and every tab drew its own "Back to
 * Dashboard" as if it were part of the Dashboard. A friend opened the site on
 * 2026-10-13 and said Settings looked like "a subset of something".
 * `Plans/site-structure.md`, Phase 3.
 *
 * One list feeds both bars (`TABS` and `MORE_ITEMS` in navTabs.ts), so the
 * laptop header and the phone bar cannot disagree. Pages that draw their own
 * top and bottom controls (`HIDDEN_ROUTE_PREFIXES`) get neither bar.
 *
 * NO SERVER DATA, BY DESIGN. The phone app bundles these pages (D8 of
 * docs/plans/own-platform-and-app.md), where server-only code does not run.
 * Who may see what stays with each page and the proxy; this is navigation only.
 *
 * Text-only links: showing the tab bar's icons here too needs the owner's word
 * (Q-ICON in the plan, `.claude/rules/ui.md`).
 */
export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (HIDDEN_ROUTE_PREFIXES.some((p) => isUnder(pathname, p))) return <>{children}</>

  return (
    <>
      <header className="hidden sm:block border-b border-border bg-card/50 backdrop-blur backdrop-fallback-card">
        <div className="mx-auto max-w-6xl flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <AppLogo />
          {/* Ten destinations plus Log Out do not fit beside the logo below
              ~1100px. The nav scrolls inside the header instead of pushing the
              page sideways, which the route sweep checks.
              TIGHTER SINCE THOUGHTS JOINED (2026-10-30): with the default
              padding the row was 929px in an 879px nav at 1280px wide, so Log
              Out sat half out of view on an ordinary laptop. `px-2.5` and no
              gap bring it to about 845px. */}
          <nav className="flex min-w-0 items-center overflow-x-auto" aria-label="Main">
            {ITEMS.map((item) => {
              // Where you are, said in colour as the phone bar says it, and to
              // a screen reader by aria-current.
              const active = isActive(pathname, item.href, item.exact)
              return (
                <Button
                  key={item.href}
                  asChild
                  variant="ghost"
                  size="sm"
                  className={`shrink-0 px-2.5 hover:text-primary ${active ? "text-primary" : "text-foreground"}`}
                  data-testid={TEST_IDS[item.href]}
                >
                  <Link href={item.href} aria-current={active ? "page" : undefined}>
                    {item.label}
                  </Link>
                </Button>
              )
            })}
            {/* Log Out before the development-only lab link, so the way out is
                never the item that scrolls out of view. */}
            {/* What this phone kept for opening pages with no signal goes
                first: the server action alone never reaches it. */}
            <form
              action={async () => {
                await forgetOfflineCopies()
                await signOut()
              }}
            >
              <Button
                variant="ghost"
                type="submit"
                size="sm"
                className="shrink-0 px-2.5 text-foreground hover:text-primary"
                data-testid="header-logout-button"
              >
                Log Out
              </Button>
            </form>
            {process.env.NODE_ENV === "development" && (
              <Button asChild variant="ghost" size="sm" className="shrink-0 text-amber-500 hover:text-amber-400">
                <Link href="/test">Test Pages</Link>
              </Button>
            )}
          </nav>
        </div>
      </header>
      <div className="pb-tab-bar">{children}</div>
      <MobileTabBar />
    </>
  )
}
