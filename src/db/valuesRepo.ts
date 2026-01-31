import { createServerSupabaseClient } from "./supabase"

export type ValueRow = {
  id: string
  category: string
  display_name: string | null
}

function isMissingColumnError(error: { message?: string } | null, columnName: string): boolean {
  const message = (error?.message ?? "").toLowerCase()
  return message.includes(`column values.${columnName}`) && message.includes("does not exist")
}

export async function listValues(): Promise<ValueRow[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("values")
    .select("id, category, display_name")

  if (!error) {
    return (data ?? []) as ValueRow[]
  }

  // Backward-compat: older schemas may not have display_name.
  if (isMissingColumnError(error, "display_name")) {
    const retry = await supabase.from("values").select("id, category")

    if (retry.error) {
      throw new Error(`Failed to list values: ${retry.error.message}`)
    }

    return ((retry.data ?? []) as Array<{ id: string; category: string }>).map((row) => ({
      ...row,
      display_name: null,
    }))
  }

  throw new Error(`Failed to list values: ${error.message}`)
}

export async function getUserValueIds(userId: string): Promise<string[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("user_values")
    .select("value_id")
    .eq("user_id", userId)

  if (error) {
    throw new Error(`Failed to get user values: ${error.message}`)
  }

  return (data ?? []).map(v => v.value_id)
}

export async function upsertUserValues(
  userId: string,
  valueIds: string[]
): Promise<void> {
  const supabase = await createServerSupabaseClient()

  const rows = valueIds.map((valueId) => ({
    user_id: userId,
    value_id: valueId,
  }))

  const { error } = await supabase
    .from("user_values")
    .upsert(rows, { onConflict: "user_id,value_id" })

  if (error) {
    throw new Error(`Failed to save user values: ${error.message}`)
  }
}
