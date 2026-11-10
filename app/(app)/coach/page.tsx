import { redirect } from "next/navigation"
import { PAYWALL_HREF } from "@/src/hometab"
import { createServerSupabaseClient } from "@/src/db/server"
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

  // No subscription: to the plans, the same place Home's locked Coach tile
  // goes (`tileAccess`). It sent them to the Dashboard with nothing said,
  // which from a typed or bookmarked address looked like a broken link.
  if (!hasPurchased) {
    redirect(PAYWALL_HREF)
  }

  return (
    <div className="min-h-dvh bg-background">
      <QAPage />
    </div>
  )
}
