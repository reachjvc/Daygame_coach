"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { TABS, HIDDEN_ROUTE_PREFIXES, PHONE_BAR_HIDDEN_PREFIXES, isActive } from "@/components/navTabs"
import { isUnder } from "@/src/shared/routes"

/**
 * Every item in the bar, measured on an iPhone 14, used to be 43.75px tall with
 * an 11px label — a quarter of a pixel under the 44px a fingertip needs, and a
 * pixel under the smallest text this app is willing to show. Six of them, on
 * every page (four since 2026-11-10). `min-h-11` and `text-xs` are the floors.
 */
const BAR_ITEM = "flex min-h-11 flex-col items-center justify-center gap-0.5 min-w-[56px] py-1"

/**
 * `force`: draw the bar on a route the frame hides it on. The plan's daily
 * steps (Today, Track, Journal, Review) pass it: /plan hides the frame for its
 * setup steps, which draw their own bottom controls, but the daily steps are
 * where you live and keep the bar (Plans/site-navigation-build.md, risk 5).
 */
export function MobileTabBar({ force = false }: { force?: boolean } = {}) {
  const pathname = usePathname()

  // Hide on routes that have their own bottom bar
  if (!force && [...HIDDEN_ROUTE_PREFIXES, ...PHONE_BAR_HIDDEN_PREFIXES].some((p) => isUnder(pathname, p))) {
    return null
  }

  /* NO MORE SHEET since 2026-11-10. What it held (Time, the audit, Ask
     Coach, Articles, Settings, Log Out) is on Home's tiles, in All tools, and
     on You (Plans/site-navigation-build.md, Phase 2). */
  return (
    <>
      {/* Bottom tab bar */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 pb-safe bg-card/90 backdrop-blur border-t border-border"
        data-testid="mobile-tab-bar"
      >
        <div className="flex items-center justify-around h-16">
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.href, tab.exact)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                /**
                 * WHICH TAB YOU ARE ON, said in more than colour.
                 *
                 * The only signal was `text-primary`. A screen reader was told
                 * nothing at all, and anybody who cannot separate those two
                 * greys reads five identical tabs — on the control whose whole
                 * job is saying where you are.
                 */
                aria-current={active ? "page" : undefined}
                className={`${BAR_ITEM} ${active ? "text-primary" : "text-muted-foreground"}`}
                data-testid={tab.testId}
              >
                <tab.icon className="size-5" />
                <span className="text-xs leading-tight">{tab.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
