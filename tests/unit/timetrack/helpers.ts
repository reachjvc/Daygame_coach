/**
 * Shared fixtures for time-tracking unit tests.
 * Builds a deterministic minimal workspace with no time entries.
 */

import { STATE_VERSION } from "@/src/timetrack/config"
import { CREATED_WITH } from "@/src/timetrack/config"
import type { TimeEntry, TimetrackState } from "@/src/timetrack/types"

export const NOW_ISO = "2026-08-10T12:00:00.000Z"

export function baseState(overrides: Partial<TimetrackState> = {}): TimetrackState {
  const state: TimetrackState = {
    version: STATE_VERSION,
    workspace: {
      id: "1",
      name: "Test WS",
      defaultCurrency: "EUR",
      defaultHourlyRate: 50,
      defaultLabourCost: 20,
      projectsBillableByDefault: true,
      onlyAdminsSeeBillableRates: false,
      rounding: { enabled: false, mode: "nearest", minutes: 15 },
      requiredFields: { project: false, task: false, tag: false, description: false },
      lockEntriesBefore: null,
      timesheetApprovalsEnabled: false,
      at: NOW_ISO,
    },
    user: {
      name: "You",
      email: "you@example.com",
      durationFormat: "improved",
      timeFormat: "h24",
      dateFormat: "YYYY-MM-DD",
      weekStart: 1,
      timezone: "UTC",
      groupSimilarEntries: true,
      showTimelineRecorder: false,
    },
    members: [
      { id: "10", workspaceId: "1", name: "You", email: "you@example.com", role: "admin", hourlyRate: 80, labourCost: 30, groupIds: [], active: true, isSelf: true, at: NOW_ISO },
      { id: "11", workspaceId: "1", name: "Sam", email: "sam@example.com", role: "basic", hourlyRate: 60, labourCost: 25, groupIds: [], active: true, isSelf: false, at: NOW_ISO },
    ],
    groups: [],
    clients: [{ id: "20", workspaceId: "1", name: "Acme", archived: false, at: NOW_ISO }],
    projects: [
      {
        id: "30",
        workspaceId: "1",
        clientId: "20",
        name: "Alpha",
        color: "#0b83d9",
        active: true,
        isPrivate: false,
        billable: true,
        currency: "EUR",
        rate: 100,
        rateHistory: [
          { validFrom: "2026-01-01", rate: 90 },
          { validFrom: "2026-08-01", rate: 100 },
        ],
        estimateType: "hours",
        estimatedSeconds: 10 * 3600,
        estimatedAmount: null,
        autoEstimates: false,
        fixedFee: null,
        recurring: false,
        recurringPeriod: null,
        recurringStart: null,
        startDate: "2026-08-01",
        endDate: "2026-08-31",
        template: false,
        alerts: [{ id: "300", basis: "estimate", threshold: 50, enabled: true }],
        memberIds: ["10"],
        at: NOW_ISO,
        createdAt: "2026-08-01T09:00:00.000Z",
      },
      {
        id: "31",
        workspaceId: "1",
        clientId: null,
        name: "Beta",
        color: "#2da608",
        active: true,
        isPrivate: false,
        billable: false,
        currency: "EUR",
        rate: null,
        rateHistory: [],
        estimateType: "hours",
        estimatedSeconds: null,
        estimatedAmount: null,
        autoEstimates: false,
        fixedFee: 1000,
        recurring: false,
        recurringPeriod: null,
        recurringStart: null,
        startDate: null,
        endDate: null,
        template: false,
        alerts: [],
        memberIds: ["10"],
        at: NOW_ISO,
        createdAt: "2026-08-01T09:00:00.000Z",
      },
    ],
    tasks: [
      { id: "40", workspaceId: "1", projectId: "30", name: "Build", estimatedSeconds: 4 * 3600, assigneeId: "10", rate: 150, active: true, at: NOW_ISO },
      { id: "41", workspaceId: "1", projectId: "30", name: "Review", estimatedSeconds: 2 * 3600, assigneeId: "10", rate: null, active: true, at: NOW_ISO },
    ],
    tags: [
      { id: "50", workspaceId: "1", name: "deep", at: NOW_ISO },
      { id: "51", workspaceId: "1", name: "meeting", at: NOW_ISO },
    ],
    entries: [],
    favorites: [],
    calendars: [],
    events: [],
    savedReports: [],
    alerts: [],
    approvals: [],
    autotrackers: [],
    webhooks: [],
    webhookLog: [],
    timeline: [],
    pomodoro: { enabled: false, workMinutes: 25, breakMinutes: 5, autoContinue: true, notify: false },
    idle: { enabled: false, minutes: 5 },
    reminders: { enabled: false, days: [1], fromHour: 9, toHour: 17, everyMinutes: 30 },
  }
  return { ...state, ...overrides }
}

/** Build a stopped entry from local wall-clock times on a given day */
export function entry(
  id: number | string,
  day: string,
  startHm: string,
  stopHm: string,
  extra: Partial<TimeEntry> = {},
): TimeEntry {
  const toIso = (hm: string) => {
    const [h, m] = hm.split(":").map(Number)
    const [y, mo, d] = day.split("-").map(Number)
    return new Date(y, mo - 1, d, h, m, 0, 0).toISOString()
  }
  const start = toIso(startHm)
  const stop = toIso(stopHm)
  return {
    id: String(id),
    workspaceId: "1",
    userId: "10",
    description: "work",
    projectId: "30",
    taskId: null,
    tagIds: [],
    billable: true,
    start,
    stop,
    duration: Math.round((new Date(stop).getTime() - new Date(start).getTime()) / 1000),
    duronly: false,
    sharedWith: [],
    createdWith: CREATED_WITH,
    sourceEventId: null,
    at: NOW_ISO,
    serverDeletedAt: null,
    ...extra,
  }
}
