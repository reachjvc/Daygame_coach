import { createServerSupabaseClient } from "./supabase"

export type ValueRow = {
  id: string
  category: string
  display_name: string | null
}

export async function listValues(): Promise<ValueRow[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("values")
    .select("id, category, display_name")

  if (error) {
    throw new Error(`Failed to list values: ${error.message}`)
  }

  return (data ?? []) as ValueRow[]
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
