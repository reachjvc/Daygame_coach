import { redirect } from "next/navigation"
import { createServerSupabaseClient, getProfile } from "@/src/db/server"
import { AppHeader } from "@/components/AppHeader"
import { MobileTabBar } from "@/components/MobileTabBar"
import { DashboardContent } from "./DashboardContent"
import type { DashboardProfileData } from "../types"

import type { ProfileRow } from "@/src/db"

/**
 * One place that turns a profile row into what the dashboard renders.
 *
 * Both the unsubscribed and the subscribed view need this. Building it in only
 * one of them is how a signed-up user ended up being shown Level 1 while their
 * profile said level 7.
 */
function toDashboardProfile(profile: ProfileRow): DashboardProfileData {
  return {
    has_purchased: profile.has_purchased ?? false,
    onboarding_completed: profile.onboarding_completed ?? false,
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
}

export async function DashboardPage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Preview mode for non-logged-in users
  if (!user) {
    return (
      <div className="min-h-dvh bg-background">
        <AppHeader currentPage="dashboard" isLoggedIn={false} isPreviewMode={true} />
        <DashboardContent profileData={null} viewer="visitor" />
      </div>
    )
  }

  const profile = await getProfile(user.id)

  // Users must be premium (has_purchased) to access features
  if (!profile?.has_purchased) {
    return (
      <div className="min-h-dvh bg-background">
        <AppHeader currentPage="dashboard" isLoggedIn={true} hasPurchased={false} isPreviewMode={true} />
        <DashboardContent
          profileData={profile ? toDashboardProfile(profile) : null}
          viewer="unsubscribed"
        />
      </div>
    )
  }

  // Onboarding check
  if (!profile?.onboarding_completed) {
    redirect("/preferences")
  }

  const profileData = toDashboardProfile(profile)

  return (
    <div className="min-h-dvh bg-background pb-tab-bar">
      <AppHeader currentPage="dashboard" isLoggedIn={true} hasPurchased={true} />
      <DashboardContent profileData={profileData} viewer="subscribed" />
      <MobileTabBar />
    </div>
  )
}
