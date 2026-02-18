"use client"

import { createContext, useContext, useMemo } from "react"
import type { CurveThemeId } from "@/src/goals/types"

// ============================================================================
// War Room Theme Configuration
// ============================================================================

export interface WarRoomThemeConfig {
  id: CurveThemeId

  // Core palette
  bg: string
  bgSecondary: string
  bgTertiary: string
  text: string
  textMuted: string
  textFaint: string
  accent: string
  accentSecondary: string
  accentFaded: string
  accentGlow: string
  border: string
  borderHover: string
  cardBg: string
  cardBorder: string
  dangerAccent: string

  // Typography
  fontFamily: string
  headingWeight: number
  textTransform: "none" | "uppercase"
  letterSpacing: string

  // Shape
  borderRadius: number
  borderRadiusLg: number

  // Effects
  shadow: string
  hoverShadow: string
  glowFilter: string

  // Decorative
  scanlines: boolean
  cornerBrackets: boolean

  // War Room vocabulary
  vocab: {
    campaign: string
    campaignSubtitle: string
    phase: string
    phaseI: string
    phaseII: string
    phaseIII: string
    phaseIName: string
    phaseIIName: string
    phaseIIIName: string
    objective: string
    objectives: string
    directive: string
    intelligence: string
    status: string
    statusPlanning: string
    statusActive: string
    timeline: string
    riskLevel: string
    riskLow: string
    riskMedium: string
    riskHigh: string
    threatLevel: string
    approve: string
    deploy: string
    startOver: string
    back: string
    selectArea: string
    selectPath: string
    customize: string
    strategy: string
    complete: string
    lifeArea: string
    goalPath: string
    campaignName: string
    inputGoals: string
    mixedGoals: string
    outcomeGoals: string
    overallProgress: string
    estimatedDuration: string
    totalObjectives: string
    habit: string
    milestone: string
    briefingTitle: string
    briefingSubtitle: string
  }
}

// ============================================================================
// Zen Theme — "The Art of Strategy" (Sun Tzu)
// ============================================================================

const ZEN_THEME: WarRoomThemeConfig = {
  id: "zen",

  bg: "#faf8f1",
  bgSecondary: "#f5f0e8",
  bgTertiary: "#ede6d8",
  text: "#1a1a2e",
  textMuted: "#7a7568",
  textFaint: "#b5ad9e",
  accent: "#1a1a2e",
  accentSecondary: "#8b5e3c",
  accentFaded: "rgba(139, 94, 60, 0.1)",
  accentGlow: "rgba(139, 94, 60, 0.2)",
  border: "#d6cfc0",
  borderHover: "#8b5e3c60",
  cardBg: "#fdfcf8",
  cardBorder: "#e3ddd0",
  dangerAccent: "#c4523e",

  fontFamily: "'Georgia', 'Times New Roman', serif",
  headingWeight: 600,
  textTransform: "none",
  letterSpacing: "0.02em",

  borderRadius: 12,
  borderRadiusLg: 16,

  shadow: "0 2px 8px rgba(26,26,46,0.04)",
  hoverShadow: "0 4px 20px rgba(139,94,60,0.1)",
  glowFilter: "none",

  scanlines: false,
  cornerBrackets: false,

  vocab: {
    campaign: "The Path of the Warrior-Scholar",
    campaignSubtitle: "A journey of a thousand miles begins with a single step",
    phase: "Chapter",
    phaseI: "Chapter I",
    phaseII: "Chapter II",
    phaseIII: "Chapter III",
    phaseIName: "The Way of Foundation",
    phaseIIName: "The Way of Advancement",
    phaseIIIName: "The Way of Mastery",
    objective: "Principle",
    objectives: "Principles",
    directive: "Discipline",
    intelligence: "Wisdom",
    status: "Status",
    statusPlanning: "Contemplation",
    statusActive: "In Practice",
    timeline: "The Path Ahead",
    riskLevel: "Challenge Level",
    riskLow: "Flowing",
    riskMedium: "Steady",
    riskHigh: "Demanding",
    threatLevel: "Difficulty",
    approve: "Set upon the path",
    deploy: "Begin the journey",
    startOver: "Return to stillness",
    back: "Step back",
    selectArea: "Life Area",
    selectPath: "Goal Path",
    customize: "Refine",
    strategy: "Strategy",
    complete: "Complete",
    lifeArea: "Realm",
    goalPath: "Path",
    campaignName: "Scroll of Strategy",
    inputGoals: "Daily Practices",
    mixedGoals: "Skills to Cultivate",
    outcomeGoals: "Achievements to Earn",
    overallProgress: "Journey Progress",
    estimatedDuration: "Path Duration",
    totalObjectives: "Total Principles",
    habit: "practice",
    milestone: "mastery",
    briefingTitle: "The Scroll of Strategy",
    briefingSubtitle: "Your path is set. Walk it with patience and purpose.",
  },
}

