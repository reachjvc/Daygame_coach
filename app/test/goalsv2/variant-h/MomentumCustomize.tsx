"use client"

import { useState, useMemo } from "react"
import { ArrowLeft, ChevronDown, ChevronRight, Trophy, Target, Check } from "lucide-react"
import type { GoalTemplate, GoalDisplayCategory } from "@/src/goals/types"
import { useMomentumTheme, CornerBrackets } from "./MomentumThemeProvider"

const CATEGORY_LABELS: Partial<Record<GoalDisplayCategory, string>> = {
  field_work: "Field Work",
  results: "Results",
  dirty_dog: "Dirty Dog",
  texting: "Texting Game",
  dates: "Dating",
  relationship: "Relationship",
}

const CYBER_CATEGORY_LABELS: Partial<Record<GoalDisplayCategory, string>> = {
  field_work: "FIELD_OPS",
  results: "OUTPUT_METRICS",
  dirty_dog: "CLASSIFIED",
  texting: "COMMS_PROTOCOL",
  dates: "MISSION_OPS",
  relationship: "BOND_VECTORS",
}

export interface GoalCustomization {
  templateId: string
  title: string
  enabled: boolean
  targetValue: number
  level: number
}

interface MomentumCustomizeProps {
  selectedL1: GoalTemplate
  selectedL2s: GoalTemplate[]
  selectedL3s: GoalTemplate[]
  pathColor: string
  onBack: () => void
  onConfirm: (goals: GoalCustomization[]) => void
}

