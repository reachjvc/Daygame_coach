import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/src/db/server"
import { SecondaryRegionSelector } from "@/src/profile/components/SecondaryRegionSelector"

export default async function SecondaryRegionPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_region, secondary_region")
    .eq("id", user.id)
    .single()

  if (!profile?.preferred_region) {
    redirect("/preferences")
  }

  return (
    <SecondaryRegionSelector
      primaryRegion={profile.preferred_region}
      initialSecondaryRegion={profile.secondary_region}
    />
  )
}
