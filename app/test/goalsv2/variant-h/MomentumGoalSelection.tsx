"use client"

import { useState, useMemo } from "react"
import { ArrowLeft, Check, ChevronDown, ChevronRight, Star, Trophy, Target, Zap, Heart, Flame } from "lucide-react"
import { getCatalogGroups, getCatalogTiers, getChildren } from "@/src/goals/data/goalGraph"
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

const CATEGORY_ICONS: Partial<Record<GoalDisplayCategory, typeof Target>> = {
  field_work: Zap,
  results: Target,
  dirty_dog: Flame,
  texting: Star,
  dates: Heart,
  relationship: Trophy,
}

interface MomentumGoalSelectionProps {
  path: "one_person" | "abundance"
  onBack: () => void
  onConfirm: (selectedL1: GoalTemplate, selectedL2s: GoalTemplate[], selectedL3s: GoalTemplate[]) => void
}

export function MomentumGoalSelection({ path, onBack, onConfirm }: MomentumGoalSelectionProps) {
  const { theme, themeId } = useMomentumTheme()
  const isCyber = themeId === "cyberpunk"

  const { onePerson, abundance } = getCatalogGroups()
  const tiers = getCatalogTiers()

  const l1Options = path === "one_person" ? onePerson : abundance
  const [selectedL1, setSelectedL1] = useState<GoalTemplate | null>(null)
  const [selectedL2Ids, setSelectedL2Ids] = useState<Set<string>>(new Set())
  const [selectedL3Ids, setSelectedL3Ids] = useState<Set<string>>(new Set())
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["field_work", "results"]))

  const pathColor = path === "one_person" ? "#ec4899" : "#f97316"
  const pathLabel = path === "one_person"
    ? (isCyber ? "FIND_ONE" : "Find the One")
    : (isCyber ? "ABUNDANCE" : "Abundance")
  const PathIcon = path === "one_person" ? Heart : Flame

  const relevantL2s = useMemo(() => {
    if (!selectedL1) return []
    return tiers.tier2
  }, [selectedL1, tiers.tier2])

  const l3ByCategory = useMemo(() => {
    return tiers.tier3
  }, [tiers.tier3])

  const toggleL2 = (id: string) => {
    setSelectedL2Ids((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        const l3Children = getChildren(id).filter((c) => c.level === 3)
        for (const child of l3Children) {
          const otherL2sReferencing = Array.from(next).some((otherId) =>
            getChildren(otherId).some((c) => c.id === child.id)
          )
          if (!otherL2sReferencing) {
            setSelectedL3Ids((prev3) => {
              const next3 = new Set(prev3)
              next3.delete(child.id)
              return next3
            })
          }
        }
      } else {
        next.add(id)
        const l3Children = getChildren(id).filter((c) => c.level === 3 && c.displayCategory !== "dirty_dog")
        for (const child of l3Children) {
          setSelectedL3Ids((prev3) => new Set(prev3).add(child.id))
        }
      }
      return next
    })
  }

  const toggleL3 = (id: string) => {
    setSelectedL3Ids((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const selectAllInCategory = (cat: GoalDisplayCategory) => {
    const goals = l3ByCategory[cat] || []
    const allSelected = goals.every((g) => selectedL3Ids.has(g.id))
    if (allSelected) {
      setSelectedL3Ids((prev) => {
        const next = new Set(prev)
        goals.forEach((g) => next.delete(g.id))
        return next
      })
    } else {
      setSelectedL3Ids((prev) => {
        const next = new Set(prev)
        goals.forEach((g) => next.add(g.id))
        return next
      })
    }
  }

  const handleConfirm = () => {
    if (!selectedL1) return
    const l2Templates = tiers.tier2.filter((t) => selectedL2Ids.has(t.id))
    const allL3 = Object.values(l3ByCategory).flat()
    const l3Templates = allL3.filter((t) => selectedL3Ids.has(t.id))
    onConfirm(selectedL1, l2Templates, l3Templates)
  }

  const totalSelected = 1 + selectedL2Ids.size + selectedL3Ids.size

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            color: theme.textMuted,
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: theme.fontFamily,
            textTransform: theme.textTransform,
          }}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} />
          {isCyber ? "< BACK" : "Back"}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <PathIcon style={{ width: 16, height: 16, color: pathColor }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: pathColor, fontFamily: theme.fontFamily, textTransform: theme.textTransform }}>{pathLabel}</span>
        </div>
      </div>

      {/* Step 1: Choose L1 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 24, height: 24,
              borderRadius: isCyber ? 2 : "50%",
              fontSize: 11, fontWeight: 700,
              color: "#fff",
              background: pathColor,
              fontFamily: theme.fontFamily,
            }}
          >
            1
          </div>
          <h2 style={{ fontSize: isCyber ? 14 : 18, fontWeight: theme.headingWeight, fontFamily: theme.fontFamily, textTransform: theme.textTransform, letterSpacing: theme.letterSpacing }}>
            {isCyber ? "PRIMARY_OBJECTIVE" : "Choose your big goal"}
          </h2>
        </div>
        <p style={{ fontSize: 13, color: theme.textMuted, marginLeft: 32, fontFamily: theme.fontFamily, textTransform: isCyber ? "uppercase" : "none" }}>
          {isCyber ? "Set primary target vector. All subsystems align to this." : "This is your North Star. Everything else builds toward it."}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginLeft: 32 }}>
          {l1Options.map((l1) => {
            const isSelected = selectedL1?.id === l1.id
            return (
              <button
                key={l1.id}
                onClick={() => {
                  setSelectedL1(l1)
                  if (!selectedL1 || selectedL1.id !== l1.id) {
                    const defaultL2s = tiers.tier2.slice(0, 3)
                    const l2Set = new Set(defaultL2s.map((t) => t.id))
                    setSelectedL2Ids(l2Set)
                    const autoL3 = new Set<string>()
                    for (const l2 of defaultL2s) {
                      const children = getChildren(l2.id).filter((c) => c.level === 3 && c.displayCategory !== "dirty_dog")
                      children.forEach((c) => autoL3.add(c.id))
                    }
                    setSelectedL3Ids(autoL3)
                  }
                }}
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  borderRadius: theme.borderRadius,
                  border: `2px solid ${isSelected ? `${pathColor}60` : theme.border}`,
                  padding: 16,
                  textAlign: "left",
                  cursor: "pointer",
                  background: isSelected ? `${pathColor}08` : theme.cardBg,
                  boxShadow: isSelected ? (isCyber ? `0 0 20px ${pathColor}15` : `0 2px 12px ${pathColor}10`) : "none",
                  fontFamily: theme.fontFamily,
                  transition: "all 0.2s",
                }}
              >
                {isSelected && (
                  <div style={{
                    position: "absolute", top: 8, right: 8,
                    width: 20, height: 20,
                    borderRadius: isCyber ? 2 : "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: pathColor,
                  }}>
                    <Check style={{ width: 12, height: 12, color: "#fff" }} />
                  </div>
                )}
                <div style={{ borderRadius: isCyber ? 2 : 8, padding: 8, background: `${pathColor}12` }}>
                  <Star style={{ width: 16, height: 16, color: pathColor }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, textTransform: theme.textTransform, letterSpacing: isCyber ? "0.03em" : "normal" }}>
                  {l1.title}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Step 2: Achievements */}
      {selectedL1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 24, height: 24,
                borderRadius: isCyber ? 2 : "50%",
                fontSize: 11, fontWeight: 700,
                color: "#fff", background: pathColor,
                fontFamily: theme.fontFamily,
              }}
            >
              2
            </div>
            <h2 style={{ fontSize: isCyber ? 14 : 18, fontWeight: theme.headingWeight, fontFamily: theme.fontFamily, textTransform: theme.textTransform, letterSpacing: theme.letterSpacing }}>
              {isCyber ? "SUBSYSTEMS" : "Achievements to unlock"}
            </h2>
          </div>
          <p style={{ fontSize: 13, color: theme.textMuted, marginLeft: 32, fontFamily: theme.fontFamily, textTransform: isCyber ? "uppercase" : "none" }}>
            {isCyber
              ? `Subsystems feeding into "${selectedL1.title}". Toggle active modules.`
              : `Transformations on the way to "${selectedL1.title}". Select the ones that resonate.`
            }
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginLeft: 32 }}>
            {relevantL2s.map((l2) => {
              const isSelected = selectedL2Ids.has(l2.id)
              const childCount = getChildren(l2.id).filter((c) => c.level === 3).length
              return (
                <button
                  key={l2.id}
                  onClick={() => toggleL2(l2.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    borderRadius: isCyber ? 2 : 8,
                    border: `1px solid ${isSelected ? `${theme.accent}50` : theme.border}`,
                    padding: 12,
                    textAlign: "left",
                    cursor: "pointer",
                    background: isSelected ? theme.accentFaded : theme.cardBg,
                    fontFamily: theme.fontFamily,
                    transition: "all 0.2s",
                  }}
                >
                  <div
                    style={{
                      width: 20, height: 20,
                      borderRadius: isCyber ? 2 : 4,
                      border: `2px solid ${isSelected ? theme.accent : theme.textMuted}40`,
                      background: isSelected ? theme.accent : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                      transition: "all 0.2s",
                    }}
                  >
                    {isSelected && <Check style={{ width: 12, height: 12, color: "#fff" }} />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, textTransform: theme.textTransform, letterSpacing: isCyber ? "0.02em" : "normal", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {l2.title}
                    </div>
                    <div style={{ fontSize: 11, color: theme.textMuted, textTransform: theme.textTransform }}>
                      {childCount} {isCyber ? "metrics" : "trackable goals"}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Step 3: Trackable Goals */}
      {selectedL1 && selectedL2Ids.size > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 24, height: 24,
                borderRadius: isCyber ? 2 : "50%",
                fontSize: 11, fontWeight: 700,
                color: "#fff", background: pathColor,
                fontFamily: theme.fontFamily,
              }}
            >
              3
            </div>
            <h2 style={{ fontSize: isCyber ? 14 : 18, fontWeight: theme.headingWeight, fontFamily: theme.fontFamily, textTransform: theme.textTransform, letterSpacing: theme.letterSpacing }}>
              {isCyber ? "TRACKING_METRICS" : "What you'll track"}
            </h2>
          </div>
          <p style={{ fontSize: 13, color: theme.textMuted, marginLeft: 32, fontFamily: theme.fontFamily, textTransform: isCyber ? "uppercase" : "none" }}>
            {isCyber ? "Individual data streams. Toggle off irrelevant channels." : "Specific metrics and habits. Toggle off anything that doesn't fit."}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginLeft: 32 }}>
            {(Object.entries(l3ByCategory) as [GoalDisplayCategory, GoalTemplate[]][]).map(([cat, goals]) => {
              if (!goals || goals.length === 0) return null
              const isExpanded = expandedCategories.has(cat)
              const selectedInCat = goals.filter((g) => selectedL3Ids.has(g.id)).length
              const allSelected = selectedInCat === goals.length
              const CatIcon = CATEGORY_ICONS[cat] || Target

              return (
                <div
                  key={cat}
                  style={{
                    borderRadius: isCyber ? 2 : 8,
                    border: `1px solid ${theme.border}`,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: 12,
                      background: isCyber ? "#0a0a0a" : `${theme.bgSecondary}80`,
                    }}
                  >
                    <button
                      onClick={() => toggleCategory(cat)}
                      style={{
                        display: "flex", alignItems: "center", gap: 8, flex: 1, textAlign: "left",
                        cursor: "pointer", background: "none", border: "none",
                        fontFamily: theme.fontFamily, color: theme.text,
                      }}
                    >
                      {isExpanded
                        ? <ChevronDown style={{ width: 16, height: 16, color: theme.textMuted }} />
                        : <ChevronRight style={{ width: 16, height: 16, color: theme.textMuted }} />
                      }
                      <CatIcon style={{ width: 16, height: 16, color: `${theme.textMuted}80` }} />
                      <span style={{ fontSize: 13, fontWeight: 600, textTransform: theme.textTransform, letterSpacing: theme.letterSpacing }}>
                        {isCyber ? CYBER_CATEGORY_LABELS[cat] : CATEGORY_LABELS[cat]}
                      </span>
                      <span style={{ fontSize: 11, color: theme.textMuted, fontFamily: theme.fontFamily }}>
                        {selectedInCat}/{goals.length}
                      </span>
                    </button>
                    <button
                      onClick={() => selectAllInCategory(cat)}
                      style={{
                        fontSize: 11, color: theme.textMuted,
                        cursor: "pointer", background: "none", border: "none",
                        fontFamily: theme.fontFamily, textTransform: theme.textTransform,
                      }}
                    >
                      {allSelected ? (isCyber ? "NONE" : "None") : (isCyber ? "ALL" : "All")}
                    </button>
                  </div>

                  {isExpanded && (
                    <div style={{ padding: "4px 12px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
                      {cat === "dirty_dog" && (
                        <p style={{ fontSize: 11, color: `${theme.textMuted}99`, fontStyle: "italic", marginBottom: 8, paddingLeft: 24, fontFamily: theme.fontFamily }}>
                          {isCyber ? "// RESTRICTED ACCESS - OPT-IN ONLY" : "Intimate outcomes. Opt in if relevant to your goals."}
                        </p>
                      )}
                      {goals.map((goal) => {
                        const isSelected = selectedL3Ids.has(goal.id)
                        const isRamp = goal.templateType === "habit_ramp"
                        return (
                          <button
                            key={goal.id}
                            onClick={() => toggleL3(goal.id)}
                            style={{
                              width: "100%",
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              borderRadius: isCyber ? 2 : 6,
                              padding: "8px 12px",
                              textAlign: "left",
                              cursor: "pointer",
                              background: isSelected ? theme.accentFaded : "transparent",
                              border: "none",
                              fontFamily: theme.fontFamily,
                              transition: "background 0.15s",
                            }}
                          >
                            <div
                              style={{
                                width: 16, height: 16,
                                borderRadius: isCyber ? 2 : 3,
                                border: `1.5px solid ${isSelected ? theme.accent : `${theme.textMuted}40`}`,
                                background: isSelected ? theme.accent : "transparent",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                flexShrink: 0,
                                transition: "all 0.15s",
                              }}
                            >
                              {isSelected && <Check style={{ width: 10, height: 10, color: "#fff" }} />}
                            </div>
                            <span style={{ fontSize: 13, flex: 1, color: isSelected ? theme.text : theme.textMuted, textTransform: theme.textTransform }}>
                              {goal.title}
                            </span>
                            <span style={{ fontSize: 10, color: `${theme.textMuted}80`, textTransform: theme.textTransform }}>
                              {isRamp ? (isCyber ? "HABIT" : "habit") : (isCyber ? "MILESTONE" : "milestone")}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      {selectedL1 && (
        <div
          style={{
            position: "sticky",
            bottom: 0,
            background: `${theme.bg}ee`,
            backdropFilter: "blur(8px)",
            borderTop: `1px solid ${theme.border}`,
            margin: "24px -24px 0",
            padding: "16px 24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 13, color: theme.textMuted, fontFamily: theme.fontFamily, textTransform: theme.textTransform }}>
              <span style={{ fontWeight: 600, color: theme.text }}>{totalSelected}</span>{" "}
              {isCyber ? "VECTORS_SELECTED" : "goals selected"}
              <span style={{ fontSize: 11, marginLeft: 8 }}>
                (1 {isCyber ? "PRIMARY" : "vision"} + {selectedL2Ids.size} {isCyber ? "SUB" : "achievements"} + {selectedL3Ids.size} {isCyber ? "METRICS" : "trackable"})
              </span>
            </div>
            <button
              onClick={handleConfirm}
              disabled={selectedL3Ids.size === 0}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 24px",
                borderRadius: isCyber ? 2 : 8,
                border: isCyber ? `1px solid ${pathColor}` : "none",
                background: selectedL3Ids.size === 0 ? theme.textMuted : pathColor,
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: selectedL3Ids.size === 0 ? "not-allowed" : "pointer",
                fontFamily: theme.fontFamily,
                textTransform: theme.textTransform,
                letterSpacing: theme.letterSpacing,
                boxShadow: isCyber && selectedL3Ids.size > 0 ? `0 0 12px ${pathColor}40` : "none",
              }}
            >
              {isCyber ? "CALIBRATE >" : "Customize & Confirm"}
              <ChevronRight style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
