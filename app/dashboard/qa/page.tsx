import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/src/db/server"
import { AppHeader } from "@/components/AppHeader"
import { QAPage } from "@/src/qa"

export default async function DashboardQAPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect if not logged in
  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("has_purchased")
    .eq("id", user.id)
    .single()

  const hasPurchased = profile?.has_purchased ?? false

  // Redirect if no subscription
  if (!hasPurchased) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader currentPage="qa" isLoggedIn={true} hasPurchased={true} />
      <QAPage />
    </div>
  )
}
