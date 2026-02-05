"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, Target, Brain, Lightbulb, MessageSquare, Users, Mic } from "lucide-react"
import { MOOD_OPTIONS } from "../config"
import {
  getMoodEmoji,
  hasSessionContext as checkHasSessionContext,
  getDefaultExpanded,
} from "../sessionImportHelpers"
import type { SessionSummaryData } from "../types"

interface SessionImportSectionProps {
  sessionData: SessionSummaryData | null
  postSessionMood: number | null
  onPostSessionMoodChange: (mood: number | null) => void
}

export function SessionImportSection({
  sessionData,
  postSessionMood,
  onPostSessionMoodChange,
}: SessionImportSectionProps) {
  const [isExpanded, setIsExpanded] = useState(getDefaultExpanded(sessionData))

  const hasSessionContext = checkHasSessionContext(sessionData)

  return (
    <div className="space-y-4 mb-6">
      {/* Session Context - Collapsible (only shown if session has data) */}
      {hasSessionContext && (
        <div data-testid="session-context-section" className="rounded-xl border border-border/50 overflow-hidden">
          {/* Collapsible Header */}
          <button
            type="button"
            data-testid="session-context-toggle"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Target className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">Session Context</span>
              {!isExpanded && sessionData && (
                <Badge variant="secondary" className="ml-2">
                  {sessionData.approachCount} approaches
                </Badge>
              )}
            </div>
            <ChevronDown
              className={cn(
                "size-4 text-muted-foreground transition-transform duration-200",
                isExpanded && "rotate-180"
              )}
            />
          </button>

          {/* Collapsible Content */}
          {isExpanded && sessionData && (
            <div className="p-4 space-y-4 border-t border-border/50">
              {/* Approach Count - Prominent display */}
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="size-3 text-primary" />
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Approaches:</span>
                  <span className="ml-2 font-semibold text-primary">{sessionData.approachCount}</span>
                  {sessionData.goal !== null && (
                    <span className="text-muted-foreground ml-1">/ {sessionData.goal} goal</span>
                  )}
                </div>
              </div>

              {/* Pre-session Intentions */}
              <div className="space-y-3">
                {/* Goal - only show separately if no approach count context */}
                {sessionData.goal !== null && sessionData.approachCount === 0 && (
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Target className="size-3 text-primary" />
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Goal:</span>
                      <span className="ml-2 font-medium">{sessionData.goal} approaches</span>
                    </div>
                  </div>
                )}

                {/* Pre-session Mood */}
                {sessionData.preSessionMood !== null && (
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                      <span className="text-sm">{getMoodEmoji(sessionData.preSessionMood)}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Starting mood:</span>
                      <span className="ml-2 font-medium">
                        {MOOD_OPTIONS.find(m => m.value === sessionData.preSessionMood)?.label || "Unknown"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Session Focus */}
                {sessionData.sessionFocus && (
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Brain className="size-3 text-blue-500" />
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Focus:</span>
                      <span className="ml-2">{sessionData.sessionFocus}</span>
                    </div>
                  </div>
                )}

                {/* Technique Focus */}
                {sessionData.techniqueFocus && (
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Lightbulb className="size-3 text-purple-500" />
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Technique:</span>
                      <span className="ml-2">{sessionData.techniqueFocus}</span>
                    </div>
                  </div>
                )}

                {/* If-Then Plan */}
                {sessionData.ifThenPlan && (
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <MessageSquare className="size-3 text-green-500" />
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">If-Then:</span>
                      <span className="ml-2">{sessionData.ifThenPlan}</span>
                    </div>
                  </div>
                )}

                {/* Custom Intention */}
                {sessionData.customIntention && (
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-slate-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs">💭</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Note:</span>
                      <span className="ml-2">{sessionData.customIntention}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Mood Timeline */}
              {sessionData.approachMoods.length > 0 && (
                <div data-testid="mood-timeline" className="pt-3 border-t border-border/30">
                  <p className="text-xs text-muted-foreground mb-3">Mood timeline</p>
                  <div className="overflow-x-auto pb-1">
                    <div className="flex gap-3 min-w-max">
                      {sessionData.approachMoods.map(({ approachNumber, mood }) => (
                        <div
                          key={approachNumber}
                          className="flex flex-col items-center gap-1"
                        >
                          <span className="text-xs text-muted-foreground">
                            #{approachNumber}
                          </span>
                          <span className="text-xl">
                            {getMoodEmoji(mood)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Approach Notes */}
              {sessionData.approachNotes.length > 0 && (
                <div data-testid="approach-notes" className="pt-3 border-t border-border/30 space-y-2">
                  <p className="text-xs text-muted-foreground mb-2">Approach notes</p>
                  {sessionData.approachNotes.map(({ approachNumber, note }) => (
                    <div
                      key={approachNumber}
                      className="rounded-lg bg-muted/40 border border-border/30 p-3"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Mic className="size-3 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">
                          Approach #{approachNumber}
                        </span>
                      </div>
                      <p className="text-sm">{note}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Current Mood Picker - Always visible */}
      <div data-testid="post-session-mood-picker" className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
        <label className="text-sm font-medium text-foreground block mb-3">
          How are you feeling now?
        </label>
        <div className="flex gap-2 sm:gap-3">
          {MOOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              data-testid={`post-session-mood-${option.value}`}
              onClick={() => onPostSessionMoodChange(
                postSessionMood === option.value ? null : option.value
              )}
              className={cn(
                "text-2xl sm:text-3xl p-2 sm:p-3 rounded-xl transition-all duration-200 hover:scale-110",
                postSessionMood === option.value
                  ? "bg-primary/20 ring-2 ring-primary ring-offset-2 ring-offset-background scale-110 shadow-lg"
                  : "bg-background/50 hover:bg-background opacity-60 hover:opacity-100"
              )}
              title={option.label}
            >
              {option.emoji}
            </button>
          ))}
        </div>
        {postSessionMood !== null && (
          <p data-testid="post-session-mood-label" className="text-xs text-muted-foreground mt-2">
            {MOOD_OPTIONS.find(m => m.value === postSessionMood)?.label}
          </p>
        )}
      </div>
    </div>
  )
}