// ============================================================================
// Cyberpunk Theme — "Tactical HUD"
// ============================================================================

const CYBERPUNK_THEME: WarRoomThemeConfig = {
  id: "cyberpunk",

  bg: "#050505",
  bgSecondary: "#0a0a0a",
  bgTertiary: "#0f0f0f",
  text: "#e0e0e0",
  textMuted: "#666666",
  textFaint: "#333333",
  accent: "#00ff41",
  accentSecondary: "#ff0033",
  accentFaded: "rgba(0, 255, 65, 0.06)",
  accentGlow: "rgba(0, 255, 65, 0.4)",
  border: "#1a1a1a",
  borderHover: "#00ff4180",
  cardBg: "#0a0a0a",
  cardBorder: "#1a1a1a",
  dangerAccent: "#ff0033",

  fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
  headingWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.08em",

  borderRadius: 2,
  borderRadiusLg: 4,

  shadow: "none",
  hoverShadow: "0 0 30px rgba(0, 255, 65, 0.1)",
  glowFilter: "drop-shadow(0 0 6px rgba(0,255,65,0.5))",

  scanlines: true,
  cornerBrackets: true,

  vocab: {
    campaign: "OPERATION: SOCIAL_DOMINANCE",
    campaignSubtitle: "TACTICAL CAMPAIGN INITIALIZED // AWAITING DEPLOYMENT",
    phase: "PHASE",
    phaseI: "PHASE_I",
    phaseII: "PHASE_II",
    phaseIII: "PHASE_III",
    phaseIName: "FOUNDATION_PROTOCOL",
    phaseIIName: "ADVANCEMENT_SEQUENCE",
    phaseIIIName: "VICTORY_CONDITION",
    objective: "Objective",
    objectives: "OBJECTIVES",
    directive: "DIRECTIVE",
    intelligence: "INTEL_REPORT",
    status: "SYS_STATUS",
    statusPlanning: "PLANNING",
    statusActive: "ACTIVE",
    timeline: "CAMPAIGN_TIMELINE",
    riskLevel: "RISK_ASSESSMENT",
    riskLow: "LOW",
    riskMedium: "ELEVATED",
    riskHigh: "CRITICAL",
    threatLevel: "THREAT_LVL",
    approve: "APPROVE_CAMPAIGN",
    deploy: "DEPLOY",
    startOver: "SYS.RESET",
    back: "<<_BACK",
    selectArea: "SELECT_SECTOR",
    selectPath: "TARGET_LOCK",
    customize: "CALIBRATE",
    strategy: "STRATEGY",
    complete: "DEBRIEF",
    lifeArea: "SECTOR",
    goalPath: "VECTOR",
    campaignName: "Campaign Briefing",
    inputGoals: "Input Directives",
    mixedGoals: "Tactical Objectives",
    outcomeGoals: "Strategic Targets",
    overallProgress: "CAMPAIGN_PROGRESS",
    estimatedDuration: "EST_DURATION",
    totalObjectives: "TOTAL_OBJ",
    habit: "directive",
    milestone: "target",
    briefingTitle: "CAMPAIGN_BRIEFING",
    briefingSubtitle: "ALL SYSTEMS GREEN // CAMPAIGN APPROVED // READY FOR DEPLOYMENT",
  },
}

export const WAR_ROOM_THEMES: Record<CurveThemeId, WarRoomThemeConfig> = {
  zen: ZEN_THEME,
  cyberpunk: CYBERPUNK_THEME,
}

// ============================================================================
// Context
// ============================================================================

