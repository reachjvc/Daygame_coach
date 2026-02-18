"use client"

import { useState, useMemo } from "react"
import { ArrowLeft, Check, ChevronDown, ChevronRight, Star, Trophy, Target, Zap, Heart, Flame } from "lucide-react"
import { getCatalogGroups, getCatalogTiers, getChildren } from "@/src/goals/data/goalGraph"
import type { GoalTemplate, GoalDisplayCategory } from "@/src/goals/types"
import { useWarRoomTheme } from "./WarRoomTheme"

const CATEGORY_LABELS: Partial<Record<GoalDisplayCategory, { zen: string; cyber: string }>> = {
  field_work: { zen: "Field Practice", cyber: "FIELD_OPS" },
  results: { zen: "Victories", cyber: "RESULT_METRICS" },
  dirty_dog: { zen: "Intimate Arts", cyber: "CLASSIFIED_OPS" },
  texting: { zen: "Written Word", cyber: "COMMS_PROTOCOL" },
  dates: { zen: "Courtship", cyber: "DATE_OPS" },
  relationship: { zen: "Bonds", cyber: "REL_MANAGEMENT" },
}

const CATEGORY_ICONS: Partial<Record<GoalDisplayCategory, typeof Target>> = {
  field_work: Zap,
  results: Target,
  dirty_dog: Flame,
  texting: Star,
  dates: Heart,
  relationship: Trophy,
}

interface ObjectiveSelectorProps {
  path: "one_person" | "abundance"
  onBack: () => void
  onConfirm: (selectedL1: GoalTemplate, selectedL2s: GoalTemplate[], selectedL3s: GoalTemplate[]) => void
}

