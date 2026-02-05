import { createServerSupabaseClient } from "@/src/db/server"
import { AppHeader } from "@/components/AppHeader"
import { InnerGamePage } from "@/src/inner-game"

export default async function DashboardInnerGamePage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Preview mode for non-logged-in users
  if (!user) {
    return (
      <div className="min-h-dvh bg-background">
        <AppHeader currentPage="inner-game" isLoggedIn={false} isPreviewMode={true} />
        <main className="mx-auto max-w-2xl px-4 py-12">
          <InnerGamePage isPreviewMode={true} />
        </main>
      </div>
    )
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("has_purchased, onboarding_completed")
    .eq("id", user.id)
    .single()

  // Preview mode for users without subscription
  if (!profile?.has_purchased) {
    return (
      <div className="min-h-dvh bg-background">
        <AppHeader currentPage="inner-game" isLoggedIn={true} hasPurchased={false} isPreviewMode={true} />
        <main className="mx-auto max-w-2xl px-4 py-12">
          <InnerGamePage isPreviewMode={true} />
        </main>
      </div>
    )
  }

  // Full access
  return (
    <div className="min-h-dvh bg-background">
      <AppHeader currentPage="inner-game" isLoggedIn={true} hasPurchased={true} />
      <InnerGamePage isPreviewMode={false} />
    </div>
  )
}
