"use client"

/**
 * Settings: profile preferences, workspace governance (required fields, locked
 * entries, approvals, default rates), automation (Pomodoro, idle, reminders,
 * AutoTracker, timeline), integrations (external calendars, webhooks) and data
 * import/export.
 */

import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  CALENDAR_COLORS,
  CALENDAR_WINDOW_DAYS_BACK,
  CALENDAR_WINDOW_DAYS_FORWARD,
  CURRENCIES,
  DATE_FORMATS,
  DURATION_FORMATS,
  ROUNDING_MINUTES,
  ROUNDING_MODES,
  TIME_FORMATS,
  WEBHOOK_EVENTS,
  WEEK_STARTS,
} from "../config"
import { googleEventsToEvents, icsToEvents } from "../calendarService"
import { IconAdd, IconCalendar, IconDelete, IconExport, IconImport, IconSpinner } from "../icons"
import { addDays, dateKey, endOfDayIso, formatDuration, startOfDayIso } from "../timetrackFormatService"
import { downloadFile, exportStateJson, importEntriesCsv, importStateJson } from "../importExportService"
import {
  addAutotracker,
  addWebhook,
  createManualEntry,
  deleteAutotracker,
  deleteWebhook,
  updateAutotracker,
} from "../timetrackService"
import type {
  CalendarSource,
  DateFormatId,
  DurationFormat,
  Id,
  TimeFormat,
  TimetrackState,
  WebhookEventName,
  WeekStart,
} from "../types"
import { MiniSelect } from "./pickers"
import { ColorDot, ConfirmButton, EmptyState, Field, SectionCard, Segmented, ToggleRow } from "./primitives"

type SettingsTab = "profile" | "workspace" | "automation" | "integrations" | "data"

