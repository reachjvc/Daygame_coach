import Link from "next/link"
import { AppLogo } from "@/components/AppLogo"
import { Button } from "@/components/ui/button"
import { MobileNav, type MobileNavItem } from "@/components/MobileNav"

/**
 * THE SALES PAGE'S HEADER, for a visitor who is not signed in.
 *
 * It used to be mounted on five signed-in pages too, each passing which page it
 * was, while every other page drew its own header or none. Signed in, every
 * page (the home page included) now wears one frame, `components/AppFrame.tsx`,
 * built from the same list as the tab bar. This header offers what a visitor
 * can actually open: sign in, and sign up. It also offered "Dashboard" and
 * "Articles", but every page behind them asks a visitor to sign in first.
 */
export function AppHeader() {
  const navItems: MobileNavItem[] = [
    {
      type: "link",
      href: "/auth/login",
      label: "Login",
      variant: "ghost",
      className: "text-foreground hover:text-primary",
    },
  ]
  const ctaItems: MobileNavItem[] = [
    { type: "link", href: "/auth/sign-up", label: "Get Started", variant: "default" },
  ]

  const renderDesktopItem = (item: MobileNavItem) =>
    item.type === "link" ? (
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
    ) : null

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
