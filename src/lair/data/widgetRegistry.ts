/**
 * Widget Registry
 *
 * Defines all available widgets for The Lair.
 * Components are lazy-loaded to reduce bundle size.
 */

import type { WidgetDefinition } from "../types"

// Placeholder component for widgets not yet implemented
import { PlaceholderWidget } from "../components/widgets/PlaceholderWidget"

// Implemented widgets
import { StreakWidget } from "../components/widgets/StreakWidget"
import { WeeklyStatsWidget } from "../components/widgets/WeeklyStatsWidget"
import { SessionStarterWidget } from "../components/widgets/SessionStarterWidget"
import { RecentSessionsWidget } from "../components/widgets/RecentSessionsWidget"
import { LevelProgressWidget } from "../components/widgets/LevelProgressWidget"
import { GoalProgressWidget } from "../components/widgets/GoalProgressWidget"
import { TodayGoalsWidget } from "../components/widgets/TodayGoalsWidget"
import { GoalsListWidget } from "../components/widgets/GoalsListWidget"
import { GoalStreaksWidget } from "../components/widgets/GoalStreaksWidget"

// ============================================
// Progress & Gamification Widgets
// ============================================

const progressWidgets: WidgetDefinition[] = [
  {
    id: "level-progress",
    name: "Level Progress",
    description: "Your current XP and level progression",
    category: "progress",
    size: "medium",
    component: LevelProgressWidget,
    requiresData: ["profile"],
  },
  {
    id: "streak-counter",
    name: "Weekly Streak",
    description: "Your consecutive active weeks",
    category: "progress",
    size: "small",
    component: StreakWidget,
    requiresData: ["tracking"],
  },
  {
    id: "next-milestone",
    name: "Next Milestone",
    description: "Progress toward your next achievement",
    category: "progress",
    size: "small",
    component: PlaceholderWidget,
    requiresData: ["milestones"],
  },
  {
    id: "recent-milestones",
    name: "Recent Unlocks",
    description: "Achievements you recently earned",
    category: "progress",
    size: "medium",
    component: PlaceholderWidget,
    requiresData: ["milestones"],
  },
  {
    id: "achievement-wall",
    name: "Achievement Wall",
    description: "All your achievements displayed",
    category: "progress",
    size: "large",
    component: PlaceholderWidget,
    requiresData: ["milestones"],
  },
  {
    id: "xp-this-week",
    name: "XP This Week",
    description: "Experience points earned this week",
    category: "progress",
    size: "small",
    component: PlaceholderWidget,
    requiresData: ["profile"],
  },
]

// ============================================
// Session & Tracking Widgets
// ============================================

const trackingWidgets: WidgetDefinition[] = [
  {
    id: "session-starter",
    name: "Start Session",
    description: "Quick button to start a new session",
    category: "tracking",
    size: "small",
    component: SessionStarterWidget,
  },
  {
    id: "active-session",
    name: "Live Session",
    description: "Your current active session with live stats",
    category: "tracking",
    size: "large",
    component: PlaceholderWidget,
    requiresData: ["session"],
  },
  {
    id: "recent-sessions",
    name: "Recent Sessions",
    description: "Your last few practice sessions",
    category: "tracking",
    size: "medium",
    component: RecentSessionsWidget,
    requiresData: ["sessions"],
  },
  {
    id: "outcome-chart",
    name: "Outcome Distribution",
    description: "Breakdown of your approach outcomes",
    category: "tracking",
    size: "medium",
    component: PlaceholderWidget,
    requiresData: ["tracking"],
  },
  {
    id: "weekly-stats",
    name: "Weekly Stats",
    description: "This week's approaches and sessions",
    category: "tracking",
    size: "medium",
    component: WeeklyStatsWidget,
    requiresData: ["tracking"],
  },
  {
    id: "time-heatmap",
    name: "Best Times",
    description: "When you do most approaches",
    category: "tracking",
    size: "medium",
    component: PlaceholderWidget,
    requiresData: ["tracking"],
  },
]

// ============================================
// Reports & Reflection Widgets
// ============================================

