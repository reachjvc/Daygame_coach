import { createServerSupabaseClient } from "@/src/db/server"
import { redirect } from "next/navigation"
import { GoalSetupWizard } from "@/src/goals/components/setup/GoalSetupWizard"

export default async function GoalSetupPage() {
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

  return <GoalSetupWizard />
}
