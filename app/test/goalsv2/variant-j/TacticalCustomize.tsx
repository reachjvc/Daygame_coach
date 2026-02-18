"use client"

import { useState, useMemo } from "react"
import { ArrowLeft, Calendar, ChevronDown, ChevronRight, Repeat, Star, Trophy, Target, Check, X } from "lucide-react"
import { Calendar as CalendarWidget } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format, parse, isValid, startOfDay } from "date-fns"
import type { GoalTemplate, GoalDisplayCategory } from "@/src/goals/types"
import { useWarRoomTheme, ThemedCard, CornerBrackets } from "./WarRoomTheme"

const CATEGORY_LABELS: Partial<Record<GoalDisplayCategory, { zen: string; cyber: string }>> = {
  field_work: { zen: "Field Practice", cyber: "FIELD_OPS" },
  results: { zen: "Victories", cyber: "RESULT_METRICS" },
  dirty_dog: { zen: "Intimate Arts", cyber: "CLASSIFIED_OPS" },
  texting: { zen: "Written Word", cyber: "COMMS_PROTOCOL" },
  dates: { zen: "Courtship", cyber: "DATE_OPS" },
  relationship: { zen: "Bonds", cyber: "REL_MANAGEMENT" },
}

export interface GoalCustomization {
  templateId: string
  title: string
  enabled: boolean
  targetValue: number
  level: number
}

interface TacticalCustomizeProps {
  selectedL1: GoalTemplate
  selectedL2s: GoalTemplate[]
  selectedL3s: GoalTemplate[]
  pathColor: string
  onBack: () => void
  onConfirm: (goals: GoalCustomization[], targetDate: Date | null) => void
}

