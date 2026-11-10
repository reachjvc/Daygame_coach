"use client"

import type { CouncilMember } from "../councilTypes"
import { useCouncilSettings } from "../hooks/useCouncilSettings"

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7) // 07:00 to 21:00

/**
 * Inside the council strip: the value of the week (Benjamin Franklin's one
 * virtue a week) and the daily reminder, both off until chosen
 * (Plans/role-models.md, Phase 12). Nothing is sent between 22:00 and 07:00.
 */
export function CouncilSettings({ members }: { members: CouncilMember[] }) {
  const { settings, error, busy, save } = useCouncilSettings()
  if (!settings) return null
  const taken = [...new Set(members.flatMap((m) => m.takenValues))]
  return (
    <div className="mt-2 flex flex-col gap-3 border-t border-border pt-3" data-testid="council-settings">
      <label className="flex flex-wrap items-center gap-2 text-sm text-foreground">
        Value of the week
        <select
          value={settings.weekValue ?? ""}
          disabled={busy}
          onChange={(e) => void save({ weekValue: e.target.value || null })}
          className="min-h-10 rounded-lg border border-border bg-background px-2 text-sm"
          data-testid="council-week-value"
        >
          <option value="">None this week</option>
          {taken.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">Today asks each day: lived it, or fell short.</span>
      </label>
      <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.remindOn}
            disabled={busy}
            onChange={(e) => void save({ remindOn: e.target.checked })}
            data-testid="council-remind-on"
          />
          A daily reminder from your council
        </label>
        <select
          value={settings.remindHour}
          disabled={busy || !settings.remindOn}
          onChange={(e) => void save({ remindHour: Number(e.target.value) })}
          aria-label="Reminder time"
          className="min-h-10 rounded-lg border border-border bg-background px-2 text-sm disabled:opacity-50"
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>{`${String(h).padStart(2, "0")}:00`}</option>
          ))}
        </select>
      </div>
      {settings.remindOn && !settings.hasEnabledDevice && (
        <p className="text-xs text-amber-400">No phone takes reminders yet. Turn them on in Settings, under notifications.</p>
      )}
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
    </div>
  )
}
