/**
 * Icon Roles Registry
 *
 * Governs which lucide-react icons can appear in multiple files.
 * Enforced by tests/unit/architecture.test.ts.
 *
 * CLAUDE: Do NOT add icons to this registry or expand roles
 * without explicit user approval. See CLAUDE.md Rule 16.
 */

// ---------------------------------------------------------------------------
// Utility icons — generic UI actions, can be used anywhere without restriction.
// These represent universal interaction patterns (add, close, expand, delete…)
// and carry no semantic meaning specific to the app domain.
// ---------------------------------------------------------------------------
export const UTILITY_ICONS = new Set([
  "AlertCircle",
  "AlertTriangle",
  "Archive",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUpDown",
  "Check",
  "ChevronDown",
  "ChevronLeft",
  "ChevronRight",
  "ChevronUp",
  "Circle",
  "Download",
  "Eye",
  "EyeOff",
  "Filter",
  "GripVertical",
  "Loader2",
  "LocateFixed",
  "LogOut",
  "Menu",
  "Minus",
  "Pencil",
  "Play",
  "Plus",
  "RotateCcw",
  "Save",
  "Search",
  "Settings",
  "Settings2",
  "Square",
  "Trash2",
  "Upload",
  "X",
])

// ---------------------------------------------------------------------------
// Semantic icons — concept-representing icons approved for specific roles.
// Each key is the lucide-react export name; the value array documents the
// approved usage contexts. If you need an icon in a context not listed here,
// ask the user first.
// ---------------------------------------------------------------------------
export const SEMANTIC_ICON_ROLES: Record<string, string[]> = {
  Award: ["achievements", "milestone badges"],
  Beaker: ["test pages (dev only)"],
  BookOpen: ["articles nav", "reading/knowledge"],
  Brain: ["psychology/inner-game", "analysis"],
  Calendar: ["date display", "date pickers", "time-related stats"],
  Castle: ["the lair nav"],
  CheckCircle2: ["completed scenarios"],
  CircleHelp: ["critical questions", "key stats"],
  Clock: ["duration/time display", "projected timelines", "time settings"],
  FileText: ["reports", "documents", "templates"],
  Flame: ["streaks", "intensity metrics"],
  GitBranch: ["child goal count"],
  Globe: ["language/region settings", "scenario settings"],
  GraduationCap: ["learning", "education", "life area"],
  Heart: ["dating life area", "emotional"],
  HelpCircle: ["ask coach", "help"],
  LayoutDashboard: ["dashboard nav"],
  LayoutGrid: ["grid view toggle"],
  ListChecks: ["implementation plans", "key stats"],
  Lightbulb: ["suggestions", "insights"],
  Link: ["auto-synced metrics"],
  Lock: ["locked/premium content"],
  Map: ["strategic view"],
  MapPin: ["location in reports"],
  MessageCircle: ["chat", "coach"],
  MessageSquare: ["messaging"],
  Mic: ["voice recording"],
  Milestone: ["milestone goal type"],
  Repeat: ["recurring goal type"],
  Scale: ["balance", "calibration", "key stats"],
  ShieldCheck: ["safety", "protection", "key stats"],
  BarChart3: ["feature highlight", "marketing stats"],
  CircleDot: ["individual L1 goal header", "goal widgets empty state", "generic objective icon"],
  Compass: ["navigation", "direction", "principles section"],
  Crosshair: ["site logo/branding", "evaluator calibration"],
  Dumbbell: ["fitness life area", "technique focus"],
  Crown: ["level progress", "level-up display"],
  // Flag: replaced by custom GoalIcon component (components/ui/GoalIcon.tsx)
  Footprints: ["tracking approaches stat", "session context"],
  Gauge: ["level progress meter"],
  Library: ["catalog browse", "content browse"],
  Medal: ["milestone completion", "milestone badges", "streak milestones"],
  PartyPopper: ["celebration overlay", "completion celebration"],
  Puzzle: ["custom/miscellaneous life area"],
  Rocket: ["onboarding"],
  Sparkles: ["AI/magic features", "sparkle decoration"],
  Star: ["favorites", "dream goals", "primary mission", "suggestion highlight"],
  Swords: ["scenarios module", "practice/sparring"],
  Sun: ["daily view"],
  Sunrise: ["inner-game aspiration", "value prioritization"],
  Target: ["icon preview"],
  TrendingUp: ["growth metrics", "progress indicators", "milestone progress"],
  Trophy: ["achievement badges", "completion step"],
  Users: ["social life area", "common humanity"],
  Wand2: ["AI enhancement"],
  Zap: ["energy", "quick actions"],
}

// All registered icon names (utility + semantic) for test enforcement
export const ALL_REGISTERED_ICONS = new Set([
  ...UTILITY_ICONS,
  ...Object.keys(SEMANTIC_ICON_ROLES),
])

// ---------------------------------------------------------------------------
// Custom icon components — project-specific SVG components that act as icons.
// Each entry maps an import path fragment to the file patterns allowed to use it.
// Enforced by tests/unit/architecture.test.ts.
//
// CLAUDE: Do NOT add entries or expand allowed patterns without explicit user approval.
// ---------------------------------------------------------------------------
export const CUSTOM_ICON_COMPONENTS: Record<string, { importPattern: string; allowedPathPatterns: RegExp[] }> = {
  GoalIcon: {
    importPattern: "GoalIcon",
    allowedPathPatterns: [
      /src\/goals\//,
      /src\/tracking\//,
      /src\/inner-game\//,
      /src\/home\//,
      /components\/AppHeader/,
      /app\/test\//,
    ],
  },
}
