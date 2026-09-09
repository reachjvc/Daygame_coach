"use server"

import { createServerSupabaseClient } from "@/src/db/server"
import { safeNextPath } from "@/src/shared/safeRedirect"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import {
  saveDatingPreferencesForUser,
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

/**
 * Save the dating-preferences gate. Called from the one screen that collects
 * them, whether that screen is standing in front of scenarios or reached from
 * `/preferences` to change an answer later.
 */
export async function saveDatingPreferences(formData: FormData) {
  const userId = await requireAuth()

  const archetypes = (formData.getAll("archetype") as string[]).filter(
    (name) => typeof name === "string" && name.length > 0
  )

  await saveDatingPreferencesForUser(userId, {
    region: formData.get("region") as string,
    archetypes,
    userIsForeign: formData.get("userIsForeign") === "true",
    datingForeigners: formData.get("datingForeigners") === "true",
    ageRangeStart: Number(formData.get("ageRangeStart")),
    ageRangeEnd: Number(formData.get("ageRangeEnd")),
    secondaryRegion: (formData.get("secondaryRegion") as string) || null,
  })

  // Both surfaces that render the gate read the profile on the server.
  revalidatePath("/dashboard/scenarios")
  revalidatePath("/preferences")
  revalidatePath("/dashboard")

  /* `next` comes from the page, but it rides in a form field the browser owns,
     so it is user input. `safeNextPath` is the existing owner of that rule --
     it rejects "//evil.com" and "/\evil.com", which a bare startsWith("/") lets
     straight through as an off-site redirect. */
  const next = formData.get("next")
  redirect(safeNextPath(typeof next === "string" ? next : null, "/dashboard"))
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
