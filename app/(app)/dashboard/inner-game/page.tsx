import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/src/db/server"
import { InnerGamePage } from "@/src/inner-game"

export default async function DashboardInnerGamePage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // The proxy sends a signed-out visitor to sign in before this runs; this line
  // is for the type checker and for defence in depth.
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("has_purchased")
    .eq("id", user.id)
    .single()

  // Preview mode for users without subscription
  if (!profile?.has_purchased) {
    return (
      <div className="min-h-dvh bg-background">
        <main className="mx-auto max-w-2xl px-4 py-12">
          <InnerGamePage isPreviewMode={true} />
        </main>
      </div>
    )
  }

  // Full access
  return (
    <div className="min-h-dvh bg-background">
      <InnerGamePage isPreviewMode={false} />
    </div>
  )
}
