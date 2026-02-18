"use client"

import { useState, useMemo } from "react"
import { ArrowLeft, ChevronDown, ChevronRight, Shield, Target, Crosshair, Activity, Clock, AlertTriangle, Zap, Trophy } from "lucide-react"
import type { GoalTemplate, MilestoneLadderConfig } from "@/src/goals/types"
import { MilestoneCurveEditor } from "@/src/goals/components/MilestoneCurveEditor"
import { useWarRoomTheme, ThemedCard, CornerBrackets } from "./WarRoomTheme"
import type { GoalCustomization } from "./TacticalCustomize"

// ============================================================================
// Phase Classification
// ============================================================================

interface PhaseGoal {
  goal: GoalCustomization
  template: GoalTemplate | null
}

interface Phase {
  id: string
  number: number
  objectives: PhaseGoal[]
}

function classifyIntoPhases(
  goals: GoalCustomization[],
  l3Templates: GoalTemplate[]
): Phase[] {
  const templateMap = new Map(l3Templates.map((t) => [t.id, t]))

  const phaseI: PhaseGoal[] = [] // Foundation: input/habit goals (L3 input)
  const phaseII: PhaseGoal[] = [] // Advancement: activity/skill goals (L3 mixed)
  const phaseIII: PhaseGoal[] = [] // Victory: outcome goals (L3 outcome, L2 achievements)

  for (const goal of goals) {
    const template = templateMap.get(goal.templateId)
    const pg: PhaseGoal = { goal, template: template ?? null }

    if (goal.level === 1) {
      phaseIII.push(pg)
    } else if (goal.level === 2) {
      phaseIII.push(pg)
    } else if (template) {
      if (template.nature === "input" && template.templateType === "habit_ramp") {
        phaseI.push(pg)
      } else if (template.nature === "input") {
        phaseII.push(pg)
      } else {
        // outcome
        if (template.displayCategory === "field_work" || template.displayCategory === "texting") {
          phaseII.push(pg)
        } else {
          phaseIII.push(pg)
        }
      }
    } else {
      phaseII.push(pg)
    }
  }

  return [
    { id: "phase_1", number: 1, objectives: phaseI },
    { id: "phase_2", number: 2, objectives: phaseII },
    { id: "phase_3", number: 3, objectives: phaseIII },
  ]
}

// ============================================================================
// WarRoom Component
// ============================================================================

interface WarRoomProps {
  selectedL1: GoalTemplate
  goals: GoalCustomization[]
  targetDate: Date | null
  pathColor: string
  allL3Templates: GoalTemplate[]
  onBack: () => void
  onConfirm: () => void
}

