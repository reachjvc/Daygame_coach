import valuesRaw from "../src/inner-game/data/values.json"
import categoriesRaw from "../src/inner-game/data/categories.json"
import { createAdminSupabaseClient } from "../src/db/supabase"

type RawValue = { id: string; category: string }

type RawCategoryGroup = {
  id: string
  label: string
  color: string
  values: string[]
}

const CATEGORY_CODE_TO_LABEL: Record<string, string> = {
  DISC: "Discipline",
  DRIVE: "Drive",
  EMO: "Emotion",
  ETH: "Ethics",
  FREE: "Freedom",
  GROW: "Growth",
  ID: "Identity",
  PLAY: "Play",
  PURP: "Purpose",
  SOC: "Social",
}

function normalizeValueId(valueLabel: string): string {
  return valueLabel
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_/, "")
    .replace(/_$/, "")
}

function buildDisplayNameById(): Map<string, string> {
  const groups = categoriesRaw as RawCategoryGroup[]
  const map = new Map<string, string>()

  for (const group of groups) {
    for (const valueLabel of group.values) {
      const id = normalizeValueId(valueLabel)
      if (!map.has(id)) {
        map.set(id, valueLabel)
      }
    }
  }

  return map
}

function isMissingColumnError(error: { message?: string } | null, columnName: string): boolean {
  const message = (error?.message ?? "").toLowerCase()
  return message.includes(`column values.${columnName}`) && message.includes("does not exist")
}

async function main() {
  const supabase = createAdminSupabaseClient()

  const values = valuesRaw as RawValue[]
  const displayNameById = buildDisplayNameById()

  const rowsWithDisplayName = values.map((value) => ({
    id: value.id,
    category: CATEGORY_CODE_TO_LABEL[value.category] ?? value.category,
    display_name: displayNameById.get(value.id) ?? null,
  }))

  const attempt = await supabase
    .from("values")
    .upsert(rowsWithDisplayName, { onConflict: "id" })

  if (!attempt.error) {
    console.log(`Seeded ${rowsWithDisplayName.length} values into Supabase table "values".`)
    return
  }

  if (isMissingColumnError(attempt.error, "display_name")) {
    const rows = rowsWithDisplayName.map(({ id, category }) => ({ id, category }))
    const retry = await supabase
      .from("values")
      .upsert(rows, { onConflict: "id" })

    if (retry.error) {
      throw new Error(`Failed to seed values: ${retry.error.message}`)
    }

    console.log(
      `Seeded ${rows.length} values into Supabase table "values" (without display_name column).`
    )
    return
  }

  throw new Error(`Failed to seed values: ${attempt.error.message}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