export function ObjectiveSelector({ path, onBack, onConfirm }: ObjectiveSelectorProps) {
  const { theme, themeId } = useWarRoomTheme()
  const isZen = themeId === "zen"

  const { onePerson, abundance } = getCatalogGroups()
  const tiers = getCatalogTiers()

  const l1Options = path === "one_person" ? onePerson : abundance
  const [selectedL1, setSelectedL1] = useState<GoalTemplate | null>(null)
  const [selectedL2Ids, setSelectedL2Ids] = useState<Set<string>>(new Set())
  const [selectedL3Ids, setSelectedL3Ids] = useState<Set<string>>(new Set())
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["field_work", "results"]))

  const pathColor = path === "one_person"
    ? (isZen ? "#ec4899" : "#ff0033")
    : (isZen ? "#f97316" : "#00ff41")

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
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {path === "one_person"
            ? <Heart size={14} style={{ color: pathColor }} />
            : <Flame size={14} style={{ color: pathColor }} />}
          <span style={{ fontSize: isZen ? 13 : 10, fontWeight: 700, color: pathColor, fontFamily: theme.fontFamily, textTransform: theme.textTransform }}>
            {isZen
              ? (path === "one_person" ? "Find the One" : "Abundance")
              : (path === "one_person" ? "OP: ONE_TARGET" : "OP: ABUNDANCE")}
          </span>
        </div>
      </div>

      {/* Step 1: Primary objective */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: isZen ? "50%" : 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 800,
              background: pathColor,
              color: isZen ? "#fff" : "#000",
              fontFamily: theme.fontFamily,
            }}
          >
            1
          </div>
          <h2
            style={{
              fontSize: isZen ? 18 : 14,
              fontWeight: theme.headingWeight,
              fontFamily: theme.fontFamily,
              textTransform: theme.textTransform,
              letterSpacing: theme.letterSpacing,
            }}
          >
            {isZen ? "Choose your primary objective" : "SELECT_PRIMARY_OBJECTIVE"}
          </h2>
        </div>
        <p
          style={{
            fontSize: isZen ? 13 : 10,
            color: theme.textMuted,
            marginLeft: 34,
            marginBottom: 12,
            fontFamily: theme.fontFamily,
            textTransform: isZen ? "none" : "uppercase",
          }}
        >
          {isZen
            ? "This is the North Star of your campaign. All other objectives serve this vision."
            : "PRIMARY DIRECTIVE // ALL SUB-OBJECTIVES DERIVE FROM THIS TARGET"}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginLeft: 34 }}>
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
                  padding: 14,
                  borderRadius: theme.borderRadius,
                  border: `2px solid ${isSelected ? pathColor + "80" : theme.border}`,
                  background: isSelected ? pathColor + "08" : theme.cardBg,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s",
                  fontFamily: theme.fontFamily,
                }}
              >
                {isSelected && (
                  <div
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      width: 18,
                      height: 18,
                      borderRadius: isZen ? "50%" : 2,
                      background: pathColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Check size={10} style={{ color: isZen ? "#fff" : "#000" }} />
                  </div>
                )}
                <div
                  style={{
                    padding: 6,
                    borderRadius: isZen ? 8 : 2,
                    background: pathColor + "15",
                  }}
                >
                  <Star size={14} style={{ color: pathColor }} />
                </div>
                <span
                  style={{
                    fontSize: isZen ? 13 : 10,
                    fontWeight: 600,
                    textTransform: theme.textTransform,
                    letterSpacing: theme.letterSpacing,
                    color: theme.text,
                  }}
                >
                  {l1.title}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Step 2: Achievements / Milestones */}
      {selectedL1 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: isZen ? "50%" : 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 800,
                background: pathColor,
                color: isZen ? "#fff" : "#000",
                fontFamily: theme.fontFamily,
              }}
            >
              2
            </div>
            <h2
              style={{
                fontSize: isZen ? 18 : 14,
                fontWeight: theme.headingWeight,
                fontFamily: theme.fontFamily,
                textTransform: theme.textTransform,
                letterSpacing: theme.letterSpacing,
              }}
            >
              {isZen ? "Achievements to unlock" : "SECONDARY_OBJECTIVES"}
            </h2>
          </div>
          <p
            style={{
              fontSize: isZen ? 13 : 10,
              color: theme.textMuted,
              marginLeft: 34,
              marginBottom: 12,
              fontFamily: theme.fontFamily,
              textTransform: isZen ? "none" : "uppercase",
            }}
          >
            {isZen
              ? `Transformations on the way to "${selectedL1.title}". Select those that resonate.`
              : `MILESTONES EN ROUTE TO "${selectedL1.title.toUpperCase()}" // SELECT ACTIVE`}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginLeft: 34 }}>
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
                    gap: 10,
                    padding: 10,
                    borderRadius: isZen ? 8 : 2,
                    border: `1px solid ${isSelected ? pathColor + "40" : theme.border + "80"}`,
                    background: isSelected ? pathColor + "05" : "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.2s",
                    fontFamily: theme.fontFamily,
                  }}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: isZen ? 4 : 2,
                      border: `2px solid ${isSelected ? pathColor : theme.textFaint}`,
                      background: isSelected ? pathColor : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transition: "all 0.2s",
                    }}
                  >
                    {isSelected && <Check size={10} style={{ color: isZen ? "#fff" : "#000" }} />}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: isZen ? 13 : 10,
                        fontWeight: 600,
                        textTransform: theme.textTransform,
                        letterSpacing: theme.letterSpacing,
                        color: theme.text,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {l2.title}
                    </div>
                    <div
                      style={{
                        fontSize: isZen ? 11 : 8,
                        color: theme.textMuted,
                        textTransform: theme.textTransform,
                      }}
                    >
                      {childCount} {isZen ? "trackable goals" : "SUB_OBJ"}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Step 3: Trackable goals */}
      {selectedL1 && selectedL2Ids.size > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: isZen ? "50%" : 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 800,
                background: pathColor,
                color: isZen ? "#fff" : "#000",
                fontFamily: theme.fontFamily,
              }}
            >
              3
            </div>
            <h2
              style={{
                fontSize: isZen ? 18 : 14,
                fontWeight: theme.headingWeight,
                fontFamily: theme.fontFamily,
                textTransform: theme.textTransform,
                letterSpacing: theme.letterSpacing,
              }}
            >
              {isZen ? "Specific objectives" : "TACTICAL_METRICS"}
            </h2>
          </div>
          <p
            style={{
              fontSize: isZen ? 13 : 10,
              color: theme.textMuted,
              marginLeft: 34,
              marginBottom: 12,
              fontFamily: theme.fontFamily,
              textTransform: isZen ? "none" : "uppercase",
            }}
          >
            {isZen
              ? "These are the specific practices and metrics for your campaign."
              : "GRANULAR DIRECTIVES AND MEASUREMENT VECTORS"}
          </p>

          <div style={{ marginLeft: 34, display: "flex", flexDirection: "column", gap: 8 }}>
            {(Object.entries(l3ByCategory) as [GoalDisplayCategory, GoalTemplate[]][]).map(([cat, goals]) => {
              if (!goals || goals.length === 0) return null
              const isExpanded = expandedCategories.has(cat)
              const selectedInCat = goals.filter((g) => selectedL3Ids.has(g.id)).length
              const allSelected = selectedInCat === goals.length
              const CatIcon = CATEGORY_ICONS[cat] || Target
              const catLabel = CATEGORY_LABELS[cat]

              return (
                <div
                  key={cat}
                  style={{
                    borderRadius: theme.borderRadius,
                    border: `1px solid ${theme.border}80`,
                    overflow: "hidden",
                  }}
                >
                  {/* Category header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 12px",
                      background: theme.bgSecondary,
                    }}
                  >
                    <button
                      onClick={() => toggleCategory(cat)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flex: 1,
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                        fontFamily: theme.fontFamily,
                      }}
                    >
                      {isExpanded ? <ChevronDown size={14} style={{ color: theme.textMuted }} /> : <ChevronRight size={14} style={{ color: theme.textMuted }} />}
                      <CatIcon size={14} style={{ color: theme.textMuted, opacity: 0.6 }} />
                      <span
                        style={{
                          fontSize: isZen ? 13 : 10,
                          fontWeight: 700,
                          textTransform: theme.textTransform,
                          letterSpacing: theme.letterSpacing,
                          color: theme.text,
                        }}
                      >
                        {isZen ? catLabel?.zen : catLabel?.cyber}
                      </span>
                      <span style={{ fontSize: isZen ? 11 : 9, color: theme.textMuted }}>
                        {selectedInCat}/{goals.length}
                      </span>
                    </button>
                    <button
                      onClick={() => selectAllInCategory(cat)}
                      style={{
                        fontSize: isZen ? 11 : 9,
                        color: theme.textMuted,
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontFamily: theme.fontFamily,
                        textTransform: theme.textTransform,
                      }}
                    >
                      {allSelected ? (isZen ? "None" : "[CLR]") : (isZen ? "All" : "[ALL]")}
                    </button>
                  </div>

                  {/* Goals */}
                  {isExpanded && (
                    <div style={{ padding: "4px 12px 8px" }}>
                      {cat === "dirty_dog" && (
                        <p style={{ fontSize: isZen ? 11 : 8, color: theme.textFaint, fontStyle: "italic", marginBottom: 6, paddingLeft: 24, fontFamily: theme.fontFamily }}>
                          {isZen ? "Intimate outcomes. Opt in if relevant." : "CLASSIFIED // OPT-IN ONLY"}
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
                              gap: 10,
                              padding: "6px 8px",
                              borderRadius: isZen ? 6 : 2,
                              background: isSelected ? pathColor + "06" : "transparent",
                              border: "none",
                              cursor: "pointer",
                              textAlign: "left",
                              transition: "all 0.15s",
                              fontFamily: theme.fontFamily,
                            }}
                          >
                            <div
                              style={{
                                width: 15,
                                height: 15,
                                borderRadius: isZen ? 3 : 1,
                                border: `1.5px solid ${isSelected ? pathColor : theme.textFaint}`,
                                background: isSelected ? pathColor : "transparent",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                transition: "all 0.15s",
                              }}
                            >
                              {isSelected && <Check size={9} style={{ color: isZen ? "#fff" : "#000" }} />}
                            </div>
                            <span
                              style={{
                                flex: 1,
                                fontSize: isZen ? 13 : 10,
                                color: isSelected ? theme.text : theme.textMuted,
                                textTransform: theme.textTransform,
                                letterSpacing: theme.letterSpacing,
                              }}
                            >
                              {goal.title}
                            </span>
                            <span
                              style={{
                                fontSize: isZen ? 10 : 8,
                                color: theme.textFaint,
                                flexShrink: 0,
                                textTransform: theme.textTransform,
                                fontFamily: theme.fontFamily,
                              }}
                            >
                              {isRamp ? theme.vocab.habit : theme.vocab.milestone}
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
            <span style={{ fontWeight: 700, color: theme.text }}>{totalSelected}</span>
            {" "}{isZen ? "objectives selected" : "OBJ_SELECTED"}
            <span style={{ fontSize: isZen ? 11 : 8, marginLeft: 8, color: theme.textFaint }}>
              (1 {isZen ? "vision" : "PRIMARY"} + {selectedL2Ids.size} {isZen ? "achievements" : "L2"} + {selectedL3Ids.size} {isZen ? "trackable" : "L3"})
            </span>
          </div>
          <button
            onClick={handleConfirm}
            disabled={selectedL3Ids.size === 0}
            style={{
              padding: "10px 24px",
              borderRadius: theme.borderRadius,
              background: selectedL3Ids.size === 0 ? theme.textFaint : pathColor,
              color: isZen ? "#fff" : "#000",
              border: "none",
              cursor: selectedL3Ids.size === 0 ? "not-allowed" : "pointer",
              fontSize: isZen ? 13 : 10,
              fontWeight: 800,
              fontFamily: theme.fontFamily,
              textTransform: theme.textTransform,
              letterSpacing: theme.letterSpacing,
              transition: "all 0.2s",
              opacity: selectedL3Ids.size === 0 ? 0.5 : 1,
              boxShadow: selectedL3Ids.size > 0 && !isZen ? `0 0 12px ${pathColor}40` : "none",
            }}
          >
            {isZen ? "Customize & Refine" : "PROCEED_TO_CALIBRATION"} <ChevronRight size={14} style={{ display: "inline", verticalAlign: "middle" }} />
          </button>
        </div>
      )}
    </div>
  )
}
