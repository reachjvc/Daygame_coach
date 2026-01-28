import { createServerSupabaseClient } from "@/src/db/supabase"
import { redirect } from "next/navigation"
import { ProgressDashboard } from "@/src/tracking"

export default async function TrackingPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  return <ProgressDashboard />
}
