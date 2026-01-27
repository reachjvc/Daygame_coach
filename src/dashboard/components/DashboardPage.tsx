import { redirect } from "next/navigation"
import Link from "next/link"
import { createServerSupabaseClient } from "@/src/db/server"
import { HelpCircle, LogOut, Settings, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { signOut } from "@/app/actions/auth"
import { DashboardContent } from "./DashboardContent"
import type { DashboardProfileData } from "../types"

export async function DashboardPage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Preview mode for non-logged-in users
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        {/* Preview Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur">
          <div className="mx-auto max-w-6xl flex h-16 items-center justify-between px-8">
            <div className="flex items-center gap-2 font-bold text-xl text-foreground">
              <Target className="size-6 text-primary" />
              <span>DayGame Coach</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                <span className="text-sm text-amber-600 font-medium">Preview Mode</span>
              </div>
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
            </div>
          </div>
        </header>

        {/* Main Content - Preview Mode */}
        <DashboardContent profileData={null} isPreviewMode={true} />
      </div>
    )
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("has_purchased, onboarding_completed, level, xp, scenarios_completed, age_range_start, age_range_end, archetype, secondary_archetype, tertiary_archetype, dating_foreigners, user_is_foreign, preferred_region, secondary_region, experience_level, primary_goal")
    .eq("id", user.id)
    .single()

  // Users must be premium (has_purchased) to access features
  if (!profile?.has_purchased) {
    return (
      <div className="min-h-screen bg-background">
        {/* Logged in but no subscription header */}
        <header className="border-b border-border bg-card/50 backdrop-blur">
          <div className="mx-auto max-w-6xl flex h-16 items-center justify-between px-8">
            <div className="flex items-center gap-2 font-bold text-xl text-foreground">
              <Target className="size-6 text-primary" />
              <span>DayGame Coach</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                <span className="text-sm text-amber-600 font-medium">Preview Mode</span>
              </div>
              <form action={signOut}>
                <Button variant="ghost" type="submit" className="text-foreground hover:text-primary">
                  <LogOut className="size-4 mr-2" />
                  Sign Out
                </Button>
              </form>
              <Link href="/#pricing">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Subscribe
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content - Preview Mode (logged in but no subscription) */}
        <DashboardContent profileData={null} isPreviewMode={true} />
      </div>
    )
  }

  // Onboarding check
  if (!profile?.onboarding_completed) {
    redirect("/preferences")
  }

  const profileData: DashboardProfileData = {
    has_purchased: profile.has_purchased,
    onboarding_completed: profile.onboarding_completed,
    level: profile.level ?? 1,
    xp: profile.xp ?? 0,
    scenarios_completed: profile.scenarios_completed ?? 0,
    age_range_start: profile.age_range_start ?? 22,
    age_range_end: profile.age_range_end ?? 25,
    archetype: profile.archetype ?? "",
    secondary_archetype: profile.secondary_archetype,
    tertiary_archetype: profile.tertiary_archetype,
    dating_foreigners: profile.dating_foreigners ?? false,
    user_is_foreign: profile.user_is_foreign,
    preferred_region: profile.preferred_region,
    secondary_region: profile.secondary_region,
    experience_level: profile.experience_level,
    primary_goal: profile.primary_goal,
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="mx-auto max-w-6xl flex h-16 items-center justify-between px-8">
          <div className="flex items-center gap-2 font-bold text-xl text-foreground">
            <Target className="size-6 text-primary" />
            <span>DayGame Coach</span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="text-foreground hover:text-primary">
              <Link href="/dashboard/qa">
                <HelpCircle className="size-4 mr-2" />
                Ask Coach
              </Link>
            </Button>
            <Button asChild variant="ghost" className="text-foreground hover:text-primary">
              <Link href="/dashboard/settings">
                <Settings className="size-4 mr-2" />
                Settings
              </Link>
            </Button>
            <form action={signOut}>
              <Button variant="ghost" type="submit" className="text-foreground hover:text-primary">
                <LogOut className="size-4 mr-2" />
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <DashboardContent profileData={profileData} isPreviewMode={false} />
    </div>
  )
}
