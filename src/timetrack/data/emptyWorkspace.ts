/**
 * A brand-new, empty workspace.
 *
 * The page ships with no sample entries, projects, clients or tags — only the
 * things a workspace cannot exist without: the workspace record itself, you as
 * its single member, and default preferences.
 */

import {
  DEFAULT_IDLE,
  DEFAULT_POMODORO,
  DEFAULT_REMINDERS,
  STATE_VERSION,
} from "../config"
import { newId } from "../idService"
import type { TimetrackState } from "../types"

export function createEmptyWorkspace(nowIso: string): TimetrackState {
  const selfId = newId()
  const workspaceId = newId()

  return {
    version: STATE_VERSION,
    workspace: {
      id: workspaceId,
      name: "My Workspace",
      defaultCurrency: "EUR",
      defaultHourlyRate: null,
      defaultLabourCost: null,
      projectsBillableByDefault: false,
      onlyAdminsSeeBillableRates: false,
      rounding: { enabled: false, mode: "nearest", minutes: 15 },
      requiredFields: { project: false, task: false, tag: false, description: false },
      lockEntriesBefore: null,
      timesheetApprovalsEnabled: false,
      at: nowIso,
    },
    user: {
      name: "You",
      email: "",
      durationFormat: "improved",
      timeFormat: "h24",
      dateFormat: "YYYY-MM-DD",
      weekStart: 1,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      groupSimilarEntries: true,
      showTimelineRecorder: false,
    },
    members: [
      {
        id: selfId,
        workspaceId,
        name: "You",
        email: "",
        role: "admin",
        hourlyRate: null,
        labourCost: null,
        groupIds: [],
        active: true,
        isSelf: true,
        at: nowIso,
      },
    ],
    groups: [],
    clients: [],
    projects: [],
    tasks: [],
    tags: [],
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
    pomodoro: { ...DEFAULT_POMODORO },
    idle: { ...DEFAULT_IDLE },
    reminders: { ...DEFAULT_REMINDERS, days: [...DEFAULT_REMINDERS.days] },
  }
}
