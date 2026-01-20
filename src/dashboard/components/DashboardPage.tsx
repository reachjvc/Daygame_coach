import { redirect } from "next/navigation"
import Link from "next/link"
import { createServerSupabaseClient } from "@/src/db/server"
import { LogOut, Settings, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { signOut } from "@/app/actions/auth"
import { DashboardContent } from "./DashboardContent"
import type { DashboardProfileData } from "../types"

export async function DashboardPage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("has_purchased, onboarding_completed, level, xp, scenarios_completed, age_range_start, age_range_end, archetype, secondary_archetype, tertiary_archetype, dating_foreigners, user_is_foreign, preferred_region, secondary_region, experience_level, primary_goal")
    .eq("id", user.id)
    .single()

  // Users must be premium (has_purchased) to access features
  if (!profile?.has_purchased) {
    return (
      <div className="container flex flex-col items-center justify-center min-h-screen text-center">
        <h1 className="text-4xl font-bold mb-4">Subscription Required</h1>
        <p className="text-muted-foreground mb-8 text-lg">
          You need to subscribe to access the Daygame Coach.
        </p>
        <Button asChild size="lg">
          <Link href="/">View Pricing</Link>
        </Button>
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
              <Link href="/settings">
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
      <DashboardContent profileData={profileData} />
    </div>
  )
}
