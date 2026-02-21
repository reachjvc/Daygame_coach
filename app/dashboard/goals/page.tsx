import { createServerSupabaseClient } from "@/src/db/server"
import { AppHeader } from "@/components/AppHeader"
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

  const goalCount = await getUserGoalCount(user.id)
  if (goalCount === 0) {
    redirect("/dashboard/goals/setup")
  }

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader currentPage="other" isLoggedIn={true} hasPurchased={true} />
      <GoalsHubPage />
    </div>
  )
}
