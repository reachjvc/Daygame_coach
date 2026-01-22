import { listValues, upsertUserValues } from "@/src/db/valuesRepo"
import type { ValueItem } from "./types"

export async function getInnerGameValues(): Promise<ValueItem[]> {
  return listValues()
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
