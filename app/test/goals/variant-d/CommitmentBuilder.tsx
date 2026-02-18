"use client"

import { useState, useMemo } from "react"
import { ArrowLeft, Calendar, ChevronDown, ChevronRight, Milestone, Repeat, Star, Trophy, Target, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar as CalendarWidget } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format, parse, isValid, startOfDay } from "date-fns"
import type { GoalTemplate, GoalDisplayCategory } from "@/src/goals/types"

const CATEGORY_LABELS: Record<GoalDisplayCategory, string> = {
  field_work: "Field Work",
  results: "Results",
  dirty_dog: "Dirty Dog",
  texting: "Texting Game",
  dates: "Dating",
  relationship: "Relationship",
}

interface GoalCustomization {
  templateId: string
  title: string
  enabled: boolean
  targetValue: number
  level: number
}

interface CommitmentBuilderProps {
  selectedL1: GoalTemplate
  selectedL2s: GoalTemplate[]
  selectedL3s: GoalTemplate[]
  pathColor: string
  onBack: () => void
  onConfirm: (goals: GoalCustomization[], targetDate: Date | null) => void
}

export function CommitmentBuilder({
  selectedL1,
  selectedL2s,
  selectedL3s,
  pathColor,
  onBack,
  onConfirm,
}: CommitmentBuilderProps) {
  const [targetDate, setTargetDate] = useState<Date | null>(null)
  const [dateText, setDateText] = useState("")
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["achievements", "field_work", "results"]))

  // Build customization state
  const [customizations, setCustomizations] = useState<Map<string, GoalCustomization>>(() => {
    const map = new Map<string, GoalCustomization>()

    // L1
    map.set(selectedL1.id, {
      templateId: selectedL1.id,
      title: selectedL1.title,
      enabled: true,
      targetValue: 1,
      level: 1,
    })

    // L2s
    for (const l2 of selectedL2s) {
      map.set(l2.id, {
        templateId: l2.id,
        title: l2.title,
        enabled: true,
        targetValue: 1,
        level: 2,
      })
    }

    // L3s
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
          <ArrowLeft className="size-4" />
          Back to selection
        </button>
      </div>

      <div>
        <h2 className="text-xl font-bold">Customize your goals</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Fine-tune targets, toggle goals on/off, and set a timeline. Everything below is adjustable later.
        </p>
      </div>

      {/* Vision goal card */}
      <div
        className="rounded-xl border-2 p-5"
        style={{ borderColor: `${pathColor}40`, backgroundColor: `${pathColor}05` }}
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg p-2" style={{ backgroundColor: `${pathColor}15` }}>
            <Star className="size-5" style={{ color: pathColor }} />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: pathColor }}>Your vision</div>
            <h3 className="text-lg font-bold">{selectedL1.title}</h3>
          </div>
        </div>

        {/* Target date */}
        <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${pathColor}20` }}>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Calendar className="size-4" />
            <span>Achieve by (optional)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Input
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
                className="w-36"
              />
            </div>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <button className="text-primary cursor-pointer" aria-label="Open calendar">
                  <Calendar className="size-4" />
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
                className="text-muted-foreground cursor-pointer"
                aria-label="Clear date"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Achievements section */}
      <CollapsibleSection
        title="Achievements"
        icon={<Trophy className="size-4 text-amber-500" />}
        count={selectedL2s.filter((l2) => customizations.get(l2.id)?.enabled).length}
        total={selectedL2s.length}
        isExpanded={expandedSections.has("achievements")}
        onToggle={() => toggleSection("achievements")}
      >
        <div className="space-y-1.5">
          {selectedL2s.map((l2) => {
            const cust = customizations.get(l2.id)
            if (!cust) return null
            return (
              <div key={l2.id} className="flex items-center gap-3 rounded-lg border border-border/50 p-3">
                <button
                  onClick={() => toggleGoal(l2.id)}
                  className={`
                    relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 cursor-pointer
                  `}
                  style={{ background: cust.enabled ? pathColor : "var(--muted)" }}
                  role="switch"
                  aria-checked={cust.enabled}
                >
                  <span className={`inline-block size-3.5 rounded-full bg-white transition-transform shadow-sm ${cust.enabled ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
                </button>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-medium ${cust.enabled ? "" : "text-muted-foreground line-through"}`}>
                    {l2.title}
                  </span>
                </div>
                <Trophy className="size-3.5 text-muted-foreground/30 flex-shrink-0" />
              </div>
            )
          })}
        </div>
      </CollapsibleSection>

      {/* L3 goals by category */}
      {(Object.entries(l3ByCategory) as [GoalDisplayCategory, GoalTemplate[]][]).map(([cat, goals]) => {
        if (!goals || goals.length === 0) return null
        const enabledInCat = goals.filter((g) => customizations.get(g.id)?.enabled).length
        const isDirtyDog = cat === "dirty_dog"

        return (
          <CollapsibleSection
            key={cat}
            title={CATEGORY_LABELS[cat]}
            icon={<Target className="size-4 text-muted-foreground/60" />}
            count={enabledInCat}
            total={goals.length}
            isExpanded={expandedSections.has(cat)}
            onToggle={() => toggleSection(cat)}
            subtitle={isDirtyDog ? "Intimate outcomes - opt in if relevant" : undefined}
          >
            <div className="space-y-2">
              {goals.map((goal) => {
                const cust = customizations.get(goal.id)
                if (!cust) return null
                const isRamp = goal.templateType === "habit_ramp"
                return (
                  <div
                    key={goal.id}
                    className={`rounded-lg border p-3 transition-colors ${cust.enabled ? "border-border/50" : "border-border/30 opacity-60"}`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleGoal(goal.id)}
                        className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 cursor-pointer"
                        style={{ background: cust.enabled ? pathColor : "var(--muted)" }}
                        role="switch"
                        aria-checked={cust.enabled}
                      >
                        <span className={`inline-block size-3.5 rounded-full bg-white transition-transform shadow-sm ${cust.enabled ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${cust.enabled ? "" : "line-through text-muted-foreground"}`}>
                            {goal.title}
                          </span>
                          <span className="text-[10px] text-muted-foreground/50 flex-shrink-0 flex items-center gap-1">
                            {isRamp ? <Repeat className="size-3" /> : <Milestone className="size-3" />}
                            {isRamp ? "habit" : "milestone"}
                          </span>
                        </div>
                      </div>
                      {cust.enabled && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-xs text-muted-foreground">Target:</span>
                          <input
                            type="number"
                            value={cust.targetValue}
                            onChange={(e) => {
                              const v = parseInt(e.target.value, 10)
                              if (!isNaN(v) && v > 0) updateTarget(goal.id, v)
                            }}
                            className="w-16 text-right text-sm font-medium rounded px-1.5 py-0.5 focus:outline-none bg-muted/50 border border-border"
                            min={1}
                          />
                          {isRamp && <span className="text-xs text-muted-foreground">/wk</span>}
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

      {/* Confirm footer */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border/50 -mx-6 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{enabledCount}</span> goals ready
            {targetDate && (
              <span className="ml-2 text-xs">
                Target: {format(targetDate, "MMM d, yyyy")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onBack}>Back</Button>
            <Button onClick={handleConfirm} style={{ backgroundColor: pathColor }}>
              Create My Goals
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Collapsible section helper
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
  return (
    <div>
      <button
        onClick={onToggle}
        className="flex items-center gap-2 w-full text-left mb-2 cursor-pointer group"
      >
        {isExpanded ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
        {icon}
        <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</span>
        <span className="text-xs text-muted-foreground/60">{count}/{total}</span>
        <div className="flex-1 border-t border-border/30 ml-2" />
      </button>
      {subtitle && isExpanded && (
        <p className="text-xs text-muted-foreground/60 italic mb-2 ml-6">{subtitle}</p>
      )}
      {isExpanded && children}
    </div>
  )
}
