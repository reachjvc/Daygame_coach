import Link from "next/link"
import { Beaker, BookOpen, HelpCircle, LayoutDashboard, LogOut, Settings, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { signOut } from "@/app/actions/auth"
import { MobileNav, type MobileNavItem } from "@/components/MobileNav"

type CurrentPage = "home" | "dashboard" | "settings" | "qa" | "inner-game" | "scenarios" | "articles" | "other"

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
        <Link href={isLoggedIn ? "/dashboard" : "/"} className="flex items-center gap-2 font-bold text-xl text-foreground">
          <Target className="size-6 text-primary" />
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
