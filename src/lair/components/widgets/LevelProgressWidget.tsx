"use client"

import { useEffect, useState } from "react"
import { Crown } from "lucide-react"
import type { WidgetProps } from "../../types"

interface ProfileData {
  level: number
  xp: number
  scenarios_completed: number
}

const LEVEL_TITLES = [
  "Rookie",
  "Apprentice",
  "Practitioner",
  "Expert",
  "Master",
]

const XP_PER_LEVEL = 100

export function LevelProgressWidget({ collapsed }: WidgetProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchProfile() {
      try {
        // This endpoint would need to be created or we use the existing one
        const res = await fetch("/api/tracking/stats")
        if (res.ok) {
          // For now, mock the level data since it's in profile, not tracking
          setProfile({
            level: 1,
            xp: 0,
            scenarios_completed: 0,
          })
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchProfile()
  }, [])

  if (collapsed) return null

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="animate-pulse bg-muted rounded h-4 w-24" />
        <div className="animate-pulse bg-muted rounded h-3 w-full" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center text-muted-foreground text-sm">
        Unable to load profile
      </div>
    )
  }

  const levelTitle = LEVEL_TITLES[Math.min(profile.level - 1, LEVEL_TITLES.length - 1)]
  const xpInCurrentLevel = profile.xp % XP_PER_LEVEL
  const progressPercent = (xpInCurrentLevel / XP_PER_LEVEL) * 100

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-500">
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <div className="font-bold">Level {profile.level}</div>
            <div className="text-xs text-muted-foreground">{levelTitle}</div>
          </div>
        </div>
        <div className="text-right text-sm">
          <div className="font-medium">{profile.xp} XP</div>
          <div className="text-xs text-muted-foreground">
            {xpInCurrentLevel}/{XP_PER_LEVEL} to next
          </div>
        </div>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-yellow-500 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  )
}
