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
  "ArrowUp",
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
  "List",
  "Loader2",
  "LocateFixed",
  "LogOut",
  "Menu",
  "Minus",
  "MoreVertical",
  "Pencil",
  "Play",
  "Plus",
  "RotateCcw",
  "Save",
  "Search",
  "Settings",
  "Settings2",
  "SkipForward",
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
  Ban: ["vices/elimination life area"],
  Beaker: ["test pages (dev only)"],
  BookOpen: ["reading/knowledge"],
  Brain: ["psychology/inner-game", "analysis"],
  Calendar: ["date display", "date pickers", "time-related stats"],
  CalendarDays: ["per-goal target date pickers"],
  Castle: ["reserved — lair (not on beta)"],
  CheckCircle2: ["completed scenarios"],
  CircleHelp: ["critical questions", "key stats", "goals step tour trigger"],
  Clock: ["duration/time display", "projected timelines", "time settings"],
  FileText: ["reports", "documents", "templates"],
  Flame: ["streaks", "intensity metrics"],
  GitBranch: ["child goal count"],
  Globe: ["language/region settings", "scenario settings"],
  GraduationCap: ["learning", "education", "life area"],
  Heart: ["dating life area", "emotional"],
  HelpCircle: ["help"],
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
  SlidersHorizontal: ["milestone curve customization", "calibration principles"],
  ShieldCheck: ["safety", "protection", "key stats"],
  BarChart3: ["feature highlight", "marketing stats"],
  CircleDot: ["individual L1 goal header", "goal widgets empty state", "generic objective icon"],
  Compass: ["navigation", "direction", "principles section"],
  Crosshair: ["site logo/branding", "evaluator calibration"],
  Dumbbell: ["fitness life area", "technique focus"],
  Crown: ["level progress", "level-up display"],
  Aperture: ["goals feature icon — headers, nav, empty states"],
  // Flag: replaced by Aperture (was custom GoalIcon component)
  Footprints: ["tracking approaches stat", "session context"],
  Info: ["informational tooltips", "constellation view legend"],
  GitFork: ["tree view"],
  Gauge: ["level progress meter"],
  Layers: ["hierarchy view"],
  Leaf: ["seasonal/weather decoration", "garden view"],
  Library: ["catalog browse", "content browse"],
  Medal: ["milestone completion", "milestone badges", "streak milestones"],
  Orbit: ["orrery/planetary view"],
  PartyPopper: ["celebration overlay", "completion celebration"],
  Puzzle: ["custom/miscellaneous life area"],
  Rocket: ["onboarding"],
  Shield: ["streak freezes", "defensive/protection theme", "scenario catalog"],
  Sprout: ["personal growth life area", "garden view growth stages"],
  Sparkles: ["AI/magic features", "sparkle decoration"],
  Star: ["favorites", "dream goals", "primary mission", "suggestion highlight"],
  Snowflake: ["seasonal/weather decoration"],
  Swords: ["scenarios module", "practice/sparring"],
  Sun: ["daily view"],
  Sunrise: ["inner-game aspiration", "value prioritization"],
  Target: ["icon preview"],
  TrendingUp: ["growth metrics", "progress indicators", "milestone progress"],
  Trophy: ["achievement badges", "completion step"],
  Users: ["social life area", "common humanity"],
  Wand2: ["AI enhancement"],
  Zap: ["energy", "quick actions", "onboarding"],
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
      /app\/test\//,          // icon comparison test page only
    ],
  },
}
