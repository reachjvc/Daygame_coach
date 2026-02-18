"use client"

import { useState, useCallback, useMemo } from "react"
import {
  Sprout,
  TreePine,
  Flower2,
  Leaf,
  Droplets,
  Sun,
  CloudRain,
  Snowflake,
  Wind,
  Heart,
  AlertTriangle,
  Skull,
  ArrowRight,
  Recycle,
  Activity,
  Sparkles,
  Clock,
  TrendingUp,
  ShieldCheck,
  Zap,
  BookOpen,
  BarChart3,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"

// ─── Types ──────────────────────────────────────────────────────────────────

type GrowthStage = "seed" | "sprout" | "growing" | "blooming" | "mighty-tree" | "wilting" | "dead"
type Season = "spring" | "summer" | "autumn" | "winter"
type LifeArea = "fitness" | "social" | "dating" | "mind" | "career" | "inner-game"

interface Plant {
  id: string
  name: string
  description: string
  stage: GrowthStage
  progress: number // 0-100
  metric: string
  lifeArea: LifeArea
  plantedDate: string
  lastWatered: string
  daysNeglected: number
  waterStreak: number
  compostLesson?: string
  seasonalGoal?: { activeSeason: Season[] }
}

interface CrossPollination {
  from: string
  to: string
  boost: number // percentage
  label: string
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const INITIAL_PLANTS: Plant[] = [
  {
    id: "gym",
    name: "Gym routine",
    description: "4x/week strength training — the foundation everything else grows from",
    stage: "mighty-tree",
    progress: 95,
    metric: "4x/week",
    lifeArea: "fitness",
    plantedDate: "6 months ago",
    lastWatered: "today",
    daysNeglected: 0,
    waterStreak: 42,
  },
  {
    id: "approaches",
    name: "Approach volume",
    description: "Build momentum with consistent approaches — volume before optimization",
    stage: "blooming",
    progress: 72,
    metric: "10/week",
    lifeArea: "social",
    plantedDate: "4 weeks ago",
    lastWatered: "yesterday",
    daysNeglected: 0,
    waterStreak: 12,
    seasonalGoal: { activeSeason: ["spring", "summer"] },
  },
  {
    id: "texting",
    name: "Texting game",
    description: "Keep 3 conversations alive per week — practice banter and logistics",
    stage: "growing",
    progress: 45,
    metric: "3 convos/week",
    lifeArea: "dating",
    plantedDate: "2 weeks ago",
    lastWatered: "2 days ago",
    daysNeglected: 1,
    waterStreak: 5,
  },
  {
    id: "dates",
    name: "Date planning",
    description: "Create a rotation of go-to date spots and activities",
    stage: "sprout",
    progress: 15,
    metric: "1 date/week",
    lifeArea: "dating",
    plantedDate: "1 week ago",
    lastWatered: "3 days ago",
    daysNeglected: 2,
    waterStreak: 2,
  },
  {
    id: "project",
    name: "Side project",
    description: "Build something that excites you — demonstration of competence and passion",
    stage: "seed",
    progress: 2,
    metric: "2 hrs/week",
    lifeArea: "career",
    plantedDate: "today",
    lastWatered: "today",
    daysNeglected: 0,
    waterStreak: 1,
  },
  {
    id: "reading",
    name: "Reading habit",
    description: "1 book per month — feeds inner game and conversation topics",
    stage: "wilting",
    progress: 55,
    metric: "1 book/month",
    lifeArea: "mind",
    plantedDate: "2 months ago",
    lastWatered: "12 days ago",
    daysNeglected: 12,
    waterStreak: 0,
  },
  {
    id: "meditation",
    name: "Meditation",
    description: "Daily mindfulness practice — the soil that nourishes everything",
    stage: "wilting",
    progress: 40,
    metric: "10 min/day",
    lifeArea: "inner-game",
    plantedDate: "6 weeks ago",
    lastWatered: "8 days ago",
    daysNeglected: 8,
    waterStreak: 0,
    seasonalGoal: { activeSeason: ["autumn", "winter"] },
  },
  {
    id: "spanish",
    name: "Learning Spanish",
    description: "Was going to learn for travel, but realized fundamentals come first",
    stage: "dead",
    progress: 20,
    metric: "3 lessons/week",
    lifeArea: "mind",
    plantedDate: "4 months ago",
    lastWatered: "2 months ago",
    daysNeglected: 60,
    waterStreak: 0,
    compostLesson: "Realized I should focus on social fundamentals first. The discipline I built here feeds into my reading habit though.",
  },
]

const CROSS_POLLINATIONS: CrossPollination[] = [
  { from: "gym", to: "approaches", boost: 15, label: "Physical confidence" },
  { from: "approaches", to: "texting", boost: 10, label: "Social momentum" },
  { from: "approaches", to: "dates", boost: 8, label: "Pipeline volume" },
  { from: "reading", to: "meditation", boost: 20, label: "Inner game depth" },
  { from: "meditation", to: "approaches", boost: 12, label: "Calm presence" },
  { from: "texting", to: "dates", boost: 15, label: "Conversion skill" },
]

const CURRENT_SEASON: Season = "spring"

// ─── Helpers ────────────────────────────────────────────────────────────────

const STAGE_CONFIG: Record<
  GrowthStage,
  {
    icon: typeof Sprout
    label: string
    color: string
    bgColor: string
    borderColor: string
    glowColor?: string
  }
> = {
  seed: {
    icon: Sparkles,
    label: "Seed",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
  },
  sprout: {
    icon: Sprout,
    label: "Sprout",
    color: "text-lime-600",
    bgColor: "bg-lime-50",
    borderColor: "border-lime-200",
  },
  growing: {
    icon: Leaf,
    label: "Growing",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  blooming: {
    icon: Flower2,
    label: "Blooming",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-300",
    glowColor: "shadow-emerald-100",
  },
  "mighty-tree": {
    icon: TreePine,
    label: "Mighty Tree",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-400",
    glowColor: "shadow-emerald-200",
  },
  wilting: {
    icon: AlertTriangle,
    label: "Wilting",
    color: "text-amber-600",
    bgColor: "bg-amber-50/80",
    borderColor: "border-amber-300",
  },
  dead: {
    icon: Skull,
    label: "Composted",
    color: "text-stone-500",
    bgColor: "bg-stone-50",
    borderColor: "border-stone-300",
  },
}

const LIFE_AREA_CONFIG: Record<LifeArea, { label: string; color: string; emoji: string }> = {
  fitness: { label: "Fitness", color: "bg-red-100 text-red-700", emoji: "💪" },
  social: { label: "Social", color: "bg-blue-100 text-blue-700", emoji: "🗣" },
  dating: { label: "Dating", color: "bg-pink-100 text-pink-700", emoji: "💘" },
  mind: { label: "Mind", color: "bg-purple-100 text-purple-700", emoji: "🧠" },
  career: { label: "Career", color: "bg-indigo-100 text-indigo-700", emoji: "🚀" },
  "inner-game": { label: "Inner Game", color: "bg-teal-100 text-teal-700", emoji: "🧘" },
}

const SEASON_CONFIG: Record<Season, { label: string; icon: typeof Sun; color: string }> = {
  spring: { label: "Spring", icon: Flower2, color: "text-green-600" },
  summer: { label: "Summer", icon: Sun, color: "text-amber-500" },
  autumn: { label: "Autumn", icon: Wind, color: "text-orange-500" },
  winter: { label: "Winter", icon: Snowflake, color: "text-sky-500" },
}

function daysAgoLabel(d: number): string {
  if (d === 0) return "today"
  if (d === 1) return "yesterday"
  return `${d} days ago`
}

function progressBarColor(stage: GrowthStage): string {
  if (stage === "wilting") return "bg-amber-400"
  if (stage === "dead") return "bg-stone-400"
  if (stage === "mighty-tree") return "bg-emerald-500"
  if (stage === "blooming") return "bg-emerald-400"
  return "bg-green-500"
}

// ─── Sub-Components ─────────────────────────────────────────────────────────

function PlantCard({
  plant,
  onWater,
  connections,
}: {
  plant: Plant
  onWater: (id: string) => void
  connections: CrossPollination[]
}) {
  const cfg = STAGE_CONFIG[plant.stage]
  const Icon = cfg.icon
  const area = LIFE_AREA_CONFIG[plant.lifeArea]
  const isDead = plant.stage === "dead"
  const isWilting = plant.stage === "wilting"
  const isHealthy = !isDead && !isWilting

  const outgoing = connections.filter((c) => c.from === plant.id)
  const incoming = connections.filter((c) => c.to === plant.id)

  return (
    <Card
      className={`relative transition-all duration-300 ${cfg.borderColor} border-2 ${
        isWilting ? "opacity-80" : ""
      } ${isDead ? "opacity-60" : ""} ${
        cfg.glowColor ? `shadow-lg ${cfg.glowColor}` : ""
      } hover:shadow-md`}
    >
      {/* Wilting alert strip */}
      {isWilting && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 rounded-t-lg animate-pulse" />
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`p-2 rounded-lg ${cfg.bgColor}`}>
              <Icon className={`size-5 ${cfg.color}`} />
            </div>
            <div className="min-w-0">
              <CardTitle className={`text-base leading-tight ${isDead ? "line-through text-muted-foreground" : ""}`}>
                {plant.name}
              </CardTitle>
              <div className="flex items-center gap-1.5 mt-1">
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${area.color} border-0`}>
                  {area.label}
                </Badge>
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cfg.bgColor} ${cfg.color} border-0`}>
                  {cfg.label}
                </Badge>
              </div>
            </div>
          </div>
          {/* Water streak */}
          {plant.waterStreak > 0 && !isDead && (
            <div className="flex items-center gap-1 text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full shrink-0">
              <Droplets className="size-3" />
              {plant.waterStreak}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Description */}
        <p className={`text-xs leading-relaxed ${isDead ? "text-muted-foreground italic" : "text-muted-foreground"}`}>
          {plant.description}
        </p>

        {/* Progress bar */}
        {!isDead && (
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">{plant.metric}</span>
              <span className="font-medium">{plant.progress}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${progressBarColor(plant.stage)}`}
                style={{ width: `${plant.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Watering info */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground flex items-center gap-1">
            <Clock className="size-3" />
            Watered {daysAgoLabel(plant.daysNeglected)}
          </span>
          <span className="text-muted-foreground">
            Planted {plant.plantedDate}
          </span>
        </div>

        {/* Wilting warning */}
        {isWilting && (
          <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertTriangle className="size-3.5 shrink-0" />
            <span>
              {plant.daysNeglected >= 10
                ? "Critical — this plant is dying. Water it or let it go."
                : "Needs attention — hasn't been watered in over a week."}
            </span>
          </div>
        )}

        {/* Compost lesson (dead plants) */}
        {isDead && plant.compostLesson && (
          <div className="flex items-start gap-2 text-xs text-stone-600 bg-stone-100 border border-stone-200 rounded-lg px-3 py-2">
            <Recycle className="size-3.5 shrink-0 mt-0.5" />
            <div>
              <span className="font-medium">Compost:</span> {plant.compostLesson}
            </div>
          </div>
        )}

        {/* Cross-pollination connections */}
        {(outgoing.length > 0 || incoming.length > 0) && !isDead && (
          <div className="space-y-1 pt-1 border-t border-dashed border-muted">
            {outgoing.map((c) => (
              <div key={`${c.from}-${c.to}`} className="flex items-center gap-1.5 text-[11px] text-emerald-600">
                <ArrowRight className="size-3" />
                <span>
                  Feeds <span className="font-medium">{INITIAL_PLANTS.find((p) => p.id === c.to)?.name}</span>{" "}
                  <span className="text-emerald-500">+{c.boost}%</span>
                </span>
                <span className="text-muted-foreground ml-auto">{c.label}</span>
              </div>
            ))}
            {incoming.map((c) => (
              <div key={`${c.from}-${c.to}-in`} className="flex items-center gap-1.5 text-[11px] text-blue-500">
                <Zap className="size-3" />
                <span>
                  Fed by <span className="font-medium">{INITIAL_PLANTS.find((p) => p.id === c.from)?.name}</span>{" "}
                  <span className="text-blue-400">+{c.boost}%</span>
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Seasonal indicator */}
        {plant.seasonalGoal && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1">
            {plant.seasonalGoal.activeSeason.map((s) => {
              const sc = SEASON_CONFIG[s]
              const SeasonIcon = sc.icon
              return (
                <span
                  key={s}
                  className={`flex items-center gap-0.5 ${
                    s === CURRENT_SEASON ? sc.color + " font-medium" : ""
                  }`}
                >
                  <SeasonIcon className="size-3" />
                  {sc.label}
                </span>
              )
            })}
            {plant.seasonalGoal.activeSeason.includes(CURRENT_SEASON) ? (
              <Badge variant="outline" className="text-[10px] px-1 py-0 border-green-300 text-green-600 ml-auto">
                In season
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] px-1 py-0 border-stone-300 text-stone-500 ml-auto">
                Dormant
              </Badge>
            )}
          </div>
        )}

        {/* Water button */}
        {!isDead && (
          <Button
            size="sm"
            className={`w-full mt-1 text-xs ${
              isWilting
                ? "bg-amber-500 hover:bg-amber-600 text-white"
                : isHealthy
                ? "bg-sky-500 hover:bg-sky-600 text-white"
                : ""
            }`}
            variant={isWilting || isHealthy ? "default" : "outline"}
            onClick={() => onWater(plant.id)}
          >
            <Droplets className="size-3.5 mr-1.5" />
            {isWilting ? "Revive this plant" : "Water"}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function GardenHealthGauge({
  plants,
}: {
  plants: Plant[]
}) {
  const alive = plants.filter((p) => p.stage !== "dead")
  const wilting = plants.filter((p) => p.stage === "wilting")
  const areas = new Set(alive.map((p) => p.lifeArea))

  // Diversity: 6 areas max
  const diversityScore = Math.round((areas.size / 6) * 100)
  // Consistency: percentage of alive plants that aren't wilting
  const consistencyScore = alive.length > 0 ? Math.round(((alive.length - wilting.length) / alive.length) * 100) : 0
  // Balance: penalize if any single area has >50% of plants
  const areaCounts = alive.reduce(
    (acc, p) => {
      acc[p.lifeArea] = (acc[p.lifeArea] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )
  const maxAreaPct = alive.length > 0 ? Math.max(...Object.values(areaCounts)) / alive.length : 0
  const balanceScore = Math.round((1 - maxAreaPct * 0.5) * 100)

  const overallHealth = Math.round((diversityScore + consistencyScore + balanceScore) / 3)

  const healthColor =
    overallHealth >= 80
      ? "text-emerald-600"
      : overallHealth >= 60
        ? "text-amber-600"
        : "text-red-600"

  const healthBg =
    overallHealth >= 80
      ? "bg-emerald-500"
      : overallHealth >= 60
        ? "bg-amber-500"
        : "bg-red-500"

  return (
    <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50/50 to-emerald-50/30">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Activity className="size-5 text-green-600" />
          <CardTitle className="text-base">Garden Health</CardTitle>
        </div>
        <CardDescription>Overall ecosystem vitality</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Big score */}
        <div className="flex items-center gap-4">
          <div className="relative size-20">
            <svg className="size-20 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeDasharray={`${(overallHealth / 100) * 213.6} 213.6`}
                strokeLinecap="round"
                className={healthColor}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-xl font-bold ${healthColor}`}>{overallHealth}</span>
            </div>
          </div>
          <div className="space-y-2 flex-1">
            <HealthBar label="Diversity" value={diversityScore} />
            <HealthBar label="Consistency" value={consistencyScore} />
            <HealthBar label="Balance" value={balanceScore} />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-white/60 rounded-lg px-2 py-1.5">
            <div className="text-lg font-bold text-green-600">{alive.length}</div>
            <div className="text-[10px] text-muted-foreground">Alive</div>
          </div>
          <div className="bg-white/60 rounded-lg px-2 py-1.5">
            <div className="text-lg font-bold text-amber-500">{wilting.length}</div>
            <div className="text-[10px] text-muted-foreground">Wilting</div>
          </div>
          <div className="bg-white/60 rounded-lg px-2 py-1.5">
            <div className="text-lg font-bold text-blue-500">{areas.size}</div>
            <div className="text-[10px] text-muted-foreground">Areas</div>
          </div>
          <div className="bg-white/60 rounded-lg px-2 py-1.5">
            <div className="text-lg font-bold text-stone-500">
              {plants.filter((p) => p.stage === "dead").length}
            </div>
            <div className="text-[10px] text-muted-foreground">Composted</div>
          </div>
        </div>

        {/* Season indicator */}
        <div className="flex items-center justify-center gap-3 pt-2 border-t">
          {(["spring", "summer", "autumn", "winter"] as Season[]).map((s) => {
            const sc = SEASON_CONFIG[s]
            const SeasonIcon = sc.icon
            const isCurrent = s === CURRENT_SEASON
            return (
              <div
                key={s}
                className={`flex flex-col items-center gap-0.5 ${
                  isCurrent ? "" : "opacity-30"
                }`}
              >
                <div
                  className={`p-1.5 rounded-full ${
                    isCurrent ? "bg-green-100 ring-2 ring-green-300" : "bg-muted"
                  }`}
                >
                  <SeasonIcon className={`size-4 ${isCurrent ? sc.color : "text-muted-foreground"}`} />
                </div>
                <span className={`text-[10px] ${isCurrent ? "font-semibold " + sc.color : "text-muted-foreground"}`}>
                  {sc.label}
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function HealthBar({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? "bg-emerald-500" : value >= 60 ? "bg-amber-400" : "bg-red-400"
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function CrossPollinationMap({ plants, connections }: { plants: Plant[]; connections: CrossPollination[] }) {
  const alive = plants.filter((p) => p.stage !== "dead")
  const activeConnections = connections.filter(
    (c) => alive.some((p) => p.id === c.from) && alive.some((p) => p.id === c.to),
  )

  return (
    <Card className="border-2 border-emerald-200">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-5 text-emerald-600" />
          <CardTitle className="text-base">Cross-Pollination</CardTitle>
        </div>
        <CardDescription>How your goals feed each other</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {activeConnections.map((c) => {
            const fromPlant = plants.find((p) => p.id === c.from)
            const toPlant = plants.find((p) => p.id === c.to)
            if (!fromPlant || !toPlant) return null

            const fromCfg = STAGE_CONFIG[fromPlant.stage]
            const toCfg = STAGE_CONFIG[toPlant.stage]
            const FromIcon = fromCfg.icon
            const ToIcon = toCfg.icon

            return (
              <div
                key={`${c.from}-${c.to}`}
                className="flex items-center gap-2 bg-gradient-to-r from-white to-emerald-50/50 rounded-lg px-3 py-2 border border-emerald-100"
              >
                <div className={`p-1 rounded ${fromCfg.bgColor}`}>
                  <FromIcon className={`size-3.5 ${fromCfg.color}`} />
                </div>
                <span className="text-xs font-medium truncate">{fromPlant.name}</span>

                <div className="flex items-center gap-1 mx-1">
                  <div className="w-6 h-px border-t-2 border-dashed border-emerald-300" />
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1 rounded">
                    +{c.boost}%
                  </span>
                  <div className="w-4 h-px border-t-2 border-dashed border-emerald-300" />
                  <ArrowRight className="size-3 text-emerald-400" />
                </div>

                <div className={`p-1 rounded ${toCfg.bgColor}`}>
                  <ToIcon className={`size-3.5 ${toCfg.color}`} />
                </div>
                <span className="text-xs font-medium truncate">{toPlant.name}</span>

                <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{c.label}</span>
              </div>
            )
          })}
        </div>
        <p className="text-[11px] text-muted-foreground mt-3 text-center italic">
          Working on one goal indirectly nurtures connected goals
        </p>
      </CardContent>
    </Card>
  )
}

function CompostPile({ plants }: { plants: Plant[] }) {
  const deadPlants = plants.filter((p) => p.stage === "dead")
  if (deadPlants.length === 0) return null

  return (
    <Card className="border-2 border-stone-200 bg-stone-50/50">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Recycle className="size-5 text-stone-500" />
          <CardTitle className="text-base text-stone-700">Compost Pile</CardTitle>
        </div>
        <CardDescription>
          Dead goals aren&apos;t failures — they&apos;re lessons that enrich your garden
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {deadPlants.map((plant) => (
          <div key={plant.id} className="flex items-start gap-3 bg-white/60 rounded-lg p-3 border border-stone-200">
            <Skull className="size-4 text-stone-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium text-stone-600 line-through">{plant.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Planted {plant.plantedDate} — reached {plant.progress}%
              </div>
              {plant.compostLesson && (
                <div className="text-xs text-stone-600 mt-1.5 bg-stone-100 rounded px-2 py-1.5 border-l-2 border-stone-400">
                  <span className="font-medium">Lesson:</span> {plant.compostLesson}
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function GardenPhilosophy() {
  return (
    <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50/30 to-amber-50/20">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <BookOpen className="size-5 text-green-700" />
          <CardTitle className="text-base">The Garden Philosophy</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              icon: Sprout,
              title: "Growth is organic",
              text: "Some goals grow slowly but become mighty trees. Don't force timelines.",
            },
            {
              icon: Droplets,
              title: "Consistency over intensity",
              text: "Small daily watering beats occasional flooding. Show up regularly.",
            },
            {
              icon: CloudRain,
              title: "Seasons matter",
              text: "Not everything should be active all year. Rest is part of the cycle.",
            },
            {
              icon: Recycle,
              title: "Pruning is wisdom",
              text: "Letting go of goals isn't failure — it enriches the soil for what matters.",
            },
            {
              icon: TrendingUp,
              title: "Cross-pollination",
              text: "Goals that feed each other create exponential growth. Build connections.",
            },
            {
              icon: Heart,
              title: "Tend your garden",
              text: "Neglect kills more goals than difficulty. The garden rewards presence.",
            },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-2.5 p-2">
              <item.icon className="size-4 text-green-600 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-green-800">{item.title}</div>
                <div className="text-[11px] text-muted-foreground leading-relaxed">{item.text}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function VariantD() {
  const [plants, setPlants] = useState<Plant[]>(INITIAL_PLANTS)
  const [wateredFlash, setWateredFlash] = useState<string | null>(null)
  const [tab, setTab] = useState("garden")

  const handleWater = useCallback((id: string) => {
    setPlants((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p
        const wasWilting = p.stage === "wilting"

        // Determine new stage after watering
        let newProgress = Math.min(p.progress + 3, 100)
        let newStage: GrowthStage = p.stage

        if (wasWilting) {
          // Revive: go back to the stage matching current progress
          if (newProgress < 10) newStage = "seed"
          else if (newProgress < 30) newStage = "sprout"
          else if (newProgress < 60) newStage = "growing"
          else if (newProgress < 90) newStage = "blooming"
          else newStage = "mighty-tree"
        } else {
          // Normal growth
          if (newProgress >= 90 && p.stage !== "mighty-tree") newStage = "mighty-tree"
          else if (newProgress >= 60 && p.stage === "growing") newStage = "blooming"
          else if (newProgress >= 30 && p.stage === "sprout") newStage = "growing"
          else if (newProgress >= 10 && p.stage === "seed") newStage = "sprout"
        }

        return {
          ...p,
          progress: newProgress,
          stage: newStage,
          lastWatered: "just now",
          daysNeglected: 0,
          waterStreak: p.waterStreak + 1,
        }
      }),
    )

    // Flash feedback
    setWateredFlash(id)
    setTimeout(() => setWateredFlash(null), 1200)
  }, [])

  // Separate plants by status
  const alivePlants = useMemo(() => plants.filter((p) => p.stage !== "dead"), [plants])
  const wiltingPlants = useMemo(() => plants.filter((p) => p.stage === "wilting"), [plants])
  const healthyPlants = useMemo(
    () => plants.filter((p) => p.stage !== "dead" && p.stage !== "wilting"),
    [plants],
  )

  // Sort: wilting first (needs attention), then by stage reverse (mighty tree last so it anchors)
  const stageOrder: Record<GrowthStage, number> = {
    wilting: 0,
    seed: 1,
    sprout: 2,
    growing: 3,
    blooming: 4,
    "mighty-tree": 5,
    dead: 6,
  }

  const sortedAlive = useMemo(
    () => [...alivePlants].sort((a, b) => stageOrder[a.stage] - stageOrder[b.stage]),
    [alivePlants],
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <TreePine className="size-6 text-green-600" />
            Your Garden
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {alivePlants.length} plants growing across {new Set(alivePlants.map((p) => p.lifeArea)).size} life areas
          </p>
        </div>
        <div className="flex items-center gap-2">
          {wiltingPlants.length > 0 && (
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 animate-pulse">
              <AlertTriangle className="size-3 mr-1" />
              {wiltingPlants.length} need water
            </Badge>
          )}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-green-700 border-green-300 hover:bg-green-50">
                <Sprout className="size-3.5 mr-1.5" />
                Plant seed
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="size-5 text-amber-500" />
                  Plant a New Seed
                </DialogTitle>
                <DialogDescription>
                  Every mighty tree started as a seed. What intention do you want to plant in your garden?
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <p className="text-sm text-muted-foreground">
                  This is a demo — in the full version, you&apos;d define your goal here, choose its life area,
                  and set how often it needs watering.
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(LIFE_AREA_CONFIG).map(([key, cfg]) => (
                    <Badge key={key} variant="outline" className={`${cfg.color} border-0 cursor-pointer hover:opacity-80`}>
                      {cfg.emoji} {cfg.label}
                    </Badge>
                  ))}
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-700">
                  <ShieldCheck className="size-4 inline mr-1.5" />
                  <strong>Garden wisdom:</strong> Before planting, ask — do I have space for this?
                  A crowded garden means every plant gets less sun.
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Watered flash banner */}
      {wateredFlash && (
        <div className="bg-sky-50 border border-sky-200 rounded-lg px-4 py-2.5 flex items-center gap-2 text-sm text-sky-700 animate-in fade-in slide-in-from-top-2 duration-300">
          <Droplets className="size-4" />
          <span className="font-medium">
            Watered {plants.find((p) => p.id === wateredFlash)?.name}
          </span>
          <span className="text-sky-500 ml-auto text-xs">+3% growth</span>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-green-50/80">
          <TabsTrigger value="garden" className="data-[state=active]:bg-white">
            <TreePine className="size-3.5 mr-1.5" />
            Garden
          </TabsTrigger>
          <TabsTrigger value="connections" className="data-[state=active]:bg-white">
            <TrendingUp className="size-3.5 mr-1.5" />
            Connections
          </TabsTrigger>
          <TabsTrigger value="health" className="data-[state=active]:bg-white">
            <BarChart3 className="size-3.5 mr-1.5" />
            Health
          </TabsTrigger>
          <TabsTrigger value="philosophy" className="data-[state=active]:bg-white">
            <BookOpen className="size-3.5 mr-1.5" />
            Philosophy
          </TabsTrigger>
        </TabsList>

        {/* ─── Garden Tab ─────────────────────────────────────── */}
        <TabsContent value="garden" className="space-y-4 mt-4">
          {/* Wilting alert */}
          {wiltingPlants.length > 0 && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-700 mb-1">
                <AlertTriangle className="size-4" />
                Plants need attention
              </div>
              <p className="text-xs text-amber-600">
                {wiltingPlants.map((p) => p.name).join(" and ")} {wiltingPlants.length === 1 ? "hasn't" : "haven't"} been
                watered recently. Water them to revive, or let them go to the compost pile.
              </p>
            </div>
          )}

          {/* Plant grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedAlive.map((plant) => (
              <div
                key={plant.id}
                className={`transition-all duration-500 ${
                  wateredFlash === plant.id ? "scale-[1.02] ring-2 ring-sky-300 rounded-xl" : ""
                }`}
              >
                <PlantCard plant={plant} onWater={handleWater} connections={CROSS_POLLINATIONS} />
              </div>
            ))}
          </div>

          {/* Compost section */}
          <CompostPile plants={plants} />
        </TabsContent>

        {/* ─── Connections Tab ─────────────────────────────────── */}
        <TabsContent value="connections" className="mt-4">
          <CrossPollinationMap plants={plants} connections={CROSS_POLLINATIONS} />
        </TabsContent>

        {/* ─── Health Tab ─────────────────────────────────────── */}
        <TabsContent value="health" className="mt-4">
          <GardenHealthGauge plants={plants} />
        </TabsContent>

        {/* ─── Philosophy Tab ─────────────────────────────────── */}
        <TabsContent value="philosophy" className="mt-4">
          <GardenPhilosophy />
        </TabsContent>
      </Tabs>
    </div>
  )
}
