"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ArrowLeft,
  Clock,
  MapPin,
  Target,
  Play,
  FileText,
  Pencil,
  Plus,
  Check,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  Save,
  AlertCircle,
} from "lucide-react"
import Link from "next/link"
import type { SessionWithApproaches, ApproachRow } from "@/src/db/trackingTypes"
import type { ApproachFormData } from "../types"
import { OUTCOME_OPTIONS, MOOD_OPTIONS, APPROACH_TAGS } from "../config"

interface SessionDetailPageProps {
  userId: string
  sessionId: string
}

export function SessionDetailPage({ userId, sessionId }: SessionDetailPageProps) {
  const router = useRouter()

  // Core data
  const [session, setSession] = useState<SessionWithApproaches | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Session metadata editing
  const [isEditingMetadata, setIsEditingMetadata] = useState(false)
  const [editLocation, setEditLocation] = useState("")
  const [editGoal, setEditGoal] = useState("")
  const [isSavingMetadata, setIsSavingMetadata] = useState(false)
  const [metadataError, setMetadataError] = useState<string | null>(null)

  // Approach editing
  const [editingApproachId, setEditingApproachId] = useState<string | null>(null)
  const [editApproachData, setEditApproachData] = useState<ApproachFormData>({})
  const [isSavingApproach, setIsSavingApproach] = useState(false)

  // Add missed approach
  const [isAddingApproach, setIsAddingApproach] = useState(false)
  const [newApproachData, setNewApproachData] = useState<ApproachFormData>({})
  const [newApproachTimestamp, setNewApproachTimestamp] = useState("")
  const [isSavingNewApproach, setIsSavingNewApproach] = useState(false)

  // Reactivation
  const [isReactivating, setIsReactivating] = useState(false)
  const [reactivateError, setReactivateError] = useState<string | null>(null)

  // Load session data
  useEffect(() => {
    loadSession()
  }, [sessionId])

  const loadSession = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch(`/api/tracking/session/${sessionId}`)
      if (!response.ok) {
        if (response.status === 404) {
          setError("Session not found")
        } else if (response.status === 403) {
          setError("Access denied")
        } else {
          setError("Failed to load session")
        }
        return
      }
      const data: SessionWithApproaches = await response.json()
      setSession(data)
    } catch {
      setError("Failed to load session")
    } finally {
      setIsLoading(false)
    }
  }

  // Compute stats from session data
  const computeStats = () => {
    if (!session) return null
    const approaches = session.approaches || []
    const outcomes: Record<string, number> = {
      blowout: 0, short: 0, good: 0, number: 0, instadate: 0,
    }
    let moodSum = 0
    let moodCount = 0
    for (const a of approaches) {
      if (a.outcome) outcomes[a.outcome]++
      if (a.mood !== null) { moodSum += a.mood; moodCount++ }
    }
    return {
      totalApproaches: approaches.length,
      outcomes,
      averageMood: moodCount > 0 ? Math.round(moodSum / moodCount) : null,
    }
  }

  const stats = computeStats()

  // Format duration
  const formatDuration = (minutes: number | null) => {
    if (!minutes) return null
    if (minutes < 60) return `${minutes} min`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }

  // Session metadata editing
  const startEditingMetadata = () => {
    if (!session) return
    setEditLocation(session.primary_location || "")
    setEditGoal(session.goal !== null ? String(session.goal) : "")
    setMetadataError(null)
    setIsEditingMetadata(true)
  }

  const cancelEditingMetadata = () => {
    setIsEditingMetadata(false)
    setMetadataError(null)
  }

  const saveMetadata = async () => {
    if (!session) return
    setIsSavingMetadata(true)
    setMetadataError(null)
    try {
      const body: Record<string, unknown> = {}
      const newLocation = editLocation.trim() || null
      const newGoal = editGoal ? parseInt(editGoal, 10) : null

      if (newLocation !== session.primary_location) {
        body.primary_location = newLocation
      }
      if (newGoal !== session.goal) {
        body.goal = newGoal
      }

      if (Object.keys(body).length === 0) {
        setIsEditingMetadata(false)
        return
      }

      const response = await fetch(`/api/tracking/session/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || "Failed to save")
      }

      const updated = await response.json()
      setSession(prev => prev ? { ...prev, ...updated } : prev)
      setIsEditingMetadata(false)
    } catch (err) {
      setMetadataError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setIsSavingMetadata(false)
    }
  }

  // Approach editing
  const startEditingApproach = (approach: ApproachRow) => {
    setEditingApproachId(approach.id)
    setEditApproachData({
      outcome: approach.outcome || undefined,
      mood: approach.mood || undefined,
      tags: approach.tags || undefined,
      note: approach.note || undefined,
    })
  }

  const cancelEditingApproach = () => {
    setEditingApproachId(null)
    setEditApproachData({})
  }

  const saveApproach = async () => {
    if (!editingApproachId) return
    setIsSavingApproach(true)
    try {
      const response = await fetch(`/api/tracking/approach/${editingApproachId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editApproachData),
      })
      if (!response.ok) throw new Error("Failed to update approach")
      const updated: ApproachRow = await response.json()

      setSession(prev => {
        if (!prev) return prev
        return {
          ...prev,
          approaches: prev.approaches.map(a => a.id === updated.id ? updated : a),
        }
      })
      setEditingApproachId(null)
      setEditApproachData({})
    } catch {
      // Keep editing open on error
    } finally {
      setIsSavingApproach(false)
    }
  }

  // Add missed approach
  const saveNewApproach = async () => {
    if (!session) return
    setIsSavingNewApproach(true)
    try {
      const response = await fetch("/api/tracking/approach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: session.id,
          timestamp: newApproachTimestamp || undefined,
          ...newApproachData,
        }),
      })
      if (!response.ok) throw new Error("Failed to add approach")
      const created: ApproachRow = await response.json()

      setSession(prev => {
        if (!prev) return prev
        const approaches = [...prev.approaches, created].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )
        return { ...prev, approaches, total_approaches: approaches.length }
      })
      setIsAddingApproach(false)
      setNewApproachData({})
      setNewApproachTimestamp("")
    } catch {
      // Keep form open on error
    } finally {
      setIsSavingNewApproach(false)
    }
  }

  // Reactivate session
  const handleReactivate = async () => {
    setIsReactivating(true)
    setReactivateError(null)
    try {
      const response = await fetch(`/api/tracking/session/${sessionId}/reactivate`, {
        method: "POST",
      })
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || "Failed to reactivate session")
      }
      // Clear any ended session from sessionStorage so the session page picks it up cleanly
      sessionStorage.removeItem("daygame_ended_session")
      router.push("/dashboard/tracking/session")
    } catch (err) {
      setReactivateError(err instanceof Error ? err.message : "Failed to reactivate")
    } finally {
      setIsReactivating(false)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="h-4 w-32 bg-muted rounded animate-pulse mb-6" />
        <div className="h-8 w-64 bg-muted rounded animate-pulse mb-4" />
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-muted/30 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error || !session) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link
          href="/dashboard/tracking"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="size-4" />
          Back to Dashboard
        </Link>
        <Card className="p-8 text-center">
          <AlertCircle className="size-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-xl font-semibold mb-2">{error || "Session not found"}</h2>
          <p className="text-muted-foreground mb-4">
            {error === "Access denied"
              ? "You don't have permission to view this session."
              : "The session you're looking for doesn't exist or has been deleted."}
          </p>
          <Link href="/dashboard/tracking">
            <Button>Go to Dashboard</Button>
          </Link>
        </Card>
      </div>
    )
  }

  const approaches = session.approaches || []
  const sortedApproaches = [...approaches].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Back link */}
      <Link
        href="/dashboard/tracking"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="size-4" />
        Back to Dashboard
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Session Detail</h1>
        <p className="text-muted-foreground">
          {new Date(session.started_at).toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-primary">{stats?.totalApproaches ?? 0}</div>
          <div className="text-xs text-muted-foreground">Approaches</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold">
            {formatDuration(session.duration_minutes) || "--"}
          </div>
          <div className="text-xs text-muted-foreground">Duration</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold">
            {session.primary_location || "--"}
          </div>
          <div className="text-xs text-muted-foreground">Location</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold">
            {session.goal !== null ? (
              <span className={session.goal_met ? "text-green-500" : ""}>
                {stats?.totalApproaches ?? 0}/{session.goal}
              </span>
            ) : "--"}
          </div>
          <div className="text-xs text-muted-foreground">
            {session.goal !== null ? "Goal" : "No Goal"}
          </div>
        </Card>
      </div>

      {/* Outcome breakdown */}
      {stats && stats.totalApproaches > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {OUTCOME_OPTIONS.map(option => {
            const count = stats.outcomes[option.value] || 0
            if (count === 0) return null
            return (
              <Badge key={option.value} variant="secondary" className={option.color}>
                {option.emoji} {option.label}: {count}
              </Badge>
            )
          })}
          {stats.averageMood !== null && (
            <Badge variant="outline">
              Avg mood: {MOOD_OPTIONS.find(m => m.value === stats.averageMood)?.emoji || "?"} {stats.averageMood}/5
            </Badge>
          )}
        </div>
      )}

      {/* Session Metadata Card */}
      <Card className="p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Session Info</h2>
          {!isEditingMetadata ? (
            <Button variant="ghost" size="sm" onClick={startEditingMetadata} className="gap-1">
              <Pencil className="size-3" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={cancelEditingMetadata}
                disabled={isSavingMetadata}
              >
                <X className="size-3" />
              </Button>
              <Button
                size="sm"
                onClick={saveMetadata}
                disabled={isSavingMetadata}
                className="gap-1"
              >
                {isSavingMetadata ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                Save
              </Button>
            </div>
          )}
        </div>

        {metadataError && (
          <div className="p-2 rounded bg-destructive/10 text-destructive text-sm mb-3">
            {metadataError}
          </div>
        )}

        {isEditingMetadata ? (
          <div className="space-y-3">
            <div>
              <Label htmlFor="edit-location" className="text-sm">Location</Label>
              <div className="flex items-center gap-2 mt-1">
                <MapPin className="size-4 text-muted-foreground shrink-0" />
                <Input
                  id="edit-location"
                  value={editLocation}
                  onChange={e => setEditLocation(e.target.value)}
                  placeholder="e.g., Downtown, Mall, Park"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-goal" className="text-sm">Goal</Label>
              <div className="flex items-center gap-2 mt-1">
                <Target className="size-4 text-muted-foreground shrink-0" />
                <Input
                  id="edit-goal"
                  type="number"
                  min="1"
                  max="100"
                  value={editGoal}
                  onChange={e => setEditGoal(e.target.value)}
                  placeholder="No goal set"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-muted-foreground" />
              <span>{session.primary_location || "No location"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="size-4 text-muted-foreground" />
              <span>{session.goal !== null ? `Goal: ${session.goal}` : "No goal set"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              <span>
                {new Date(session.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                {session.ended_at && (
                  <> - {new Date(session.ended_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</>
                )}
              </span>
            </div>
            {session.session_focus && (
              <div className="text-muted-foreground">
                Focus: {session.session_focus}
              </div>
            )}
            {session.technique_focus && (
              <div className="text-muted-foreground">
                Technique: {session.technique_focus}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Approaches List */}
      <Card className="p-4 mb-6">
        <h2 className="font-semibold mb-3">
          Approaches ({sortedApproaches.length})
        </h2>

        {sortedApproaches.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4 text-center">
            No approaches logged for this session
          </p>
        ) : (
          <div className="space-y-2">
            {sortedApproaches.map((approach, index) => {
              const isEditing = editingApproachId === approach.id
              const outcomeOption = OUTCOME_OPTIONS.find(o => o.value === approach.outcome)
              const moodOption = MOOD_OPTIONS.find(m => m.value === approach.mood)

              return (
                <div key={approach.id} className="rounded-lg border bg-muted/20">
                  {/* Approach summary row */}
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => isEditing ? cancelEditingApproach() : startEditingApproach(approach)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-muted-foreground w-8">
                        #{index + 1}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(approach.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {outcomeOption && (
                        <Badge variant="outline" className={outcomeOption.color}>
                          {outcomeOption.emoji} {outcomeOption.label}
                        </Badge>
                      )}
                      {moodOption && (
                        <span title={moodOption.label}>{moodOption.emoji}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {approach.tags && approach.tags.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {approach.tags.length} tags
                        </span>
                      )}
                      {isEditing ? (
                        <ChevronUp className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="size-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Inline edit form */}
                  {isEditing && (
                    <div className="border-t p-3 space-y-4">
                      <ApproachForm
                        data={editApproachData}
                        onChange={setEditApproachData}
                      />

                      {/* Note */}
                      <div>
                        <Label className="text-sm text-muted-foreground mb-1 block">Note</Label>
                        <Input
                          value={editApproachData.note || ""}
                          onChange={e => setEditApproachData(prev => ({ ...prev, note: e.target.value || undefined }))}
                          placeholder="Add a note..."
                        />
                      </div>

                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="sm" onClick={cancelEditingApproach} disabled={isSavingApproach}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={saveApproach} disabled={isSavingApproach} className="gap-1">
                          {isSavingApproach ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                          Save
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Show note preview when not editing */}
                  {!isEditing && approach.note && (
                    <div className="border-t px-3 py-2">
                      <p className="text-sm text-muted-foreground truncate">{approach.note}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Add missed approach */}
        {!isAddingApproach ? (
          <Button
            variant="outline"
            className="w-full mt-3 gap-2"
            onClick={() => {
              setIsAddingApproach(true)
              setNewApproachData({})
              // Default timestamp to session midpoint or now
              const start = new Date(session.started_at)
              setNewApproachTimestamp(
                start.toISOString().slice(0, 16) // format for datetime-local input
              )
            }}
          >
            <Plus className="size-4" />
            Add Missed Approach
          </Button>
        ) : (
          <div className="mt-3 border rounded-lg p-3 space-y-4">
            <h3 className="font-medium text-sm">Add Missed Approach</h3>

            <div>
              <Label className="text-sm text-muted-foreground mb-1 block">Time</Label>
              <Input
                type="datetime-local"
                value={newApproachTimestamp}
                onChange={e => setNewApproachTimestamp(e.target.value)}
              />
            </div>

            <ApproachForm
              data={newApproachData}
              onChange={setNewApproachData}
            />

            {/* Note */}
            <div>
              <Label className="text-sm text-muted-foreground mb-1 block">Note</Label>
              <Input
                value={newApproachData.note || ""}
                onChange={e => setNewApproachData(prev => ({ ...prev, note: e.target.value || undefined }))}
                placeholder="Add a note..."
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAddingApproach(false)
                  setNewApproachData({})
                  setNewApproachTimestamp("")
                }}
                disabled={isSavingNewApproach}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={saveNewApproach}
                disabled={isSavingNewApproach}
                className="gap-1"
              >
                {isSavingNewApproach ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
                Add
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Action Buttons */}
      <div className="space-y-3">
        {reactivateError && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {reactivateError}
          </div>
        )}

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={handleReactivate}
            disabled={isReactivating || session.is_active}
          >
            {isReactivating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Play className="size-4" />
            )}
            Continue Session Live
          </Button>

          <Link href={`/dashboard/tracking/report?session=${sessionId}`} className="flex-1">
            <Button variant="default" className="w-full gap-2">
              <FileText className="size-4" />
              Write Field Report
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

// Shared form for editing/adding approaches (outcome, mood, tags)
function ApproachForm({
  data,
  onChange,
}: {
  data: ApproachFormData
  onChange: (data: ApproachFormData) => void
}) {
  return (
    <>
      {/* Outcome */}
      <div>
        <Label className="text-sm text-muted-foreground mb-2 block">Outcome</Label>
        <div className="flex flex-wrap gap-2">
          {OUTCOME_OPTIONS.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() =>
                onChange({
                  ...data,
                  outcome: data.outcome === option.value ? undefined : option.value,
                })
              }
              className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                data.outcome === option.value
                  ? option.color
                  : "border-border hover:border-primary/50"
              }`}
            >
              {option.emoji} {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mood */}
      <div>
        <Label className="text-sm text-muted-foreground mb-2 block">Mood</Label>
        <div className="flex gap-2">
          {MOOD_OPTIONS.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() =>
                onChange({
                  ...data,
                  mood: data.mood === option.value ? undefined : option.value,
                })
              }
              className={`flex-1 py-2 rounded-lg border transition-colors text-xl ${
                data.mood === option.value
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

      {/* Tags */}
      <div>
        <Label className="text-sm text-muted-foreground mb-2 block">Tags</Label>
        <div className="flex flex-wrap gap-1.5">
          {Object.values(APPROACH_TAGS)
            .flat()
            .map(tag => {
              const isSelected = data.tags?.includes(tag)
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    const currentTags = data.tags || []
                    const newTags = isSelected
                      ? currentTags.filter(t => t !== tag)
                      : [...currentTags, tag]
                    onChange({ ...data, tags: newTags.length > 0 ? newTags : undefined })
                  }}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {tag}
                </button>
              )
            })}
        </div>
      </div>
    </>
  )
}
