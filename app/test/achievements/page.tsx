"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  X,
  Trophy,
  Lock,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Star,
  Filter
} from "lucide-react"

// Mock milestone data
const MOCK_EARNED = [
  "first_approach",
  "5_approaches",
  "10_approaches",
  "first_number",
  "first_session",
  "3_sessions",
  "weekend_warrior",
  "first_field_report",
]

interface MilestoneInfo {
  label: string
  emoji: string
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
  description: string
  category: string
}

const ALL_MILESTONES: Record<string, MilestoneInfo> = {
  // Approaches
  first_approach: { label: "First Steps", emoji: "👣", tier: "bronze", category: "Approaches", description: "Complete your first approach" },
  "5_approaches": { label: "Getting Started", emoji: "🌱", tier: "bronze", category: "Approaches", description: "Complete 5 approaches" },
  "10_approaches": { label: "Double Digits", emoji: "🔟", tier: "bronze", category: "Approaches", description: "Complete 10 approaches" },
  "25_approaches": { label: "Quarter Century", emoji: "⭐", tier: "silver", category: "Approaches", description: "Complete 25 approaches" },
  "50_approaches": { label: "Half Century", emoji: "🌟", tier: "silver", category: "Approaches", description: "Complete 50 approaches" },
  "100_approaches": { label: "Centurion", emoji: "💯", tier: "gold", category: "Approaches", description: "Complete 100 approaches" },
  // Numbers
  first_number: { label: "First Digits", emoji: "📱", tier: "bronze", category: "Numbers", description: "Get your first number" },
  "5_numbers": { label: "High Five", emoji: "🖐️", tier: "silver", category: "Numbers", description: "Get 5 numbers" },
  "10_numbers": { label: "Perfect 10", emoji: "🔥", tier: "silver", category: "Numbers", description: "Get 10 numbers" },
  // Sessions
  first_session: { label: "First Session", emoji: "🚀", tier: "bronze", category: "Sessions", description: "Complete your first session" },
  "3_sessions": { label: "Hat Trick", emoji: "🎩", tier: "bronze", category: "Sessions", description: "Complete 3 sessions" },
  "5_sessions": { label: "Regular", emoji: "📅", tier: "silver", category: "Sessions", description: "Complete 5 sessions" },
  "10_sessions": { label: "Dedicated", emoji: "💪", tier: "silver", category: "Sessions", description: "Complete 10 sessions" },
  // Special
  weekend_warrior: { label: "Weekend Warrior", emoji: "⚔️", tier: "bronze", category: "Special", description: "Complete a session on the weekend" },
  night_owl: { label: "Night Owl", emoji: "🦉", tier: "bronze", category: "Special", description: "Start a session after 9pm" },
  marathon: { label: "Marathon Man", emoji: "🏃", tier: "gold", category: "Special", description: "Complete a 2+ hour session" },
  hot_streak: { label: "Hot Streak", emoji: "🔥", tier: "platinum", category: "Special", description: "Get 3 numbers in a single session" },
  // Reports
  first_field_report: { label: "Field Scholar", emoji: "📝", tier: "bronze", category: "Reports", description: "Write your first field report" },
  "5_field_reports": { label: "Reporter", emoji: "📰", tier: "silver", category: "Reports", description: "Write 5 field reports" },
  // Unique Sets (NEW!)
  mom_daughter: { label: "Family Affair", emoji: "👩‍👧", tier: "gold", category: "Unique Sets", description: "Approach a mother-daughter pair" },
  sister_set: { label: "Double Trouble", emoji: "👯‍♀️", tier: "gold", category: "Unique Sets", description: "Approach a set of sisters" },
  tourist_set: { label: "Tour Guide", emoji: "🗺️", tier: "silver", category: "Unique Sets", description: "Approach a tourist" },
  moving_set: { label: "Catch Me If You Can", emoji: "🏃‍♀️", tier: "silver", category: "Unique Sets", description: "Stop and approach someone walking" },
  seated_master: { label: "Seated Master", emoji: "🪑", tier: "silver", category: "Unique Sets", description: "Successfully approach 5 seated sets" },
  mixed_group: { label: "Social Infiltrator", emoji: "👥", tier: "gold", category: "Unique Sets", description: "Approach a mixed group (guys + girls)" },
  celebrity_vibes: { label: "Star Struck", emoji: "⭐", tier: "platinum", category: "Unique Sets", description: "Approach someone who looks like a model/celebrity" },
  // Social
  wingman_session: { label: "Wing Commander", emoji: "🦅", tier: "silver", category: "Social", description: "Complete a session with a wingman" },
  "10_wingman_sessions": { label: "Dynamic Duo", emoji: "🤝", tier: "gold", category: "Social", description: "Complete 10 wingman sessions" },
  double_set: { label: "Double Team", emoji: "👯", tier: "gold", category: "Social", description: "Successfully run a double set with your wing" },
  mentor_first: { label: "Mentor", emoji: "🎓", tier: "gold", category: "Social", description: "Help a friend complete their first approach" },
  "5_mentored": { label: "Coach", emoji: "📋", tier: "platinum", category: "Social", description: "Mentor 5 different people" },
  "20_mentored": { label: "Sensei", emoji: "🥋", tier: "diamond", category: "Social", description: "Mentor 20 different people" },
}

