"use client"

import { Check } from "lucide-react"
import { useMomentumTheme, ThemeToggle } from "./MomentumThemeProvider"

interface Step {
  label: string
  key: string
}

interface MomentumStepBarProps {
  steps: Step[]
  currentStepIndex: number
}

export function MomentumStepBar({ steps, currentStepIndex }: MomentumStepBarProps) {
  const { theme, themeId } = useMomentumTheme()
  const isCyber = themeId === "cyberpunk"

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      {/* Steps */}
      <div style={{ display: "flex", alignItems: "center", gap: isCyber ? 4 : 6, flex: 1 }}>
        {steps.map((step, i) => {
          const isComplete = i < currentStepIndex
          const isCurrent = i === currentStepIndex
          const isFuture = i > currentStepIndex

          return (
            <div key={step.key} style={{ display: "flex", alignItems: "center", gap: isCyber ? 4 : 6 }}>
              {/* Step indicator */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 28,
                    height: 28,
                    borderRadius: isCyber ? 2 : "50%",
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: theme.fontFamily,
                    letterSpacing: theme.letterSpacing,
                    transition: "all 0.3s",
                    transform: isCurrent ? "scale(1.15)" : "scale(1)",
                    background: isComplete || isCurrent
                      ? theme.accent
                      : isCyber ? "#111" : theme.bgSecondary,
                    color: isComplete || isCurrent
                      ? "#ffffff"
                      : theme.textMuted,
                    border: isCyber
                      ? `1px solid ${isComplete || isCurrent ? theme.accent : "#222"}`
                      : `2px solid ${isComplete || isCurrent ? theme.accent : theme.border}`,
                    boxShadow: isCurrent && isCyber
                      ? `0 0 12px ${theme.accentGlow}`
                      : isCurrent
                        ? `0 0 0 3px ${theme.accentFaded}`
                        : "none",
                  }}
                >
                  {isComplete ? <Check style={{ width: 14, height: 14 }} /> : i + 1}
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: isCurrent ? 600 : 500,
                    fontFamily: theme.fontFamily,
                    textTransform: theme.textTransform,
                    letterSpacing: theme.letterSpacing,
                    color: isCurrent ? theme.text : theme.textMuted,
                    transition: "color 0.3s",
                    display: "none",
                  }}
                  className="sm:!inline"
                >
                  {step.label}
                </span>
              </div>

              {/* Connector */}
              {i < steps.length - 1 && (
                <div
                  style={{
                    width: 24,
                    height: isCyber ? 1 : 2,
                    marginLeft: 2,
                    marginRight: 2,
                    borderRadius: isCyber ? 0 : 999,
                    transition: "background 0.3s",
                    background: isComplete ? theme.accent : theme.border,
                    boxShadow: isComplete && isCyber ? `0 0 6px ${theme.accentGlow}` : "none",
                  }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Theme toggle */}
      <ThemeToggle />
    </div>
  )
}
