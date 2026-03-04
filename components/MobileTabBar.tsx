"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { useState } from "react"
import {
  LayoutDashboard,
  Aperture,
  BarChart3,
  Swords,
  Menu,
  Castle,
  HelpCircle,
  BookOpen,
  Settings,
  LogOut,
  X,
} from "lucide-react"
import { signOut } from "@/app/actions/auth"

/** Routes where the tab bar should be hidden (they have their own bottom bars). */
const HIDDEN_ROUTE_PREFIXES = [
  "/dashboard/goals/setup",
  "/dashboard/tracking/review",
]

const TABS = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard", exact: true },
  { label: "Goals", icon: Aperture, href: "/dashboard/goals", exact: false },
  { label: "Tracking", icon: BarChart3, href: "/dashboard/tracking", exact: false },
  { label: "Scenarios", icon: Swords, href: "/dashboard/scenarios", exact: false },
] as const

const MORE_ITEMS = [
  { label: "The Lair", icon: Castle, href: "/lair" },
  { label: "Ask Coach", icon: HelpCircle, href: "/dashboard/qa" },
  { label: "Articles", icon: BookOpen, href: "/dashboard/articles" },
  { label: "Settings", icon: Settings, href: "/dashboard/settings" },
] as const

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
                className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1 ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
                data-testid={`tab-${tab.label.toLowerCase()}`}
              >
                <tab.icon className="size-5" />
                <span className="text-[11px] leading-tight">{tab.label}</span>
              </Link>
            )
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1 text-muted-foreground"
            data-testid="tab-more"
          >
            <Menu className="size-5" />
            <span className="text-[11px] leading-tight">More</span>
          </button>
        </div>
      </nav>

      {/* "More" bottom sheet */}
      {moreOpen && (
        <div
          className="sm:hidden fixed inset-0 z-50"
          data-testid="more-sheet"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />

          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl border-t border-border pb-safe animate-slide-up">
            {/* Handle + close */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <span className="text-sm font-semibold text-foreground">More</span>
              <button
                onClick={() => setMoreOpen(false)}
                className="text-muted-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Links */}
            <div className="px-3 pb-4 space-y-1">
              {MORE_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg text-foreground hover:bg-muted transition-colors"
                >
                  <item.icon className="size-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              ))}

              {/* Divider */}
              <div className="border-t border-border my-2" />

              {/* Log Out */}
              <form action={signOut}>
                <button
                  type="submit"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg text-foreground hover:bg-muted transition-colors w-full"
                  data-testid="more-logout-button"
                >
                  <LogOut className="size-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Log Out</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Slide-up animation */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slideUp 0.2s ease-out;
        }
      `}</style>
    </>
  )
}
