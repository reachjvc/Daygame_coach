import Link from "next/link"
import { LIFE_MASTERY } from "@/src/shared/lifeMasteryRoutes"
import { Beaker, BookOpen, HelpCircle, LayoutDashboard, LogOut, Settings, ScrollText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { signOut } from "@/app/actions/auth"
import { MobileNav, type MobileNavItem } from "@/components/MobileNav"

// "goals" was a page type here until the goals hub was archived; nothing
// identifies as it any more.
/**
 * The pages this header can be on, so it can hide the link to wherever you
 * already are. `"life-mastery"` is in the list although no page passes it yet:
 * this header is mounted on four pages and Life Mastery is not one of them, so
 * the guard below is defensive. Without the member the comparison is a type
 * error, and the two ways to silence that are to delete the guard — which
 * leaves a link to the current page the day somebody mounts this there — or to
 * say out loud that it is a page this header could serve. This is the second.
 */
type CurrentPage =
  | "home"
  | "dashboard"
  | "settings"
  | "qa"
  | "inner-game"
  | "scenarios"
  | "articles"
  | "life-mastery"
  | "other"

interface AppHeaderProps {
  /** Current page identifier - used to hide redundant navigation links */
  currentPage?: CurrentPage
  /** User auth state */
  isLoggedIn: boolean
  /** Whether user has an active subscription */
  hasPurchased?: boolean
  /** Optional preview mode badge */
  isPreviewMode?: boolean
}

/**
 * Consistent header component used across all pages.
 *
 * Navigation order (when logged in with subscription):
 * 1. Dashboard (unless on Dashboard page)
 * 2. Ask Coach (unless on QA page)
 * 3. Settings (unless on Settings page)
 * 4. Log Out
 *
 * Navigation order (when logged out):
 * 1. Dashboard
 * 2. Login
 * 3. Get Started (primary)
 */
export function AppHeader({
  currentPage = "other",
  isLoggedIn,
  hasPurchased = false,
  isPreviewMode = false,
}: AppHeaderProps) {
  const showDashboard = currentPage !== "dashboard"
  const showAskCoach = currentPage !== "qa" && hasPurchased
  const showArticles = currentPage !== "articles"
  const showSettings = currentPage !== "settings" && isLoggedIn

  const navItems: MobileNavItem[] = []
  const ctaItems: MobileNavItem[] = []

  if (isLoggedIn) {
    if (showDashboard) {
      navItems.push({
        type: "link",
        href: "/dashboard",
        label: "Dashboard",
        icon: <LayoutDashboard className="size-4 mr-2" />,
        variant: "ghost",
        className: "text-foreground hover:text-primary",
        testId: "header-dashboard-link",
      })
    }
    /**
     * YOUR PLAN, SO IT IS REACHABLE ON A DESKTOP TOO.
     *
     * `MobileTabBar`'s "More" sheet is `sm:hidden`, so the entry added there on
     * 2026-09-24 only exists below 640px. Without this line Life Mastery — and
     * the whole vice module under it — is reachable on a desktop only by typing
     * the address, which is where it had been since it was built.
     *
     * This landed a few hours after the sheet row did: it needs `ScrollText` in
     * two files, `src/shared/iconRoles.ts` requires an entry for any icon used
     * in more than one, and that file says an entry needs the owner's approval
     * by name. So it was written, reverted, and restored when they gave it.
     *
     * HONEST LIMIT, STATED RATHER THAN PAPERED OVER: this header is mounted on
     * four pages — `/dashboard/qa`, `/dashboard/inner-game`,
     * `/dashboard/articles` and one archived test page — so this makes the plan
     * reachable from those four and no others. Every other desktop page draws
     * its own header. What desktop navigation is for this product is a
     * whole-app question; see `docs/plans/vice-finished.md`, M4.
     */
    if (currentPage !== "life-mastery") {
      navItems.push({
        type: "link",
        href: LIFE_MASTERY,
        label: "Your plan",
        icon: <ScrollText className="size-4 mr-2" />,
        variant: "ghost",
        className: "text-foreground hover:text-primary",
        testId: "header-life-mastery-link",
      })
    }
    // NO LAIR LINK. The Lair was a second goals surface, and the app is being
    // consolidated onto one. Archived on 2026-09-02, deleted outright on
    // 2026-09-09 — slice, repo, API route and Mission Control with it.
    // NO GOALS LINK. The hub is archived at /test/archive/goals-hub, and the
    // navigation is being rebuilt around one consolidated surface rather than a
    // goals entry sitting beside a tracking entry.
    if (showAskCoach) {
      navItems.push({
        type: "link",
        href: "/dashboard/qa",
        label: "Ask Coach",
        icon: <HelpCircle className="size-4 mr-2" />,
        variant: "ghost",
        className: "text-foreground hover:text-primary",
      })
    }
    if (showArticles) {
      navItems.push({
        type: "link",
        href: "/dashboard/articles",
        label: "Articles",
        icon: <BookOpen className="size-4 mr-2" />,
        variant: "ghost",
        className: "text-foreground hover:text-primary",
      })
    }
    if (showSettings) {
      navItems.push({
        type: "link",
        href: "/dashboard/settings",
        label: "Settings",
        icon: <Settings className="size-4 mr-2" />,
        variant: "ghost",
        className: "text-foreground hover:text-primary",
        testId: "header-settings-link",
      })
    }
    if (process.env.NODE_ENV === "development") {
      navItems.push({
        type: "link",
        href: "/test",
        label: "Test Pages",
        icon: <Beaker className="size-4 mr-2" />,
        variant: "ghost",
        className: "text-amber-500 hover:text-amber-400",
      })
    }

    ctaItems.push({
      type: "action",
      label: "Log Out",
      icon: <LogOut className="size-4 mr-2" />,
      action: signOut,
      variant: "ghost",
      className: "text-foreground hover:text-primary",
      testId: "header-logout-button",
    })

    if (!hasPurchased) {
      ctaItems.push({
        type: "link",
        href: "/#pricing",
        label: "Subscribe",
        variant: "default",
      })
    }
  } else {
    if (showDashboard) {
      navItems.push({
        type: "link",
        href: "/dashboard",
        label: "Dashboard",
        icon: <LayoutDashboard className="size-4 mr-2" />,
        variant: "ghost",
        className: "text-foreground hover:text-primary",
      })
    }
    if (showArticles) {
      navItems.push({
        type: "link",
        href: "/dashboard/articles",
        label: "Articles",
        icon: <BookOpen className="size-4 mr-2" />,
        variant: "ghost",
        className: "text-foreground hover:text-primary",
      })
    }
    navItems.push({
      type: "link",
      href: "/auth/login",
      label: "Login",
      variant: "ghost",
      className: "text-foreground hover:text-primary",
    })
    ctaItems.push({
      type: "link",
      href: "/auth/sign-up",
      label: "Get Started",
      variant: "default",
    })
  }

  const renderDesktopItem = (item: MobileNavItem) => {
    if (item.type === "link") {
      return (
        <Button
          key={`${item.label}-${item.href}`}
          asChild
          variant={item.variant ?? "ghost"}
          className={item.className}
          data-testid={item.testId}
        >
          <Link href={item.href}>
            {item.icon}
            {item.label}
          </Link>
        </Button>
      )
    }

    return (
      <form action={item.action} key={item.label}>
        <Button
          variant={item.variant ?? "ghost"}
          type="submit"
          className={item.className}
          data-testid={item.testId}
        >
          {item.icon}
          {item.label}
        </Button>
      </form>
    )
  }

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur backdrop-fallback-card">
      <div className="mx-auto max-w-6xl flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 32 32" className="shrink-0">
            <circle cx="16" cy="16" r="11" fill="none" stroke="#ff6b35" strokeWidth="2"/>
            <circle cx="16" cy="16" r="2.5" fill="#ff6b35"/>
            <line x1="16" y1="1" x2="16" y2="7" stroke="#ff6b35" strokeWidth="2" strokeLinecap="round"/>
            <line x1="16" y1="25" x2="16" y2="31" stroke="#ff6b35" strokeWidth="2" strokeLinecap="round"/>
            <line x1="1" y1="16" x2="7" y2="16" stroke="#ff6b35" strokeWidth="2" strokeLinecap="round"/>
            <line x1="25" y1="16" x2="31" y2="16" stroke="#ff6b35" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span>DayGame Coach</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden sm:flex items-center gap-2">
          {/* Preview Mode Badge */}
          {isPreviewMode && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 mr-2">
              <span className="text-sm text-amber-600 font-medium">Preview Mode</span>
            </div>
          )}
          {navItems.map(renderDesktopItem)}
          {ctaItems.map(renderDesktopItem)}
        </nav>

        <MobileNav items={navItems} ctaItems={ctaItems} isPreviewMode={isPreviewMode} />
      </div>
    </header>
  )
}