const reflectionWidgets: WidgetDefinition[] = [
  {
    id: "field-report-add",
    name: "Quick Report",
    description: "Shortcut to create a field report",
    category: "reflection",
    size: "small",
    component: PlaceholderWidget,
  },
  {
    id: "recent-reports",
    name: "Field Reports",
    description: "Your recent field reports",
    category: "reflection",
    size: "medium",
    component: PlaceholderWidget,
    requiresData: ["reports"],
  },
  {
    id: "weekly-review",
    name: "Weekly Review",
    description: "Quick access to weekly review",
    category: "reflection",
    size: "small",
    component: PlaceholderWidget,
    requiresData: ["reviews"],
  },
  {
    id: "commitment",
    name: "Commitment",
    description: "Your current weekly commitment",
    category: "reflection",
    size: "small",
    component: PlaceholderWidget,
    requiresData: ["reviews"],
  },
  {
    id: "pending-reviews",
    name: "Pending Reviews",
    description: "Reviews waiting for completion",
    category: "reflection",
    size: "small",
    component: PlaceholderWidget,
    requiresData: ["reviews"],
  },
  {
    id: "values-display",
    name: "My Values",
    description: "Your selected core values",
    category: "reflection",
    size: "medium",
    component: PlaceholderWidget,
    requiresData: ["inner-game"],
  },
]

// ============================================
// Practice & Learning Widgets
// ============================================

const practiceWidgets: WidgetDefinition[] = [
  {
    id: "scenario-start",
    name: "Quick Practice",
    description: "Jump into a random scenario",
    category: "practice",
    size: "small",
    component: PlaceholderWidget,
  },
  {
    id: "qa-box",
    name: "Ask Question",
    description: "Quick access to Q&A coach",
    category: "practice",
    size: "medium",
    component: PlaceholderWidget,
    premium: true,
  },
  {
    id: "featured-article",
    name: "Featured Read",
    description: "Recommended article for you",
    category: "practice",
    size: "medium",
    component: PlaceholderWidget,
  },
  {
    id: "article-pillars",
    name: "Content Pillars",
    description: "Browse by content category",
    category: "practice",
    size: "medium",
    component: PlaceholderWidget,
  },
  {
    id: "concept-day",
    name: "Daily Concept",
    description: "Learn something new today",
    category: "practice",
    size: "small",
    component: PlaceholderWidget,
  },
  {
    id: "ai-recommendations",
    name: "AI Tips",
    description: "Personalized recommendations",
    category: "practice",
    size: "medium",
    component: PlaceholderWidget,
    premium: true,
    requiresData: ["tracking", "profile"],
  },
]

// ============================================
// Goals Widgets (NEW)
// ============================================

const goalsWidgets: WidgetDefinition[] = [
  {
    id: "goals-list",
    name: "Goals",
    description: "All your goals with filters",
    category: "goals",
    size: "large",
    component: GoalsListWidget,
    requiresData: ["goals"],
  },
  {
    id: "goal-progress",
    name: "Goal Progress",
    description: "Progress bars for active goals",
    category: "goals",
    size: "medium",
    component: GoalProgressWidget,
    requiresData: ["goals"],
  },
  {
    id: "today-goals",
    name: "Today's Goals",
    description: "Goals due today",
    category: "goals",
    size: "medium",
    component: TodayGoalsWidget,
    requiresData: ["goals"],
  },
  {
    id: "goal-streaks",
    name: "Goal Streaks",
    description: "Consecutive days hitting goals",
    category: "goals",
    size: "small",
    component: GoalStreaksWidget,
    requiresData: ["goals"],
  },
]

// ============================================
// Account Widgets
// ============================================

const accountWidgets: WidgetDefinition[] = [
  {
    id: "subscription",
    name: "Subscription",
    description: "Your plan and billing",
    category: "account",
    size: "small",
    component: PlaceholderWidget,
    requiresData: ["profile"],
  },
  {
    id: "difficulty",
    name: "Difficulty",
    description: "Adjust game difficulty",
    category: "account",
    size: "small",
    component: PlaceholderWidget,
    requiresData: ["settings"],
  },
  {
    id: "preferences",
    name: "Preferences",
    description: "Your archetype and region",
    category: "account",
    size: "medium",
    component: PlaceholderWidget,
    requiresData: ["profile"],
  },
]

// ============================================
// Combined Registry
// ============================================

const allWidgets = [
  ...progressWidgets,
  ...trackingWidgets,
  ...reflectionWidgets,
  ...practiceWidgets,
  ...goalsWidgets,
  ...accountWidgets,
]

/**
 * Widget registry indexed by ID for O(1) lookup.
 */
export const widgetRegistry: Record<string, WidgetDefinition> = Object.fromEntries(
  allWidgets.map(w => [w.id, w])
)

/**
 * Get all widget definitions as array.
 */
export function getAllWidgets(): WidgetDefinition[] {
  return allWidgets
}
