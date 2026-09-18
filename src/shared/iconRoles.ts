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
  "LucideIcon",
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
  Activity: ["health tracking panel header", "mobility/yoga metric tiles"],
  Award: ["achievements", "milestone badges"],
  Ban: ["vices/elimination life area"],
  Beaker: ["test pages (dev only)"],
  BookOpen: ["articles nav", "reading/knowledge", "goals guidance"],
  Brain: ["psychology/inner-game", "analysis"],
  Calendar: ["date display", "date pickers", "time-related stats"],
  CalendarCheck: ["habit consistency", "build-the-habit objective"],
  CalendarDays: ["per-goal target date pickers"],
  CheckCircle2: ["completed scenarios"],
  CircleHelp: ["critical questions", "key stats", "goals step tour trigger"],
  Clock: ["duration/time display", "projected timelines", "time settings"],
  FileText: ["reports", "documents", "templates"],
  Flame: ["streaks", "intensity metrics"],
  GitBranch: ["child goal count"],
  Globe: ["language/region settings", "scenario settings"],
  GraduationCap: ["learning", "education", "life area"],
  Heart: ["dating life area", "emotional"],
  HelpCircle: ["ask coach", "help"],
  Landmark: ["wealth/financial life area", "institution/empire building"],
  LayoutDashboard: ["dashboard nav"],
  LayoutGrid: ["grid view toggle"],
  ListChecks: ["implementation plans", "key stats"],
  Lightbulb: ["suggestions", "insights"],
  Link: ["auto-synced metrics"],
  Lock: ["locked/premium content"],
  Map: ["strategic view"],
  MapPin: ["location in reports", "unique-locations metric tile"],
  MessageCircle: ["chat", "coach"],
  MessageSquare: ["messaging"],
  Mic: ["voice recording"],
  Milestone: ["milestone goal type"],
  RefreshCw: ["recurring goal type selector"],
  Repeat: ["recurring goal type"],
  Scale: ["balance", "calibration", "key stats"],
  SlidersHorizontal: ["milestone curve customization", "calibration principles", "review template icons"],
  ShieldCheck: ["safety", "protection", "key stats"],
  BarChart3: ["feature highlight", "marketing stats", "tracking bottom tab"],
  CircleDot: ["individual L1 goal header", "goal widgets empty state", "generic objective icon"],
  ClipboardCheck: ["structured review templates", "checklist-style reviews", "weekly-review-count metric tile"],
  Compass: ["navigation", "direction", "principles section"],
  Crosshair: ["site logo/branding", "evaluator calibration"],
  Dumbbell: ["fitness life area", "technique focus", "workout logging entry point"],
  Crown: ["level progress", "level-up display"],
  Aperture: ["goals feature icon — headers, nav, empty states"],
  Flag: ["stage primitive fallback", "goal stages"],
  Footprints: ["tracking approaches stat", "session context"],
  Info: ["informational tooltips", "constellation view legend"],
  GitFork: ["tree view"],
  Gauge: ["level progress meter"],
  Layers: ["hierarchy view"],
  Link2: ["shared driver connections", "linked goals"],
  Leaf: ["seasonal/weather decoration", "garden view"],
  Library: ["catalog browse", "content browse"],
  Medal: ["milestone completion", "milestone badges", "streak milestones"],
  Orbit: ["orrery/planetary view"],
  PartyPopper: ["celebration overlay", "completion celebration"],
  Puzzle: ["custom/miscellaneous life area"],
  Rocket: ["onboarding", "start a business objective icon"],
  Scaling: ["body transformation objective icon"],
  Shield: ["streak freezes", "defensive/protection theme", "scenario catalog"],
  Sprout: ["personal growth life area", "garden view growth stages"],
  Sparkles: ["AI/magic features", "sparkle decoration"],
  Star: ["favorites", "dream goals", "primary mission", "suggestion highlight"],
  Timer: ["time tracker navigation", "rest countdown (RestBar)", "time-limited reflection principle"],
  Snowflake: ["seasonal/weather decoration"],
  Swords: ["scenarios module", "practice/sparring"],
  Sun: ["daily view"],
  Sunrise: ["inner-game aspiration", "value prioritization"],
  Target: ["icon preview", "review template icons"],
  TargetIcon: ["alias for Target in primitive icon maps — avoids JSX attribute collision"],
  TreePine: ["tree of life view mode", "tree of life empty state"],
  TrendingUp: ["growth metrics", "progress indicators", "milestone progress"],
  Trophy: ["achievement badges", "completion step"],
  UtensilsCrossed: ["nutrition metrics — protein days, calorie days, nutrition quality"],
  Users: ["social life area", "common humanity"],
  Wand2: ["AI enhancement"],
  Wind: ["endurance/cardio objective icon"],
  Zap: ["energy", "quick actions", "onboarding"],
}

// All registered icon names (utility + semantic) for test enforcement
export const ALL_REGISTERED_ICONS = new Set([
  ...UTILITY_ICONS,
  ...Object.keys(SEMANTIC_ICON_ROLES),
])

// ---------------------------------------------------------------------------
// Context-locked icons — a role is a place, not just a name.
//
// THE FAILURE THIS EXISTS TO PREVENT. The registry above only asked whether an
// icon used in two files was written down somewhere. It never asked whether the
// second file was doing the job the icon was registered for. So the stopwatch
// (Timer) was registered for the Time-tracker tab and then quietly picked up by
// the live workout's rest countdown, and every test passed — the reuse the
// rules say needs a yes went through without one being asked for.
//
// An icon listed here may only be imported from the files named. The list may
// SHRINK (a file is deleted, a screen stops using it) and never grow without
// the owner saying yes, the same convention every allowlist in this codebase
// follows. Enforced by tests/unit/architecture.test.ts.
//
// CLAUDE: Do NOT add entries or expand allowed patterns without explicit user approval.
// ---------------------------------------------------------------------------
export const CONTEXT_LOCKED_ICONS: Record<string, RegExp[]> = {
  // Approved 2026-09-17 for its second job, the rest countdown. A stopwatch on
  // a rest timer is what people expect; the lock is what stops it drifting into
  // a third context without being noticed.
  Timer: [
    /^components\/navTabs\.ts$/, // the Time tracker tab
    /^src\/programs\/components\/live\/RestBar\.tsx$/, // the rest countdown
    /^src\/programs\/components\/RestTimer\.tsx$/, // the older rest timer, until it goes
    // Already here when the lock was written, and found by running the check
    // rather than by listing files from memory — which is the point of running
    // it. Principle 17 is "set a time limit on rumination", so a stopwatch is
    // the same idea a third time: a clock that is counting something down.
    /^src\/tracking\/data\/principles\.tsx$/,
  ],
}

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
