import { redirect } from "next/navigation"
import { createServerSupabaseClient, getProfile } from "@/src/db/server"
import { getUserLairConfig } from "@/src/db/lairRepo"
import { AppHeader } from "@/components/AppHeader"
import { LairContent } from "./LairContent"

export async function LairPageServer() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Require login for The Lair
  if (!user) {
    redirect("/auth/login")
  }

  const profile = await getProfile(user.id)

  // Require premium for The Lair
  if (!profile?.has_purchased) {
    redirect("/dashboard")
  }

  // Require onboarding
  if (!profile?.onboarding_completed) {
    redirect("/preferences")
  }

  // Get user's lair layout
  const layout = await getUserLairConfig(user.id)

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader currentPage="lair" isLoggedIn={true} hasPurchased={true} />
      <LairContent initialLayout={layout} />
    </div>
  )
}
