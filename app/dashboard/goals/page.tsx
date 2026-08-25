import { createServerSupabaseClient } from "@/src/db/server"
import { AppHeader } from "@/components/AppHeader"
import { MobileTabBar } from "@/components/MobileTabBar"
import { redirect } from "next/navigation"
import { GoalsHubPage } from "@/src/goals/components/GoalsHubPage"
import { getUserGoalCount } from "@/src/db/goalRepo"

export default async function GoalsPage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("has_purchased")
    .eq("id", user.id)
    .single()

  if (!profile?.has_purchased) {
    redirect("/dashboard")
  }

  // Nothing on the account yet: the flow that fills it is Life Mastery now,
  // not the archived setup wizard.
  const goalCount = await getUserGoalCount(user.id)
  if (goalCount === 0) {
    redirect("/dashboard/goals/plan")
  }

  return (
    <div className="min-h-dvh bg-background pb-tab-bar">
      <AppHeader currentPage="other" isLoggedIn={true} hasPurchased={true} />
      <GoalsHubPage />
      <MobileTabBar />
    </div>
  )
}
