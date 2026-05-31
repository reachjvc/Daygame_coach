import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getGoalTree, getUserGoals } from "@/src/db/goalRepo"
import { getProgress } from "@/src/db/innerGameProgressRepo"
import { getUserValueIds } from "@/src/db/valuesRepo"
import { getUserTimezone } from "@/src/db/settingsRepo"
import { flattenTree } from "@/src/goals/goalsService"
import type { TreeOfLifeData } from "@/src/goals/types"

export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    const tz = await getUserTimezone(auth.userId)
    const [tree, progress, selectedValues] = await Promise.all([
      getGoalTree(auth.userId, false, tz),
      getProgress(auth.userId),
      getUserValueIds(auth.userId),
    ])

    const goals = flattenTree(tree)

    // Extract core values (roots) and aspirational values
    const roots = progress?.final_core_values as { id: string; rank: number }[] | null
    const aspirational = progress?.aspirational_values as { id: string }[] | null

    // Build alignment map: goalId → aligned value IDs
    const alignmentMap: Record<string, string[]> = {}
    for (const goal of goals) {
      if (goal.aligned_values && goal.aligned_values.length > 0) {
        alignmentMap[goal.id] = goal.aligned_values
      }
    }

    // Soil density: how many values the user has explored (0-1)
    const soilDensity = Math.min(1, (selectedValues?.length ?? 0) / 300)

    const data: TreeOfLifeData = {
      tree,
      goals,
      roots: roots ?? null,
      aspirational: aspirational?.map((v) => v.id) ?? null,
      soilDensity,
      alignmentMap,
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error getting tree of life data:", error)
    return NextResponse.json({ error: "Failed to get tree of life data" }, { status: 500 })
  }
}