export function SettingsView({
  state,
  setState,
  nowSec,
  pushToast,
  resetSandbox,
  replaceState,
  requestNotificationPermission,
  tab,
  setTab,
}: {
  state: TimetrackState
  setState: (updater: (current: TimetrackState) => TimetrackState) => void
  nowSec: number
  pushToast: (text: string, tone?: "info" | "error") => void
  resetSandbox: () => void
  replaceState: (next: TimetrackState) => void
  requestNotificationPermission: () => Promise<boolean>
  tab: SettingsTab
  setTab: (tab: SettingsTab) => void
}) {
  return (
    <div className="space-y-4">
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { id: "profile", label: "Profile" },
          { id: "workspace", label: "Workspace" },
          { id: "automation", label: "Automation" },
          { id: "integrations", label: "Integrations" },
          { id: "data", label: "Data" },
        ]}
      />

      {tab === "profile" && <ProfilePanel state={state} setState={setState} />}
      {tab === "workspace" && <WorkspacePanel state={state} setState={setState} />}
      {tab === "automation" && (
        <AutomationPanel
          state={state}
          setState={setState}
          nowSec={nowSec}
          pushToast={pushToast}
          requestNotificationPermission={requestNotificationPermission}
        />
      )}
      {tab === "integrations" && <IntegrationsPanel state={state} setState={setState} nowSec={nowSec} pushToast={pushToast} />}
      {tab === "data" && (
        <DataPanel state={state} setState={setState} pushToast={pushToast} resetSandbox={resetSandbox} replaceState={replaceState} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

function ProfilePanel({
  state,
  setState,
}: {
  state: TimetrackState
  setState: (updater: (current: TimetrackState) => TimetrackState) => void
}) {
  const patch = (changes: Partial<TimetrackState["user"]>) =>
    setState((current) => ({ ...current, user: { ...current.user, ...changes } }))

  return (
    <SectionCard title="Profile" description="These preferences change how times and dates are displayed everywhere.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Input value={state.user.name} onChange={(event) => patch({ name: event.target.value })} />
        </Field>
        <Field label="Email">
          <Input value={state.user.email} onChange={(event) => patch({ email: event.target.value })} />
        </Field>
        <Field label="Duration display format">
          <MiniSelect
            value={state.user.durationFormat}
            onChange={(value) => patch({ durationFormat: value as DurationFormat })}
            options={DURATION_FORMATS.map((f) => ({ id: f.id, label: f.label }))}
          />
        </Field>
        <Field label="Time format">
          <MiniSelect
            value={state.user.timeFormat}
            onChange={(value) => patch({ timeFormat: value as TimeFormat })}
            options={TIME_FORMATS.map((f) => ({ id: f.id, label: f.label }))}
          />
        </Field>
        <Field label="Date format">
          <MiniSelect
            value={state.user.dateFormat}
            onChange={(value) => patch({ dateFormat: value as DateFormatId })}
            options={DATE_FORMATS.map((f) => ({ id: f, label: f }))}
          />
        </Field>
        <Field label="First day of the week">
          <MiniSelect
            value={String(state.user.weekStart)}
            onChange={(value) => patch({ weekStart: Number(value) as WeekStart })}
            options={WEEK_STARTS.map((w) => ({ id: String(w.id), label: w.label }))}
          />
        </Field>
        <Field label="Time zone" hint="Taken from this browser">
          <Input value={state.user.timezone} readOnly className="opacity-70" />
        </Field>
      </div>
      <div className="mt-2 border-t border-border pt-2">
        <ToggleRow
          label="Group similar time entries"
          hint="Collapse entries that share description, project, task, tags and billable status"
          checked={state.user.groupSimilarEntries}
          onChange={(groupSimilarEntries) => patch({ groupSimilarEntries })}
        />
      </div>
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// Workspace
// ---------------------------------------------------------------------------

function WorkspacePanel({
  state,
  setState,
}: {
  state: TimetrackState
  setState: (updater: (current: TimetrackState) => TimetrackState) => void
}) {
  const patch = (changes: Partial<TimetrackState["workspace"]>) =>
    setState((current) => ({ ...current, workspace: { ...current.workspace, ...changes, at: new Date().toISOString() } }))

  return (
    <div className="space-y-4">
      <SectionCard title="Workspace">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Workspace name">
            <Input value={state.workspace.name} onChange={(event) => patch({ name: event.target.value })} />
          </Field>
          <Field label="Default currency">
            <MiniSelect
              value={state.workspace.defaultCurrency}
              onChange={(defaultCurrency) => patch({ defaultCurrency })}
              options={CURRENCIES.map((c) => ({ id: c, label: c }))}
            />
          </Field>
          <Field label="Default billable rate / h">
            <Input
              type="number"
              value={state.workspace.defaultHourlyRate ?? ""}
              onChange={(event) => patch({ defaultHourlyRate: event.target.value ? Number(event.target.value) : null })}
            />
          </Field>
          <Field label="Default labour cost / h" hint="Used for Cost and Profit metrics">
            <Input
              type="number"
              value={state.workspace.defaultLabourCost ?? ""}
              onChange={(event) => patch({ defaultLabourCost: event.target.value ? Number(event.target.value) : null })}
            />
          </Field>
        </div>
        <div className="mt-2 border-t border-border pt-2">
          <ToggleRow
            label="New projects are billable by default"
            checked={state.workspace.projectsBillableByDefault}
            onChange={(projectsBillableByDefault) => patch({ projectsBillableByDefault })}
          />
          <ToggleRow
            label="Only admins see billable rates"
            checked={state.workspace.onlyAdminsSeeBillableRates}
            onChange={(onlyAdminsSeeBillableRates) => patch({ onlyAdminsSeeBillableRates })}
          />
        </div>
      </SectionCard>

      <SectionCard title="Default report rounding" description="Reports start with this rounding; each report can override it.">
        <div className="flex flex-wrap items-center gap-3">
          <ToggleRow
            label="Round by default"
            checked={state.workspace.rounding.enabled}
            onChange={(enabled) => patch({ rounding: { ...state.workspace.rounding, enabled } })}
          />
          <MiniSelect
            className="w-[130px]"
            value={state.workspace.rounding.mode}
            onChange={(mode) => patch({ rounding: { ...state.workspace.rounding, mode: mode as "nearest" } })}
            options={ROUNDING_MODES.map((m) => ({ id: m.id, label: m.label }))}
          />
          <MiniSelect
            className="w-[110px]"
            value={String(state.workspace.rounding.minutes)}
            onChange={(minutes) => patch({ rounding: { ...state.workspace.rounding, minutes: Number(minutes) } })}
            options={ROUNDING_MINUTES.map((m) => ({ id: String(m), label: `${m} min` }))}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Required fields"
        description="Entries cannot be saved until these are filled — enforced on the timer, the calendar and CSV import."
      >
        {(["description", "project", "task", "tag"] as const).map((field) => (
          <ToggleRow
            key={field}
            label={`${field[0].toUpperCase()}${field.slice(1)} is required`}
            checked={state.workspace.requiredFields[field]}
            onChange={(value) => patch({ requiredFields: { ...state.workspace.requiredFields, [field]: value } })}
          />
        ))}
      </SectionCard>

      <SectionCard title="Locking" description="Both rules block edits, exactly like Toggl's locked entries and approvals.">
        <Field label="Lock time entries on or before" hint="Leave empty to allow editing any date">
          <Input
            type="date"
            value={state.workspace.lockEntriesBefore ?? ""}
            onChange={(event) => patch({ lockEntriesBefore: event.target.value || null })}
            className="w-[200px]"
          />
        </Field>
        <ToggleRow
          label="Enable timesheet approvals"
          hint="Submitted or approved weeks become read-only"
          checked={state.workspace.timesheetApprovalsEnabled}
          onChange={(timesheetApprovalsEnabled) => patch({ timesheetApprovalsEnabled })}
        />
      </SectionCard>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Automation
// ---------------------------------------------------------------------------

function AutomationPanel({
  state,
  setState,
  nowSec,
  pushToast,
  requestNotificationPermission,
}: {
  state: TimetrackState
  setState: (updater: (current: TimetrackState) => TimetrackState) => void
  nowSec: number
  pushToast: (text: string, tone?: "info" | "error") => void
  requestNotificationPermission: () => Promise<boolean>
}) {
  const [rule, setRule] = useState({ keyword: "", projectId: null as Id | null })

  return (
    <div className="space-y-4">
      <SectionCard title="Pomodoro" description="Stops the timer when a work interval ends and prompts you after the break.">
        <ToggleRow
          label="Enable Pomodoro"
          checked={state.pomodoro.enabled}
          onChange={async (enabled) => {
            if (enabled && state.pomodoro.notify) await requestNotificationPermission()
            setState((current) => ({ ...current, pomodoro: { ...current.pomodoro, enabled } }))
          }}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Work interval (minutes)">
            <Input
              type="number"
              value={state.pomodoro.workMinutes}
              onChange={(event) =>
                setState((current) => ({ ...current, pomodoro: { ...current.pomodoro, workMinutes: Number(event.target.value) || 1 } }))
              }
            />
          </Field>
          <Field label="Break interval (minutes)">
            <Input
              type="number"
              value={state.pomodoro.breakMinutes}
              onChange={(event) =>
                setState((current) => ({ ...current, pomodoro: { ...current.pomodoro, breakMinutes: Number(event.target.value) || 1 } }))
              }
            />
          </Field>
        </div>
        <ToggleRow
          label="Continue the last entry when the break ends"
          checked={state.pomodoro.autoContinue}
          onChange={(autoContinue) => setState((current) => ({ ...current, pomodoro: { ...current.pomodoro, autoContinue } }))}
        />
        <ToggleRow
          label="Desktop notifications"
          checked={state.pomodoro.notify}
          onChange={async (notify) => {
            if (notify) {
              const granted = await requestNotificationPermission()
              if (!granted) pushToast("Browser notifications were not granted — in-app toasts will be used", "error")
            }
            setState((current) => ({ ...current, pomodoro: { ...current.pomodoro, notify } }))
          }}
        />
      </SectionCard>

      <SectionCard title="Idle detection" description="If you stop interacting while the timer runs, you get asked whether to keep the idle time.">
        <ToggleRow
          label="Detect idle time"
          checked={state.idle.enabled}
          onChange={(enabled) => setState((current) => ({ ...current, idle: { ...current.idle, enabled } }))}
        />
        <Field label="Prompt after (minutes)">
          <Input
            type="number"
            className="w-[120px]"
            value={state.idle.minutes}
            onChange={(event) => setState((current) => ({ ...current, idle: { ...current.idle, minutes: Number(event.target.value) || 1 } }))}
          />
        </Field>
      </SectionCard>

      <SectionCard title="Tracking reminders" description="Nags you while nothing is running inside your working window.">
        <ToggleRow
          label="Enable reminders"
          checked={state.reminders.enabled}
          onChange={async (enabled) => {
            if (enabled) await requestNotificationPermission()
            setState((current) => ({ ...current, reminders: { ...current.reminders, enabled } }))
          }}
        />
        <div className="flex flex-wrap gap-1 py-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => {
            const active = state.reminders.days.includes(index)
            return (
              <button
                key={day}
                type="button"
                onClick={() =>
                  setState((current) => ({
                    ...current,
                    reminders: {
                      ...current.reminders,
                      days: active ? current.reminders.days.filter((d) => d !== index) : [...current.reminders.days, index],
                    },
                  }))
                }
                className={cn(
                  "rounded-full border px-2 py-0.5 text-xs",
                  active ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground",
                )}
              >
                {day}
              </button>
            )
          })}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="From hour">
            <Input
              type="number"
              value={state.reminders.fromHour}
              onChange={(event) =>
                setState((current) => ({ ...current, reminders: { ...current.reminders, fromHour: Number(event.target.value) } }))
              }
            />
          </Field>
          <Field label="To hour">
            <Input
              type="number"
              value={state.reminders.toHour}
              onChange={(event) =>
                setState((current) => ({ ...current, reminders: { ...current.reminders, toHour: Number(event.target.value) } }))
              }
            />
          </Field>
          <Field label="Every N minutes">
            <Input
              type="number"
              value={state.reminders.everyMinutes}
              onChange={(event) =>
                setState((current) => ({ ...current, reminders: { ...current.reminders, everyMinutes: Number(event.target.value) || 5 } }))
              }
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        title="AutoTracker"
        description="Keyword rules that suggest a project while you type a description."
        actions={
          <div className="flex flex-wrap gap-2">
            <Input
              value={rule.keyword}
              onChange={(event) => setRule({ ...rule, keyword: event.target.value })}
              placeholder="Keyword"
              className="h-8 w-[140px]"
            />
            <MiniSelect
              className="w-[160px]"
              value={rule.projectId === null ? "none" : String(rule.projectId)}
              onChange={(value) => setRule({ ...rule, projectId: value === "none" ? null : Number(value) })}
              options={[{ id: "none", label: "No project" }, ...state.projects.map((p) => ({ id: String(p.id), label: p.name }))]}
            />
            <Button
              size="sm"
              onClick={() => {
                if (!rule.keyword.trim()) {
                  pushToast("Give the rule a keyword", "error")
                  return
                }
                setState((current) =>
                  addAutotracker(current, { keyword: rule.keyword.trim(), projectId: rule.projectId, taskId: null, tagIds: [], enabled: true }),
                )
                setRule({ keyword: "", projectId: null })
              }}
            >
              <IconAdd className="size-4" /> Add rule
            </Button>
          </div>
        }
      >
        {state.autotrackers.length === 0 ? (
          <p className="text-xs text-muted-foreground">No rules yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {state.autotrackers.map((autotracker) => (
              <li key={autotracker.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">{autotracker.keyword}</code>
                <span className="text-muted-foreground">→</span>
                <span>{state.projects.find((p) => p.id === autotracker.projectId)?.name ?? "No project"}</span>
                <div className="ml-auto flex items-center gap-2">
                  <ToggleRow
                    label={autotracker.enabled ? "On" : "Off"}
                    checked={autotracker.enabled}
                    onChange={(enabled) => setState((current) => updateAutotracker(current, autotracker.id, { enabled }))}
                  />
                  <ConfirmButton size="icon-sm" onConfirm={() => setState((current) => deleteAutotracker(current, autotracker.id))}>
                    <IconDelete className="size-4" />
                  </ConfirmButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        title="Timeline recorder"
        description="Toggl's desktop Timeline records every application you use. A web page cannot see other apps, so this records only how long this tab stays visible — enable it to convert those blocks into entries."
      >
        <ToggleRow
          label="Record this tab's activity"
          checked={state.user.showTimelineRecorder}
          onChange={(showTimelineRecorder) =>
            setState((current) => ({ ...current, user: { ...current.user, showTimelineRecorder } }))
          }
        />
        {state.timeline.length > 0 && (
          <ul className="mt-2 divide-y divide-border">
            {state.timeline.slice(0, 10).map((block) => {
              const seconds = Math.round((new Date(block.end).getTime() - new Date(block.start).getTime()) / 1000)
              return (
                <li key={block.id} className="flex items-center gap-2 py-2 text-xs">
                  <span className="flex-1 truncate">{block.label}</span>
                  <span className="tabular-nums text-muted-foreground">{formatDuration(seconds, state.user.durationFormat)}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7"
                    disabled={block.converted}
                    onClick={() =>
                      setState((current) => {
                        const result = createManualEntry(
                          current,
                          {
                            draft: { description: block.label, projectId: null, taskId: null, tagIds: [], billable: false },
                            start: block.start,
                            stop: block.end,
                          },
                          new Date().toISOString(),
                        )
                        if (result.violations.length > 0) {
                          pushToast(result.violations[0].message, "error")
                          return current
                        }
                        return {
                          ...result.state,
                          timeline: result.state.timeline.map((b) => (b.id === block.id ? { ...b, converted: true } : b)),
                        }
                      })
                    }
                  >
                    {block.converted ? "Converted" : "Convert"}
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">
          Current clock: {new Date(nowSec * 1000).toLocaleTimeString()}
        </p>
      </SectionCard>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Integrations — external calendars + webhooks
// ---------------------------------------------------------------------------

export function IntegrationsPanel({
  state,
  setState,
  nowSec,
  pushToast,
}: {
  state: TimetrackState
  setState: (updater: (current: TimetrackState) => TimetrackState) => void
  nowSec: number
  pushToast: (text: string, tone?: "info" | "error") => void
}) {
  const [source, setSource] = useState<CalendarSource>("ics_file")
  const [name, setName] = useState("Google Calendar")
  const [ref, setRef] = useState("")
  const [rememberUrl, setRememberUrl] = useState(false)
  const [busy, setBusy] = useState(false)
  const [hookUrl, setHookUrl] = useState("")
  /** Set when re-syncing a calendar whose secret address was deliberately not stored */
  const [resyncCalendarId, setResyncCalendarId] = useState<Id | null>(null)
  const fileInput = useRef<HTMLInputElement | null>(null)
  const urlInput = useRef<HTMLInputElement | null>(null)
  const todayKey = dateKey(new Date(nowSec * 1000))

  const mergeEvents = (
    calendarId: Id,
    events: ReturnType<typeof icsToEvents>["events"],
    stats: { skippedAllDay: number; skippedOutOfWindow?: number },
  ) => {
    setState((current) => ({
      ...current,
      events: [...current.events.filter((e) => e.calendarId !== calendarId), ...events],
      calendars: current.calendars.map((c) =>
        c.id === calendarId ? { ...c, lastSyncedAt: new Date().toISOString(), eventCount: events.length } : c,
      ),
    }))
    pushToast(
      `Imported ${events.length} events · skipped ${stats.skippedAllDay} all-day${
        stats.skippedOutOfWindow ? ` and ${stats.skippedOutOfWindow} outside the window` : ""
      }`,
    )
  }

  const ensureCalendar = (calendarSource: CalendarSource, calendarRef: string, label: string): Id => {
    // A secret iCal address is a credential: only keep it when explicitly asked to
    const storedRef = calendarSource === "ics_url" && !rememberUrl ? "" : calendarRef
    let id = -1
    setState((current) => {
      const existing = current.calendars.find(
        (c) => c.source === calendarSource && c.ref !== "" && c.ref === calendarRef,
      )
      if (existing) {
        id = existing.id
        return current
      }
      id = current.nextId
      return {
        ...current,
        nextId: current.nextId + 1,
        calendars: [
          ...current.calendars,
          {
            id,
            name: label || "Calendar",
            source: calendarSource,
            ref: storedRef,
            color: CALENDAR_COLORS[current.calendars.length % CALENDAR_COLORS.length],
            enabled: true,
            lastSyncedAt: null,
            eventCount: 0,
          },
        ],
      }
    })
    return id
  }

  const importFromUrl = async (calendarRef: string, label: string, existingId?: Id) => {
    setBusy(true)
    try {
      const response = await fetch("/api/timetrack/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "ics_url", ref: calendarRef }),
      })
      const payload = (await response.json()) as { ics?: string; error?: string }
      if (!response.ok || !payload.ics) throw new Error(payload.error ?? "Calendar fetch failed")
      const id = existingId ?? ensureCalendar("ics_url", calendarRef, label)
      const result = icsToEvents(payload.ics, id, todayKey)
      mergeEvents(id, result.events, result)
      setRef("")
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Calendar import failed", "error")
    } finally {
      setBusy(false)
    }
  }

  const importFromGoogleApi = async (calendarRef: string, label: string, existingId?: Id) => {
    setBusy(true)
    try {
      const response = await fetch("/api/timetrack/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "google_api",
          ref: calendarRef,
          timeMin: startOfDayIso(addDays(todayKey, -CALENDAR_WINDOW_DAYS_BACK)),
          timeMax: endOfDayIso(addDays(todayKey, CALENDAR_WINDOW_DAYS_FORWARD)),
        }),
      })
      const payload = (await response.json()) as { items?: unknown[]; serviceAccountEmail?: string; error?: string }
      if (!response.ok || !payload.items) throw new Error(payload.error ?? "Google Calendar request failed")
      const id = existingId ?? ensureCalendar("google_api", calendarRef, label)
      const result = googleEventsToEvents(payload.items, id)
      mergeEvents(id, result.events, result)
      setRef("")
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Google Calendar import failed", "error")
    } finally {
      setBusy(false)
    }
  }

  const importFromFile = async (file: File) => {
    const text = await file.text()
    if (!text.includes("BEGIN:VCALENDAR")) {
      pushToast("That file is not an iCalendar (.ics) export", "error")
      return
    }
    const id = ensureCalendar("ics_file", file.name, file.name.replace(/\.ics$/i, ""))
    const result = icsToEvents(text, id, todayKey)
    mergeEvents(id, result.events, result)
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title="External calendars"
        description={`Events appear in the right column of the calendar view. All-day events are skipped and the window is ${CALENDAR_WINDOW_DAYS_BACK} days back / ${CALENDAR_WINDOW_DAYS_FORWARD} days forward — the same rules Toggl applies.`}
      >
        {state.calendars.length === 0 ? (
          <EmptyState title="No calendar connected yet" hint="Pick a method below." />
        ) : (
          <ul className="divide-y divide-border">
            {state.calendars.map((calendar) => (
              <li key={calendar.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <ColorDot color={calendar.color} />
                <Input
                  value={calendar.name}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      calendars: current.calendars.map((c) => (c.id === calendar.id ? { ...c, name: event.target.value } : c)),
                    }))
                  }
                  className="h-8 w-[180px]"
                />
                <span className="max-w-[220px] truncate text-xs text-muted-foreground">
                  {calendar.source === "ics_url" ? "iCal URL" : calendar.source === "ics_file" ? "uploaded file" : "Google API"} ·{" "}
                  {calendar.eventCount} events
                  {calendar.lastSyncedAt ? ` · synced ${new Date(calendar.lastSyncedAt).toLocaleString()}` : ""}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <ToggleRow
                    label={calendar.enabled ? "Shown" : "Hidden"}
                    checked={calendar.enabled}
                    onChange={(enabled) =>
                      setState((current) => ({
                        ...current,
                        calendars: current.calendars.map((c) => (c.id === calendar.id ? { ...c, enabled } : c)),
                      }))
                    }
                  />
                  {calendar.source !== "ics_file" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        calendar.source === "ics_url"
                          ? importFromUrl(calendar.ref, calendar.name, calendar.id)
                          : importFromGoogleApi(calendar.ref, calendar.name, calendar.id)
                      }
                    >
                      {busy ? <IconSpinner className="size-4 animate-spin" /> : "Sync now"}
                    </Button>
                  )}
                  <ConfirmButton
                    size="icon-sm"
                    onConfirm={() =>
                      setState((current) => ({
                        ...current,
                        calendars: current.calendars.filter((c) => c.id !== calendar.id),
                        events: current.events.filter((e) => e.calendarId !== calendar.id),
                      }))
                    }
                  >
                    <IconDelete className="size-4" />
                  </ConfirmButton>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 space-y-3 rounded-md border border-border p-3">
          <Segmented
            value={source}
            onChange={setSource}
            options={[
              { id: "ics_url", label: "Google iCal URL" },
              { id: "ics_file", label: "Upload .ics" },
              { id: "google_api", label: "Google API" },
            ]}
          />

          {source === "ics_url" && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Google Calendar → Settings → your calendar → <strong>Integrate calendar</strong> → copy{" "}
                <strong>Secret address in iCal format</strong>. Paste it here; it is fetched server-side and never stored
                outside this browser. Works for Outlook/Apple published calendars too.
              </p>
              <div className="flex flex-wrap gap-2">
                <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Label" className="h-9 w-[160px]" />
                <Input
                  value={ref}
                  onChange={(event) => setRef(event.target.value)}
                  placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
                  className="h-9 flex-1"
                />
                <Button size="sm" disabled={busy || !ref.trim()} onClick={() => importFromUrl(ref.trim(), name)}>
                  {busy ? <IconSpinner className="size-4 animate-spin" /> : <IconCalendar className="size-4" />} Import
                </Button>
              </div>
            </div>
          )}

          {source === "ics_file" && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Google Calendar → Settings → <strong>Import &amp; export</strong> → Export gives a zip; unzip it and pick the
                .ics file for the calendar you want.
              </p>
              <input
                ref={fileInput}
                type="file"
                accept=".ics,text/calendar"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void importFromFile(file)
                  event.target.value = ""
                }}
              />
              <Button size="sm" variant="outline" onClick={() => fileInput.current?.click()}>
                <IconImport className="size-4" /> Choose .ics file
              </Button>
            </div>
          )}

          {source === "google_api" && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Reads a calendar through the Google Calendar API using this project&apos;s service account
                (<code>GOOGLE_SERVICE_ACCOUNT_JSON</code>). Share the calendar with the service account&apos;s{" "}
                <code>client_email</code> first, then enter the calendar id (usually your Gmail address).
              </p>
              <div className="flex flex-wrap gap-2">
                <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Label" className="h-9 w-[160px]" />
                <Input value={ref} onChange={(event) => setRef(event.target.value)} placeholder="you@gmail.com" className="h-9 flex-1" />
                <Button size="sm" disabled={busy || !ref.trim()} onClick={() => importFromGoogleApi(ref.trim(), name)}>
                  {busy ? <IconSpinner className="size-4 animate-spin" /> : <IconCalendar className="size-4" />} Import
                </Button>
              </div>
            </div>
          )}

          <p className="border-t border-border pt-2 text-[11px] text-muted-foreground">
            Toggl&apos;s one-click “Connect” button uses an OAuth consent screen. That needs a Google Cloud OAuth client id
            and secret in this app&apos;s environment; until those exist, the three methods above cover the same import
            without asking you to authorise anything.
          </p>
        </div>
      </SectionCard>

      <SectionCard
        title="Webhooks"
        description="Toggl can POST entry and project events to a URL. Here the payloads are logged locally rather than sent."
        actions={
          <div className="flex gap-2">
            <Input value={hookUrl} onChange={(event) => setHookUrl(event.target.value)} placeholder="https://example.com/hook" className="h-8 w-[220px]" />
            <Button
              size="sm"
              onClick={() => {
                if (!hookUrl.trim()) return
                setState((current) => addWebhook(current, hookUrl.trim(), [...WEBHOOK_EVENTS] as WebhookEventName[]))
                setHookUrl("")
              }}
            >
              <IconAdd className="size-4" /> Add
            </Button>
          </div>
        }
      >
        {state.webhooks.length === 0 ? (
          <p className="text-xs text-muted-foreground">No webhooks configured.</p>
        ) : (
          <ul className="divide-y divide-border">
            {state.webhooks.map((hook) => (
              <li key={hook.id} className="flex items-center gap-2 py-2 text-sm">
                <code className="flex-1 truncate text-xs">{hook.url}</code>
                <span className="text-xs text-muted-foreground">{hook.events.length} events</span>
                <ConfirmButton size="icon-sm" onConfirm={() => setState((current) => deleteWebhook(current, hook.id))}>
                  <IconDelete className="size-4" />
                </ConfirmButton>
              </li>
            ))}
          </ul>
        )}
        {state.webhookLog.length > 0 && (
          <div className="mt-3 max-h-48 overflow-y-auto rounded border border-border bg-secondary/20 p-2 text-[11px]">
            {state.webhookLog.slice(0, 30).map((entry) => (
              <p key={entry.id} className="truncate">
                <span className="text-muted-foreground">{new Date(entry.at).toLocaleTimeString()}</span> {entry.event} →{" "}
                {entry.url}
              </p>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

function DataPanel({
  state,
  setState,
  pushToast,
  resetSandbox,
  replaceState,
}: {
  state: TimetrackState
  setState: (updater: (current: TimetrackState) => TimetrackState) => void
  pushToast: (text: string, tone?: "info" | "error") => void
  resetSandbox: () => void
  replaceState: (next: TimetrackState) => void
}) {
  const jsonInput = useRef<HTMLInputElement | null>(null)
  const csvInput = useRef<HTMLInputElement | null>(null)

  return (
    <div className="space-y-4">
      <SectionCard title="Backup" description="Everything lives in this browser's localStorage — export if you want to keep it.">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => downloadFile(`toggl-sandbox-${new Date().toISOString().slice(0, 10)}.json`, exportStateJson(state), "application/json")}
          >
            <IconExport className="size-4" /> Export workspace JSON
          </Button>
          <input
            ref={jsonInput}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0]
              event.target.value = ""
              if (!file) return
              const result = importStateJson(await file.text())
              if (!result.state) {
                pushToast(result.error ?? "Import failed", "error")
                return
              }
              replaceState(result.state)
              pushToast("Workspace restored from backup")
            }}
          />
          <Button size="sm" variant="outline" onClick={() => jsonInput.current?.click()}>
            <IconImport className="size-4" /> Restore workspace JSON
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        title="Import time entries from CSV"
        description="Accepts Toggl's export columns: Description, Project, Client, Task, Tags, Billable, Start date, Start time, End date, End time, Duration. Missing clients, projects, tasks and tags are created."
      >
        <input
          ref={csvInput}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0]
            event.target.value = ""
            if (!file) return
            const text = await file.text()
            setState((current) => {
              const result = importEntriesCsv(current, text, new Date().toISOString())
              pushToast(
                result.skipped.length === 0
                  ? `Imported ${result.imported} entries`
                  : `Imported ${result.imported}, skipped ${result.skipped.length}: ${result.skipped
                      .slice(0, 3)
                      .map((s) => `line ${s.line} (${s.reason})`)
                      .join("; ")}`,
                result.skipped.length > 0 ? "error" : "info",
              )
              return result.state
            })
          }}
        />
        <Button size="sm" variant="outline" onClick={() => csvInput.current?.click()}>
          <IconImport className="size-4" /> Choose CSV file
        </Button>
      </SectionCard>

      <SectionCard title="Sandbox" description="Counts in this workspace right now.">
        <ul className="grid gap-1 text-sm sm:grid-cols-2">
          <li>{state.entries.length} time entries</li>
          <li>{state.projects.length} projects</li>
          <li>{state.clients.length} clients</li>
          <li>{state.tasks.length} tasks</li>
          <li>{state.tags.length} tags</li>
          <li>{state.members.length} members</li>
          <li>{state.events.length} calendar events</li>
          <li>{state.savedReports.length} saved reports</li>
        </ul>
        <div className="mt-3">
          <ConfirmButton variant="destructive" confirmLabel="Really reset?" onConfirm={resetSandbox}>
            Reset to seeded demo data
          </ConfirmButton>
        </div>
      </SectionCard>
    </div>
  )
}

export type { SettingsTab }
