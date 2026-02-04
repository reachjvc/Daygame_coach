/**
 * Milestone data for achievements display.
 * Extracted from ProgressDashboard for cleaner component structure.
 */

// ============================================
// Types
// ============================================

export interface MilestoneInfo {
  label: string
  emoji: string
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
  description: string
  category: string
}

export type MilestoneTier = MilestoneInfo['tier']

// ============================================
// Tier Information
// ============================================

export const TIER_INFO: Array<{ name: MilestoneTier; label: string; icon: string }> = [
  { name: 'bronze', label: 'Bronze', icon: '🥉' },
  { name: 'silver', label: 'Silver', icon: '🥈' },
  { name: 'gold', label: 'Gold', icon: '🥇' },
  { name: 'platinum', label: 'Platinum', icon: '💎' },
  { name: 'diamond', label: 'Diamond', icon: '👑' },
]

// ============================================
// All Milestones
// ============================================

export const ALL_MILESTONES = {
  // Volume - Approaches
  first_approach: { label: "First Steps", emoji: "👣", tier: "bronze", category: "Approaches", description: "Complete your first approach" },
  "5_approaches": { label: "Getting Started", emoji: "🌱", tier: "bronze", category: "Approaches", description: "Complete 5 approaches" },
  "10_approaches": { label: "Double Digits", emoji: "🔟", tier: "bronze", category: "Approaches", description: "Complete 10 approaches" },
  "25_approaches": { label: "Quarter Century", emoji: "⭐", tier: "silver", category: "Approaches", description: "Complete 25 approaches" },
  "50_approaches": { label: "Half Century", emoji: "🌟", tier: "silver", category: "Approaches", description: "Complete 50 approaches" },
  "100_approaches": { label: "Centurion", emoji: "💯", tier: "gold", category: "Approaches", description: "Complete 100 approaches" },
  "250_approaches": { label: "Veteran", emoji: "🎖️", tier: "gold", category: "Approaches", description: "Complete 250 approaches" },
  "500_approaches": { label: "Elite", emoji: "💎", tier: "platinum", category: "Approaches", description: "Complete 500 approaches" },
  "1000_approaches": { label: "Legend", emoji: "🏆", tier: "diamond", category: "Approaches", description: "Complete 1,000 approaches" },
  // Volume - Numbers
  first_number: { label: "First Digits", emoji: "📱", tier: "bronze", category: "Numbers", description: "Get your first number" },
  "2_numbers": { label: "Doubling Up", emoji: "✌️", tier: "bronze", category: "Numbers", description: "Get 2 numbers" },
  "5_numbers": { label: "High Five", emoji: "🖐️", tier: "silver", category: "Numbers", description: "Get 5 numbers" },
  "10_numbers": { label: "Perfect 10", emoji: "🔥", tier: "silver", category: "Numbers", description: "Get 10 numbers" },
  "25_numbers": { label: "Contact King", emoji: "👑", tier: "gold", category: "Numbers", description: "Get 25 numbers" },
  "50_numbers": { label: "Phonebook", emoji: "📖", tier: "platinum", category: "Numbers", description: "Get 50 numbers" },
  "100_numbers": { label: "Social Butterfly", emoji: "🦋", tier: "diamond", category: "Numbers", description: "Get 100 numbers" },
  // Volume - Instadates
  first_instadate: { label: "First Date!", emoji: "☕", tier: "silver", category: "Instadates", description: "Go on your first instadate" },
  "2_instadates": { label: "Date Night", emoji: "🌙", tier: "silver", category: "Instadates", description: "Go on 2 instadates" },
  "5_instadates": { label: "Smooth Operator", emoji: "😎", tier: "gold", category: "Instadates", description: "Go on 5 instadates" },
  "10_instadates": { label: "Mr. Spontaneous", emoji: "⚡", tier: "platinum", category: "Instadates", description: "Go on 10 instadates" },
  "25_instadates": { label: "Date Master", emoji: "🎩", tier: "diamond", category: "Instadates", description: "Go on 25 instadates" },
  // Sessions
  first_session: { label: "First Session", emoji: "🚀", tier: "bronze", category: "Sessions", description: "Complete your first session" },
  "3_sessions": { label: "Hat Trick", emoji: "🎩", tier: "bronze", category: "Sessions", description: "Complete 3 sessions" },
  "5_sessions": { label: "Regular", emoji: "📅", tier: "silver", category: "Sessions", description: "Complete 5 sessions" },
  "10_sessions": { label: "Dedicated", emoji: "💪", tier: "silver", category: "Sessions", description: "Complete 10 sessions" },
  "25_sessions": { label: "Committed", emoji: "🔒", tier: "gold", category: "Sessions", description: "Complete 25 sessions" },
  "50_sessions": { label: "Iron Will", emoji: "⚔️", tier: "platinum", category: "Sessions", description: "Complete 50 sessions" },
  "100_sessions": { label: "Unstoppable", emoji: "🦾", tier: "diamond", category: "Sessions", description: "Complete 100 sessions" },
  first_5_approach_session: { label: "Warming Up", emoji: "🔥", tier: "bronze", category: "Sessions", description: "Do 5+ approaches in one session" },
  first_10_approach_session: { label: "On Fire", emoji: "🔥", tier: "silver", category: "Sessions", description: "Do 10+ approaches in one session" },
  first_goal_hit: { label: "Goal Crusher", emoji: "🎯", tier: "bronze", category: "Sessions", description: "Hit your session goal" },
  // Weekly Streaks
  "2_week_streak": { label: "Getting Momentum", emoji: "🌊", tier: "bronze", category: "Streaks", description: "2 active weeks in a row" },
  "4_week_streak": { label: "Month Strong", emoji: "📅", tier: "silver", category: "Streaks", description: "4 active weeks in a row" },
  "8_week_streak": { label: "Two Months!", emoji: "💪", tier: "gold", category: "Streaks", description: "8 active weeks in a row" },
  "12_week_streak": { label: "Quarter Year", emoji: "🔥", tier: "gold", category: "Streaks", description: "12 active weeks in a row" },
  "26_week_streak": { label: "Half Year Hero", emoji: "🦸", tier: "platinum", category: "Streaks", description: "26 active weeks in a row" },
  "52_week_streak": { label: "Year Champion", emoji: "👑", tier: "diamond", category: "Streaks", description: "52 active weeks in a row" },
  // Reports & Reviews
  first_field_report: { label: "Field Scholar", emoji: "📝", tier: "bronze", category: "Reports", description: "Write your first field report" },
  "5_field_reports": { label: "Reporter", emoji: "📰", tier: "silver", category: "Reports", description: "Write 5 field reports" },
  "10_field_reports": { label: "Analyst", emoji: "📊", tier: "silver", category: "Reports", description: "Write 10 field reports" },
  "25_field_reports": { label: "Chronicler", emoji: "📚", tier: "gold", category: "Reports", description: "Write 25 field reports" },
  "50_field_reports": { label: "Historian", emoji: "🏛️", tier: "platinum", category: "Reports", description: "Write 50 field reports" },
  first_weekly_review: { label: "Self-Aware", emoji: "🪞", tier: "bronze", category: "Reports", description: "Complete your first weekly review" },
  monthly_unlocked: { label: "Monthly Unlocked", emoji: "🔓", tier: "silver", category: "Reports", description: "Complete 4 weekly reviews" },
  quarterly_unlocked: { label: "Quarterly Unlocked", emoji: "🗝️", tier: "gold", category: "Reports", description: "Complete 3 monthly reviews" },
  // Fun/Variety
  early_bird: { label: "Early Bird", emoji: "🐦", tier: "bronze", category: "Special", description: "Start a session before 10am" },
  globetrotter: { label: "Globetrotter", emoji: "🌍", tier: "gold", category: "Special", description: "Approach in 5 different locations" },
  consistent: { label: "Consistent", emoji: "📈", tier: "silver", category: "Special", description: "Approach every day for a week" },
  marathon: { label: "Marathon Man", emoji: "🏃", tier: "gold", category: "Special", description: "Complete a 2+ hour session" },
  weekend_warrior: { label: "Weekend Warrior", emoji: "⚔️", tier: "bronze", category: "Special", description: "Complete a session on the weekend" },
  // Comeback & Resilience
  comeback_kid: { label: "Comeback Kid", emoji: "🔄", tier: "silver", category: "Special", description: "Return after 2+ weeks away" },
  rejection_proof: { label: "Rejection Proof", emoji: "🛡️", tier: "gold", category: "Special", description: "Log 10 approaches with no numbers in one session" },
  never_give_up: { label: "Never Give Up", emoji: "💪", tier: "platinum", category: "Special", description: "Complete a session after 5 consecutive rejections" },
  // Time-based achievements
  lunch_break_legend: { label: "Lunch Break Legend", emoji: "🥪", tier: "silver", category: "Special", description: "Complete 3+ approaches between 12-1pm" },
  rush_hour_hero: { label: "Rush Hour Hero", emoji: "🚇", tier: "silver", category: "Special", description: "Complete 5+ approaches during rush hour (5-7pm)" },
  sunday_funday: { label: "Sunday Funday", emoji: "☀️", tier: "bronze", category: "Special", description: "Complete a session on Sunday" },
  new_years_resolution: { label: "New Year's Resolution", emoji: "🎆", tier: "gold", category: "Special", description: "Complete a session in the first week of January" },
  valentines_warrior: { label: "Valentine's Warrior", emoji: "💘", tier: "gold", category: "Special", description: "Complete a session on Valentine's Day" },
  // Efficiency achievements
  sniper: { label: "Sniper", emoji: "🎯", tier: "gold", category: "Special", description: "Get a number on your first approach of the day" },
  hot_streak: { label: "Hot Streak", emoji: "🔥", tier: "platinum", category: "Special", description: "Get 3 numbers in a single session" },
  perfect_session: { label: "Perfect Session", emoji: "✨", tier: "diamond", category: "Special", description: "Get 5+ numbers in a single session" },
  instant_connection: { label: "Instant Connection", emoji: "⚡", tier: "gold", category: "Special", description: "Get an instadate on your first approach" },
  double_date: { label: "Double Date", emoji: "👯", tier: "platinum", category: "Special", description: "Get 2 instadates in one session" },
  // Location variety
  coffee_connoisseur: { label: "Coffee Connoisseur", emoji: "☕", tier: "silver", category: "Special", description: "Get a number in a coffee shop" },
  bookworm: { label: "Bookworm", emoji: "📚", tier: "silver", category: "Special", description: "Get a number in a bookstore" },
  street_smart: { label: "Street Smart", emoji: "🛣️", tier: "bronze", category: "Special", description: "Complete 10 street approaches" },
  mall_rat: { label: "Mall Rat", emoji: "🛍️", tier: "bronze", category: "Special", description: "Complete 10 mall approaches" },
  park_ranger: { label: "Park Ranger", emoji: "🌳", tier: "bronze", category: "Special", description: "Complete 10 park approaches" },
  // Mindset & Growth
  first_rejection: { label: "Baptism by Fire", emoji: "🔥", tier: "bronze", category: "Mindset", description: "Log your first rejection - you're in the arena!" },
  "10_rejections": { label: "Thick Skin", emoji: "🦏", tier: "silver", category: "Mindset", description: "Handle 10 rejections with grace" },
  "50_rejections": { label: "Bulletproof", emoji: "🛡️", tier: "gold", category: "Mindset", description: "Handle 50 rejections - nothing stops you" },
  "100_rejections": { label: "Rejection Master", emoji: "👊", tier: "platinum", category: "Mindset", description: "Handle 100 rejections - true mastery" },
  first_blowout: { label: "Battle Scars", emoji: "⚔️", tier: "bronze", category: "Mindset", description: "Experience your first harsh rejection" },
  approach_anxiety_conquered: { label: "Fear Slayer", emoji: "🐉", tier: "silver", category: "Mindset", description: "Complete 3 approaches in under 10 minutes" },
  zone_state: { label: "In The Zone", emoji: "🧘", tier: "gold", category: "Mindset", description: "Complete 5 approaches in 15 minutes" },
  flow_state: { label: "Flow State", emoji: "🌊", tier: "platinum", category: "Mindset", description: "Complete 10 approaches in 30 minutes" },
  // Social (tracked via session wingman fields)
  wing_commander: { label: "Wing Commander", emoji: "🦅", tier: "silver", category: "Social", description: "Complete a session with a wingman" },
  "10_wingman_sessions": { label: "Dynamic Duo", emoji: "🤝", tier: "gold", category: "Social", description: "Complete 10 wingman sessions" },
  "25_wingman_sessions": { label: "Brotherhood", emoji: "👊", tier: "platinum", category: "Social", description: "Complete 25 wingman sessions" },
  first_double_set: { label: "Double Team", emoji: "👯", tier: "gold", category: "Social", description: "Successfully approach a 2-set with your wing" },
  "10_double_sets": { label: "Teamwork", emoji: "🏆", tier: "platinum", category: "Social", description: "Complete 10 double sets with your wing" },
  // Unique Set Types (tracked via approach set_type field)
  first_two_set: { label: "Pair Opener", emoji: "👭", tier: "bronze", category: "Unique Sets", description: "Approach your first 2-set" },
  first_group: { label: "Group Master", emoji: "👥", tier: "silver", category: "Unique Sets", description: "Approach a group of 3+" },
  first_mixed_group: { label: "Social Infiltrator", emoji: "🎭", tier: "gold", category: "Unique Sets", description: "Approach a mixed group (guys + girls)" },
  first_mom_daughter: { label: "Family Affair", emoji: "👩‍👧", tier: "gold", category: "Unique Sets", description: "Approach a mother-daughter pair" },
  first_sisters: { label: "Double Trouble", emoji: "👯‍♀️", tier: "gold", category: "Unique Sets", description: "Approach a set of sisters" },
  first_tourist: { label: "Tour Guide", emoji: "🗺️", tier: "bronze", category: "Unique Sets", description: "Approach your first tourist" },
  tourist_guide: { label: "World Welcome", emoji: "🌎", tier: "silver", category: "Unique Sets", description: "Approach 10 tourists" },
  world_traveler: { label: "Global Ambassador", emoji: "🌍", tier: "gold", category: "Unique Sets", description: "Approach 25 tourists" },
  first_moving_set: { label: "Catch Me", emoji: "🏃‍♀️", tier: "silver", category: "Unique Sets", description: "Stop and approach someone walking" },
  first_seated: { label: "Sit Down", emoji: "🪑", tier: "bronze", category: "Unique Sets", description: "Approach your first seated set" },
  "10_seated": { label: "Table Service", emoji: "☕", tier: "silver", category: "Unique Sets", description: "Approach 10 seated sets" },
  seated_master: { label: "Seated Master", emoji: "🛋️", tier: "gold", category: "Unique Sets", description: "Approach 25 seated sets" },
  first_foreign: { label: "Lost in Translation", emoji: "🗣️", tier: "silver", category: "Unique Sets", description: "Approach someone speaking a different language" },
  polyglot: { label: "Polyglot", emoji: "🌐", tier: "gold", category: "Unique Sets", description: "Approach girls speaking 5 different languages" },
  first_celebrity: { label: "Star Struck", emoji: "⭐", tier: "gold", category: "Unique Sets", description: "Approach someone with model/celebrity vibes" },
  // Big milestones
  "2000_approaches": { label: "Approach God", emoji: "⚡", tier: "diamond", category: "Approaches", description: "Complete 2,000 approaches" },
  "5000_approaches": { label: "Living Legend", emoji: "🌟", tier: "diamond", category: "Approaches", description: "Complete 5,000 approaches" },
  "200_numbers": { label: "Number Ninja", emoji: "🥷", tier: "diamond", category: "Numbers", description: "Get 200 numbers" },
  "50_instadates": { label: "Instadate King", emoji: "👑", tier: "diamond", category: "Instadates", description: "Go on 50 instadates" },
  // Legacy
  "7_day_streak": { label: "Week Warrior", emoji: "📆", tier: "bronze", category: "Streaks", description: "7 consecutive days approaching" },
  "30_day_streak": { label: "Month Master", emoji: "🗓️", tier: "silver", category: "Streaks", description: "30 consecutive days approaching" },
  "100_day_streak": { label: "Century Streak", emoji: "💯", tier: "gold", category: "Streaks", description: "100 consecutive days approaching" },
} as const satisfies Record<string, MilestoneInfo>