function getTierColor(tier: MilestoneInfo['tier']): string {
  switch (tier) {
    case 'bronze': return 'from-amber-600 to-amber-800'
    case 'silver': return 'from-slate-300 to-slate-500'
    case 'gold': return 'from-yellow-400 to-yellow-600'
    case 'platinum': return 'from-cyan-300 to-cyan-500'
    case 'diamond': return 'from-violet-400 to-fuchsia-500'
  }
}

function getTierBg(tier: MilestoneInfo['tier']): string {
  switch (tier) {
    case 'bronze': return 'bg-amber-500/10'
    case 'silver': return 'bg-slate-400/10'
    case 'gold': return 'bg-yellow-500/10'
    case 'platinum': return 'bg-cyan-400/10'
    case 'diamond': return 'bg-violet-500/10'
  }
}

// Design 1: Collapsible categories (accordion style)
function DesignCollapsible() {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["Approaches"]))

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const grouped = Object.entries(ALL_MILESTONES).reduce((acc, [key, info]) => {
    if (!acc[info.category]) acc[info.category] = []
    acc[info.category].push({ key, ...info })
    return acc
  }, {} as Record<string, Array<MilestoneInfo & { key: string }>>)

  return (
    <div className="space-y-2">
      {Object.entries(grouped).map(([category, milestones]) => {
        const earnedCount = milestones.filter(m => MOCK_EARNED.includes(m.key)).length
        const isExpanded = expandedCategories.has(category)

        return (
          <div key={category} className="border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? <ChevronDown className="size-5" /> : <ChevronRight className="size-5" />}
                <span className="font-semibold">{category}</span>
              </div>
              <Badge variant={earnedCount === milestones.length ? "default" : "secondary"}>
                {earnedCount} / {milestones.length}
              </Badge>
            </button>

            {isExpanded && (
              <div className="border-t bg-muted/20 p-3 space-y-2">
                {milestones.map((m) => {
                  const isEarned = MOCK_EARNED.includes(m.key)
                  return (
                    <div
                      key={m.key}
                      className={`flex items-center gap-3 p-2 rounded-lg ${
                        isEarned ? getTierBg(m.tier) : 'opacity-50'
                      }`}
                    >
                      <div className={`size-8 rounded-full flex items-center justify-center ${
                        isEarned ? `bg-gradient-to-br ${getTierColor(m.tier)}` : 'bg-muted'
                      }`}>
                        {isEarned ? <span>{m.emoji}</span> : <Lock className="size-3" />}
                      </div>
                      <div className="flex-1">
                        <div className={`text-sm font-medium ${!isEarned && 'text-muted-foreground'}`}>
                          {m.label}
                        </div>
                        <div className="text-xs text-muted-foreground">{m.description}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Design 2: Tab-based categories with grid
function DesignTabs() {
  const categories = [...new Set(Object.values(ALL_MILESTONES).map(m => m.category))]
  const [activeTab, setActiveTab] = useState(categories[0])

  const milestones = Object.entries(ALL_MILESTONES)
    .filter(([, m]) => m.category === activeTab)
    .map(([key, m]) => ({ key, ...m }))

  return (
    <div>
      {/* Category tabs */}
      <div className="flex gap-1 overflow-x-auto pb-3 mb-4 border-b">
        {categories.map((cat) => {
          const catMilestones = Object.entries(ALL_MILESTONES).filter(([, m]) => m.category === cat)
          const earned = catMilestones.filter(([k]) => MOCK_EARNED.includes(k)).length
          return (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                activeTab === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              {cat}
              <span className="ml-2 text-xs opacity-70">
                {earned}/{catMilestones.length}
              </span>
            </button>
          )
        })}
      </div>

      {/* Grid of achievements */}
      <div className="grid grid-cols-2 gap-3">
        {milestones.map((m) => {
          const isEarned = MOCK_EARNED.includes(m.key)
          return (
            <div
              key={m.key}
              className={`p-3 rounded-xl border transition-all ${
                isEarned
                  ? `${getTierBg(m.tier)} border-transparent`
                  : 'bg-muted/30 border-transparent opacity-60'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`size-10 rounded-full flex items-center justify-center shadow-md ${
                  isEarned ? `bg-gradient-to-br ${getTierColor(m.tier)}` : 'bg-muted'
                }`}>
                  {isEarned ? <span className="text-lg">{m.emoji}</span> : <Lock className="size-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-medium text-sm truncate ${!isEarned && 'text-muted-foreground'}`}>
                    {m.label}
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">{m.tier}</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{m.description}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Design 3: Progress bars with hover expand
function DesignProgressBars() {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)

  const grouped = Object.entries(ALL_MILESTONES).reduce((acc, [key, info]) => {
    if (!acc[info.category]) acc[info.category] = []
    acc[info.category].push({ key, ...info })
    return acc
  }, {} as Record<string, Array<MilestoneInfo & { key: string }>>)

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([category, milestones]) => {
        const earned = milestones.filter(m => MOCK_EARNED.includes(m.key)).length
        const progress = (earned / milestones.length) * 100
        const isHovered = hoveredCategory === category

        return (
          <div
            key={category}
            className="group cursor-pointer"
            onMouseEnter={() => setHoveredCategory(category)}
            onMouseLeave={() => setHoveredCategory(null)}
          >
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{category}</span>
                {earned === milestones.length && <Sparkles className="size-4 text-yellow-500" />}
              </div>
              <span className="text-sm text-muted-foreground">{earned}/{milestones.length}</span>
            </div>

            {/* Progress bar with achievement previews */}
            <div className="relative h-8 bg-muted rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/70 transition-all"
                style={{ width: `${progress}%` }}
              />
              {/* Achievement dots */}
              <div className="absolute inset-0 flex items-center justify-around px-2">
                {milestones.slice(0, 6).map((m, i) => {
                  const isEarned = MOCK_EARNED.includes(m.key)
                  return (
                    <div
                      key={m.key}
                      className={`size-6 rounded-full flex items-center justify-center text-xs transition-transform ${
                        isEarned ? `bg-gradient-to-br ${getTierColor(m.tier)} shadow-sm` : 'bg-background/50'
                      } ${isHovered ? 'scale-110' : ''}`}
                      style={{ transitionDelay: `${i * 30}ms` }}
                    >
                      {isEarned ? m.emoji : <Lock className="size-2" />}
                    </div>
                  )
                })}
                {milestones.length > 6 && (
                  <span className="text-xs text-muted-foreground">+{milestones.length - 6}</span>
                )}
              </div>
            </div>

            {/* Expanded view */}
            {isHovered && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg animate-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-3 gap-2">
                  {milestones.map((m) => {
                    const isEarned = MOCK_EARNED.includes(m.key)
                    return (
                      <div key={m.key} className="flex items-center gap-2 text-xs">
                        <span>{isEarned ? m.emoji : '🔒'}</span>
                        <span className={!isEarned ? 'text-muted-foreground' : ''}>{m.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Design 4: Showcase style (earned front and center)
function DesignShowcase() {
  const [showLocked, setShowLocked] = useState(false)

  const earned = Object.entries(ALL_MILESTONES)
    .filter(([key]) => MOCK_EARNED.includes(key))
    .map(([key, m]) => ({ key, ...m }))

  const locked = Object.entries(ALL_MILESTONES)
    .filter(([key]) => !MOCK_EARNED.includes(key))
    .map(([key, m]) => ({ key, ...m }))

  return (
    <div>
      {/* Earned achievements - showcase style */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="size-5 text-yellow-500" />
          <h3 className="font-bold text-lg">Your Achievements</h3>
          <Badge>{earned.length}</Badge>
        </div>

        <div className="flex flex-wrap gap-3">
          {earned.map((m) => (
            <div
              key={m.key}
              className={`group relative p-4 rounded-2xl ${getTierBg(m.tier)} hover:scale-105 transition-transform cursor-pointer`}
            >
              <div className={`size-14 rounded-full bg-gradient-to-br ${getTierColor(m.tier)} flex items-center justify-center shadow-lg mx-auto mb-2`}>
                <span className="text-2xl">{m.emoji}</span>
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/30 to-transparent" />
              </div>
              <div className="text-center">
                <div className="font-semibold text-sm">{m.label}</div>
                <div className="text-xs text-muted-foreground capitalize">{m.tier}</div>
              </div>

              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                <p className="text-xs">{m.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Toggle for locked */}
      <Button
        variant="outline"
        onClick={() => setShowLocked(!showLocked)}
        className="w-full mb-4"
      >
        <Lock className="size-4 mr-2" />
        {showLocked ? 'Hide' : 'Show'} Locked ({locked.length})
        {showLocked ? <ChevronDown className="size-4 ml-2" /> : <ChevronRight className="size-4 ml-2" />}
      </Button>

      {showLocked && (
        <div className="grid grid-cols-4 gap-2 opacity-60">
          {locked.map((m) => (
            <div
              key={m.key}
              className="p-2 rounded-lg bg-muted/30 text-center"
            >
              <div className="size-8 rounded-full bg-muted flex items-center justify-center mx-auto mb-1">
                <Lock className="size-3" />
              </div>
              <div className="text-xs text-muted-foreground truncate">{m.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Design 5: Tier-based view (group by rarity)
function DesignTierBased() {
  const [selectedTier, setSelectedTier] = useState<string | null>(null)

  const tiers: Array<{ name: MilestoneInfo['tier'], label: string, icon: string }> = [
    { name: 'bronze', label: 'Bronze', icon: '🥉' },
    { name: 'silver', label: 'Silver', icon: '🥈' },
    { name: 'gold', label: 'Gold', icon: '🥇' },
    { name: 'platinum', label: 'Platinum', icon: '💎' },
    { name: 'diamond', label: 'Diamond', icon: '👑' },
  ]

  return (
    <div>
      {/* Tier selector */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <Button
          variant={selectedTier === null ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedTier(null)}
        >
          All
        </Button>
        {tiers.map((tier) => {
          const count = Object.entries(ALL_MILESTONES).filter(([k, m]) =>
            m.tier === tier.name && MOCK_EARNED.includes(k)
          ).length
          const total = Object.values(ALL_MILESTONES).filter(m => m.tier === tier.name).length

          return (
            <Button
              key={tier.name}
              variant={selectedTier === tier.name ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTier(tier.name)}
              className="gap-1"
            >
              <span>{tier.icon}</span>
              <span>{tier.label}</span>
              <span className="text-xs opacity-70">{count}/{total}</span>
            </Button>
          )
        })}
      </div>

      {/* Achievements list */}
      <div className="space-y-6">
        {tiers
          .filter(t => selectedTier === null || t.name === selectedTier)
          .map((tier) => {
            const milestones = Object.entries(ALL_MILESTONES)
              .filter(([, m]) => m.tier === tier.name)
              .map(([key, m]) => ({ key, ...m }))

            if (milestones.length === 0) return null

            return (
              <div key={tier.name}>
                <div className={`flex items-center gap-2 mb-3 pb-2 border-b`}>
                  <span className="text-xl">{tier.icon}</span>
                  <h3 className="font-bold">{tier.label} Tier</h3>
                  <Badge variant="outline" className="ml-auto">
                    {milestones.filter(m => MOCK_EARNED.includes(m.key)).length}/{milestones.length}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {milestones.map((m) => {
                    const isEarned = MOCK_EARNED.includes(m.key)
                    return (
                      <div
                        key={m.key}
                        className={`flex items-center gap-3 p-3 rounded-lg ${
                          isEarned ? getTierBg(m.tier) : 'bg-muted/20 opacity-50'
                        }`}
                      >
                        <div className={`size-10 rounded-full flex items-center justify-center ${
                          isEarned ? `bg-gradient-to-br ${getTierColor(m.tier)}` : 'bg-muted'
                        }`}>
                          {isEarned ? <span>{m.emoji}</span> : <Lock className="size-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{m.label}</div>
                          <div className="text-xs text-muted-foreground truncate">{m.description}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}

export default function AchievementsTestPage() {
  const [activeDesign, setActiveDesign] = useState(1)

  const designs = [
    { id: 1, name: "Collapsible Accordion", component: DesignCollapsible },
    { id: 2, name: "Tab Categories", component: DesignTabs },
    { id: 3, name: "Progress Bars", component: DesignProgressBars },
    { id: 4, name: "Showcase Grid", component: DesignShowcase },
    { id: 5, name: "Tier-Based", component: DesignTierBased },
  ]

  const ActiveComponent = designs.find(d => d.id === activeDesign)?.component || DesignCollapsible

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Achievement Modal Designs</h1>
        <p className="text-muted-foreground">
          Testing different visual approaches for the &quot;View All&quot; achievements modal
        </p>
      </div>

      {/* Design selector */}
      <Card className="p-4 mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="size-4" />
          <span className="font-medium">Select Design</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {designs.map((design) => (
            <Button
              key={design.id}
              variant={activeDesign === design.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveDesign(design.id)}
            >
              {design.id}. {design.name}
            </Button>
          ))}
        </div>
      </Card>

      {/* Mock Modal */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b bg-muted/50">
          <div className="flex items-center gap-2">
            <Trophy className="size-5 text-yellow-500" />
            <h2 className="font-bold">All Achievements</h2>
            <Badge>{MOCK_EARNED.length} / {Object.keys(ALL_MILESTONES).length}</Badge>
          </div>
          <Button variant="ghost" size="icon">
            <X className="size-5" />
          </Button>
        </div>
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          <ActiveComponent />
        </div>
      </Card>

      {/* New Achievement Categories Section */}
      <Card className="mt-8 p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Star className="size-5 text-yellow-500" />
          New Trackable Achievement Ideas
        </h2>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-primary mb-2">Unique Set Types (tracked via field reports)</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Add a &quot;Set Type&quot; dropdown to field reports to unlock these:
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 bg-muted/50 rounded">👩‍👧 Mom & Daughter</div>
              <div className="p-2 bg-muted/50 rounded">👯‍♀️ Sisters</div>
              <div className="p-2 bg-muted/50 rounded">🗺️ Tourist</div>
              <div className="p-2 bg-muted/50 rounded">🏃‍♀️ Moving Set</div>
              <div className="p-2 bg-muted/50 rounded">🪑 Seated Set</div>
              <div className="p-2 bg-muted/50 rounded">👥 Mixed Group</div>
              <div className="p-2 bg-muted/50 rounded">⭐ Model/Celebrity</div>
              <div className="p-2 bg-muted/50 rounded">🌍 Foreign Language</div>
              <div className="p-2 bg-muted/50 rounded">👔 Work/Professional</div>
              <div className="p-2 bg-muted/50 rounded">🏋️ Gym Set</div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-primary mb-2">Social (tracked via session tags)</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Add &quot;with_wingman&quot; tag or wingman field to sessions:
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 bg-muted/50 rounded">🦅 Wingman Session (1)</div>
              <div className="p-2 bg-muted/50 rounded">🤝 Dynamic Duo (10 wingman sessions)</div>
              <div className="p-2 bg-muted/50 rounded">👯 Double Set Success</div>
              <div className="p-2 bg-muted/50 rounded">🎓 Mentor (helped newbie)</div>
              <div className="p-2 bg-muted/50 rounded">📋 Coach (5 people mentored)</div>
              <div className="p-2 bg-muted/50 rounded">🥋 Sensei (20 people mentored)</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
