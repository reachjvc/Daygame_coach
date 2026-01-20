"use server"

import { createClient } from "@/src/db/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { REGIONS } from "@/src/profile/data/regions"

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Extract form data
  const ageRangeStart = Number(formData.get("ageRangeStart"))
  const ageRangeEnd = Number(formData.get("ageRangeEnd"))
  const userIsForeign = formData.get("userIsForeign") === "true"
  const datingForeigners = formData.get("datingForeigners") === "true"
  const region = formData.get("region") as string
  const archetype = formData.get("archetype") as string
  const secondaryArchetypeRaw = (formData.get("secondaryArchetype") as string) || null
  const tertiaryArchetypeRaw = (formData.get("tertiaryArchetype") as string) || null
  const secondaryArchetype =
    secondaryArchetypeRaw && secondaryArchetypeRaw !== archetype
      ? secondaryArchetypeRaw
      : null
  const tertiaryArchetype =
    tertiaryArchetypeRaw &&
    tertiaryArchetypeRaw !== archetype &&
    tertiaryArchetypeRaw !== secondaryArchetype
      ? tertiaryArchetypeRaw
      : null
  const experienceLevel = formData.get("experienceLevel") as string
  const primaryGoal = formData.get("primaryGoal") as string

  // Map experience level to initial user level
  const initialLevel = getInitialLevelFromExperience(experienceLevel)

  // Update profiles table
  const { error } = await supabase
    .from("profiles")
    .update({
      age_range_start: ageRangeStart,
      age_range_end: ageRangeEnd,
      user_is_foreign: userIsForeign,
      dating_foreigners: datingForeigners,
      preferred_region: region,
      archetype: archetype,
      secondary_archetype: secondaryArchetype,
      tertiary_archetype: tertiaryArchetype,
      experience_level: experienceLevel,
      primary_goal: primaryGoal,
      level: initialLevel,
      onboarding_completed: true,
    })
    .eq("id", user.id)

  if (error) {
    console.error("Error completing onboarding:", error)
    throw new Error("Failed to complete onboarding")
  }

  redirect("/dashboard")
}

function getInitialLevelFromExperience(experienceLevel: string): number {
  switch (experienceLevel) {
    case "complete-beginner":
      return 1
    case "newbie":
      return 3
    case "intermediate":
      return 7
    case "advanced":
      return 12
    case "expert":
      return 18
    default:
      return 1
  }
}

export async function updateSecondaryRegion(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("preferred_region")
    .eq("id", user.id)
    .single()

  if (profileError) {
    console.error("Error loading profile for secondary region update:", profileError)
    throw new Error("Failed to load profile")
  }

  const primaryRegion = profile?.preferred_region || null
  const secondaryRegionRaw = (formData.get("secondaryRegion") as string) || ""
  const secondaryRegion =
    secondaryRegionRaw && secondaryRegionRaw !== primaryRegion ? secondaryRegionRaw : null

  const { error } = await supabase
    .from("profiles")
    .update({ secondary_region: secondaryRegion })
    .eq("id", user.id)

  if (error) {
    console.error("Error updating secondary region:", error)
    throw new Error("Failed to update secondary region")
  }

  revalidatePath("/dashboard")
}

export async function updateProfilePreference(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const preferenceKey = formData.get("preferenceKey") as string
  const preferenceValue = formData.get("preferenceValue") as string

  const booleanKeys = new Set(["user_is_foreign", "dating_foreigners"])
  const experienceLevels = new Set([
    "complete-beginner",
    "newbie",
    "intermediate",
    "advanced",
    "expert",
  ])
  const primaryGoals = new Set([
    "get-numbers",
    "have-conversations",
    "build-confidence",
    "find-dates",
  ])

  const updates: Record<string, unknown> = {}

  if (booleanKeys.has(preferenceKey)) {
    updates[preferenceKey] = preferenceValue === "true"
  } else if (preferenceKey === "experience_level") {
    if (!experienceLevels.has(preferenceValue)) {
      throw new Error("Invalid experience level")
    }
    updates[preferenceKey] = preferenceValue
  } else if (preferenceKey === "primary_goal") {
    if (!primaryGoals.has(preferenceValue)) {
      throw new Error("Invalid primary goal")
    }
    updates[preferenceKey] = preferenceValue
  } else {
    throw new Error("Invalid preference key")
  }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)

  if (error) {
    console.error("Error updating preference:", error)
    throw new Error("Failed to update preference")
  }

  revalidatePath("/dashboard")
  redirect("/dashboard")
}

