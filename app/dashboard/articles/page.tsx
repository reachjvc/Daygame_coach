import { createServerSupabaseClient } from "@/src/db/server"
import { AppHeader } from "@/components/AppHeader"
import { MobileTabBar } from "@/components/MobileTabBar"
import { ArticlesPage } from "@/src/articles"

export default async function DashboardArticlesPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Articles are publicly accessible - no auth required
  if (!user) {
    return (
      <div className="min-h-dvh bg-background">
        <AppHeader currentPage="articles" isLoggedIn={false} />
        <ArticlesPage />
      </div>
    )
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("has_purchased")
    .eq("id", user.id)
    .single()

  const hasPurchased = profile?.has_purchased ?? false

  return (
    <div className="min-h-dvh bg-background pb-tab-bar">
      <AppHeader currentPage="articles" isLoggedIn={true} hasPurchased={hasPurchased} />
      <ArticlesPage />
      {hasPurchased && <MobileTabBar />}
    </div>
  )
}