interface WarRoomThemeContextValue {
  theme: WarRoomThemeConfig
  themeId: CurveThemeId
  toggleTheme: () => void
}

const WarRoomThemeContext = createContext<WarRoomThemeContextValue>({
  theme: ZEN_THEME,
  themeId: "zen",
  toggleTheme: () => {},
})

export function useWarRoomTheme() {
  return useContext(WarRoomThemeContext)
}

// ============================================================================
// Provider
// ============================================================================

interface WarRoomThemeProviderProps {
  themeId: CurveThemeId
  onToggle: () => void
  children: React.ReactNode
}

export function WarRoomThemeProvider({ themeId, onToggle, children }: WarRoomThemeProviderProps) {
  const theme = WAR_ROOM_THEMES[themeId]

  const value = useMemo(
    () => ({ theme, themeId, toggleTheme: onToggle }),
    [theme, themeId, onToggle]
  )

  return (
    <WarRoomThemeContext.Provider value={value}>
      <div
        style={{
          background: theme.bg,
          color: theme.text,
          fontFamily: theme.fontFamily,
          minHeight: "100%",
          position: "relative",
          transition: "background 0.4s, color 0.3s",
        }}
      >
        {/* Scanline overlay for cyberpunk */}
        {theme.scanlines && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              pointerEvents: "none",
              zIndex: 50,
              background:
                "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,65,0.015) 2px, rgba(0,255,65,0.015) 4px)",
            }}
          />
        )}
        {children}
      </div>
    </WarRoomThemeContext.Provider>
  )
}

// ============================================================================
// Theme Toggle Button
// ============================================================================

export function WarRoomThemeToggle() {
  const { theme, themeId, toggleTheme } = useWarRoomTheme()
  const isZen = themeId === "zen"

  return (
    <button
      onClick={toggleTheme}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 14px",
        borderRadius: theme.borderRadius,
        border: `1px solid ${theme.border}`,
        background: theme.cardBg,
        color: isZen ? theme.accentSecondary : theme.accent,
        fontSize: 11,
        fontWeight: 700,
        fontFamily: theme.fontFamily,
        textTransform: theme.textTransform,
        letterSpacing: theme.letterSpacing,
        cursor: "pointer",
        transition: "all 0.2s",
      }}
      title={`Switch to ${isZen ? "Cyberpunk" : "Zen"} theme`}
    >
      <span style={{ fontSize: 14 }}>{isZen ? "\u2638" : "\u26A1"}</span>
      {isZen ? "Art of War" : "TACTICAL_HUD"}
    </button>
  )
}

// ============================================================================
// Corner Brackets decorator
// ============================================================================

export function CornerBrackets({ color }: { color?: string }) {
  const { theme } = useWarRoomTheme()
  if (!theme.cornerBrackets) return null

  const c = color ?? theme.accent
  const style = (pos: React.CSSProperties): React.CSSProperties => ({
    position: "absolute",
    width: 10,
    height: 10,
    zIndex: 5,
    ...pos,
  })

  return (
    <>
      <div style={style({ top: 0, left: 0, borderTop: `2px solid ${c}`, borderLeft: `2px solid ${c}` })} />
      <div style={style({ top: 0, right: 0, borderTop: `2px solid ${c}`, borderRight: `2px solid ${c}` })} />
      <div style={style({ bottom: 0, left: 0, borderBottom: `2px solid ${c}`, borderLeft: `2px solid ${c}` })} />
      <div style={style({ bottom: 0, right: 0, borderBottom: `2px solid ${c}`, borderRight: `2px solid ${c}` })} />
    </>
  )
}

// ============================================================================
// Themed Card wrapper
// ============================================================================

export function ThemedCard({
  children,
  style: extraStyle,
  className,
  glow,
}: {
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
  glow?: boolean
}) {
  const { theme } = useWarRoomTheme()

  return (
    <div
      className={className}
      style={{
        position: "relative",
        background: theme.cardBg,
        border: `1px solid ${theme.cardBorder}`,
        borderRadius: theme.borderRadius,
        padding: 20,
        boxShadow: glow ? theme.hoverShadow : theme.shadow,
        transition: "all 0.3s",
        overflow: "hidden",
        ...extraStyle,
      }}
    >
      <CornerBrackets />
      {children}
    </div>
  )
}
