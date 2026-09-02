import { createServerSupabaseClient } from "@/src/db/server"
import { AppHeader } from "@/components/AppHeader"
import { MobileTabBar } from "@/components/MobileTabBar"
import { redirect } from "next/navigation"
import { GoalsHubPage } from "@/src/goals/components/GoalsHubPage"

/**
 * THE ARCHIVED GOALS HUB, still working.
 *
 * It was /dashboard/goals — the tab every paid account used to manage goals in —
 * until the Life Mastery flow at /dashboard/goals/plan became the one goal
 * surface the product keeps. It is here rather than deleted so its decisions can
 * be inspected and any of them carried across; it is expected to be deleted
 * outright once that is done.
 *
 * IT IS NOT A MOCK. Same guards as it had (signed in, paid), same component,
 * same real rows. Creating, editing, incrementing and archiving here all write
 * to the signed-in account exactly as they did in the product.
 *
 * ONE DELIBERATE DIFFERENCE: the live page redirected an empty account to the
 * plan flow. That redirect belonged to it being the front door, and it is not
 * one any more — an empty account should see the empty hub, which is the thing
 * being inspected.
 */
export default async function ArchivedGoalsHubPage() {
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

  return (
    <div className="min-h-dvh bg-background pb-tab-bar">
      <AppHeader currentPage="other" isLoggedIn={true} hasPurchased={true} />
      <GoalsHubPage />
      <MobileTabBar />
    </div>
  )
}
