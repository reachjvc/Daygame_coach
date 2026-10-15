import Link from "next/link"
import { ROUTES } from "@/src/shared/routes"
import { Beaker, BookOpen, HelpCircle, LayoutDashboard, LogOut, Settings, ScrollText } from "lucide-react"
import { AppLogo } from "@/components/AppLogo"
import { Button } from "@/components/ui/button"
import { signOut } from "@/app/actions/auth"
import { MobileNav, type MobileNavItem } from "@/components/MobileNav"

interface AppHeaderProps {
  /** User auth state */
  isLoggedIn: boolean
  /** Whether user has an active subscription */
  hasPurchased?: boolean
}

/**
 * THE PUBLIC HOME PAGE'S HEADER, and nothing else's.
 *
 * It used to be mounted on five signed-in pages, each passing which page it
 * was so it could hide its own link, and every other page drew its own header
 * or none. The signed-in app now has one frame (`components/AppFrame.tsx`,
 * from `app/(app)/layout.tsx`), and this serves the page outside it: the home
 * page, signed in or out (plus one archived lab page).
 *
 * Signed out it offers sign-in and sign-up only. It also offered "Dashboard"
 * and "Articles", but every page behind them asks a signed-out visitor to sign
 * in first, so both were the login page under another name.
 */
export function AppHeader({ isLoggedIn, hasPurchased = false }: AppHeaderProps) {
  const navItems: MobileNavItem[] = []
  const ctaItems: MobileNavItem[] = []

  if (isLoggedIn) {
    navItems.push({
      type: "link",
      href: ROUTES.dashboard,
      label: "Dashboard",
      icon: <LayoutDashboard className="size-4 mr-2" />,
      variant: "ghost",
      className: "text-foreground hover:text-primary",
      testId: "header-dashboard-link",
    })
    navItems.push({
      type: "link",
      href: ROUTES.plan,
      label: "Your plan",
      icon: <ScrollText className="size-4 mr-2" />,
      variant: "ghost",
      className: "text-foreground hover:text-primary",
      testId: "header-life-mastery-link",
    })
    if (hasPurchased) {
      navItems.push({
        type: "link",
        href: ROUTES.coach,
        label: "Ask Coach",
        icon: <HelpCircle className="size-4 mr-2" />,
        variant: "ghost",
        className: "text-foreground hover:text-primary",
      })
    }
    navItems.push({
      type: "link",
      href: ROUTES.articles,
      label: "Articles",
      icon: <BookOpen className="size-4 mr-2" />,
      variant: "ghost",
      className: "text-foreground hover:text-primary",
    })
    navItems.push({
      type: "link",
      href: ROUTES.settings,
      label: "Settings",
      icon: <Settings className="size-4 mr-2" />,
      variant: "ghost",
      className: "text-foreground hover:text-primary",
      testId: "header-settings-link",
    })
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
        <AppLogo />

        <nav className="hidden sm:flex items-center gap-2">
          {navItems.map(renderDesktopItem)}
          {ctaItems.map(renderDesktopItem)}
        </nav>

        <MobileNav items={navItems} ctaItems={ctaItems} />
      </div>
    </header>
  )
}
