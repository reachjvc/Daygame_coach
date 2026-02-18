"use client"

import { useState, useMemo } from "react"
import {
  Skull,
  ShieldAlert,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Eye,
  Flame,
  Target,
  HeartPulse,
  Briefcase,
  Ghost,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  Activity,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

// ─── Types ───────────────────────────────────────────────────────────────────

interface FearBehavior {
  id: string
  label: string
  invertedGoal: string
  /** 0-100: how far from the nightmare behavior (100 = maximally safe) */
  distanceScore: number
  /** weekly frequency target */
  targetFrequency: string
  /** current streak in days */
  streak: number
  lastCompleted: string | null
}

interface AntiIdentity {
  id: string
  name: string
  tagline: string
  icon: React.ElementType
  color: string
  bgGlow: string
  fearBehaviors: FearBehavior[]
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const ANTI_IDENTITIES: AntiIdentity[] = [
  {
    id: "invisible-man",
    name: "The Invisible Man",
    tagline: "Never talks to women. Dies alone. No one remembers his name.",
    icon: Ghost,
    color: "text-red-500",
    bgGlow: "shadow-red-500/20",
    fearBehaviors: [
      {
        id: "im-1",
        label: "Skips sessions — stays home on weekends",
        invertedGoal: "3 daygame sessions per week",
        distanceScore: 72,
        targetFrequency: "3x/week",
        streak: 5,
        lastCompleted: "2026-02-17",
      },
      {
        id: "im-2",
        label: "Makes excuses — 'not today, too cold, too tired'",
        invertedGoal: "10 approaches per week minimum",
        distanceScore: 58,
        targetFrequency: "10+/week",
        streak: 3,
        lastCompleted: "2026-02-17",
      },
      {
        id: "im-3",
        label: "Hesitates endlessly — watches her walk away",
        invertedGoal: "Open within 3 seconds of spotting",
        distanceScore: 41,
        targetFrequency: "Every approach",
        streak: 0,
        lastCompleted: "2026-02-15",
      },
      {
        id: "im-4",
        label: "Never leaves comfort zone — same 2 spots forever",
        invertedGoal: "1 new venue or area per month",
        distanceScore: 85,
        targetFrequency: "1x/month",
        streak: 12,
        lastCompleted: "2026-02-10",
      },
    ],
  },
  {
    id: "soft-body",
    name: "The Soft Body",
    tagline: "Lets his body decay. Low energy. Women look through him.",
    icon: HeartPulse,
    color: "text-amber-500",
    bgGlow: "shadow-amber-500/20",
    fearBehaviors: [
      {
        id: "sb-1",
        label: "Skips the gym — always 'too busy'",
        invertedGoal: "Gym 4 times per week",
        distanceScore: 88,
        targetFrequency: "4x/week",
        streak: 21,
        lastCompleted: "2026-02-18",
      },
      {
        id: "sb-2",
        label: "Eats junk — convenience over discipline",
        invertedGoal: "Hit protein target daily (160g)",
        distanceScore: 63,
        targetFrequency: "Daily",
        streak: 2,
        lastCompleted: "2026-02-17",
      },
      {
        id: "sb-3",
        label: "Terrible sleep — scrolling until 2am",
        invertedGoal: "8 hours of sleep, phone off by 10pm",
        distanceScore: 35,
        targetFrequency: "Daily",
        streak: 0,
        lastCompleted: "2026-02-14",
      },
      {
        id: "sb-4",
        label: "Zero grooming — looks like he gave up",
        invertedGoal: "Daily skincare + weekly grooming check",
        distanceScore: 77,
        targetFrequency: "Daily",
        streak: 8,
        lastCompleted: "2026-02-18",
      },
    ],
  },
  {
    id: "wage-slave",
    name: "The Wage Slave",
    tagline: "Stuck. No ambition. Trading his life for someone else's dream.",
    icon: Briefcase,
    color: "text-orange-500",
    bgGlow: "shadow-orange-500/20",
    fearBehaviors: [
      {
        id: "ws-1",
        label: "No side projects — all consumption, no creation",
        invertedGoal: "2 hours per week on side project",
        distanceScore: 52,
        targetFrequency: "2hr/week",
        streak: 1,
        lastCompleted: "2026-02-16",
      },
      {
        id: "ws-2",
        label: "Stopped learning — brain rotting on social media",
        invertedGoal: "1 book per month (non-fiction)",
        distanceScore: 68,
        targetFrequency: "1 book/month",
        streak: 4,
        lastCompleted: "2026-02-12",
      },
      {
        id: "ws-3",
        label: "Zero network — no one knows who he is",
        invertedGoal: "2 networking events per month",
        distanceScore: 29,
        targetFrequency: "2x/month",
        streak: 0,
        lastCompleted: "2026-01-20",
      },
    ],
  },
]

// ─── Helper Functions ────────────────────────────────────────────────────────

function getDistanceColor(score: number): string {
  if (score >= 75) return "text-emerald-400"
  if (score >= 50) return "text-amber-400"
  if (score >= 25) return "text-orange-500"
  return "text-red-500"
}

function getDistanceBg(score: number): string {
  if (score >= 75) return "bg-emerald-500/20"
  if (score >= 50) return "bg-amber-500/20"
  if (score >= 25) return "bg-orange-500/20"
  return "bg-red-500/20"
}

function getBarColor(score: number): string {
  if (score >= 75) return "bg-emerald-500"
  if (score >= 50) return "bg-amber-500"
  if (score >= 25) return "bg-orange-500"
  return "bg-red-500"
}

function getBarTrack(score: number): string {
  if (score >= 75) return "bg-emerald-500/10"
  if (score >= 50) return "bg-amber-500/10"
  if (score >= 25) return "bg-orange-500/10"
  return "bg-red-500/10"
}

function getStatusIcon(score: number) {
  if (score >= 75) return <CheckCircle2 className="size-4 text-emerald-400" />
  if (score >= 50) return <Activity className="size-4 text-amber-400" />
  if (score >= 25) return <AlertTriangle className="size-4 text-orange-500" />
  return <XCircle className="size-4 text-red-500" />
}

function getStreakLabel(streak: number): string {
  if (streak === 0) return "Broken"
  if (streak >= 14) return `${streak}d fire`
  return `${streak}d`
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function OverallThreatLevel({ identities }: { identities: AntiIdentity[] }) {
  const allBehaviors = identities.flatMap((i) => i.fearBehaviors)
  const avgDistance =
    allBehaviors.reduce((sum, b) => sum + b.distanceScore, 0) /
    allBehaviors.length
  const criticalCount = allBehaviors.filter((b) => b.distanceScore < 30).length
  const brokenStreaks = allBehaviors.filter((b) => b.streak === 0).length

  const threatLevel =
    avgDistance >= 70 ? "LOW" : avgDistance >= 45 ? "MODERATE" : "CRITICAL"
  const threatColor =
    threatLevel === "LOW"
      ? "text-emerald-400 border-emerald-500/30"
      : threatLevel === "MODERATE"
        ? "text-amber-400 border-amber-500/30"
        : "text-red-400 border-red-500/30 animate-pulse"
  const threatBg =
    threatLevel === "LOW"
      ? "bg-emerald-500/5"
      : threatLevel === "MODERATE"
        ? "bg-amber-500/5"
        : "bg-red-500/5"

  return (
    <div
      className={`rounded-xl border-2 ${threatColor} ${threatBg} p-5 mb-6`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <ShieldAlert
            className={`size-6 ${threatLevel === "CRITICAL" ? "text-red-400" : threatLevel === "MODERATE" ? "text-amber-400" : "text-emerald-400"}`}
          />
          <div>
            <div className="text-xs uppercase tracking-widest text-zinc-500">
              Overall Threat Level
            </div>
            <div
              className={`text-xl font-black tracking-wide ${threatLevel === "CRITICAL" ? "text-red-400" : threatLevel === "MODERATE" ? "text-amber-400" : "text-emerald-400"}`}
            >
              {threatLevel}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black text-zinc-100">
            {Math.round(avgDistance)}
          </div>
          <div className="text-xs text-zinc-500">avg distance</div>
        </div>
      </div>
      <div className="flex gap-6 text-xs">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="size-3.5 text-red-400" />
          <span className="text-zinc-400">
            <span className="font-bold text-red-400">{criticalCount}</span>{" "}
            critical zones
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Flame className="size-3.5 text-orange-400" />
          <span className="text-zinc-400">
            <span className="font-bold text-orange-400">{brokenStreaks}</span>{" "}
            broken streaks
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Target className="size-3.5 text-zinc-400" />
          <span className="text-zinc-400">
            <span className="font-bold text-zinc-200">
              {allBehaviors.length}
            </span>{" "}
            tracked behaviors
          </span>
        </div>
      </div>
    </div>
  )
}

function AccountabilityMirror({
  identities,
}: {
  identities: AntiIdentity[]
}) {
  const avgScores = identities.map((identity) => {
    const avg =
      identity.fearBehaviors.reduce((s, b) => s + b.distanceScore, 0) /
      identity.fearBehaviors.length
    return { identity, avg }
  })

  const overallAvg =
    avgScores.reduce((s, a) => s + a.avg, 0) / avgScores.length

  return (
    <Card className="border-zinc-800 bg-zinc-950 mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Eye className="size-5 text-zinc-400" />
          The Accountability Mirror
        </CardTitle>
        <p className="text-xs text-zinc-500">
          Where you stand right now. The mirror does not lie.
        </p>
      </CardHeader>
      <CardContent>
        {/* Visual spectrum */}
        <div className="relative mb-6">
          {/* Labels */}
          <div className="flex justify-between mb-2 text-xs">
            <span className="text-red-500 font-bold flex items-center gap-1">
              <Skull className="size-3.5" />
              NIGHTMARE
            </span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              IDEAL SELF
              <TrendingUp className="size-3.5" />
            </span>
          </div>

          {/* The bar */}
          <div className="relative h-8 rounded-full bg-gradient-to-r from-red-900/60 via-amber-900/40 to-emerald-900/40 border border-zinc-700 overflow-hidden">
            {/* Danger zone hatch pattern */}
            <div className="absolute inset-y-0 left-0 w-[25%] bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(220,38,38,0.1)_4px,rgba(220,38,38,0.1)_8px)]" />

            {/* Per-identity markers */}
            {avgScores.map(({ identity, avg }) => {
              const Icon = identity.icon
              return (
                <div
                  key={identity.id}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
                  style={{ left: `${avg}%` }}
                  title={`${identity.name}: ${Math.round(avg)}%`}
                >
                  <div
                    className={`size-6 rounded-full border-2 border-zinc-800 flex items-center justify-center ${
                      avg >= 60
                        ? "bg-emerald-600"
                        : avg >= 40
                          ? "bg-amber-600"
                          : "bg-red-600"
                    }`}
                  >
                    <Icon className="size-3.5 text-white" />
                  </div>
                </div>
              )
            })}

            {/* Overall position — "YOU" */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20"
              style={{ left: `${overallAvg}%` }}
            >
              <div className="flex flex-col items-center">
                <div className="text-[10px] font-black text-white bg-zinc-800 px-1.5 py-0.5 rounded-sm border border-zinc-600 -mb-1 relative z-30">
                  YOU
                </div>
                <div className="w-0.5 h-3 bg-white" />
              </div>
            </div>
          </div>

          {/* Scale markers */}
          <div className="flex justify-between mt-1 text-[10px] text-zinc-600 px-1">
            <span>0</span>
            <span>25</span>
            <span>50</span>
            <span>75</span>
            <span>100</span>
          </div>
        </div>

        {/* Per-identity summary row */}
        <div className="grid grid-cols-3 gap-3">
          {avgScores.map(({ identity, avg }) => {
            const Icon = identity.icon
            return (
              <div
                key={identity.id}
                className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-center"
              >
                <Icon className={`size-5 mx-auto mb-1 ${identity.color}`} />
                <div className="text-xs text-zinc-500 mb-1 truncate">
                  {identity.name}
                </div>
                <div
                  className={`text-lg font-black ${getDistanceColor(avg)}`}
                >
                  {Math.round(avg)}
                </div>
                <div className="text-[10px] text-zinc-600">distance</div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function AntiIdentityCard({
  identity,
  isExpanded,
  onToggle,
}: {
  identity: AntiIdentity
  isExpanded: boolean
  onToggle: () => void
}) {
  const Icon = identity.icon
  const avgDistance =
    identity.fearBehaviors.reduce((s, b) => s + b.distanceScore, 0) /
    identity.fearBehaviors.length
  const worstBehavior = identity.fearBehaviors.reduce((worst, b) =>
    b.distanceScore < worst.distanceScore ? b : worst
  )
  const criticalCount = identity.fearBehaviors.filter(
    (b) => b.distanceScore < 30
  ).length

  return (
    <Card
      className={`border-zinc-800 bg-zinc-950 transition-shadow ${identity.bgGlow} ${
        criticalCount > 0 ? "border-red-900/50" : ""
      }`}
    >
      <CardHeader className="pb-2">
        <button
          onClick={onToggle}
          className="flex items-center justify-between w-full text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div
              className={`size-10 rounded-lg flex items-center justify-center ${
                avgDistance < 40
                  ? "bg-red-500/15 border border-red-500/30"
                  : avgDistance < 65
                    ? "bg-amber-500/15 border border-amber-500/30"
                    : "bg-zinc-800 border border-zinc-700"
              }`}
            >
              <Icon className={`size-5 ${identity.color}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{identity.name}</CardTitle>
                {criticalCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="text-[10px] px-1.5 py-0 h-4 animate-pulse"
                  >
                    {criticalCount} CRITICAL
                  </Badge>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-0.5 italic">
                &quot;{identity.tagline}&quot;
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right mr-2">
              <div
                className={`text-xl font-black ${getDistanceColor(avgDistance)}`}
              >
                {Math.round(avgDistance)}
              </div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-wide">
                distance
              </div>
            </div>
            {isExpanded ? (
              <ChevronDown className="size-4 text-zinc-500" />
            ) : (
              <ChevronRight className="size-4 text-zinc-500" />
            )}
          </div>
        </button>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          {/* Worst behavior callout */}
          {worstBehavior.distanceScore < 50 && (
            <div className="rounded-lg border border-red-900/40 bg-red-950/30 p-3 mb-4 flex items-start gap-2.5">
              <AlertTriangle className="size-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs font-semibold text-red-400 mb-0.5">
                  Closest to Nightmare
                </div>
                <div className="text-xs text-zinc-400">
                  {worstBehavior.label}
                </div>
                <div className="text-[10px] text-zinc-500 mt-1">
                  Only{" "}
                  <span className="text-red-400 font-bold">
                    {worstBehavior.distanceScore}%
                  </span>{" "}
                  distance from becoming this.
                </div>
              </div>
            </div>
          )}

          {/* Fear behaviors list */}
          <div className="space-y-3">
            {identity.fearBehaviors.map((behavior) => (
              <FearBehaviorRow key={behavior.id} behavior={behavior} />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

function FearBehaviorRow({ behavior }: { behavior: FearBehavior }) {
  const [showDetail, setShowDetail] = useState(false)

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden">
      <button
        onClick={() => setShowDetail(!showDetail)}
        className="w-full p-3 text-left cursor-pointer"
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            {getStatusIcon(behavior.distanceScore)}
            <div className="min-w-0">
              <div className="text-xs text-zinc-300 leading-relaxed">
                {behavior.invertedGoal}
              </div>
              <div className="text-[10px] text-zinc-600 mt-0.5 flex items-center gap-1.5">
                <TrendingDown className="size-2.5" />
                <span className="italic truncate">{behavior.label}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Streak badge */}
            <div
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                behavior.streak === 0
                  ? "bg-red-500/15 text-red-400"
                  : behavior.streak >= 14
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {behavior.streak > 0 ? (
                <Flame className="size-2.5" />
              ) : (
                <XCircle className="size-2.5" />
              )}
              {getStreakLabel(behavior.streak)}
            </div>
            {/* Score */}
            <div
              className={`text-base font-black tabular-nums ${getDistanceColor(behavior.distanceScore)}`}
            >
              {behavior.distanceScore}
            </div>
          </div>
        </div>

        {/* Distance bar */}
        <div className="flex items-center gap-2">
          <div
            className={`flex-1 h-1.5 rounded-full ${getBarTrack(behavior.distanceScore)}`}
          >
            <div
              className={`h-full rounded-full transition-all ${getBarColor(behavior.distanceScore)}`}
              style={{ width: `${behavior.distanceScore}%` }}
            />
          </div>
          <span className="text-[10px] text-zinc-600 w-10 text-right">
            {behavior.targetFrequency}
          </span>
        </div>
      </button>

      {/* Expanded detail */}
      {showDetail && (
        <div className="px-3 pb-3 border-t border-zinc-800/50 pt-2">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded bg-zinc-900 p-2">
              <div className="text-[10px] text-zinc-500 mb-0.5">Target</div>
              <div className="text-xs font-medium text-zinc-300">
                {behavior.targetFrequency}
              </div>
            </div>
            <div className="rounded bg-zinc-900 p-2">
              <div className="text-[10px] text-zinc-500 mb-0.5">Streak</div>
              <div
                className={`text-xs font-medium ${behavior.streak === 0 ? "text-red-400" : "text-zinc-300"}`}
              >
                {behavior.streak} days
              </div>
            </div>
            <div className="rounded bg-zinc-900 p-2">
              <div className="text-[10px] text-zinc-500 mb-0.5">Last Done</div>
              <div className="text-xs font-medium text-zinc-300">
                {behavior.lastCompleted
                  ? new Date(behavior.lastCompleted).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric" }
                    )
                  : "Never"}
              </div>
            </div>
          </div>
          {behavior.distanceScore < 40 && (
            <div className="mt-2 rounded bg-red-950/40 border border-red-900/30 p-2 text-[10px] text-red-300 flex items-center gap-1.5">
              <Zap className="size-3 flex-shrink-0" />
              You are dangerously close to becoming the person you fear. Act
              today.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function WeeklyPulse({ identities }: { identities: AntiIdentity[] }) {
  // Simulate 7-day distance history per anti-identity
  const weekData = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    return identities.map((identity) => {
      const currentAvg =
        identity.fearBehaviors.reduce((s, b) => s + b.distanceScore, 0) /
        identity.fearBehaviors.length
      // Generate plausible historical data trending toward current
      const history = days.map((day, i) => {
        const noise = Math.sin(i * 1.5 + identity.id.length) * 8
        const trend = (currentAvg - 50) * (i / 6)
        return {
          day,
          score: Math.max(
            5,
            Math.min(95, Math.round(50 + trend + noise))
          ),
        }
      })
      return { identity, history }
    })
  }, [identities])

  return (
    <Card className="border-zinc-800 bg-zinc-950 mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="size-5 text-zinc-400" />
          7-Day Pulse
        </CardTitle>
        <p className="text-xs text-zinc-500">
          Distance from each nightmare over the past week. Dips = danger.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {weekData.map(({ identity, history }) => {
            const Icon = identity.icon
            const max = Math.max(...history.map((h) => h.score))
            const min = Math.min(...history.map((h) => h.score))
            const trending = history[6].score > history[0].score

            return (
              <div key={identity.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Icon className={`size-3.5 ${identity.color}`} />
                    <span className="text-xs text-zinc-400">
                      {identity.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    {trending ? (
                      <TrendingUp className="size-3 text-emerald-400" />
                    ) : (
                      <TrendingDown className="size-3 text-red-400" />
                    )}
                    <span
                      className={
                        trending ? "text-emerald-400" : "text-red-400"
                      }
                    >
                      {trending ? "Distancing" : "Drifting closer"}
                    </span>
                  </div>
                </div>

                {/* Mini sparkline-style bar chart */}
                <div className="flex items-end gap-1 h-8">
                  {history.map((point, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <div
                        className={`w-full rounded-sm transition-all ${getBarColor(point.score)}`}
                        style={{ height: `${(point.score / 100) * 32}px` }}
                        title={`${point.day}: ${point.score}`}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-0.5">
                  {history.map((point, i) => (
                    <span
                      key={i}
                      className="text-[9px] text-zinc-600 flex-1 text-center"
                    >
                      {point.day}
                    </span>
                  ))}
                </div>

                {/* Min/Max labels */}
                <div className="flex justify-between mt-0.5 text-[9px]">
                  <span className="text-zinc-600">
                    Low:{" "}
                    <span className={getDistanceColor(min)}>{min}</span>
                  </span>
                  <span className="text-zinc-600">
                    High:{" "}
                    <span className={getDistanceColor(max)}>{max}</span>
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function DailyNudge({ identities }: { identities: AntiIdentity[] }) {
  // Find the single most critical behavior across all identities
  const allBehaviors = identities.flatMap((i) =>
    i.fearBehaviors.map((b) => ({ ...b, identityName: i.name }))
  )
  const mostCritical = allBehaviors.reduce((worst, b) =>
    b.distanceScore < worst.distanceScore ? b : worst
  )

  return (
    <div className="rounded-xl border-2 border-red-900/50 bg-gradient-to-br from-red-950/40 via-zinc-950 to-zinc-950 p-5 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Skull className="size-5 text-red-400" />
        <span className="text-sm font-bold text-red-400 uppercase tracking-wider">
          Today&apos;s Warning
        </span>
      </div>
      <p className="text-zinc-300 text-sm leading-relaxed mb-3">
        You are{" "}
        <span className="font-black text-red-400">
          {mostCritical.distanceScore}% away
        </span>{" "}
        from &quot;{mostCritical.identityName}&quot; on{" "}
        <span className="italic text-zinc-200">{mostCritical.label}</span>.
      </p>
      <p className="text-zinc-400 text-xs">
        The antidote:{" "}
        <span className="text-zinc-200 font-medium">
          {mostCritical.invertedGoal}
        </span>
      </p>
      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          className="bg-red-600 hover:bg-red-700 text-white text-xs h-7 px-3"
        >
          <Zap className="size-3 mr-1" />
          Do it now
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-zinc-700 text-zinc-400 text-xs h-7 px-3 hover:bg-zinc-800"
        >
          Remind me tonight
        </Button>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function VariantA() {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(["invisible-man"])
  )

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="space-y-0">
      {/* Philosophy header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Skull className="size-5 text-red-500" />
          <h2 className="text-lg font-black text-zinc-100 tracking-tight">
            Anti-Goals
          </h2>
        </div>
        <p className="text-xs text-zinc-500 leading-relaxed max-w-xl">
          Don&apos;t chase what you want. Run from what you fear becoming. Define
          your nightmare identities, track the behaviors that lead there, and
          measure your distance from the abyss.
        </p>
      </div>

      {/* Daily nudge — most critical single action */}
      <DailyNudge identities={ANTI_IDENTITIES} />

      {/* Overall threat level */}
      <OverallThreatLevel identities={ANTI_IDENTITIES} />

      {/* Accountability Mirror */}
      <AccountabilityMirror identities={ANTI_IDENTITIES} />

      {/* 7-Day Pulse */}
      <WeeklyPulse identities={ANTI_IDENTITIES} />

      {/* Anti-Identity Cards */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Ghost className="size-4 text-zinc-500" />
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
            Your Nightmare Identities
          </h3>
        </div>
        {ANTI_IDENTITIES.map((identity) => (
          <AntiIdentityCard
            key={identity.id}
            identity={identity}
            isExpanded={expandedIds.has(identity.id)}
            onToggle={() => toggleExpand(identity.id)}
          />
        ))}
      </div>

      {/* Bottom philosophy note */}
      <div className="mt-8 text-center text-[10px] text-zinc-700 italic">
        &quot;He who has a why to live can bear almost any how.&quot; &mdash;
        Nietzsche. Your &quot;why&quot; is the version of yourself you refuse to
        become.
      </div>
    </div>
  )
}
