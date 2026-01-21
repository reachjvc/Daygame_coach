"use server"

import { createServerSupabaseClient } from "@/src/db/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import {
  completeOnboardingForUser,
  updateSecondaryRegionForUser,
  updatePreferenceForUser,
  updatePreferredRegionForUser,
  updateSecondaryRegionDirectForUser,
  updateAgeRangeForUser,
  updateArchetypesForUser,
} from "./profileService"

/**
 * Get the authenticated user ID or redirect to login.
 */
async function requireAuth(): Promise<string> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return user.id
}

export async function completeOnboarding(formData: FormData) {
  const userId = await requireAuth()

  const data = {
    ageRangeStart: Number(formData.get("ageRangeStart")),
    ageRangeEnd: Number(formData.get("ageRangeEnd")),
    userIsForeign: formData.get("userIsForeign") === "true",
    datingForeigners: formData.get("datingForeigners") === "true",
    region: formData.get("region") as string,
    archetype: formData.get("archetype") as string,
    secondaryArchetype: (formData.get("secondaryArchetype") as string) || null,
    tertiaryArchetype: (formData.get("tertiaryArchetype") as string) || null,
    experienceLevel: formData.get("experienceLevel") as string,
    primaryGoal: formData.get("primaryGoal") as string,
  }

  await completeOnboardingForUser(userId, data)

  redirect("/dashboard")
}

export async function updateSecondaryRegion(formData: FormData) {
  const userId = await requireAuth()

  const secondaryRegion = (formData.get("secondaryRegion") as string) || null

  await updateSecondaryRegionForUser(userId, secondaryRegion)

  revalidatePath("/dashboard")
}

export async function updateProfilePreference(formData: FormData) {
  const userId = await requireAuth()

  const preferenceKey = formData.get("preferenceKey") as string
  const preferenceValue = formData.get("preferenceValue") as string

  await updatePreferenceForUser(userId, {
    key: preferenceKey,
    value: preferenceValue,
  })

  revalidatePath("/dashboard")
  redirect("/dashboard")
}

export async function updatePreferredRegion(regionId: string) {
  const userId = await requireAuth()

  await updatePreferredRegionForUser(userId, regionId)

  revalidatePath("/dashboard")
}

export async function updateSecondaryRegionDirect(regionId: string | null) {
  const userId = await requireAuth()

  await updateSecondaryRegionDirectForUser(userId, regionId)

  revalidatePath("/dashboard")
}

export async function updateAgeRange(ageRangeStart: number, ageRangeEnd: number) {
  const userId = await requireAuth()

  await updateAgeRangeForUser(userId, ageRangeStart, ageRangeEnd)

  revalidatePath("/dashboard")
}

export async function updateArchetypes(formData: FormData) {
  const userId = await requireAuth()

  const data = {
    archetype: (formData.get("archetype") as string) || "",
    secondaryArchetype: (formData.get("secondaryArchetype") as string) || null,
    tertiaryArchetype: (formData.get("tertiaryArchetype") as string) || null,
  }

  await updateArchetypesForUser(userId, data)

  revalidatePath("/dashboard")
  redirect("/dashboard")
}