export function WarRoom({
  selectedL1,
  goals,
  targetDate,
  pathColor,
  allL3Templates,
  onBack,
  onConfirm,
}: WarRoomProps) {
  const { theme, themeId } = useWarRoomTheme()
  const isZen = themeId === "zen"

  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set(["phase_1", "phase_2", "phase_3"]))

  // Overall campaign curve config
  const [campaignCurve, setCampaignCurve] = useState<MilestoneLadderConfig>({
    start: 0,
    target: goals.length * 100,
    steps: 6,
    curveTension: 0.5,
    controlPoints: [],
  })

  const phases = useMemo(() => classifyIntoPhases(goals, allL3Templates), [goals, allL3Templates])

  const totalObjectives = goals.length
  const enabledObjectives = goals.filter((g) => g.enabled).length

  // Risk assessment based on objective count
  const riskLevel = enabledObjectives > 15
    ? "high"
    : enabledObjectives > 8
      ? "medium"
      : "low"

  const riskLabel = riskLevel === "high"
    ? theme.vocab.riskHigh
    : riskLevel === "medium"
      ? theme.vocab.riskMedium
      : theme.vocab.riskLow

  const riskColor = riskLevel === "high"
    ? theme.dangerAccent
    : riskLevel === "medium"
      ? (isZen ? "#d4a72c" : "#ffcc00")
      : (isZen ? "#22c55e" : theme.accent)

  const togglePhase = (id: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const phaseNames = [theme.vocab.phaseIName, theme.vocab.phaseIIName, theme.vocab.phaseIIIName]
  const phaseLabels = [theme.vocab.phaseI, theme.vocab.phaseII, theme.vocab.phaseIII]

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <button
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: isZen ? 13 : 10,
            color: theme.textMuted,
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: theme.fontFamily,
            textTransform: theme.textTransform,
            letterSpacing: theme.letterSpacing,
          }}
        >
          <ArrowLeft size={14} />
          {theme.vocab.back}
        </button>
      </div>

      {/* Campaign Header */}
      <ThemedCard
        style={{
          marginBottom: 24,
          borderColor: pathColor + "30",
          background: isZen
            ? `linear-gradient(135deg, ${theme.cardBg}, ${theme.bgSecondary})`
            : `linear-gradient(135deg, ${theme.cardBg}, #0f0f0f)`,
        }}
        glow
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                padding: 12,
                borderRadius: isZen ? 12 : 2,
                background: pathColor + "15",
                border: `1px solid ${pathColor}30`,
              }}
            >
              <Shield size={24} style={{ color: pathColor }} />
            </div>
            <div>
              <h1
                style={{
                  fontSize: isZen ? 22 : 16,
                  fontWeight: theme.headingWeight,
                  fontFamily: theme.fontFamily,
                  textTransform: theme.textTransform,
                  letterSpacing: isZen ? "0.01em" : "0.1em",
                  lineHeight: 1.2,
                  marginBottom: 4,
                }}
              >
                {theme.vocab.campaign}
              </h1>
              <p
                style={{
                  fontSize: isZen ? 12 : 9,
                  color: theme.textMuted,
                  fontFamily: theme.fontFamily,
                  textTransform: isZen ? "none" : "uppercase",
                  letterSpacing: isZen ? "0.02em" : "0.06em",
                }}
              >
                {theme.vocab.campaignSubtitle}
              </p>
            </div>
          </div>

          {/* Status badge */}
          <div
            style={{
              padding: "6px 14px",
              borderRadius: isZen ? 16 : 2,
              background: pathColor + "15",
              border: `1px solid ${pathColor}30`,
              fontSize: isZen ? 11 : 9,
              fontWeight: 800,
              color: pathColor,
              fontFamily: theme.fontFamily,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              boxShadow: !isZen ? `0 0 8px ${pathColor}20` : "none",
            }}
          >
            {theme.vocab.statusPlanning}
          </div>
        </div>
      </ThemedCard>

      {/* Main content: 2-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>
        {/* Left: Phases */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Campaign Timeline Bar */}
          <ThemedCard style={{ padding: 16 }}>
            <div
              style={{
                fontSize: isZen ? 12 : 9,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: theme.textMuted,
                marginBottom: 12,
                fontFamily: theme.fontFamily,
              }}
            >
              {theme.vocab.timeline}
            </div>
            <div style={{ display: "flex", gap: 4, height: 36 }}>
              {phases.map((phase, i) => {
                const width = phase.objectives.length / Math.max(totalObjectives, 1) * 100
                const phaseColor = i === 0
                  ? (isZen ? "#22c55e" : theme.accent)
                  : i === 1
                    ? (isZen ? "#eab308" : "#ffcc00")
                    : pathColor
                return (
                  <div
                    key={phase.id}
                    style={{
                      flex: Math.max(width, 10),
                      borderRadius: isZen ? 6 : 2,
                      background: phaseColor + "15",
                      border: `1px solid ${phaseColor}30`,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                      overflow: "hidden",
                      transition: "all 0.3s",
                    }}
                  >
                    {/* Scanline effect for cyberpunk phase bars */}
                    {!isZen && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: `repeating-linear-gradient(0deg, transparent, transparent 1px, ${phaseColor}08 1px, ${phaseColor}08 2px)`,
                          pointerEvents: "none",
                        }}
                      />
                    )}
                    <span
                      style={{
                        fontSize: isZen ? 10 : 8,
                        fontWeight: 800,
                        color: phaseColor,
                        fontFamily: theme.fontFamily,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        position: "relative",
                        zIndex: 2,
                      }}
                    >
                      {phaseLabels[i]}
                    </span>
                    <span style={{ fontSize: isZen ? 9 : 7, color: theme.textFaint, position: "relative", zIndex: 2, fontFamily: theme.fontFamily }}>
                      {phase.objectives.length} {isZen ? "obj" : "OBJ"}
                    </span>
                  </div>
                )
              })}
            </div>
          </ThemedCard>

          {/* Phase Sections */}
          {phases.map((phase, phaseIdx) => {
            const isExpanded = expandedPhases.has(phase.id)
            const phaseColor = phaseIdx === 0
              ? (isZen ? "#22c55e" : theme.accent)
              : phaseIdx === 1
                ? (isZen ? "#eab308" : "#ffcc00")
                : pathColor

            if (phase.objectives.length === 0) return null

            return (
              <ThemedCard key={phase.id} style={{ padding: 0 }}>
                {/* Phase header */}
                <button
                  onClick={() => togglePhase(phase.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    width: "100%",
                    padding: "14px 16px",
                    background: "none",
                    border: "none",
                    borderBottom: isExpanded ? `1px solid ${theme.border}50` : "none",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: theme.fontFamily,
                  }}
                >
                  {isExpanded
                    ? <ChevronDown size={14} style={{ color: theme.textMuted }} />
                    : <ChevronRight size={14} style={{ color: theme.textMuted }} />}

                  {/* Phase number badge */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: isZen ? 28 : 24,
                      height: isZen ? 28 : 24,
                      borderRadius: isZen ? "50%" : 2,
                      background: phaseColor + "20",
                      border: `2px solid ${phaseColor}40`,
                      fontSize: isZen ? 12 : 10,
                      fontWeight: 800,
                      color: phaseColor,
                      fontFamily: theme.fontFamily,
                      flexShrink: 0,
                    }}
                  >
                    {isZen ? (
                      ["I", "II", "III"][phaseIdx]
                    ) : (
                      phase.number
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: isZen ? 14 : 11,
                        fontWeight: theme.headingWeight,
                        textTransform: theme.textTransform,
                        letterSpacing: theme.letterSpacing,
                        color: theme.text,
                      }}
                    >
                      {phaseNames[phaseIdx]}
                    </div>
                    <div style={{ fontSize: isZen ? 11 : 8, color: theme.textMuted, textTransform: theme.textTransform }}>
                      {phase.objectives.length} {isZen ? "objectives" : "OBJECTIVES"}
                    </div>
                  </div>

                  {/* Phase progress indicator */}
                  <div
                    style={{
                      padding: "4px 10px",
                      borderRadius: isZen ? 12 : 2,
                      background: phaseColor + "10",
                      border: `1px solid ${phaseColor}20`,
                      fontSize: isZen ? 10 : 8,
                      fontWeight: 700,
                      color: phaseColor,
                      fontFamily: theme.fontFamily,
                      textTransform: "uppercase",
                    }}
                  >
                    {isZen ? "Ready" : "STANDBY"}
                  </div>
                </button>

                {/* Phase content */}
                {isExpanded && (
                  <div style={{ padding: "12px 16px" }}>
                    {/* Objectives list */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {phase.objectives.map((pg, i) => {
                        const isRamp = pg.template?.templateType === "habit_ramp"
                        return (
                          <div
                            key={pg.goal.templateId}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              padding: "8px 10px",
                              borderRadius: isZen ? 6 : 2,
                              background: i % 2 === 0 ? "transparent" : theme.bgSecondary + "40",
                              fontFamily: theme.fontFamily,
                            }}
                          >
                            {/* Status indicator */}
                            <div
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: isZen ? "50%" : 1,
                                background: phaseColor,
                                opacity: 0.6,
                                boxShadow: !isZen ? `0 0 4px ${phaseColor}60` : "none",
                                flexShrink: 0,
                              }}
                            />

                            {/* Objective name */}
                            <span
                              style={{
                                flex: 1,
                                fontSize: isZen ? 13 : 10,
                                fontWeight: 500,
                                color: theme.text,
                                textTransform: theme.textTransform,
                                letterSpacing: theme.letterSpacing,
                              }}
                            >
                              {pg.goal.title}
                            </span>

                            {/* Type badge */}
                            <span
                              style={{
                                fontSize: isZen ? 9 : 7,
                                padding: "2px 6px",
                                borderRadius: isZen ? 8 : 1,
                                background: theme.bgSecondary,
                                border: `1px solid ${theme.border}60`,
                                color: theme.textMuted,
                                textTransform: "uppercase",
                                fontWeight: 700,
                                letterSpacing: "0.06em",
                                flexShrink: 0,
                              }}
                            >
                              {isRamp ? theme.vocab.habit : theme.vocab.milestone}
                            </span>

                            {/* Target value */}
                            {pg.goal.level === 3 && (
                              <span
                                style={{
                                  fontSize: isZen ? 12 : 9,
                                  fontWeight: 700,
                                  color: phaseColor,
                                  fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                                  minWidth: 36,
                                  textAlign: "right",
                                  flexShrink: 0,
                                }}
                              >
                                {pg.goal.targetValue}{isRamp ? "/wk" : ""}
                              </span>
                            )}

                            {/* Threat level for cyberpunk */}
                            {!isZen && pg.goal.level === 3 && (
                              <span
                                style={{
                                  fontSize: 7,
                                  fontWeight: 800,
                                  color: pg.goal.targetValue > 20 ? "#ff0033" : pg.goal.targetValue > 5 ? "#ffcc00" : theme.accent,
                                  fontFamily: theme.fontFamily,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.08em",
                                }}
                              >
                                [{theme.vocab.threatLevel}:{pg.goal.targetValue > 20 ? "H" : pg.goal.targetValue > 5 ? "M" : "L"}]
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </ThemedCard>
            )
          })}

          {/* Overall Campaign Progress Curve */}
          <div style={{ marginTop: 8 }}>
            <div
              style={{
                fontSize: isZen ? 13 : 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: theme.textMuted,
                marginBottom: 10,
                fontFamily: theme.fontFamily,
              }}
            >
              {theme.vocab.overallProgress}
            </div>
            <MilestoneCurveEditor
              config={campaignCurve}
              onChange={setCampaignCurve}
              themeId={themeId}
            />
          </div>
        </div>

        {/* Right sidebar: Intelligence Report */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 20 }}>
          {/* Intel header */}
          <ThemedCard style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              {isZen ? (
                <Activity size={16} style={{ color: theme.accentSecondary }} />
              ) : (
                <Crosshair size={16} style={{ color: theme.accent, filter: theme.glowFilter }} />
              )}
              <span
                style={{
                  fontSize: isZen ? 13 : 10,
                  fontWeight: theme.headingWeight,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: isZen ? theme.accentSecondary : theme.accent,
                  fontFamily: theme.fontFamily,
                }}
              >
                {theme.vocab.intelligence}
              </span>
            </div>

            {/* Stats grid */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Total objectives */}
              <StatRow
                label={theme.vocab.totalObjectives}
                value={String(enabledObjectives)}
                color={theme.text}
                icon={<Target size={12} />}
              />

              {/* Phases */}
              <StatRow
                label={isZen ? "Phases" : "PHASES"}
                value={String(phases.filter((p) => p.objectives.length > 0).length)}
                color={theme.text}
                icon={<Shield size={12} />}
              />

              {/* Timeline */}
              <StatRow
                label={theme.vocab.estimatedDuration}
                value={targetDate
                  ? `${Math.ceil((targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7))} ${isZen ? "weeks" : "WK"}`
                  : isZen ? "Open-ended" : "UNDEFINED"}
                color={theme.textMuted}
                icon={<Clock size={12} />}
              />

              {/* Divider */}
              <div style={{ height: 1, background: theme.border + "50" }} />

              {/* Risk assessment */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <AlertTriangle size={12} style={{ color: riskColor }} />
                  <span
                    style={{
                      fontSize: isZen ? 11 : 8,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: theme.textMuted,
                      fontFamily: theme.fontFamily,
                    }}
                  >
                    {theme.vocab.riskLevel}
                  </span>
                </div>
                <div
                  style={{
                    padding: "6px 10px",
                    borderRadius: isZen ? 8 : 2,
                    background: riskColor + "10",
                    border: `1px solid ${riskColor}30`,
                    fontSize: isZen ? 12 : 10,
                    fontWeight: 800,
                    color: riskColor,
                    textAlign: "center",
                    fontFamily: theme.fontFamily,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    boxShadow: !isZen ? `0 0 6px ${riskColor}20` : "none",
                  }}
                >
                  {riskLabel}
                </div>
              </div>

              {/* Phase breakdown */}
              <div style={{ height: 1, background: theme.border + "50" }} />

              <div>
                <div
                  style={{
                    fontSize: isZen ? 11 : 8,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: theme.textMuted,
                    marginBottom: 8,
                    fontFamily: theme.fontFamily,
                  }}
                >
                  {isZen ? "Phase Breakdown" : "PHASE_BREAKDOWN"}
                </div>
                {phases.map((phase, i) => {
                  if (phase.objectives.length === 0) return null
                  const phaseColor = i === 0
                    ? (isZen ? "#22c55e" : theme.accent)
                    : i === 1
                      ? (isZen ? "#eab308" : "#ffcc00")
                      : pathColor
                  return (
                    <div
                      key={phase.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "4px 0",
                        fontFamily: theme.fontFamily,
                      }}
                    >
                      <span style={{ fontSize: isZen ? 11 : 8, color: phaseColor, fontWeight: 600, textTransform: theme.textTransform }}>
                        {phaseLabels[i]}
                      </span>
                      <span style={{ fontSize: isZen ? 11 : 8, color: theme.textMuted, fontWeight: 700, fontFamily: "var(--font-mono, 'Geist Mono', monospace)" }}>
                        {phase.objectives.length}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Primary objective */}
              <div style={{ height: 1, background: theme.border + "50" }} />
              <div>
                <div
                  style={{
                    fontSize: isZen ? 11 : 8,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: theme.textMuted,
                    marginBottom: 4,
                    fontFamily: theme.fontFamily,
                  }}
                >
                  {isZen ? "Primary Objective" : "PRIMARY_OBJ"}
                </div>
                <div
                  style={{
                    fontSize: isZen ? 12 : 9,
                    fontWeight: 700,
                    color: pathColor,
                    fontFamily: theme.fontFamily,
                    textTransform: theme.textTransform,
                  }}
                >
                  {selectedL1.title}
                </div>
              </div>
            </div>
          </ThemedCard>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          padding: "16px 0",
          marginTop: 24,
          background: theme.bg,
          borderTop: `1px solid ${theme.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 10,
        }}
      >
        <button
          onClick={onBack}
          style={{
            padding: "8px 16px",
            borderRadius: theme.borderRadius,
            background: "transparent",
            border: `1px solid ${theme.border}`,
            color: theme.textMuted,
            fontSize: isZen ? 13 : 10,
            fontWeight: 600,
            fontFamily: theme.fontFamily,
            textTransform: theme.textTransform,
            cursor: "pointer",
          }}
        >
          {theme.vocab.back}
        </button>
        <button
          onClick={onConfirm}
          style={{
            padding: "12px 32px",
            borderRadius: theme.borderRadius,
            background: pathColor,
            color: isZen ? "#fff" : "#000",
            border: "none",
            cursor: "pointer",
            fontSize: isZen ? 14 : 11,
            fontWeight: 900,
            fontFamily: theme.fontFamily,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            boxShadow: !isZen ? `0 0 20px ${pathColor}40` : theme.shadow,
            transition: "all 0.2s",
          }}
        >
          {theme.vocab.approve}
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// Stat Row helper
// ============================================================================

function StatRow({ label, value, color, icon }: { label: string; value: string; color: string; icon: React.ReactNode }) {
  const { theme, themeId } = useWarRoomTheme()
  const isZen = themeId === "zen"

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ color: theme.textMuted, opacity: 0.6 }}>{icon}</span>
        <span
          style={{
            fontSize: isZen ? 11 : 8,
            color: theme.textMuted,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            fontFamily: theme.fontFamily,
          }}
        >
          {label}
        </span>
      </div>
      <span
        style={{
          fontSize: isZen ? 14 : 11,
          fontWeight: 800,
          color,
          fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
        }}
      >
        {value}
      </span>
    </div>
  )
}
