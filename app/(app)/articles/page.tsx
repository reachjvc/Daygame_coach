import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/src/db/server"
import { ArticlesPage } from "@/src/articles"

export default async function DashboardArticlesPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  // The proxy sends a signed-out visitor to sign in before this runs; this line
  // is for the type checker and for defence in depth.
  if (!user) redirect("/auth/login")

  return (
    <div className="min-h-dvh bg-background">
      <ArticlesPage />
    </div>
  )
}
