import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/src/db/server"
import { OnboardingFlow } from "@/src/profile/components"

interface PreferencesPageProps {
  searchParams: Promise<{ step?: string }>
}

export default async function PreferencesPage({ searchParams }: PreferencesPageProps) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const params = await searchParams
  const stepParam = params?.step
  const initialStep = stepParam ? Math.min(Math.max(Number(stepParam), 1), 5) : undefined

  return <OnboardingFlow initialStep={initialStep} />
}
