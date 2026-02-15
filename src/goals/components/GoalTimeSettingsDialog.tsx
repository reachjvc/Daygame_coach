"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Check, LocateFixed, Loader2 } from "lucide-react"

const WEEK_DAYS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
]

function getTimezoneList(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone")
  } catch {
    return [
      "UTC",
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "Europe/London",
      "Europe/Paris",
      "Europe/Berlin",
      "Europe/Copenhagen",
      "Asia/Tokyo",
      "Asia/Shanghai",
      "Australia/Sydney",
    ]
  }
}

export interface TimePreferences {
  timezone: string | null
  week_start_day: number
}

interface GoalTimeSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialPrefs: TimePreferences | null
  onSaved: (prefs: TimePreferences) => void
}

export function GoalTimeSettingsDialog({ open, onOpenChange, initialPrefs, onSaved }: GoalTimeSettingsDialogProps) {
  const [timezone, setTimezone] = useState<string | null>(null)
  const [weekStartDay, setWeekStartDay] = useState(0)
  const [timezoneSearch, setTimezoneSearch] = useState("")
  const [showTimezoneDropdown, setShowTimezoneDropdown] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const allTimezones = getTimezoneList()

  const filteredTimezones = timezoneSearch
    ? allTimezones.filter((tz) =>
        tz.toLowerCase().replace(/_/g, " ").includes(timezoneSearch.toLowerCase())
      )
    : allTimezones

  // Sync local state when dialog opens or initialPrefs change
  useEffect(() => {
    if (open && initialPrefs) {
      setTimezone(initialPrefs.timezone)
      setWeekStartDay(initialPrefs.week_start_day)
      setTimezoneSearch("")
      setShowTimezoneDropdown(false)
      setError(null)
    }
  }, [open, initialPrefs])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowTimezoneDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleDetectTimezone = () => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (detected) {
      setTimezone(detected)
      setTimezoneSearch("")
      setShowTimezoneDropdown(false)
    }
  }

  const handleTimezoneSelect = (tz: string) => {
    setTimezone(tz)
    setTimezoneSearch("")
    setShowTimezoneDropdown(false)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    try {
      const body: Record<string, unknown> = { week_start_day: weekStartDay }
      if (timezone) body.timezone = timezone
      const res = await fetch("/api/settings/time-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save")
      }
      onSaved({ timezone, week_start_day: weekStartDay })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setIsSaving(false)
    }
  }

  const isLoading = !initialPrefs
  const currentTimezone = timezone || "Not set"
  const timezoneOffset = timezone
    ? new Date().toLocaleString("en-US", { timeZone: timezone, timeZoneName: "short" }).split(" ").pop()
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Time Settings</DialogTitle>
          <DialogDescription>
            Configure your timezone and weekly reset schedule for goal tracking.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Timezone */}
            <div className="space-y-3">
              <Label>Timezone</Label>
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{currentTimezone.replace(/_/g, " ")}</p>
                  {timezoneOffset && (
                    <p className="text-xs text-muted-foreground">{timezoneOffset}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDetectTimezone}
                  className="shrink-0"
                >
                  <LocateFixed className="mr-1 size-4" />
                  Detect
                </Button>
              </div>

              <div className="relative" ref={dropdownRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search timezones..."
                    value={timezoneSearch}
                    onChange={(e) => {
                      setTimezoneSearch(e.target.value)
                      setShowTimezoneDropdown(true)
                    }}
                    onFocus={() => setShowTimezoneDropdown(true)}
                    className="pl-9"
                  />
                </div>
                {showTimezoneDropdown && (
                  <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-md border border-border bg-popover shadow-md">
                    {filteredTimezones.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">No timezones found</div>
                    ) : (
                      filteredTimezones.map((tz) => (
                        <button
                          key={tz}
                          type="button"
                          onClick={() => handleTimezoneSelect(tz)}
                          className={`flex w-full items-center justify-between px-3 py-2 text-sm text-left transition-colors hover:bg-muted ${
                            tz === timezone ? "bg-primary/10 text-primary" : ""
                          }`}
                        >
                          <span>{tz.replace(/_/g, " ")}</span>
                          {tz === timezone && <Check className="size-4 text-primary" />}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Weekly Reset Day */}
            <div className="space-y-3">
              <Label>Weekly reset day</Label>
              <Select value={String(weekStartDay)} onValueChange={(v) => setWeekStartDay(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEK_DAYS.map((day) => (
                    <SelectItem key={day.value} value={day.value}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Weekly goals reset to zero at midnight on {WEEK_DAYS[weekStartDay]?.label || "Sunday"}, starting a new week.
              </p>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading || isSaving}>
            {isSaving ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