export async function updatePreferredRegion(regionId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const regionIds = new Set(REGIONS.map((region) => region.id))
  if (!regionIds.has(regionId)) {
    throw new Error("Invalid region")
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("secondary_region")
    .eq("id", user.id)
    .single()

  if (profileError) {
    console.error("Error loading profile for region update:", profileError)
    throw new Error("Failed to load profile")
  }

  const updates: Record<string, unknown> = { preferred_region: regionId }
  if (profile?.secondary_region === regionId) {
    updates.secondary_region = null
  }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)

  if (error) {
    console.error("Error updating preferred region:", error)
    throw new Error("Failed to update preferred region")
  }

  revalidatePath("/dashboard")
}

export async function updateSecondaryRegionDirect(regionId: string | null) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const regionIds = new Set(REGIONS.map((region) => region.id))
  if (regionId && !regionIds.has(regionId)) {
    throw new Error("Invalid region")
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("preferred_region")
    .eq("id", user.id)
    .single()

  if (profileError) {
    console.error("Error loading profile for secondary update:", profileError)
    throw new Error("Failed to load profile")
  }

  const nextSecondary =
    regionId && regionId !== profile?.preferred_region ? regionId : null

  const { error } = await supabase
    .from("profiles")
    .update({ secondary_region: nextSecondary })
    .eq("id", user.id)

  if (error) {
    console.error("Error updating secondary region:", error)
    throw new Error("Failed to update secondary region")
  }

  revalidatePath("/dashboard")
}

export async function updateAgeRange(ageRangeStart: number, ageRangeEnd: number) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const start = Number(ageRangeStart)
  const end = Number(ageRangeEnd)
  if (Number.isNaN(start) || Number.isNaN(end)) {
    throw new Error("Invalid age range")
  }

  const clampedStart = Math.max(18, Math.min(start, 45))
  const clampedEnd = Math.max(18, Math.min(end, 45))
  const finalStart = Math.min(clampedStart, clampedEnd)
  const finalEnd = Math.max(clampedStart, clampedEnd)

  const { error } = await supabase
    .from("profiles")
    .update({ age_range_start: finalStart, age_range_end: finalEnd })
    .eq("id", user.id)

  if (error) {
    console.error("Error updating age range:", error)
    throw new Error("Failed to update age range")
  }

  revalidatePath("/dashboard")
}

export async function updateArchetypes(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const archetype = (formData.get("archetype") as string) || null
  if (!archetype) {
    throw new Error("Archetype is required")
  }

  const secondaryArchetypeRaw = (formData.get("secondaryArchetype") as string) || null
  const tertiaryArchetypeRaw = (formData.get("tertiaryArchetype") as string) || null

  const secondaryArchetype =
    secondaryArchetypeRaw && secondaryArchetypeRaw !== archetype
      ? secondaryArchetypeRaw
      : null
  const tertiaryArchetype =
    tertiaryArchetypeRaw &&
    tertiaryArchetypeRaw !== archetype &&
    tertiaryArchetypeRaw !== secondaryArchetype
      ? tertiaryArchetypeRaw
      : null

  const { error } = await supabase
    .from("profiles")
    .update({
      archetype,
      secondary_archetype: secondaryArchetype,
      tertiary_archetype: tertiaryArchetype,
    })
    .eq("id", user.id)

  if (error) {
    console.error("Error updating archetypes:", error)
    throw new Error("Failed to update archetypes")
  }

  revalidatePath("/dashboard")
  redirect("/dashboard")
}