/**
 * MilestoneType is derived from ALL_MILESTONES keys.
 * This is the single source of truth - add/remove milestones from ALL_MILESTONES only.
 */
export type MilestoneType = keyof typeof ALL_MILESTONES

// ============================================
// Helper Functions
// ============================================

export function getMilestoneInfo(type: string): MilestoneInfo {
  // Cast needed because ALL_MILESTONES is const - graceful fallback for unknown/orphaned types
  return (ALL_MILESTONES as Record<string, MilestoneInfo>)[type] || { label: type, emoji: "🏅", tier: "bronze", category: "Other", description: "Achievement unlocked" }
}

export function getTierColor(tier: MilestoneTier): string {
  switch (tier) {
    case 'bronze': return 'from-amber-600 to-amber-800'
    case 'silver': return 'from-slate-300 to-slate-500'
    case 'gold': return 'from-yellow-400 to-yellow-600'
    case 'platinum': return 'from-cyan-300 to-cyan-500'
    case 'diamond': return 'from-violet-400 to-fuchsia-500'
  }
}

export function getTierBg(tier: MilestoneTier): string {
  switch (tier) {
    case 'bronze': return 'bg-amber-500/10'
    case 'silver': return 'bg-slate-400/10'
    case 'gold': return 'bg-yellow-500/10'
    case 'platinum': return 'bg-cyan-400/10'
    case 'diamond': return 'bg-violet-500/10'
  }
}

/**
 * Get all unique milestone categories
 */
export function getMilestoneCategories(): string[] {
  return [...new Set(Object.values(ALL_MILESTONES).map(m => m.category))]
}

/**
 * Get all tiers as a Set (useful for filter state)
 */
export function getAllTiers(): Set<MilestoneTier> {
  return new Set<MilestoneTier>(['bronze', 'silver', 'gold', 'platinum', 'diamond'])
}