export function MomentumCustomize({
  selectedL1,
  selectedL2s,
  selectedL3s,
  pathColor,
  onBack,
  onConfirm,
}: MomentumCustomizeProps) {
  const { theme, themeId } = useMomentumTheme()
  const isCyber = themeId === "cyberpunk"

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["achievements", "field_work", "results"])
  )

  const [customizations, setCustomizations] = useState<Map<string, GoalCustomization>>(() => {
    const map = new Map<string, GoalCustomization>()
    map.set(selectedL1.id, {
      templateId: selectedL1.id,
      title: selectedL1.title,
      enabled: true,
      targetValue: 1,
      level: 1,
    })
    for (const l2 of selectedL2s) {
      map.set(l2.id, { templateId: l2.id, title: l2.title, enabled: true, targetValue: 1, level: 2 })
    }
    for (const l3 of selectedL3s) {
      const defaultTarget = l3.templateType === "milestone_ladder" && l3.defaultMilestoneConfig
        ? l3.defaultMilestoneConfig.target
        : l3.templateType === "habit_ramp" && l3.defaultRampSteps
          ? l3.defaultRampSteps[0].frequencyPerWeek
          : 1
      map.set(l3.id, { templateId: l3.id, title: l3.title, enabled: true, targetValue: defaultTarget, level: 3 })
    }
    return map
  })

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  const toggleGoal = (id: string) => {
    setCustomizations((prev) => {
      const next = new Map(prev)
      const current = next.get(id)
      if (current) next.set(id, { ...current, enabled: !current.enabled })
      return next
    })
  }

  const updateTarget = (id: string, value: number) => {
    setCustomizations((prev) => {
      const next = new Map(prev)
      const current = next.get(id)
      if (current) next.set(id, { ...current, targetValue: value })
      return next
    })
  }

  const l3ByCategory = useMemo(() => {
    const grouped: Record<string, GoalTemplate[]> = {}
    for (const l3 of selectedL3s) {
      const cat = l3.displayCategory || "field_work"
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(l3)
    }
    return grouped as Partial<Record<GoalDisplayCategory, GoalTemplate[]>>
  }, [selectedL3s])

  const enabledCount = useMemo(() => {
    let count = 0
    for (const [, c] of customizations) {
      if (c.enabled) count++
    }
    return count
  }, [customizations])

  const handleConfirm = () => {
    const goals = Array.from(customizations.values()).filter((c) => c.enabled)
    onConfirm(goals)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          onClick={onBack}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            fontSize: 13, color: theme.textMuted,
            background: "none", border: "none", cursor: "pointer",
            fontFamily: theme.fontFamily, textTransform: theme.textTransform,
          }}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} />
          {isCyber ? "< BACK" : "Back to selection"}
        </button>
      </div>

      <div>
        <h2 style={{ fontSize: isCyber ? 16 : 20, fontWeight: theme.headingWeight, fontFamily: theme.fontFamily, textTransform: theme.textTransform, letterSpacing: theme.letterSpacing }}>
          {isCyber ? "CALIBRATE_PARAMETERS" : "Customize your goals"}
        </h2>
        <p style={{ fontSize: 13, color: theme.textMuted, marginTop: 4, fontFamily: theme.fontFamily, textTransform: isCyber ? "uppercase" : "none" }}>
          {isCyber ? "Fine-tune target values. All parameters adjustable post-deployment." : "Fine-tune targets, toggle goals on/off. Everything is adjustable later."}
        </p>
      </div>

      {/* Vision card */}
      <div
        style={{
          position: "relative",
          borderRadius: theme.borderRadiusLg,
          border: `2px solid ${pathColor}40`,
          background: `${pathColor}05`,
          padding: 20,
        }}
      >
        {isCyber && <CornerBrackets color={pathColor} />}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ borderRadius: isCyber ? 2 : 8, padding: 8, background: `${pathColor}15` }}>
            <Target style={{ width: 20, height: 20, color: pathColor }} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: pathColor, fontFamily: theme.fontFamily }}>
              {isCyber ? "PRIMARY_TARGET" : "Your vision"}
            </div>
            <h3 style={{ fontSize: isCyber ? 14 : 18, fontWeight: theme.headingWeight, fontFamily: theme.fontFamily, textTransform: theme.textTransform }}>
              {selectedL1.title}
            </h3>
          </div>
        </div>
      </div>

      {/* Achievements */}
      <CollapsibleSection
        title={isCyber ? "SUBSYSTEMS" : "Achievements"}
        icon={<Trophy style={{ width: 16, height: 16, color: "#f59e0b" }} />}
        count={selectedL2s.filter((l2) => customizations.get(l2.id)?.enabled).length}
        total={selectedL2s.length}
        isExpanded={expandedSections.has("achievements")}
        onToggle={() => toggleSection("achievements")}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {selectedL2s.map((l2) => {
            const cust = customizations.get(l2.id)
            if (!cust) return null
            return (
              <div
                key={l2.id}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  borderRadius: isCyber ? 2 : 8,
                  border: `1px solid ${theme.border}`,
                  padding: 12,
                }}
              >
                <ToggleSwitch
                  checked={cust.enabled}
                  onChange={() => toggleGoal(l2.id)}
                  color={pathColor}
                />
                <span style={{
                  fontSize: 13, fontWeight: 500, flex: 1,
                  fontFamily: theme.fontFamily, textTransform: theme.textTransform,
                  textDecoration: cust.enabled ? "none" : "line-through",
                  color: cust.enabled ? theme.text : theme.textMuted,
                }}>
                  {l2.title}
                </span>
              </div>
            )
          })}
        </div>
      </CollapsibleSection>

      {/* L3 goals by category */}
      {(Object.entries(l3ByCategory) as [GoalDisplayCategory, GoalTemplate[]][]).map(([cat, goals]) => {
        if (!goals || goals.length === 0) return null
        const enabledInCat = goals.filter((g) => customizations.get(g.id)?.enabled).length

        return (
          <CollapsibleSection
            key={cat}
            title={(isCyber ? CYBER_CATEGORY_LABELS[cat] : CATEGORY_LABELS[cat]) ?? cat}
            icon={<Target style={{ width: 16, height: 16, color: `${theme.textMuted}80` }} />}
            count={enabledInCat}
            total={goals.length}
            isExpanded={expandedSections.has(cat)}
            onToggle={() => toggleSection(cat)}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {goals.map((goal) => {
                const cust = customizations.get(goal.id)
                if (!cust) return null
                const isRamp = goal.templateType === "habit_ramp"
                return (
                  <GoalRow
                    key={goal.id}
                    goal={goal}
                    customization={cust}
                    isRamp={isRamp}
                    pathColor={pathColor}
                    onToggle={() => toggleGoal(goal.id)}
                    onUpdateTarget={(v) => updateTarget(goal.id, v)}
                  />
                )
              })}
            </div>
          </CollapsibleSection>
        )
      })}

      {/* Confirm footer */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          background: `${theme.bg}ee`,
          backdropFilter: "blur(8px)",
          borderTop: `1px solid ${theme.border}`,
          margin: "0 -24px",
          padding: "16px 24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 13, color: theme.textMuted, fontFamily: theme.fontFamily, textTransform: theme.textTransform }}>
            <span style={{ fontWeight: 600, color: theme.text }}>{enabledCount}</span>{" "}
            {isCyber ? "VECTORS_READY" : "goals ready"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={onBack}
              style={{
                padding: "10px 20px",
                borderRadius: isCyber ? 2 : 8,
                border: `1px solid ${theme.border}`,
                background: "transparent",
                color: theme.text,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: theme.fontFamily,
                textTransform: theme.textTransform,
              }}
            >
              {isCyber ? "< BACK" : "Back"}
            </button>
            <button
              onClick={handleConfirm}
              style={{
                padding: "10px 24px",
                borderRadius: isCyber ? 2 : 8,
                border: isCyber ? `1px solid ${pathColor}` : "none",
                background: pathColor,
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: theme.fontFamily,
                textTransform: theme.textTransform,
                letterSpacing: theme.letterSpacing,
                boxShadow: isCyber ? `0 0 12px ${pathColor}40` : "none",
              }}
            >
              {isCyber ? "BUILD_MOMENTUM >" : "Set Momentum"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Helper Components
// ============================================================================

function ToggleSwitch({ checked, onChange, color }: { checked: boolean; onChange: () => void; color: string }) {
  const { theme, themeId } = useMomentumTheme()
  const isCyber = themeId === "cyberpunk"

  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      style={{
        position: "relative",
        display: "inline-flex",
        height: 20,
        width: 36,
        alignItems: "center",
        borderRadius: isCyber ? 2 : 999,
        background: checked ? color : theme.border,
        border: "none",
        cursor: "pointer",
        flexShrink: 0,
        transition: "background 0.2s",
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: 14,
          height: 14,
          borderRadius: isCyber ? 1 : "50%",
          background: "#fff",
          transition: "transform 0.2s",
          transform: checked ? "translateX(18px)" : "translateX(3px)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
        }}
      />
    </button>
  )
}

function GoalRow({
  goal,
  customization,
  isRamp,
  pathColor,
  onToggle,
  onUpdateTarget,
}: {
  goal: GoalTemplate
  customization: GoalCustomization
  isRamp: boolean
  pathColor: string
  onToggle: () => void
  onUpdateTarget: (v: number) => void
}) {
  const { theme, themeId } = useMomentumTheme()
  const isCyber = themeId === "cyberpunk"

  return (
    <div
      style={{
        borderRadius: isCyber ? 2 : 8,
        border: `1px solid ${customization.enabled ? theme.border : `${theme.border}60`}`,
        padding: 12,
        opacity: customization.enabled ? 1 : 0.6,
        transition: "opacity 0.2s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <ToggleSwitch checked={customization.enabled} onChange={onToggle} color={pathColor} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              fontSize: 13, fontWeight: 500,
              fontFamily: theme.fontFamily, textTransform: theme.textTransform,
              textDecoration: customization.enabled ? "none" : "line-through",
              color: customization.enabled ? theme.text : theme.textMuted,
            }}>
              {goal.title}
            </span>
            <span style={{ fontSize: 10, color: `${theme.textMuted}80`, textTransform: theme.textTransform, fontFamily: theme.fontFamily }}>
              {isRamp ? (isCyber ? "HABIT" : "habit") : (isCyber ? "MILESTONE" : "milestone")}
            </span>
          </div>
        </div>
        {customization.enabled && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: theme.textMuted, fontFamily: theme.fontFamily, textTransform: theme.textTransform }}>
              {isCyber ? "TGT:" : "Target:"}
            </span>
            <input
              type="number"
              value={customization.targetValue}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                if (!isNaN(v) && v > 0) onUpdateTarget(v)
              }}
              style={{
                width: 64,
                textAlign: "right",
                fontSize: 13,
                fontWeight: 500,
                borderRadius: isCyber ? 2 : 4,
                padding: "2px 6px",
                background: isCyber ? "#111" : theme.bgSecondary,
                border: `1px solid ${theme.border}`,
                color: theme.text,
                fontFamily: theme.fontFamily,
                outline: "none",
              }}
              min={1}
            />
            {isRamp && (
              <span style={{ fontSize: 11, color: theme.textMuted, fontFamily: theme.fontFamily }}>
                {isCyber ? "/WK" : "/wk"}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function CollapsibleSection({
  title,
  icon,
  count,
  total,
  isExpanded,
  onToggle,
  children,
}: {
  title: string
  icon: React.ReactNode
  count: number
  total: number
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  const { theme, themeId } = useMomentumTheme()
  const isCyber = themeId === "cyberpunk"

  return (
    <div>
      <button
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          textAlign: "left",
          marginBottom: 8,
          cursor: "pointer",
          background: "none",
          border: "none",
          fontFamily: theme.fontFamily,
          color: theme.text,
        }}
      >
        {isExpanded
          ? <ChevronDown style={{ width: 16, height: 16, color: theme.textMuted }} />
          : <ChevronRight style={{ width: 16, height: 16, color: theme.textMuted }} />
        }
        {icon}
        <span style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: theme.textMuted }}>
          {title}
        </span>
        <span style={{ fontSize: 11, color: `${theme.textMuted}80` }}>{count}/{total}</span>
        <div style={{ flex: 1, borderTop: `1px solid ${theme.border}30`, marginLeft: 8 }} />
      </button>
      {isExpanded && children}
    </div>
  )
}
