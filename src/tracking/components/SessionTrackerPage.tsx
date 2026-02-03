"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "../hooks/useSession"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Play,
  Square,
  Plus,
  Target,
  Clock,
  TrendingUp,
  MapPin,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
} from "lucide-react"
import { OUTCOME_OPTIONS, MOOD_OPTIONS, APPROACH_TAGS, DEFAULT_SESSION_SUGGESTIONS } from "../config"
import type { ApproachFormData } from "../types"
import Link from "next/link"

// Combobox input component with dropdown suggestions
interface ComboboxInputProps {
  id: string
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  placeholder: string
}

function ComboboxInput({ id, value, onChange, suggestions, placeholder }: ComboboxInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filteredSuggestions = suggestions.filter(
    s => s.toLowerCase().includes(value.toLowerCase())
  )

  const showDropdown = (isOpen || inputFocused) && filteredSuggestions.length > 0

  return (
    <div ref={containerRef} className="relative">
      <div className="flex gap-2">
        <Input
          id={id}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setTimeout(() => setInputFocused(false), 150)}
          className="flex-1"
        />
        {suggestions.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
            className="shrink-0"
          >
            <ChevronDown className={`size-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </Button>
        )}
      </div>
      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
              onClick={() => {
                onChange(suggestion)
                setIsOpen(false)
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}


interface SessionTrackerPageProps {
  userId: string
}

export function SessionTrackerPage({ userId }: SessionTrackerPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const {
    state,
    liveStats,
    endedSession,
    startSession,
    endSession,
    addApproach,
    updateLastApproach,
    reactivateSession,
    clearEndedSession,
  } = useSession({ userId })

  const [showStartDialog, setShowStartDialog] = useState(false)
  const [showEndDialog, setShowEndDialog] = useState(false)
  const [showQuickLog, setShowQuickLog] = useState(false)
  const [showStats, setShowStats] = useState(true)
  const [goalInput, setGoalInput] = useState("")
  const [selectedGoalPreset, setSelectedGoalPreset] = useState<number | null>(null)
  const [locationInput, setLocationInput] = useState("")
  const [preMood, setPreMood] = useState<number | null>(null)
  const [quickLogData, setQuickLogData] = useState<ApproachFormData>({})
  // Pre-session intention prompts
  const [sessionFocus, setSessionFocus] = useState("")
  const [techniqueFocus, setTechniqueFocus] = useState("")
  const [ifThenPlan, setIfThenPlan] = useState("")
  const [customIntention, setCustomIntention] = useState("")

  // Suggestions from previous sessions merged with defaults
  const [suggestions, setSuggestions] = useState<{
    sessionFocus: string[]
    techniqueFocus: string[]
    locations: string[]
  }>(DEFAULT_SESSION_SUGGESTIONS)

  // Fetch user's previous values and merge with defaults
  useEffect(() => {
    async function fetchSuggestions() {
      try {
        const response = await fetch("/api/tracking/session/suggestions")
        if (response.ok) {
          const data = await response.json()
          // Merge: user's previous values first, then defaults that aren't already included
          const mergeWithDefaults = (userValues: string[], defaults: string[]) => {
            const combined = [...userValues]
            for (const def of defaults) {
              if (!combined.some(v => v.toLowerCase() === def.toLowerCase())) {
                combined.push(def)
              }
            }
            return combined.slice(0, 15) // Limit total suggestions
          }
          setSuggestions({
            sessionFocus: mergeWithDefaults(data.sessionFocus || [], DEFAULT_SESSION_SUGGESTIONS.sessionFocus),
            techniqueFocus: mergeWithDefaults(data.techniqueFocus || [], DEFAULT_SESSION_SUGGESTIONS.techniqueFocus),
            locations: mergeWithDefaults(data.locations || [], DEFAULT_SESSION_SUGGESTIONS.locations),
          })
        }
      } catch (error) {
        console.error("Failed to fetch suggestions:", error)
        // Keep defaults on error
      }
    }
    fetchSuggestions()
  }, [])

  const GOAL_PRESETS = [
    { value: 1, emoji: "👋", label: "1" },
    { value: 3, emoji: "🎯", label: "3" },
    { value: 5, emoji: "💪", label: "5" },
    { value: 10, emoji: "🔥", label: "10" },
  ] as const

  // Auto-open dialog when coming from reports page with autostart=true
  useEffect(() => {
    if (searchParams.get("autostart") === "true" && !state.isActive && !state.isLoading) {
      setShowStartDialog(true)
      // Clean up the URL
      router.replace("/dashboard/tracking/session", { scroll: false })
    }
  }, [searchParams, state.isActive, state.isLoading, router])

  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  const handleStartSession = async () => {
    const goal = goalInput ? parseInt(goalInput, 10) : undefined
    const success = await startSession({
      goal,
      location: locationInput || undefined,
      sessionFocus: sessionFocus || undefined,
      techniqueFocus: techniqueFocus || undefined,
      ifThenPlan: ifThenPlan || undefined,
      customIntention: customIntention || undefined,
      preMood: preMood || undefined,
    })
    if (success) {
      setShowStartDialog(false)
      setGoalInput("")
      setSelectedGoalPreset(null)
      setLocationInput("")
      setPreMood(null)
      setSessionFocus("")
      setTechniqueFocus("")
      setIfThenPlan("")
      setCustomIntention("")
    }
    // If failed, keep dialog open so user sees error
  }

  const handleEndSession = async () => {
    // Navigate first to avoid flash of "Start Session" screen
    router.push("/dashboard/tracking")
    setShowEndDialog(false)
    await endSession()
  }

  const handleTap = async () => {
    await addApproach()
    setShowQuickLog(true)
    setQuickLogData({})
  }

  const handleQuickLogSubmit = async () => {
    if (Object.keys(quickLogData).length > 0) {
      await updateLastApproach(quickLogData)
    }
    setShowQuickLog(false)
    setQuickLogData({})
  }

  const handleQuickLogSkip = () => {
    setShowQuickLog(false)
    setQuickLogData({})
  }

  // Not in session - show start screen
  if (!state.isActive) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-4">Session Tracker</h1>
          <p className="text-muted-foreground max-w-md">
            Track your approaches in real-time. Set a goal, hit the streets, and watch your progress.
          </p>
        </div>

        <Button
          size="lg"
          className="h-20 px-12 text-xl gap-3"
          onClick={() => setShowStartDialog(true)}
          data-testid="start-session-button"
        >
          <Play className="size-6" />
          Start Session
        </Button>

        {/* Start Session Dialog */}
        <Dialog open={showStartDialog} onOpenChange={(open) => {
          setShowStartDialog(open)
          if (!open) {
            setGoalInput("")
            setSelectedGoalPreset(null)
            setLocationInput("")
            setPreMood(null)
            setSessionFocus("")
            setTechniqueFocus("")
            setIfThenPlan("")
            setCustomIntention("")
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start a Session</DialogTitle>
              <DialogDescription>
                Set an optional goal to keep yourself motivated.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {state.error && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {state.error}
                </div>
              )}

              <div className="space-y-3">
                <Label>Goal (optional)</Label>
                <div className="flex flex-wrap gap-2">
                  {GOAL_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => {
                        setSelectedGoalPreset(preset.value)
                        setGoalInput(String(preset.value))
                      }}
                      className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                        selectedGoalPreset === preset.value
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <span className="text-xl">{preset.emoji}</span>
                      <span className="font-semibold">{preset.label}</span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Target className="size-4 text-muted-foreground" />
                  <Input
                    id="goal"
                    type="number"
                    min="1"
                    max="100"
                    placeholder="Or enter custom goal..."
                    value={goalInput}
                    onChange={(e) => {
                      setGoalInput(e.target.value)
                      setSelectedGoalPreset(null)
                    }}
                    data-testid="session-goal-input"
                  />
                </div>
              </div>

              {/* Pre-session mood */}
              <div className="space-y-3">
                <Label>How are you feeling? (optional)</Label>
                <div className="flex gap-2">
                  {MOOD_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPreMood(preMood === option.value ? null : option.value)}
                      className={`flex-1 py-3 rounded-lg border-2 transition-all text-2xl ${
                        preMood === option.value
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                      title={option.label}
                    >
                      {option.emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location (optional)</Label>
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-muted-foreground shrink-0" />
                  <ComboboxInput
                    id="location"
                    placeholder="e.g., Downtown, Mall, Park"
                    value={locationInput}
                    onChange={setLocationInput}
                    suggestions={suggestions.locations}
                  />
                </div>
              </div>

              {/* Pre-session intentions section */}
              <div className="pt-4 border-t border-border space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-1">Set Your Intentions</h4>
                  <p className="text-xs text-muted-foreground">Optional prompts to focus your session</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sessionFocus">What&apos;s your focus?</Label>
                  <ComboboxInput
                    id="sessionFocus"
                    placeholder="e.g., Be more playful, Hold eye contact longer"
                    value={sessionFocus}
                    onChange={setSessionFocus}
                    suggestions={suggestions.sessionFocus}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="techniqueFocus">Technique to practice</Label>
                  <ComboboxInput
                    id="techniqueFocus"
                    placeholder="e.g., Cold reads, Push-pull, Assumption stacking"
                    value={techniqueFocus}
                    onChange={setTechniqueFocus}
                    suggestions={suggestions.techniqueFocus}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ifThenPlan">If-Then plan</Label>
                  <Input
                    id="ifThenPlan"
                    placeholder="e.g., If she seems distracted, I will use a cold read"
                    value={ifThenPlan}
                    onChange={(e) => setIfThenPlan(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customIntention">Any other intention</Label>
                  <Input
                    id="customIntention"
                    placeholder="Your own focus or reminder..."
                    value={customIntention}
                    onChange={(e) => setCustomIntention(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowStartDialog(false)
                  setGoalInput("")
                  setSelectedGoalPreset(null)
                  setLocationInput("")
                  setPreMood(null)
                  setSessionFocus("")
                  setTechniqueFocus("")
                  setIfThenPlan("")
                  setCustomIntention("")
                }}
                disabled={state.isLoading}
              >
                Cancel
              </Button>
              <Button data-testid="start-session-confirm" onClick={handleStartSession} disabled={state.isLoading}>
                {state.isLoading ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <Play className="size-4 mr-2" />
                )}
                {state.isLoading ? "Starting..." : "Start"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // Active session view
  return (
    <div className="min-h-screen pb-32">
      {/* Header with session info */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="size-4" />
              <span className="font-mono" data-testid="session-duration">{liveStats.sessionDuration}</span>
            </div>
            {state.session?.primary_location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <MapPin className="size-4" />
                <span>{state.session.primary_location}</span>
              </div>
            )}
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowEndDialog(true)}
            data-testid="end-session-button"
          >
            <Square className="size-4 mr-2" />
            End
          </Button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Main Counter */}
        <Card className="p-8">
          <div className="text-center">
            <div data-testid="approach-counter" className="text-7xl font-bold mb-2">{liveStats.totalApproaches}</div>
            <div className="text-muted-foreground">approaches</div>

            {/* Goal Progress */}
            {liveStats.goalProgress.target && (
              <div className="mt-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Goal Progress</span>
                  <span className="font-medium">
                    {liveStats.goalProgress.current} / {liveStats.goalProgress.target}
                  </span>
                </div>
                <div className="h-3 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      liveStats.goalProgress.percentage >= 100
                        ? "bg-green-500"
                        : "bg-primary"
                    }`}
                    style={{ width: `${Math.min(100, liveStats.goalProgress.percentage)}%` }}
                  />
                </div>
                {liveStats.goalProgress.percentage >= 100 && (
                  <div className="mt-2 text-green-500 font-medium text-sm">
                    Goal achieved! Keep going!
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Big Tap Button */}
        <button
          onClick={handleTap}
          className="w-full h-32 rounded-2xl bg-primary hover:bg-primary/90 active:scale-95 transition-all duration-150 flex items-center justify-center text-primary-foreground shadow-lg"
          data-testid="tap-approach-button"
        >
          <div className="flex items-center gap-3">
            <Plus className="size-10" />
            <span className="text-2xl font-bold">TAP FOR APPROACH</span>
          </div>
        </button>

        {/* Collapsible Stats */}
        <Card>
          <button
            onClick={() => setShowStats(!showStats)}
            className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
          >
            <span className="font-medium">Live Stats</span>
            {showStats ? (
              <ChevronUp className="size-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-5 text-muted-foreground" />
            )}
          </button>

          {showStats && (
            <div className="px-4 pb-4 space-y-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <TrendingUp className="size-4" />
                    <span>Per Hour</span>
                  </div>
                  <div className="text-2xl font-bold">{liveStats.approachesPerHour}</div>
                </div>

                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Clock className="size-4" />
                    <span>Since Last</span>
                  </div>
                  <div className="text-2xl font-bold font-mono">
                    {liveStats.timeSinceLastApproach || "--:--"}
                  </div>
                </div>
              </div>

              {/* Outcome Breakdown */}
              {liveStats.totalApproaches > 0 && (
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Outcomes</div>
                  <div className="flex flex-wrap gap-2">
                    {OUTCOME_OPTIONS.map((option) => {
                      const count = liveStats.outcomeBreakdown[option.value]
                      if (count === 0) return null
                      return (
                        <Badge key={option.value} variant="secondary" className="text-sm">
                          {option.emoji} {count}
                        </Badge>
                      )
                    })}
                    {Object.values(liveStats.outcomeBreakdown).every((v) => v === 0) && (
                      <span className="text-sm text-muted-foreground">
                        No outcomes logged yet
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Recent Approaches */}
        {state.approaches.length > 0 && (
          <Card className="p-4">
            <div className="text-sm font-medium mb-3">Recent Approaches</div>
            <div className="space-y-2">
              {state.approaches
                .slice(-5)
                .reverse()
                .map((approach, index) => (
                  <div
                    key={approach.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-muted-foreground">
                        #{state.approaches.length - index}
                      </span>
                      <span className="text-sm">
                        {new Date(approach.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {approach.mood && (
                        <span>{MOOD_OPTIONS.find((m) => m.value === approach.mood)?.emoji}</span>
                      )}
                      {approach.outcome && (
                        <Badge
                          variant="outline"
                          className={
                            OUTCOME_OPTIONS.find((o) => o.value === approach.outcome)?.color
                          }
                        >
                          {OUTCOME_OPTIONS.find((o) => o.value === approach.outcome)?.label}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        )}
      </div>

      {/* Quick Log Bottom Sheet */}
      {showQuickLog && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" data-testid="quick-log-modal">
          <div className="fixed inset-x-0 bottom-0 z-50 bg-background border-t rounded-t-xl p-4 animate-in slide-in-from-bottom">
            <div className="max-w-lg mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Quick Log</h3>
                <Button variant="ghost" size="sm" onClick={handleQuickLogSkip} data-testid="quick-log-dismiss">
                  Skip
                </Button>
              </div>

              {/* Outcome Selection */}
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Outcome</Label>
                <div className="flex flex-wrap gap-2">
                  {OUTCOME_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() =>
                        setQuickLogData((prev) => ({
                          ...prev,
                          outcome: prev.outcome === option.value ? undefined : option.value,
                        }))
                      }
                      className={`px-4 py-2 rounded-lg border transition-colors ${
                        quickLogData.outcome === option.value
                          ? option.color
                          : "border-border hover:border-primary/50"
                      }`}
                      data-testid={`outcome-${option.value}`}
                    >
                      {option.emoji} {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mood Selection */}
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Your Mood</Label>
                <div className="flex gap-2">
                  {MOOD_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() =>
                        setQuickLogData((prev) => ({
                          ...prev,
                          mood: prev.mood === option.value ? undefined : option.value,
                        }))
                      }
                      className={`flex-1 py-3 rounded-lg border transition-colors text-2xl ${
                        quickLogData.mood === option.value
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                      title={option.label}
                      data-testid={`mood-${option.value}`}
                    >
                      {option.emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Tags */}
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.values(APPROACH_TAGS)
                    .flat()
                    .map((tag) => (
                      <button
                        key={tag}
                        onClick={() => {
                          const currentTags = quickLogData.tags || []
                          const newTags = currentTags.includes(tag)
                            ? currentTags.filter((t) => t !== tag)
                            : [...currentTags, tag]
                          setQuickLogData((prev) => ({ ...prev, tags: newTags }))
                        }}
                        className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                          quickLogData.tags?.includes(tag)
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50"
                        }`}
                        data-testid={`tag-${tag.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {tag}
                      </button>
                    ))}
                </div>
              </div>

              <Button className="w-full" onClick={handleQuickLogSubmit} data-testid="quick-log-save">
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* End Session Dialog */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Session?</DialogTitle>
            <DialogDescription>
              You&apos;ve logged {liveStats.totalApproaches} approaches in {liveStats.sessionDuration}.
              {liveStats.goalProgress.target && liveStats.goalProgress.percentage >= 100 && (
                <span className="block mt-2 text-green-500">
                  You hit your goal!
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowEndDialog(false)}>
              Keep Going
            </Button>
            <Link href={`/dashboard/tracking/report?session=${state.session?.id}`}>
              <Button variant="secondary" className="w-full sm:w-auto">
                <FileText className="size-4 mr-2" />
                Write Field Report
              </Button>
            </Link>
            <Button variant="destructive" onClick={handleEndSession}>
              End Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
