import { listValues, upsertUserValues } from "@/src/db/valuesRepo"
import type { ValueItem } from "./types"

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

export async function getInnerGameValues(): Promise<ValueItem[]> {
  const values = await listValues()

  return values.map((value) => ({
    id: value.id,
    category: CATEGORY_CODE_TO_LABEL[value.category] ?? value.category,
    display_name: value.display_name,
  }))
}

export async function saveInnerGameValueSelection(
  userId: string,
  valueIds: string[]
): Promise<void> {
  const uniqueValueIds = Array.from(new Set(valueIds))

  if (uniqueValueIds.length === 0) {
    return
  }

  await upsertUserValues(userId, uniqueValueIds)
}
