import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/src/db/server"
import { ArchetypeSelector } from "@/src/profile/components"

export default async function ArchetypesPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("age_range_start, age_range_end, archetype, secondary_archetype, tertiary_archetype, preferred_region")
    .eq("id", user.id)
    .single()

  if (!profile) {
    redirect("/preferences")
  }

  return (
    <ArchetypeSelector
      ageRangeStart={profile.age_range_start ?? 22}
      ageRangeEnd={profile.age_range_end ?? 25}
      initialArchetype={profile.archetype}
      initialSecondaryArchetype={profile.secondary_archetype}
      initialTertiaryArchetype={profile.tertiary_archetype}
      region={profile.preferred_region ?? undefined}
    />
  )
}
