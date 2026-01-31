import Link from "next/link"
import { Beaker, BookOpen, HelpCircle, LayoutDashboard, LogOut, Settings, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { signOut } from "@/app/actions/auth"

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

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur">
      <div className="mx-auto max-w-6xl flex h-16 items-center justify-between px-8">
        {/* Logo */}
        <Link href={isLoggedIn ? "/dashboard" : "/"} className="flex items-center gap-2 font-bold text-xl text-foreground">
          <Target className="size-6 text-primary" />
          <span>DayGame Coach</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-2">
          {/* Preview Mode Badge */}
          {isPreviewMode && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 mr-2">
              <span className="text-sm text-amber-600 font-medium">Preview Mode</span>
            </div>
          )}

          {isLoggedIn ? (
            <>
              {/* Logged in navigation */}
              {showDashboard && (
                <Button asChild variant="ghost" className="text-foreground hover:text-primary" data-testid="header-dashboard-link">
                  <Link href="/dashboard">
                    <LayoutDashboard className="size-4 mr-2" />
                    Dashboard
                  </Link>
                </Button>
              )}
              {showAskCoach && (
                <Button asChild variant="ghost" className="text-foreground hover:text-primary">
                  <Link href="/dashboard/qa">
                    <HelpCircle className="size-4 mr-2" />
                    Ask Coach
                  </Link>
                </Button>
              )}
              {showArticles && (
                <Button asChild variant="ghost" className="text-foreground hover:text-primary">
                  <Link href="/dashboard/articles">
                    <BookOpen className="size-4 mr-2" />
                    Articles
                  </Link>
                </Button>
              )}
              {showSettings && (
                <Button asChild variant="ghost" className="text-foreground hover:text-primary" data-testid="header-settings-link">
                  <Link href="/dashboard/settings">
                    <Settings className="size-4 mr-2" />
                    Settings
                  </Link>
                </Button>
              )}
              {process.env.NODE_ENV === "development" && (
                <Button asChild variant="ghost" className="text-amber-500 hover:text-amber-400">
                  <Link href="/test">
                    <Beaker className="size-4 mr-2" />
                    Test Pages
                  </Link>
                </Button>
              )}
              <form action={signOut}>
                <Button variant="ghost" type="submit" className="text-foreground hover:text-primary" data-testid="header-logout-button">
                  <LogOut className="size-4 mr-2" />
                  Log Out
                </Button>
              </form>
              {/* Subscribe CTA for logged-in users without subscription */}
              {!hasPurchased && (
                <Link href="/#pricing">
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                    Subscribe
                  </Button>
                </Link>
              )}
            </>
          ) : (
            <>
              {/* Logged out navigation */}
              {showDashboard && (
                <Button asChild variant="ghost" className="text-foreground hover:text-primary">
                  <Link href="/dashboard">
                    <LayoutDashboard className="size-4 mr-2" />
                    Dashboard
                  </Link>
                </Button>
              )}
              {showArticles && (
                <Button asChild variant="ghost" className="text-foreground hover:text-primary">
                  <Link href="/dashboard/articles">
                    <BookOpen className="size-4 mr-2" />
                    Articles
                  </Link>
                </Button>
              )}
              <Link href="/auth/login">
                <Button variant="ghost" className="text-foreground hover:text-primary">
                  Login
                </Button>
              </Link>
              <Link href="/auth/sign-up">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
