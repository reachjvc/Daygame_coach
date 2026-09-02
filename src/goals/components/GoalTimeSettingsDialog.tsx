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
import { Search, Check, LocateFixed, Loader2 } from "lucide-react"


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
      const body: Record<string, unknown> = {}
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
      onSaved({ timezone, week_start_day: initialPrefs?.week_start_day ?? 1 })
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

            {/* When the week turns over. Not a setting.
                This used to be a picker offering all seven days, above copy that
                read "Weekly goals reset to zero at midnight on Sunday". Both were
                false: every reset in the app is Monday-based and always has been,
                so whatever was chosen here changed nothing. The picker is gone
                rather than relabelled — an inert control is worse than none. */}
            <div className="space-y-2">
              <Label>When your week turns over</Label>
              <p className="text-sm">Monday, 00:00 in your timezone.</p>
              <p className="text-xs text-muted-foreground">
                Weekly goals and weekly counts run Monday to Sunday. Sunday night
                still belongs to the week that is ending.
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
