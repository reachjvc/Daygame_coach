/**
 * Seed workspace for the time-tracking sandbox.
 * Deterministic (fixed PRNG seed) so reloads produce the same demo history.
 */

import {
  DEFAULT_IDLE,
  DEFAULT_POMODORO,
  DEFAULT_REMINDERS,
  PROJECT_COLORS,
  SEED_CREATED_WITH,
  STATE_VERSION,
} from "../config"
import { addDays, dateKey, dateKeyToDate, epochSeconds } from "../timetrackFormatService"
import type { Project, TimeEntry, TimetrackState } from "../types"

/** Mulberry32 — small deterministic PRNG */
function makeRandom(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createSeedState(nowIso: string): TimetrackState {
  const today = dateKey(nowIso)
  const random = makeRandom(20260810)
  let id = 1
  const nextId = () => id++

  const selfId = nextId()
  const mateId = nextId()
  const contractorId = nextId()
  const groupCoreId = nextId()

  const clientAcme = nextId()
  const clientInternal = nextId()

  const projectApp = nextId()
  const projectPipeline = nextId()
  const projectContent = nextId()
  const projectAdmin = nextId()
  const projectRetainer = nextId()

  const taskFrontend = nextId()
  const taskBackend = nextId()
  const taskReview = nextId()
  const taskTranscripts = nextId()
  const taskEditing = nextId()

  const tagDeep = nextId()
  const tagMeeting = nextId()
  const tagAdmin = nextId()
  const tagBug = nextId()

  const projects: Project[] = [
    {
      id: projectApp,
      workspaceId: 1,
      clientId: clientAcme,
      name: "Coach App Build",
      color: PROJECT_COLORS[0],
      active: true,
      isPrivate: false,
      billable: true,
      currency: "EUR",
      rate: 95,
      rateHistory: [
        { validFrom: addDays(today, -180), rate: 80 },
        { validFrom: addDays(today, -30), rate: 95 },
      ],
      estimateType: "hours",
      estimatedSeconds: 120 * 3600,
      estimatedAmount: null,
      autoEstimates: false,
      fixedFee: null,
      recurring: false,
      recurringPeriod: null,
      recurringStart: null,
      startDate: addDays(today, -45),
      endDate: addDays(today, 30),
      template: false,
      alerts: [
        { id: nextId(), basis: "estimate", threshold: 75, enabled: true },
        { id: nextId(), basis: "estimate", threshold: 100, enabled: true },
      ],
      memberIds: [selfId, mateId],
      at: nowIso,
      createdAt: addDays(today, -45) + "T09:00:00.000Z",
    },
    {
      id: projectPipeline,
      workspaceId: 1,
      clientId: clientInternal,
      name: "Training Pipeline",
      color: PROJECT_COLORS[5],
      active: true,
      isPrivate: false,
      billable: false,
      currency: "EUR",
      rate: null,
      rateHistory: [],
      estimateType: "hours",
      estimatedSeconds: 40 * 3600,
      estimatedAmount: null,
      autoEstimates: true,
      fixedFee: null,
      recurring: true,
      recurringPeriod: "monthly",
      recurringStart: addDays(today, -75),
      startDate: null,
      endDate: null,
      template: false,
      alerts: [{ id: nextId(), basis: "estimate", threshold: 90, enabled: true }],
      memberIds: [selfId],
      at: nowIso,
      createdAt: addDays(today, -75) + "T09:00:00.000Z",
    },
    {
      id: projectContent,
      workspaceId: 1,
      clientId: clientAcme,
      name: "Content & Research",
      color: PROJECT_COLORS[2],
      active: true,
      isPrivate: false,
      billable: true,
      currency: "EUR",
      rate: 70,
      rateHistory: [{ validFrom: addDays(today, -90), rate: 70 }],
      estimateType: "monetary",
      estimatedSeconds: null,
      estimatedAmount: 6000,
      autoEstimates: false,
      fixedFee: null,
      recurring: false,
      recurringPeriod: null,
      recurringStart: null,
      startDate: addDays(today, -60),
      endDate: null,
      template: false,
      alerts: [{ id: nextId(), basis: "estimate", threshold: 80, enabled: true }],
      memberIds: [selfId, contractorId],
      at: nowIso,
      createdAt: addDays(today, -60) + "T09:00:00.000Z",
    },
    {
      id: projectAdmin,
      workspaceId: 1,
      clientId: clientInternal,
      name: "Admin & Overhead",
      color: PROJECT_COLORS[13],
      active: true,
      isPrivate: true,
      billable: false,
      currency: "EUR",
      rate: null,
      rateHistory: [],
      estimateType: "hours",
      estimatedSeconds: null,
      estimatedAmount: null,
      autoEstimates: false,
      fixedFee: null,
      recurring: false,
      recurringPeriod: null,
      recurringStart: null,
      startDate: null,
      endDate: null,
      template: false,
      alerts: [],
      memberIds: [selfId],
      at: nowIso,
      createdAt: addDays(today, -120) + "T09:00:00.000Z",
    },
    {
      id: projectRetainer,
      workspaceId: 1,
      clientId: clientAcme,
      name: "Acme Retainer (fixed fee)",
      color: PROJECT_COLORS[3],
      active: true,
      isPrivate: false,
      billable: true,
      currency: "EUR",
      rate: 110,
      rateHistory: [{ validFrom: addDays(today, -30), rate: 110 }],
      estimateType: "hours",
      estimatedSeconds: 20 * 3600,
      estimatedAmount: null,
      autoEstimates: false,
      fixedFee: 4000,
      recurring: true,
      recurringPeriod: "monthly",
      recurringStart: addDays(today, -60),
      startDate: null,
      endDate: null,
      template: false,
      alerts: [{ id: nextId(), basis: "fixed_fee", threshold: 75, enabled: true }],
      memberIds: [selfId, mateId],
      at: nowIso,
      createdAt: addDays(today, -60) + "T09:00:00.000Z",
    },
  ]

  // --- demo history: 24 days of plausible tracking -------------------------
  const entries: TimeEntry[] = []
  const patterns = [
    { projectId: projectApp, taskId: taskFrontend, description: "Timer UI polish", tagIds: [tagDeep], billable: true, hours: [2, 3.5] },
    { projectId: projectApp, taskId: taskBackend, description: "Reports aggregation", tagIds: [tagDeep], billable: true, hours: [1.5, 3] },
    { projectId: projectApp, taskId: taskReview, description: "Code review", tagIds: [tagMeeting], billable: true, hours: [0.5, 1] },
    { projectId: projectPipeline, taskId: taskTranscripts, description: "Transcript QA pass", tagIds: [tagDeep], billable: false, hours: [1, 2.5] },
    { projectId: projectContent, taskId: taskEditing, description: "Draft article edits", tagIds: [], billable: true, hours: [1, 2] },
    { projectId: projectAdmin, taskId: null, description: "Inbox & invoices", tagIds: [tagAdmin], billable: false, hours: [0.25, 0.75] },
    { projectId: projectRetainer, taskId: null, description: "Client sync", tagIds: [tagMeeting], billable: true, hours: [0.5, 1.5] },
    { projectId: projectApp, taskId: taskBackend, description: "Fix rounding bug", tagIds: [tagBug], billable: true, hours: [0.5, 1.5] },
  ]

  const nowDate = new Date(nowIso)
  const nowMinutes = nowDate.getHours() * 60 + nowDate.getMinutes()
  let runningCreated = false

  for (let dayOffset = 24; dayOffset >= 0; dayOffset--) {
    const day = addDays(today, -dayOffset)
    const weekday = dateKeyToDate(day).getDay()
    if (weekday === 0) continue
    if (weekday === 6 && random() > 0.4) continue

    // Today starts early enough that at least one block lands before "now",
    // so the demo never shows time tracked in the future
    let clock =
      dayOffset === 0
        ? Math.min(9 + random() * 1.5, Math.max(0.25, nowMinutes / 60 - 1.25))
        : 9 + random() * 1.5
    const blocks = 2 + Math.floor(random() * 4)
    for (let b = 0; b < blocks; b++) {
      const pattern = patterns[Math.floor(random() * patterns.length)]
      const [min, max] = pattern.hours
      const hours = min + random() * (max - min)
      const start = dateKeyToDate(day)
      start.setHours(0, 0, 0, 0)
      start.setMinutes(Math.round(clock * 60))
      const stop = new Date(start.getTime() + hours * 3600 * 1000)
      if (stop.getHours() >= 19) break
      // Never begin a block in the future
      if (dayOffset === 0 && start.getTime() >= nowDate.getTime()) break

      // The block that would run past "now" is the live one
      const isRunningBlock = dayOffset === 0 && stop.getTime() >= nowDate.getTime()
      const startIso = start.toISOString()
      const stopIso = isRunningBlock ? null : stop.toISOString()
      const userId = random() > 0.82 ? (random() > 0.5 ? mateId : contractorId) : selfId

      entries.push({
        id: nextId(),
        workspaceId: 1,
        userId,
        description: pattern.description,
        projectId: pattern.projectId,
        taskId: pattern.taskId,
        tagIds: [...pattern.tagIds],
        billable: pattern.billable,
        start: startIso,
        stop: stopIso,
        duration: stopIso ? Math.round((stop.getTime() - start.getTime()) / 1000) : -epochSeconds(startIso),
        duronly: false,
        sharedWith: [],
        createdWith: SEED_CREATED_WITH,
        sourceEventId: null,
        at: nowIso,
        serverDeletedAt: null,
      })

      if (isRunningBlock) {
        runningCreated = true
        break
      }
      clock += hours + 0.25 + random() * 0.75
      if (clock > 18) break
    }
  }

  // The sandbox should open with a live timer, so make sure today has one
  if (!runningCreated) {
    const pattern = patterns[0]
    const start = new Date(nowDate.getTime() - (10 + Math.round(random() * 25)) * 60_000)
    entries.push({
      id: nextId(),
      workspaceId: 1,
      userId: selfId,
      description: pattern.description,
      projectId: pattern.projectId,
      taskId: pattern.taskId,
      tagIds: [...pattern.tagIds],
      billable: pattern.billable,
      start: start.toISOString(),
      stop: null,
      duration: -epochSeconds(start.toISOString()),
      duronly: false,
      sharedWith: [],
      createdWith: SEED_CREATED_WITH,
      sourceEventId: null,
      at: nowIso,
      serverDeletedAt: null,
    })
  }

  return {
    version: STATE_VERSION,
    workspace: {
      id: 1,
      name: "My Workspace",
      defaultCurrency: "EUR",
      defaultHourlyRate: 75,
      defaultLabourCost: 45,
      projectsBillableByDefault: true,
      onlyAdminsSeeBillableRates: false,
      rounding: { enabled: false, mode: "nearest", minutes: 15 },
      requiredFields: { project: false, task: false, tag: false, description: false },
      lockEntriesBefore: null,
      timesheetApprovalsEnabled: false,
      at: nowIso,
    },
    user: {
      name: "You",
      email: "you@example.com",
      durationFormat: "improved",
      timeFormat: "h24",
      dateFormat: "YYYY-MM-DD",
      weekStart: 1,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      groupSimilarEntries: true,
      showTimelineRecorder: false,
    },
    members: [
      { id: selfId, workspaceId: 1, name: "You", email: "you@example.com", role: "admin", hourlyRate: 95, labourCost: 45, groupIds: [groupCoreId], active: true, isSelf: true, at: nowIso },
      { id: mateId, workspaceId: 1, name: "Sam Rivera", email: "sam@example.com", role: "manager", hourlyRate: 85, labourCost: 55, groupIds: [groupCoreId], active: true, isSelf: false, at: nowIso },
      { id: contractorId, workspaceId: 1, name: "Kai Lund", email: "kai@example.com", role: "basic", hourlyRate: 60, labourCost: 38, groupIds: [], active: true, isSelf: false, at: nowIso },
    ],
    groups: [{ id: groupCoreId, workspaceId: 1, name: "Core team", at: nowIso }],
    clients: [
      { id: clientAcme, workspaceId: 1, name: "Acme Studio", archived: false, at: nowIso },
      { id: clientInternal, workspaceId: 1, name: "Internal", archived: false, at: nowIso },
    ],
    projects,
    tasks: [
      { id: taskFrontend, workspaceId: 1, projectId: projectApp, name: "Frontend", estimatedSeconds: 60 * 3600, assigneeId: selfId, rate: null, active: true, at: nowIso },
      { id: taskBackend, workspaceId: 1, projectId: projectApp, name: "Backend", estimatedSeconds: 40 * 3600, assigneeId: selfId, rate: 110, active: true, at: nowIso },
      { id: taskReview, workspaceId: 1, projectId: projectApp, name: "Review", estimatedSeconds: 20 * 3600, assigneeId: mateId, rate: null, active: true, at: nowIso },
      { id: taskTranscripts, workspaceId: 1, projectId: projectPipeline, name: "Transcripts", estimatedSeconds: 25 * 3600, assigneeId: selfId, rate: null, active: true, at: nowIso },
      { id: taskEditing, workspaceId: 1, projectId: projectContent, name: "Editing", estimatedSeconds: 15 * 3600, assigneeId: contractorId, rate: null, active: true, at: nowIso },
    ],
    tags: [
      { id: tagDeep, workspaceId: 1, name: "deep work", at: nowIso },
      { id: tagMeeting, workspaceId: 1, name: "meeting", at: nowIso },
      { id: tagAdmin, workspaceId: 1, name: "admin", at: nowIso },
      { id: tagBug, workspaceId: 1, name: "bug", at: nowIso },
    ],
    entries,
    favorites: [
      { id: nextId(), draft: { description: "Timer UI polish", projectId: projectApp, taskId: taskFrontend, tagIds: [tagDeep], billable: true }, at: nowIso },
      { id: nextId(), draft: { description: "Inbox & invoices", projectId: projectAdmin, taskId: null, tagIds: [tagAdmin], billable: false }, at: nowIso },
      { id: nextId(), draft: { description: "Client sync", projectId: projectRetainer, taskId: null, tagIds: [tagMeeting], billable: true }, at: nowIso },
    ],
    calendars: [],
    events: [],
    savedReports: [],
    alerts: [],
    approvals: [],
    autotrackers: [
      { id: nextId(), keyword: "invoice", projectId: projectAdmin, taskId: null, tagIds: [tagAdmin], enabled: true },
      { id: nextId(), keyword: "review", projectId: projectApp, taskId: taskReview, tagIds: [tagMeeting], enabled: true },
    ],
    webhooks: [],
    webhookLog: [],
    timeline: [],
    pomodoro: { ...DEFAULT_POMODORO },
    idle: { ...DEFAULT_IDLE },
    reminders: { ...DEFAULT_REMINDERS, days: [...DEFAULT_REMINDERS.days] },
    nextId: id,
  }
}
