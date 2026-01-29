import { redirect } from "next/navigation"
import { createServerSupabaseClient, getProfile } from "@/src/db/server"
import { AppHeader } from "@/components/AppHeader"
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
        <AppHeader currentPage="dashboard" isLoggedIn={false} isPreviewMode={true} />
        <DashboardContent profileData={null} isPreviewMode={true} />
      </div>
    )
  }

  const profile = await getProfile(user.id)

  // Users must be premium (has_purchased) to access features
  if (!profile?.has_purchased) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader currentPage="dashboard" isLoggedIn={true} hasPurchased={false} isPreviewMode={true} />
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
    user_is_foreign: profile.user_is_foreign ?? undefined,
    preferred_region: profile.preferred_region ?? undefined,
    secondary_region: profile.secondary_region ?? undefined,
    experience_level: profile.experience_level ?? undefined,
    primary_goal: profile.primary_goal ?? undefined,
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader currentPage="dashboard" isLoggedIn={true} hasPurchased={true} />
      <DashboardContent profileData={profileData} isPreviewMode={false} />
    </div>
  )
}
