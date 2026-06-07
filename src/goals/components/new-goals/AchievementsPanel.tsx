"use client"

/**
 * Test-side "real badges" for framework goals: each `fw:tgt:` goal whose target
 * has template-level thresholds (via getAchievementTiers) earns Bronze/Silver/Gold
 * based on its ACTUAL current_value. This is the earned-badge counterpart to the
 * Summary's preview — rendered in the Lab's Track view without touching the
 * production badge engine (which keys on goalGraph L2 nodes the framework skips).
 */

import { getAchievementTiers } from "@/src/goals/data/newGoalFramework"
import type { AchievementTier } from "@/src/goals/data/newGoalFramework"
import type { GoalWithProgress } from "../../types"
import { Award, Lock } from "lucide-react"

const TIER_COLORS: Record<string, string> = { Bronze: "#cd7f32", Silver: "#c0c0c0", Gold: "#fcd34d" }
const FW_TGT = "fw:tgt:"

type BadgeRow = {
  goal: GoalWithProgress
  id: string
  label: string
  value: number
  tiers: AchievementTier[]
  earnedIdx: number
  next: AchievementTier | null
  progress: number
}

export function AchievementsPanel({ goals, onEdit }: { goals: GoalWithProgress[]; onEdit?: (goal: GoalWithProgress) => void }) {
  const badges: BadgeRow[] = []
  for (const g of goals) {
    const tpl = g.template_id ?? ""
    if (!tpl.startsWith(FW_TGT)) continue
    const tiers = getAchievementTiers(tpl.slice(FW_TGT.length))
    if (!tiers) continue
    let earnedIdx = -1
    tiers.forEach((t, i) => { if (g.current_value >= t.value) earnedIdx = i })
    const next = tiers[earnedIdx + 1] ?? null
    const progress = next ? Math.min(100, Math.round((g.current_value / next.value) * 100)) : 100
    badges.push({ goal: g, id: g.id, label: g.title, value: g.current_value, tiers, earnedIdx, next, progress })
  }

  if (badges.length === 0) return null
  const earnedCount = badges.filter((b) => b.earnedIdx >= 0).length

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Award className="size-4 text-zinc-400" />
        <span className="text-sm font-semibold text-white">Achievements</span>
        <span className="text-xs text-zinc-500">{earnedCount} earned</span>
      </div>
      <div className="space-y-2.5">
        {badges.map((b) => (
          <div
            key={b.id}
            onClick={onEdit ? () => onEdit(b.goal) : undefined}
            className={`flex items-center gap-3 flex-wrap ${onEdit ? "cursor-pointer hover:bg-white/5 -mx-2 px-2 py-1 rounded-lg transition-colors" : ""}`}
            title={onEdit ? "Reshape / re-pace this ladder" : undefined}
          >
            <span className="text-xs text-zinc-300" style={{ minWidth: 130 }}>{b.label}</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {b.tiers.map((t, i) => {
                const got = i <= b.earnedIdx
                return (
                  <span
                    key={t.tier}
                    title={`${t.tier}: ${t.value}`}
                    className="text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1"
                    style={got
                      ? { backgroundColor: TIER_COLORS[t.tier] + "22", color: TIER_COLORS[t.tier] }
                      : { backgroundColor: "rgba(255,255,255,0.04)", color: "#52525b" }}
                  >
                    {got ? <Award className="size-2.5" /> : <Lock className="size-2.5" />}
                    {t.value}
                  </span>
                )
              })}
            </div>
            <span className="text-[10px] ml-auto">
              {b.next
                ? <span className="text-zinc-500">{b.value}/{b.next.value} → {b.next.tier} ({b.progress}%)</span>
                : <span className="text-amber-300">Maxed — Gold!</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
