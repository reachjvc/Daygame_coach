"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { useState } from "react"
import { Menu, LogOut } from "lucide-react"
import { signOut } from "@/app/actions/auth"
import { BottomSheet, SheetRow } from "@/components/BottomSheet"
import { TABS, MORE_ITEMS, HIDDEN_ROUTE_PREFIXES } from "@/components/navTabs"

/**
 * Every item in the bar, measured on an iPhone 14, used to be 43.75px tall with
 * an 11px label — a quarter of a pixel under the 44px a fingertip needs, and a
 * pixel under the smallest text this app is willing to show. Six of them, on
 * every page. `min-h-11` and `text-xs` are the floors.
 */
const BAR_ITEM = "flex min-h-11 flex-col items-center justify-center gap-0.5 min-w-[56px] py-1"

function isActive(pathname: string, href: string, exact: boolean) {
  if (exact) return pathname === href
  return pathname.startsWith(href)
}

export function MobileTabBar() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  // Hide on routes that have their own bottom bar
  if (HIDDEN_ROUTE_PREFIXES.some((p) => pathname.startsWith(p))) {
    return null
  }

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
                data-testid={`tab-${tab.label.toLowerCase()}`}
              >
                <tab.icon className="size-5" />
                <span className="text-xs leading-tight">{tab.label}</span>
              </Link>
            )
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className={`${BAR_ITEM} text-muted-foreground`}
            data-testid="tab-more"
          >
            <Menu className="size-5" />
            <span className="text-xs leading-tight">More</span>
          </button>
        </div>
      </nav>

      {/* "More" menu. The shared sheet — the same one every ⋮ menu in the app
          opens — rather than this file's own copy of one. */}
      <BottomSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title="More"
        testId="more-sheet"
      >
        {MORE_ITEMS.map((item) => (
          <SheetRow
            key={item.href}
            href={item.href}
            icon={item.icon}
            onClick={() => setMoreOpen(false)}
          >
            {item.label}
          </SheetRow>
        ))}

        <div className="border-t border-border my-2" />

        {/* NO onClick HERE. Closing the sheet unmounts this form before the
            browser submits it, so Log Out did nothing at all — you tapped it,
            the menu slid away, and you were still signed in. Signing out
            redirects to the front page, which takes the sheet with it. */}
        <form action={signOut}>
          <SheetRow type="submit" icon={LogOut} testId="more-logout-button">
            Log Out
          </SheetRow>
        </form>
      </BottomSheet>
    </>
  )
}
