/**
 * Curve theme configurations — visual presets for the milestone curve editor.
 */

import type { CurveThemeId } from "./types"

export interface CurveThemeConfig {
  id: CurveThemeId
  label: string

  // Colors
  accent: string
  accentLight: string
  accentFaded: string
  bg: string
  cardBg: string
  text: string
  muted: string
  border: string
  subtleBorder: string

  // SVG colors
  svgColors: {
    accent: string
    grid: string
    axis: string
    tooltipBg: string
    tooltipBorder: string
    tooltipText: string
    areaTop: string
    areaBottom: string
    labelColor: string
    endpointColor: string
  }

  // SVG rendering
  glowIntensity: number
  glowOpacity: number
  strokeWidth: number
  svgCursor?: string

  // Style
  borderRadius: number
  textTransform: "none" | "uppercase"
  monoLabels: boolean

  // Decorative
  scanlines: boolean
  cornerBrackets: boolean

  // Slider classes (Tailwind overrides for the Slider component)
  sliderClasses: string
}

export const CURVE_THEMES: Record<CurveThemeId, CurveThemeConfig> = {
  zen: {
    id: "zen",
    label: "Zen",

    accent: "#0d9488",
    accentLight: "#14b8a6",
    accentFaded: "rgba(13, 148, 136, 0.08)",
    bg: "#fafaf9",
    cardBg: "#ffffff",
    text: "#1c1917",
    muted: "#a8a29e",
    border: "#e7e5e4",
    subtleBorder: "#f5f5f4",

    svgColors: {
      accent: "#0d9488",
      grid: "#1c1917",
      axis: "#1c1917",
      tooltipBg: "#ffffff",
      tooltipBorder: "#e7e5e4",
      tooltipText: "#1c1917",
      areaTop: "rgba(13, 148, 136, 0.06)",
      areaBottom: "rgba(13, 148, 136, 0.01)",
      labelColor: "#a8a29e",
      endpointColor: "#0d9488",
    },

    glowIntensity: 0,
    glowOpacity: 0,
    strokeWidth: 2,

    borderRadius: 12,
    textTransform: "none",
    monoLabels: false,

    scanlines: false,
    cornerBrackets: false,

    sliderClasses:
      "[&_[data-slot=slider-track]]:bg-[#e7e5e4] [&_[data-slot=slider-range]]:bg-[#0d9488] [&_[data-slot=slider-thumb]]:border-[#0d9488] [&_[data-slot=slider-thumb]]:bg-white",
  },

  cyberpunk: {
    id: "cyberpunk",
    label: "Cyberpunk",

    accent: "#ff0033",
    accentLight: "#ff3366",
    accentFaded: "rgba(255, 0, 51, 0.08)",
    bg: "#050505",
    cardBg: "#0a0a0a",
    text: "#e0e0e0",
    muted: "#555555",
    border: "#1c1c1c",
    subtleBorder: "#1c1c1c",

    svgColors: {
      accent: "#ff0033",
      grid: "#ff0033",
      axis: "#ff0033",
      tooltipBg: "#0a0a0a",
      tooltipBorder: "rgba(255, 0, 51, 0.6)",
      tooltipText: "#ff0033",
      areaTop: "rgba(255, 0, 51, 0.12)",
      areaBottom: "rgba(255, 0, 51, 0.01)",
      labelColor: "#e0e0e0",
      endpointColor: "#ff0033",
    },

    glowIntensity: 4,
    glowOpacity: 0.45,
    strokeWidth: 2,
    svgCursor: "crosshair",

    borderRadius: 4,
    textTransform: "uppercase",
    monoLabels: true,

    scanlines: true,
    cornerBrackets: true,

    sliderClasses:
      "w-full [&_[data-slot=slider-track]]:rounded-none [&_[data-slot=slider-track]]:bg-[#1c1c1c] [&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-range]]:bg-[#ff0033] [&_[data-slot=slider-range]]:rounded-none [&_[data-slot=slider-thumb]]:rounded-none [&_[data-slot=slider-thumb]]:border-[#ff0033] [&_[data-slot=slider-thumb]]:bg-[#ff0033] [&_[data-slot=slider-thumb]]:size-3 [&_[data-slot=slider-thumb]]:shadow-[0_0_6px_rgba(255,0,51,0.5)]",
  },
}

export const CURVE_THEME_IDS = Object.keys(CURVE_THEMES) as CurveThemeId[]

export function getCurveTheme(id: CurveThemeId): CurveThemeConfig {
  return CURVE_THEMES[id] ?? CURVE_THEMES.zen
}

export function isValidCurveThemeId(id: string): id is CurveThemeId {
  return id in CURVE_THEMES
}
