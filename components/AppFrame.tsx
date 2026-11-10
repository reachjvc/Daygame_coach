"use client"

import Link from "next/link"
import { LogOut } from "lucide-react"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import { AppLogo } from "@/components/AppLogo"
import { LogOutButton } from "@/components/LogOutButton"
import { MobileTabBar } from "@/components/MobileTabBar"
import { Button } from "@/components/ui/button"
import { HIDDEN_ROUTE_PREFIXES, PHONE_BAR_HIDDEN_PREFIXES, TABS, isActive } from "@/components/navTabs"
import { ROUTES, isUnder } from "@/src/shared/routes"

/** The e2e helpers find these (tests/e2e/helpers/selectors.ts). Same IDs AppHeader used. */
const TEST_IDS: Record<string, string> = {
  [ROUTES.dashboard]: "header-dashboard-link",
  [ROUTES.plan]: "header-life-mastery-link",
  [ROUTES.settings]: "header-settings-link",
}

/** The bar's four, in the bar's order. The tools are on Home (Phase 2 of Plans/site-navigation-build.md); the laptop sidebar is Phase 3. */
const ITEMS = TABS

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
 * One list feeds both bars (`TABS` in navTabs.ts), so the
 * laptop header and the phone bar cannot disagree. Pages that draw their own
 * top and bottom controls (`HIDDEN_ROUTE_PREFIXES`) get neither bar; pages
 * that draw only their own phone bar (`PHONE_BAR_HIDDEN_PREFIXES`, the time
 * tracker) keep the laptop header and lose the phone bar.
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
  const ownPhoneBar = PHONE_BAR_HIDDEN_PREFIXES.some((p) => isUnder(pathname, p))
  const folded = SIDEBAR_FOLDED_PREFIXES.some((p) => isUnder(pathname, p))

  return (
    <>
      <SiteHeader folded={folded} />
      {/* No room kept for a phone bar the page draws for itself; room on the
          left for the laptop sidebar */}
      <div className={`${ownPhoneBar ? "" : "pb-tab-bar"} ${sidebarOffset(folded)}`}>{children}</div>
      {!ownPhoneBar && <MobileTabBar />}
    </>
  )
}

/**
 * Pages where the laptop sidebar folds to icons: Time, a copy of Toggl made on
 * purpose, keeps its own full-width sidebar beside ours
 * (Plans/site-navigation-build.md, risk 6).
 */
export const SIDEBAR_FOLDED_PREFIXES: string[] = [ROUTES.time]

/** Room kept on the left for the sidebar, at the width it has on this page. */
export function sidebarOffset(folded: boolean): string {
  return folded ? "lg:pl-16" : "lg:pl-56"
}

/**
 * THE SITE'S NAVIGATION ABOVE A PHONE: a header row from 640px, a left
 * sidebar from 1024px (Plans/site-navigation-build.md, Phase 3).
 *
 * ONE ELEMENT, RESTYLED BY WIDTH, not a header and a sidebar side by side:
 * one set of links means one of each test id and one tab order, and the two
 * cannot list different places. Between 640 and 1024px a 224px sidebar would
 * take a third of the screen, so the row stays there.
 *
 * Exported for a page the frame steps aside for that still wants it: the
 * plan's daily steps (`NorthStarFlow`, `USE_STEPS`). Hidden below `sm`, where
 * the phone bar does this job.
 */
export function SiteHeader({ folded = false }: { folded?: boolean } = {}) {
  const pathname = usePathname()
  const label = folded ? "lg:sr-only" : ""
  return (
    <header
      className={`hidden sm:block border-b border-border bg-card/50 backdrop-blur backdrop-fallback-card lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:border-b-0 lg:border-r ${folded ? "lg:w-16" : "lg:w-56"}`}
      data-testid="site-nav"
      data-folded={folded ? "true" : undefined}
    >
      <div className={`mx-auto max-w-6xl flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:mx-0 lg:h-full lg:flex-col lg:items-stretch lg:justify-start lg:gap-6 lg:py-5 ${folded ? "lg:px-2" : "lg:px-3"}`}>
        <span className={folded ? "lg:flex lg:justify-center lg:[&_a>span]:hidden" : "lg:px-2 lg:[&_a]:whitespace-nowrap lg:[&_a]:text-lg"}>
          <AppLogo />
        </span>
        {/* Four destinations plus Log Out fit beside the logo at any width
            from 640px; the nav still scrolls inside the header rather than
            push the page sideways, which the route sweep checks. On a laptop
            it is a column. */}
        <nav className="flex min-w-0 items-center overflow-x-auto lg:flex-1 lg:flex-col lg:items-stretch lg:gap-1 lg:overflow-visible" aria-label="Main">
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
                className={`shrink-0 px-2.5 hover:text-primary lg:h-10 lg:justify-start lg:gap-3 ${folded ? "lg:justify-center lg:px-0" : ""} ${active ? "text-primary lg:bg-primary/10" : "text-foreground"}`}
                data-testid={TEST_IDS[item.href]}
              >
                <Link href={item.href} aria-current={active ? "page" : undefined} title={folded ? item.label : undefined}>
                  {/* The phone bar's icon for the same place: shown only on
                      the sidebar, where a column of words alone reads as a
                      list rather than navigation. */}
                  <item.icon className="hidden size-5 shrink-0 lg:inline" aria-hidden />
                  <span className={label}>{item.label}</span>
                </Link>
              </Button>
            )
          })}
          {/* Log Out before the development-only lab link, so the way out is
              never the item that scrolls out of view. At the foot of the
              sidebar on a laptop. */}
          {/* What this browser kept for opening pages with no signal goes
              first, and what has not reached the account yet is sent or
              asked about before it goes (LogOutButton). */}
          <LogOutButton>
            {({ onClick, busy }) => (
              <Button
                variant="ghost"
                type="button"
                size="sm"
                className={`shrink-0 px-2.5 text-foreground hover:text-primary lg:mt-auto lg:h-10 lg:justify-start lg:gap-3 ${folded ? "lg:justify-center lg:px-0" : ""}`}
                data-testid="header-logout-button"
                onClick={onClick}
                disabled={busy}
                title={folded ? "Log Out" : undefined}
              >
                <LogOut className="hidden size-5 shrink-0 lg:inline" aria-hidden />
                <span className={label}>Log Out</span>
              </Button>
            )}
          </LogOutButton>
          {process.env.NODE_ENV === "development" && (
            <Button asChild variant="ghost" size="sm" className={`shrink-0 text-amber-500 hover:text-amber-400 lg:justify-start ${folded ? "lg:hidden" : ""}`}>
              <Link href="/test">Test Pages</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  )
}
