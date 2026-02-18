"use client"

import { Check } from "lucide-react"
import { useWarRoomTheme, WarRoomThemeToggle } from "./WarRoomTheme"

interface Step {
  label: string
  zenLabel: string
  cyberLabel: string
  key: string
}

interface TacticalStepBarProps {
  steps: Step[]
  currentStepIndex: number
}

export function TacticalStepBar({ steps, currentStepIndex }: TacticalStepBarProps) {
  const { theme, themeId } = useWarRoomTheme()
  const isZen = themeId === "zen"

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 20px",
        borderRadius: theme.borderRadius,
        background: theme.bgSecondary,
        border: `1px solid ${theme.border}`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Corner brackets for cyberpunk */}
      {theme.cornerBrackets && (
        <>
          <div style={{ position: "absolute", top: 0, left: 0, width: 8, height: 8, borderTop: `2px solid ${theme.accent}`, borderLeft: `2px solid ${theme.accent}` }} />
          <div style={{ position: "absolute", top: 0, right: 0, width: 8, height: 8, borderTop: `2px solid ${theme.accent}`, borderRight: `2px solid ${theme.accent}` }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, width: 8, height: 8, borderBottom: `2px solid ${theme.accent}`, borderLeft: `2px solid ${theme.accent}` }} />
          <div style={{ position: "absolute", bottom: 0, right: 0, width: 8, height: 8, borderBottom: `2px solid ${theme.accent}`, borderRight: `2px solid ${theme.accent}` }} />
        </>
      )}

      {/* Steps */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, flex: 1 }}>
        {steps.map((step, i) => {
          const isComplete = i < currentStepIndex
          const isCurrent = i === currentStepIndex
          const isFuture = i > currentStepIndex
          const label = isZen ? step.zenLabel : step.cyberLabel

          return (
            <div key={step.key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {/* Step indicator */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {/* The step circle/hexagon */}
                {isZen ? (
                  /* Zen: Ink circle with calligraphy-style number */
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: theme.fontFamily,
                      transition: "all 0.3s",
                      background: isComplete || isCurrent
                        ? theme.accent
                        : "transparent",
                      color: isComplete || isCurrent
                        ? theme.bg
                        : theme.textFaint,
                      border: `2px solid ${isComplete || isCurrent ? theme.accent : theme.textFaint}`,
                      transform: isCurrent ? "scale(1.15)" : "scale(1)",
                      // Brush-stroke style border for zen
                      boxShadow: isCurrent ? `0 0 0 3px ${theme.accentFaded}` : "none",
                    }}
                  >
                    {isComplete ? <Check size={13} /> : i + 1}
                  </div>
                ) : (
                  /* Cyberpunk: Hexagonal shape with scan-line fill */
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 800,
                      fontFamily: theme.fontFamily,
                      letterSpacing: "0.1em",
                      transition: "all 0.3s",
                      background: isComplete || isCurrent
                        ? theme.accent
                        : "transparent",
                      color: isComplete || isCurrent
                        ? "#000000"
                        : theme.textFaint,
                      border: `2px solid ${isComplete || isCurrent ? theme.accent : theme.textFaint}`,
                      clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
                      // Pulsing effect for current step
                      boxShadow: isCurrent ? `0 0 12px ${theme.accentGlow}` : "none",
                    }}
                  >
                    {isComplete ? <Check size={11} /> : i + 1}
                  </div>
                )}

                {/* Step label */}
                <span
                  style={{
                    fontSize: isZen ? 12 : 10,
                    fontWeight: isCurrent ? 700 : 500,
                    fontFamily: theme.fontFamily,
                    textTransform: theme.textTransform,
                    letterSpacing: theme.letterSpacing,
                    color: isCurrent
                      ? (isZen ? theme.accent : theme.accent)
                      : isFuture
                        ? theme.textFaint
                        : theme.textMuted,
                    transition: "color 0.3s",
                    display: "none",
                  }}
                  className="sm:!inline"
                >
                  {label}
                </span>
              </div>

              {/* Connector */}
              {i < steps.length - 1 && (
                isZen ? (
                  /* Zen: brush stroke connector */
                  <div
                    style={{
                      width: 24,
                      height: 2,
                      marginLeft: 2,
                      marginRight: 2,
                      background: isComplete
                        ? theme.accent
                        : theme.border,
                      borderRadius: 4,
                      opacity: isComplete ? 0.6 : 0.3,
                      transition: "all 0.3s",
                      // Brush-stroke feel: slightly uneven
                      clipPath: isComplete
                        ? "polygon(0% 20%, 15% 0%, 85% 0%, 100% 30%, 95% 100%, 5% 100%)"
                        : "none",
                    }}
                  />
                ) : (
                  /* Cyberpunk: dashed digital connector */
                  <div
                    style={{
                      width: 24,
                      height: 2,
                      marginLeft: 2,
                      marginRight: 2,
                      background: isComplete
                        ? theme.accent
                        : theme.border,
                      opacity: isComplete ? 0.8 : 0.3,
                      transition: "all 0.3s",
                      // Dashed effect for cyberpunk
                      backgroundImage: !isComplete
                        ? `repeating-linear-gradient(90deg, ${theme.textFaint} 0px, ${theme.textFaint} 3px, transparent 3px, transparent 6px)`
                        : undefined,
                      boxShadow: isComplete ? `0 0 4px ${theme.accentGlow}` : "none",
                    }}
                  />
                )
              )}
            </div>
          )
        })}
      </div>

      {/* Theme toggle */}
      <div style={{ marginLeft: 16, flexShrink: 0 }}>
        <WarRoomThemeToggle />
      </div>
    </div>
  )
}
