"use client"

import { createContext, useContext, useMemo } from "react"
import type { CurveThemeId } from "@/src/goals/types"

// ============================================================================
// Theme configuration
// ============================================================================

export interface MomentumTheme {
  id: CurveThemeId

  // Core palette
  bg: string
  bgSecondary: string
  text: string
  textMuted: string
  accent: string
  accentFaded: string
  accentGlow: string
  border: string
  borderHover: string
  cardBg: string
  cardBorder: string

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

  // Momentum-specific vocabulary
  vocab: {
    flow: string
    momentum: string
    velocity: string
    acceleration: string
    channel: string
    score: string
    starting: string
    target: string
    profile: string
    complete: string
    selectArea: string
    selectPath: string
    customize: string
    launch: string
    peakVelocity: string
    totalMomentum: string
    accelerationCurve: string
    startOver: string
  }
}

const ZEN_THEME: MomentumTheme = {
  id: "zen",

  bg: "#fafaf9",
  bgSecondary: "#f5f5f4",
  text: "#1c1917",
  textMuted: "#a8a29e",
  accent: "#0d9488",
  accentFaded: "rgba(13, 148, 136, 0.08)",
  accentGlow: "rgba(13, 148, 136, 0.15)",
  border: "#e7e5e4",
  borderHover: "#0d948850",
  cardBg: "#ffffff",
  cardBorder: "#e7e5e4",

  fontFamily: "inherit",
  headingWeight: 700,
  textTransform: "none",
  letterSpacing: "normal",

  borderRadius: 12,
  borderRadiusLg: 16,

  shadow: "0 1px 3px rgba(0,0,0,0.06)",
  hoverShadow: "0 4px 20px rgba(13, 148, 136, 0.1)",
  glowFilter: "none",

  scanlines: false,
  cornerBrackets: false,

  vocab: {
    flow: "Flow",
    momentum: "Momentum",
    velocity: "Rhythm",
    acceleration: "Growth",
    channel: "Path",
    score: "Harmony Score",
    starting: "Starting Flow",
    target: "Target Rhythm",
    profile: "Flow Profile",
    complete: "Your path is set",
    selectArea: "Choose your focus",
    selectPath: "Find your direction",
    customize: "Shape your journey",
    launch: "Begin Your Flow",
    peakVelocity: "Peak Rhythm",
    totalMomentum: "Total Balance",
    accelerationCurve: "Growth Curve",
    startOver: "Start fresh",
  },
}

const CYBERPUNK_THEME: MomentumTheme = {
  id: "cyberpunk",

  bg: "#050505",
  bgSecondary: "#0a0a0a",
  text: "#e0e0e0",
  textMuted: "#555555",
  accent: "#ff0033",
  accentFaded: "rgba(255, 0, 51, 0.08)",
  accentGlow: "rgba(255, 0, 51, 0.4)",
  border: "#1c1c1c",
  borderHover: "#ff003380",
  cardBg: "#0a0a0a",
  cardBorder: "#1c1c1c",

  fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
  headingWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.06em",

  borderRadius: 2,
  borderRadiusLg: 4,

  shadow: "none",
  hoverShadow: "0 0 30px rgba(255, 0, 51, 0.15)",
  glowFilter: "drop-shadow(0 0 8px rgba(255,0,51,0.5))",

  scanlines: true,
  cornerBrackets: true,

  vocab: {
    flow: "VELOCITY",
    momentum: "MOMENTUM",
    velocity: "POWER_OUTPUT",
    acceleration: "SURGE_PROTOCOL",
    channel: "VECTOR",
    score: "POWER_INDEX",
    starting: "INIT_VELOCITY",
    target: "MAX_VELOCITY",
    profile: "MOMENTUM_PROFILE",
    complete: "SYSTEMS_ONLINE",
    selectArea: "SELECT_SECTOR",
    selectPath: "TARGET_ACQUISITION",
    customize: "CALIBRATE",
    launch: "ENGAGE_PROTOCOL",
    peakVelocity: "PEAK_OUTPUT",
    totalMomentum: "TOTAL_THRUST",
    accelerationCurve: "ACCEL_CURVE",
    startOver: "SYS.RESET",
  },
}

export const MOMENTUM_THEMES: Record<CurveThemeId, MomentumTheme> = {
  zen: ZEN_THEME,
  cyberpunk: CYBERPUNK_THEME,
}

// ============================================================================
// Context
// ============================================================================

interface MomentumThemeContextValue {
  theme: MomentumTheme
  themeId: CurveThemeId
  toggleTheme: () => void
}

const MomentumThemeContext = createContext<MomentumThemeContextValue>({
  theme: ZEN_THEME,
  themeId: "zen",
  toggleTheme: () => {},
})

export function useMomentumTheme() {
  return useContext(MomentumThemeContext)
}

// ============================================================================
// Provider
// ============================================================================

interface MomentumThemeProviderProps {
  themeId: CurveThemeId
  onToggle: () => void
  children: React.ReactNode
}

export function MomentumThemeProvider({ themeId, onToggle, children }: MomentumThemeProviderProps) {
  const theme = MOMENTUM_THEMES[themeId]

  const value = useMemo(
    () => ({
      theme,
      themeId,
      toggleTheme: onToggle,
    }),
    [theme, themeId, onToggle]
  )

  return (
    <MomentumThemeContext.Provider value={value}>
      <div
        style={{
          background: theme.bg,
          color: theme.text,
          fontFamily: theme.fontFamily,
          minHeight: "100%",
          position: "relative",
          transition: "background 0.3s, color 0.3s",
        }}
      >
        {/* Scanline overlay */}
        {theme.scanlines && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              pointerEvents: "none",
              zIndex: 50,
              background:
                "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,0,51,0.02) 2px, rgba(255,0,51,0.02) 4px)",
            }}
          />
        )}
        {children}
      </div>
    </MomentumThemeContext.Provider>
  )
}

// ============================================================================
// Theme Toggle Button
// ============================================================================

export function ThemeToggle() {
  const { theme, themeId, toggleTheme } = useMomentumTheme()
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
        color: theme.accent,
        fontSize: 12,
        fontWeight: 600,
        fontFamily: theme.fontFamily,
        textTransform: theme.textTransform,
        letterSpacing: theme.letterSpacing,
        cursor: "pointer",
        transition: "all 0.2s",
      }}
      title={`Switch to ${isZen ? "Cyberpunk" : "Zen"} theme`}
    >
      <span style={{ fontSize: 14 }}>{isZen ? "\u2600" : "\u26A1"}</span>
      {isZen ? "Zen" : "CYBER"}
    </button>
  )
}

// ============================================================================
// Corner brackets decorator
// ============================================================================

export function CornerBrackets({ color }: { color?: string }) {
  const { theme } = useMomentumTheme()
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