export function TacticalCustomize({
  selectedL1,
  selectedL2s,
  selectedL3s,
  pathColor,
  onBack,
  onConfirm,
}: TacticalCustomizeProps) {
  const { theme, themeId } = useWarRoomTheme()
  const isZen = themeId === "zen"

  const [targetDate, setTargetDate] = useState<Date | null>(null)
  const [dateText, setDateText] = useState("")
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["achievements", "field_work", "results"]))

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
      map.set(l2.id, {
        templateId: l2.id,
        title: l2.title,
        enabled: true,
        targetValue: 1,
        level: 2,
      })
    }

    for (const l3 of selectedL3s) {
      const defaultTarget = l3.templateType === "milestone_ladder" && l3.defaultMilestoneConfig
        ? l3.defaultMilestoneConfig.target
        : l3.templateType === "habit_ramp" && l3.defaultRampSteps
        ? l3.defaultRampSteps[0].frequencyPerWeek
        : 1
      map.set(l3.id, {
        templateId: l3.id,
        title: l3.title,
        enabled: true,
        targetValue: defaultTarget,
        level: 3,
      })
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
      if (current) {
        next.set(id, { ...current, enabled: !current.enabled })
      }
      return next
    })
  }

  const updateTarget = (id: string, value: number) => {
    setCustomizations((prev) => {
      const next = new Map(prev)
      const current = next.get(id)
      if (current) {
        next.set(id, { ...current, targetValue: value })
      }
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
    onConfirm(goals, targetDate)
  }

  // Toggle switch component
  const ToggleSwitch = ({ checked, onToggle }: { checked: boolean; onToggle: () => void }) => (
    <button
      onClick={onToggle}
      style={{
        position: "relative",
        display: "inline-flex",
        height: 20,
        width: 36,
        alignItems: "center",
        borderRadius: isZen ? 10 : 2,
        border: "none",
        background: checked ? pathColor : theme.bgSecondary,
        cursor: "pointer",
        transition: "all 0.2s",
        flexShrink: 0,
      }}
      role="switch"
      aria-checked={checked}
    >
      <span
        style={{
          display: "inline-block",
          width: 14,
          height: 14,
          borderRadius: isZen ? "50%" : 2,
          background: "#fff",
          transition: "transform 0.2s",
          transform: checked ? "translateX(18px)" : "translateX(3px)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
        }}
      />
    </button>
  )

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
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

      <div style={{ marginBottom: 24 }}>
        <h2
          style={{
            fontSize: isZen ? 22 : 16,
            fontWeight: theme.headingWeight,
            fontFamily: theme.fontFamily,
            textTransform: theme.textTransform,
            letterSpacing: theme.letterSpacing,
            marginBottom: 4,
          }}
        >
          {isZen ? "Refine your objectives" : "CALIBRATE_OBJECTIVES"}
        </h2>
        <p
          style={{
            fontSize: isZen ? 13 : 10,
            color: theme.textMuted,
            fontFamily: theme.fontFamily,
            textTransform: isZen ? "none" : "uppercase",
          }}
        >
          {isZen
            ? "Fine-tune targets, toggle objectives on/off, and set your campaign timeline."
            : "ADJUST TARGET VALUES // ENABLE/DISABLE DIRECTIVES // SET CAMPAIGN DEADLINE"}
        </p>
      </div>

      {/* Vision / Primary objective card */}
      <ThemedCard
        style={{
          borderColor: pathColor + "40",
          background: pathColor + "05",
          marginBottom: 24,
        }}
        glow
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ padding: 8, borderRadius: isZen ? 10 : 2, background: pathColor + "15" }}>
            <Star size={20} style={{ color: pathColor }} />
          </div>
          <div>
            <div
              style={{
                fontSize: isZen ? 11 : 9,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: pathColor,
                fontFamily: theme.fontFamily,
              }}
            >
              {isZen ? "Primary Objective" : "PRIMARY_DIRECTIVE"}
            </div>
            <h3
              style={{
                fontSize: isZen ? 18 : 14,
                fontWeight: theme.headingWeight,
                fontFamily: theme.fontFamily,
                textTransform: theme.textTransform,
                letterSpacing: theme.letterSpacing,
              }}
            >
              {selectedL1.title}
            </h3>
          </div>
        </div>

        {/* Target date */}
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${pathColor}20` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: isZen ? 13 : 10, color: theme.textMuted, marginBottom: 8, fontFamily: theme.fontFamily, textTransform: theme.textTransform }}>
            <Calendar size={14} />
            {isZen ? "Campaign deadline (optional)" : "DEADLINE (OPTIONAL)"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              placeholder="dd/mm/yyyy"
              value={dateText}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "").slice(0, 8)
                let masked = ""
                for (let i = 0; i < raw.length; i++) {
                  if (i === 2 || i === 4) masked += "/"
                  masked += raw[i]
                }
                setDateText(masked)
                const parsed = parse(masked, "dd/MM/yyyy", new Date())
                if (masked.length === 10 && isValid(parsed) && parsed >= startOfDay(new Date())) {
                  setTargetDate(parsed)
                } else {
                  setTargetDate(null)
                }
              }}
              style={{
                width: 130,
                padding: "6px 10px",
                borderRadius: theme.borderRadius,
                border: `1px solid ${theme.border}`,
                background: theme.cardBg,
                color: theme.text,
                fontSize: isZen ? 13 : 11,
                fontFamily: theme.fontFamily,
                outline: "none",
              }}
            />
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <button style={{ color: pathColor, cursor: "pointer", background: "none", border: "none" }} aria-label="Open calendar">
                  <Calendar size={14} />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarWidget
                  mode="single"
                  captionLayout="dropdown"
                  selected={targetDate ?? undefined}
                  onSelect={(d) => {
                    setTargetDate(d ?? null)
                    setDateText(d ? format(d, "dd/MM/yyyy") : "")
                    setDatePickerOpen(false)
                  }}
                  defaultMonth={targetDate ?? new Date()}
                  startMonth={new Date()}
                  endMonth={new Date(new Date().getFullYear() + 5, 11)}
                  disabled={{ before: startOfDay(new Date()) }}
                  autoFocus
                />
              </PopoverContent>
            </Popover>
            {targetDate && (
              <button
                onClick={() => { setTargetDate(null); setDateText("") }}
                style={{ color: theme.textMuted, cursor: "pointer", background: "none", border: "none" }}
                aria-label="Clear date"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </ThemedCard>

      {/* Achievements section */}
      <CollapsibleSection
        title={isZen ? "Achievements" : "L2_ACHIEVEMENTS"}
        icon={<Trophy size={14} style={{ color: isZen ? "#d4a72c" : theme.accent }} />}
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
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 12,
                  borderRadius: theme.borderRadius,
                  border: `1px solid ${theme.border}80`,
                  fontFamily: theme.fontFamily,
                }}
              >
                <ToggleSwitch checked={cust.enabled} onToggle={() => toggleGoal(l2.id)} />
                <span
                  style={{
                    flex: 1,
                    fontSize: isZen ? 13 : 10,
                    fontWeight: 600,
                    textTransform: theme.textTransform,
                    letterSpacing: theme.letterSpacing,
                    color: cust.enabled ? theme.text : theme.textMuted,
                    textDecoration: cust.enabled ? "none" : "line-through",
                  }}
                >
                  {l2.title}
                </span>
                <Trophy size={12} style={{ color: theme.textFaint, flexShrink: 0 }} />
              </div>
            )
          })}
        </div>
      </CollapsibleSection>

      {/* L3 goals by category */}
      {(Object.entries(l3ByCategory) as [GoalDisplayCategory, GoalTemplate[]][]).map(([cat, goals]) => {
        if (!goals || goals.length === 0) return null
        const enabledInCat = goals.filter((g) => customizations.get(g.id)?.enabled).length
        const catLabel = CATEGORY_LABELS[cat]

        return (
          <CollapsibleSection
            key={cat}
            title={(isZen ? catLabel?.zen : catLabel?.cyber) ?? cat}
            icon={<Target size={14} style={{ color: theme.textMuted, opacity: 0.6 }} />}
            count={enabledInCat}
            total={goals.length}
            isExpanded={expandedSections.has(cat)}
            onToggle={() => toggleSection(cat)}
            subtitle={cat === "dirty_dog" ? (isZen ? "Intimate outcomes \u2014 opt in if relevant" : "CLASSIFIED // OPT-IN") : undefined}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {goals.map((goal) => {
                const cust = customizations.get(goal.id)
                if (!cust) return null
                const isRamp = goal.templateType === "habit_ramp"
                return (
                  <div
                    key={goal.id}
                    style={{
                      padding: 10,
                      borderRadius: theme.borderRadius,
                      border: `1px solid ${cust.enabled ? theme.border + "80" : theme.border + "40"}`,
                      opacity: cust.enabled ? 1 : 0.6,
                      transition: "all 0.2s",
                      fontFamily: theme.fontFamily,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <ToggleSwitch checked={cust.enabled} onToggle={() => toggleGoal(goal.id)} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span
                            style={{
                              fontSize: isZen ? 13 : 10,
                              fontWeight: 600,
                              textTransform: theme.textTransform,
                              letterSpacing: theme.letterSpacing,
                              color: cust.enabled ? theme.text : theme.textMuted,
                              textDecoration: cust.enabled ? "none" : "line-through",
                            }}
                          >
                            {goal.title}
                          </span>
                          <span
                            style={{
                              fontSize: isZen ? 10 : 8,
                              color: theme.textFaint,
                              display: "flex",
                              alignItems: "center",
                              gap: 3,
                              flexShrink: 0,
                              textTransform: theme.textTransform,
                            }}
                          >
                            {isRamp ? <Repeat size={10} /> : <Target size={10} />}
                            {isRamp ? theme.vocab.habit : theme.vocab.milestone}
                          </span>
                        </div>
                      </div>
                      {cust.enabled && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                          <span style={{ fontSize: isZen ? 11 : 9, color: theme.textMuted, textTransform: theme.textTransform }}>
                            {isZen ? "Target:" : "TGT:"}
                          </span>
                          <input
                            type="number"
                            value={cust.targetValue}
                            onChange={(e) => {
                              const v = parseInt(e.target.value, 10)
                              if (!isNaN(v) && v > 0) updateTarget(goal.id, v)
                            }}
                            style={{
                              width: 60,
                              textAlign: "right",
                              fontSize: isZen ? 13 : 10,
                              fontWeight: 600,
                              padding: "2px 6px",
                              borderRadius: isZen ? 4 : 2,
                              border: `1px solid ${theme.border}`,
                              background: theme.bgSecondary,
                              color: theme.text,
                              fontFamily: theme.fontFamily,
                              outline: "none",
                            }}
                            min={1}
                          />
                          {isRamp && (
                            <span style={{ fontSize: isZen ? 11 : 8, color: theme.textMuted, fontFamily: theme.fontFamily, textTransform: theme.textTransform }}>
                              /wk
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CollapsibleSection>
        )
      })}

      {/* Footer */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          padding: "12px 0",
          background: theme.bg,
          borderTop: `1px solid ${theme.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 10,
        }}
      >
        <div style={{ fontSize: isZen ? 13 : 10, color: theme.textMuted, fontFamily: theme.fontFamily, textTransform: theme.textTransform }}>
          <span style={{ fontWeight: 700, color: theme.text }}>{enabledCount}</span>
          {" "}{isZen ? "objectives ready" : "OBJ_READY"}
          {targetDate && (
            <span style={{ marginLeft: 8, fontSize: isZen ? 11 : 8 }}>
              {isZen ? "Deadline:" : "DL:"} {format(targetDate, "MMM d, yyyy")}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
            onClick={handleConfirm}
            style={{
              padding: "10px 24px",
              borderRadius: theme.borderRadius,
              background: pathColor,
              color: isZen ? "#fff" : "#000",
              border: "none",
              cursor: "pointer",
              fontSize: isZen ? 13 : 10,
              fontWeight: 800,
              fontFamily: theme.fontFamily,
              textTransform: theme.textTransform,
              letterSpacing: theme.letterSpacing,
              boxShadow: !isZen ? `0 0 12px ${pathColor}40` : "none",
            }}
          >
            {isZen ? "Proceed to Strategy" : "DEPLOY_STRATEGY"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Collapsible Section helper
// ============================================================================

function CollapsibleSection({
  title,
  icon,
  count,
  total,
  isExpanded,
  onToggle,
  subtitle,
  children,
}: {
  title: string
  icon: React.ReactNode
  count: number
  total: number
  isExpanded: boolean
  onToggle: () => void
  subtitle?: string
  children: React.ReactNode
}) {
  const { theme, themeId } = useWarRoomTheme()
  const isZen = themeId === "zen"

  return (
    <div style={{ marginBottom: 16 }}>
      <button
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          textAlign: "left",
          marginBottom: 8,
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: theme.fontFamily,
        }}
      >
        {isExpanded ? <ChevronDown size={14} style={{ color: theme.textMuted }} /> : <ChevronRight size={14} style={{ color: theme.textMuted }} />}
        {icon}
        <span
          style={{
            fontSize: isZen ? 12 : 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: theme.textMuted,
          }}
        >
          {title}
        </span>
        <span style={{ fontSize: isZen ? 11 : 9, color: theme.textFaint }}>{count}/{total}</span>
        <div style={{ flex: 1, height: 1, background: theme.border + "40", marginLeft: 8 }} />
      </button>
      {subtitle && isExpanded && (
        <p style={{ fontSize: isZen ? 11 : 8, color: theme.textFaint, fontStyle: "italic", marginBottom: 8, marginLeft: 24, fontFamily: theme.fontFamily }}>
          {subtitle}
        </p>
      )}
      {isExpanded && children}
    </div>
  )
}
