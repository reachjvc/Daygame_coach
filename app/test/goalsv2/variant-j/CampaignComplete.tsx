"use client"

import { useMemo } from "react"
import { Shield, Target, Clock, Trophy, Zap, Star, CheckCircle, RotateCcw } from "lucide-react"
import type { GoalTemplate } from "@/src/goals/types"
import { useWarRoomTheme, ThemedCard, CornerBrackets } from "./WarRoomTheme"
import type { GoalCustomization } from "./TacticalCustomize"

// ============================================================================
// CampaignComplete
// ============================================================================

interface CampaignCompleteProps {
  selectedL1: GoalTemplate
  goals: GoalCustomization[]
  targetDate: Date | null
  pathColor: string
  allL3Templates: GoalTemplate[]
  onStartOver: () => void
}

export function CampaignComplete({
  selectedL1,
  goals,
  targetDate,
  pathColor,
  allL3Templates,
  onStartOver,
}: CampaignCompleteProps) {
  const { theme, themeId } = useWarRoomTheme()
  const isZen = themeId === "zen"

  const templateMap = useMemo(() => new Map(allL3Templates.map((t) => [t.id, t])), [allL3Templates])

  const phases = useMemo(() => {
    const phaseI: GoalCustomization[] = []
    const phaseII: GoalCustomization[] = []
    const phaseIII: GoalCustomization[] = []

    for (const goal of goals) {
      const template = templateMap.get(goal.templateId)
      if (goal.level === 1 || goal.level === 2) {
        phaseIII.push(goal)
      } else if (template) {
        if (template.nature === "input" && template.templateType === "habit_ramp") {
          phaseI.push(goal)
        } else if (template.nature === "input") {
          phaseII.push(goal)
        } else {
          if (template.displayCategory === "field_work" || template.displayCategory === "texting") {
            phaseII.push(goal)
          } else {
            phaseIII.push(goal)
          }
        }
      } else {
        phaseII.push(goal)
      }
    }

    return [
      { label: theme.vocab.phaseIName, goals: phaseI, color: isZen ? "#22c55e" : theme.accent },
      { label: theme.vocab.phaseIIName, goals: phaseII, color: isZen ? "#eab308" : "#ffcc00" },
      { label: theme.vocab.phaseIIIName, goals: phaseIII, color: pathColor },
    ]
  }, [goals, templateMap, theme, isZen, pathColor])

  const totalGoals = goals.length
  const habitGoals = goals.filter((g) => {
    const t = templateMap.get(g.templateId)
    return t?.templateType === "habit_ramp"
  }).length
  const milestoneGoals = totalGoals - habitGoals

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      {/* Dramatic header */}
      <div style={{ textAlign: "center", padding: "40px 0 32px", position: "relative" }}>
        {/* Decorative elements */}
        {isZen ? (
          /* Zen: brush stroke dividers */
          <>
            <div
              style={{
                width: 80,
                height: 2,
                background: `linear-gradient(90deg, transparent, ${theme.accentSecondary}60, transparent)`,
                margin: "0 auto 20px",
                borderRadius: 2,
              }}
            />
          </>
        ) : (
          /* Cyberpunk: targeting reticle */
          <>
            <div
              style={{
                width: 60,
                height: 60,
                margin: "0 auto 16px",
                position: "relative",
              }}
            >
              <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 2, height: 12, background: theme.accent, boxShadow: `0 0 8px ${theme.accent}60` }} />
              <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: 2, height: 12, background: theme.accent, boxShadow: `0 0 8px ${theme.accent}60` }} />
              <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 12, height: 2, background: theme.accent, boxShadow: `0 0 8px ${theme.accent}60` }} />
              <div style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", width: 12, height: 2, background: theme.accent, boxShadow: `0 0 8px ${theme.accent}60` }} />
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 20, height: 20, border: `2px solid ${theme.accent}`, borderRadius: "50%", boxShadow: `0 0 12px ${theme.accent}40` }} />
            </div>
          </>
        )}

        {/* Approved badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 20px",
            borderRadius: isZen ? 20 : 2,
            background: pathColor + "15",
            border: `2px solid ${pathColor}40`,
            marginBottom: 16,
            boxShadow: !isZen ? `0 0 20px ${pathColor}20` : "none",
          }}
        >
          <CheckCircle size={16} style={{ color: pathColor }} />
          <span
            style={{
              fontSize: isZen ? 13 : 10,
              fontWeight: 900,
              color: pathColor,
              fontFamily: theme.fontFamily,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
            }}
          >
            {isZen ? "Campaign Approved" : "CAMPAIGN_APPROVED"}
          </span>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: isZen ? 28 : 20,
            fontWeight: theme.headingWeight,
            fontFamily: theme.fontFamily,
            textTransform: theme.textTransform,
            letterSpacing: isZen ? "0.02em" : "0.12em",
            lineHeight: 1.2,
            marginBottom: 8,
          }}
        >
          {theme.vocab.briefingTitle}
        </h1>

        <p
          style={{
            fontSize: isZen ? 14 : 10,
            color: theme.textMuted,
            maxWidth: 480,
            margin: "0 auto",
            fontFamily: theme.fontFamily,
            textTransform: isZen ? "none" : "uppercase",
            letterSpacing: isZen ? "0.01em" : "0.06em",
            lineHeight: 1.6,
          }}
        >
          {theme.vocab.briefingSubtitle}
        </p>

        {/* Zen brush stroke bottom divider */}
        {isZen && (
          <div
            style={{
              width: 120,
              height: 2,
              background: `linear-gradient(90deg, transparent, ${theme.accentSecondary}40, transparent)`,
              margin: "20px auto 0",
              borderRadius: 2,
            }}
          />
        )}
      </div>

      {/* Campaign stats overview */}
      <ThemedCard style={{ marginBottom: 24 }} glow>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
          <StatCell
            icon={<Target size={16} />}
            label={isZen ? "Objectives" : "TOTAL_OBJ"}
            value={String(totalGoals)}
            color={pathColor}
          />
          <StatCell
            icon={<Shield size={16} />}
            label={isZen ? "Phases" : "PHASES"}
            value={String(phases.filter((p) => p.goals.length > 0).length)}
            color={isZen ? theme.accentSecondary : theme.accent}
          />
          <StatCell
            icon={<Zap size={16} />}
            label={isZen ? "Practices" : "HABITS"}
            value={String(habitGoals)}
            color={isZen ? "#22c55e" : theme.accent}
          />
          <StatCell
            icon={<Trophy size={16} />}
            label={isZen ? "Milestones" : "TARGETS"}
            value={String(milestoneGoals)}
            color={isZen ? "#eab308" : "#ffcc00"}
          />
        </div>

        {targetDate && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${theme.border}50`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Clock size={14} style={{ color: theme.textMuted }} />
            <span style={{ fontSize: isZen ? 13 : 10, color: theme.textMuted, fontFamily: theme.fontFamily, textTransform: theme.textTransform }}>
              {isZen ? "Campaign Deadline:" : "DEADLINE:"}
            </span>
            <span style={{ fontSize: isZen ? 13 : 10, fontWeight: 700, color: theme.text, fontFamily: "var(--font-mono, 'Geist Mono', monospace)" }}>
              {targetDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
        )}
      </ThemedCard>

      {/* Primary objective highlight */}
      <ThemedCard
        style={{
          marginBottom: 24,
          borderColor: pathColor + "40",
          background: pathColor + "05",
          textAlign: "center",
          padding: 24,
        }}
      >
        <Star size={24} style={{ color: pathColor, margin: "0 auto 8px", display: "block" }} />
        <div
          style={{
            fontSize: isZen ? 11 : 8,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: pathColor,
            marginBottom: 4,
            fontFamily: theme.fontFamily,
          }}
        >
          {isZen ? "Primary Objective" : "PRIMARY_DIRECTIVE"}
        </div>
        <h2
          style={{
            fontSize: isZen ? 20 : 15,
            fontWeight: theme.headingWeight,
            fontFamily: theme.fontFamily,
            textTransform: theme.textTransform,
            letterSpacing: theme.letterSpacing,
          }}
        >
          {selectedL1.title}
        </h2>
      </ThemedCard>

      {/* Phase breakdown */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
        {phases.map((phase, i) => {
          if (phase.goals.length === 0) return null
          const phaseLabel = [theme.vocab.phaseI, theme.vocab.phaseII, theme.vocab.phaseIII][i]
          return (
            <ThemedCard key={i} style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: isZen ? "50%" : 2,
                    background: phase.color + "20",
                    border: `2px solid ${phase.color}40`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: isZen ? 11 : 9,
                    fontWeight: 800,
                    color: phase.color,
                    fontFamily: theme.fontFamily,
                  }}
                >
                  {isZen ? ["I", "II", "III"][i] : i + 1}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: isZen ? 14 : 11,
                      fontWeight: theme.headingWeight,
                      fontFamily: theme.fontFamily,
                      textTransform: theme.textTransform,
                      letterSpacing: theme.letterSpacing,
                      color: theme.text,
                    }}
                  >
                    {phase.label}
                  </div>
                  <div style={{ fontSize: isZen ? 11 : 8, color: theme.textMuted, fontFamily: theme.fontFamily, textTransform: theme.textTransform }}>
                    {phase.goals.length} {isZen ? "objectives" : "OBJ"}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {phase.goals.map((goal) => {
                  const template = templateMap.get(goal.templateId)
                  const isRamp = template?.templateType === "habit_ramp"
                  return (
                    <div
                      key={goal.templateId}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 8px",
                        borderRadius: isZen ? 4 : 1,
                        fontFamily: theme.fontFamily,
                      }}
                    >
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: isZen ? "50%" : 1,
                          background: phase.color,
                          opacity: 0.5,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          flex: 1,
                          fontSize: isZen ? 12 : 9,
                          color: theme.text,
                          textTransform: theme.textTransform,
                          letterSpacing: theme.letterSpacing,
                        }}
                      >
                        {goal.title}
                      </span>
                      {goal.level === 3 && (
                        <span
                          style={{
                            fontSize: isZen ? 11 : 8,
                            fontWeight: 700,
                            color: phase.color,
                            fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                          }}
                        >
                          {goal.targetValue}{isRamp ? "/wk" : ""}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </ThemedCard>
          )
        })}
      </div>

      {/* Start over */}
      <div style={{ textAlign: "center", paddingBottom: 40 }}>
        <button
          onClick={onStartOver}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 28px",
            borderRadius: theme.borderRadius,
            background: "transparent",
            border: `2px solid ${theme.border}`,
            color: theme.textMuted,
            fontSize: isZen ? 13 : 10,
            fontWeight: 700,
            fontFamily: theme.fontFamily,
            textTransform: theme.textTransform,
            letterSpacing: theme.letterSpacing,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = pathColor + "60"
            e.currentTarget.style.color = pathColor
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = theme.border
            e.currentTarget.style.color = theme.textMuted
          }}
        >
          <RotateCcw size={14} />
          {theme.vocab.startOver}
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// StatCell helper
// ============================================================================

function StatCell({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const { theme, themeId } = useWarRoomTheme()
  const isZen = themeId === "zen"

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ color, marginBottom: 6, display: "flex", justifyContent: "center" }}>
        {icon}
      </div>
      <div
        style={{
          fontSize: isZen ? 22 : 18,
          fontWeight: 900,
          color: theme.text,
          fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
          lineHeight: 1,
          marginBottom: 4,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: isZen ? 10 : 8,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: theme.textMuted,
          fontFamily: theme.fontFamily,
        }}
      >
        {label}
      </div>
    </div>
  )
}
