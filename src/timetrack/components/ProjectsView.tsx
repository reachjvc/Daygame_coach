"use client"

/**
 * Projects: list, full project editor (color, client, privacy, billable rate
 * with history, estimates, auto-estimates, fixed fee, recurrence, alerts,
 * tasks, template flag) and the project dashboard with forecast.
 */

import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { ALERT_THRESHOLDS, CURRENCIES, PROJECT_COLORS, RECURRING_PERIODS } from "../config"
import { IconAdd, IconAlert, IconArchive, IconDelete, IconEdit, IconTrend } from "../icons"
import { buildProjectDashboard, paceVerdict, periodDaysRemaining } from "../projectDashboardService"
import {
  addDays,
  dateKey,
  formatCompact,
  formatDate,
  formatDuration,
  formatMoney,
  parseDurationInput,
} from "../timetrackFormatService"
import {
  createProject,
  createProjectFromTemplate,
  createTask,
  deleteProject,
  deleteTask,
  entriesInRange,
  liveEntries,
  projectEstimateSeconds,
  projectPeriod,
  sumSeconds,
  updateProject,
  updateTask,
} from "../timetrackService"
import type { AlertThreshold, Id, Project, RecurringPeriod, TimetrackState } from "../types"
import { MiniSelect } from "./pickers"
import {
  BurnUpChart,
  ColorDot,
  ConfirmButton,
  EmptyState,
  Field,
  Modal,
  ProgressBar,
  SectionCard,
  Segmented,
  StatTile,
  ToggleRow,
} from "./primitives"

export function ProjectsView({
  state,
  setState,
  nowSec,
  pushToast,
  focusProjectId,
  onFocusProject,
}: {
  state: TimetrackState
  setState: (updater: (current: TimetrackState) => TimetrackState) => void
  nowSec: number
  pushToast: (text: string, tone?: "info" | "error") => void
  focusProjectId: Id | null
  onFocusProject: (id: Id | null) => void
}) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<"active" | "archived" | "templates">("active")
  const [editing, setEditing] = useState<Project | "new" | null>(null)
  const todayKey = dateKey(new Date(nowSec * 1000))

  const projects = useMemo(() => {
    const text = query.trim().toLowerCase()
    return state.projects
      .filter((project) => {
        if (filter === "templates") return project.template
        if (filter === "archived") return !project.active && !project.template
        return project.active && !project.template
      })
      .filter((project) => !text || project.name.toLowerCase().includes(text))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [state.projects, query, filter])

  const focused = focusProjectId ? state.projects.find((p) => p.id === focusProjectId) ?? null : null

  if (focused) {
    return (
      <ProjectDashboardPanel
        state={state}
        setState={setState}
        project={focused}
        nowSec={nowSec}
        onBack={() => onFocusProject(null)}
        onEdit={() => setEditing(focused)}
        editing={editing}
        setEditing={setEditing}
        pushToast={pushToast}
      />
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search projects…"
          className="h-10 w-full sm:h-9 sm:w-[220px]"
        />
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { id: "active", label: "Active" },
            { id: "archived", label: "Archived" },
            { id: "templates", label: "Templates" },
          ]}
        />
        <Button size="sm" className="w-full sm:ml-auto sm:w-auto" onClick={() => setEditing("new")}>
          <IconAdd className="size-4" /> New project
        </Button>
      </div>

      {projects.length === 0 ? (
        <EmptyState title="No projects here" hint="Create one, or switch the filter above to see archived projects and templates." />
      ) : (
        <>
        {/* phones: one card per project */}
        <ul className="space-y-2 sm:hidden">
          {projects.map((project) => {
            const period = projectPeriod(project, todayKey)
            const tracked = sumSeconds(
              entriesInRange(liveEntries(state).filter((e) => e.projectId === project.id), period.start, period.end),
              nowSec,
            )
            const estimate = projectEstimateSeconds(state, project)
            return (
              <li key={project.id} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center gap-2">
                  <ColorDot color={project.color} />
                  <button
                    type="button"
                    onClick={() => onFocusProject(project.id)}
                    className="min-h-9 min-w-0 flex-1 truncate text-left text-sm font-medium"
                  >
                    {project.name}
                  </button>
                  <span className="shrink-0 text-sm tabular-nums">
                    {formatDuration(tracked, state.user.durationFormat)}
                  </span>
                  <Button size="icon-sm" variant="ghost" onClick={() => setEditing(project)} aria-label="Edit project">
                    <IconEdit className="size-4" />
                  </Button>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {state.clients.find((c) => c.id === project.clientId)?.name ?? "No client"}
                  {project.template && " · template"}
                  {project.recurring && ` · ${project.recurringPeriod}`}
                </p>
                {estimate && (
                  <div className="mt-2 space-y-1">
                    <ProgressBar value={tracked} max={estimate} color={project.color} />
                    <p className="text-[11px] text-muted-foreground">
                      {formatDuration(tracked, state.user.durationFormat)} of{" "}
                      {formatDuration(estimate, state.user.durationFormat)} this period
                    </p>
                  </div>
                )}
              </li>
            )
          })}
        </ul>

        <div className="hidden overflow-x-auto rounded-lg border border-border bg-card sm:block">
          <table className="w-full min-w-[880px] text-sm">
            <thead className="border-b border-border bg-secondary/30 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Project</th>
                <th className="px-3 py-2 text-left font-medium">Client</th>
                <th className="px-3 py-2 text-left font-medium">Tasks</th>
                <th className="px-3 py-2 text-left font-medium">Estimate (current period)</th>
                <th className="px-3 py-2 text-right font-medium">Tracked</th>
                <th className="px-3 py-2 text-right font-medium">Rate</th>
                <th className="px-3 py-2 text-left font-medium">Access</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {projects.map((project) => {
                const period = projectPeriod(project, todayKey)
                const tracked = sumSeconds(
                  entriesInRange(liveEntries(state).filter((e) => e.projectId === project.id), period.start, period.end),
                  nowSec,
                )
                const estimate = projectEstimateSeconds(state, project)
                const taskCount = state.tasks.filter((t) => t.projectId === project.id).length
                return (
                  <tr key={project.id} className="hover:bg-secondary/20">
                    <td className="px-3 py-2">
                      <button type="button" onClick={() => onFocusProject(project.id)} className="flex items-center gap-2 hover:underline">
                        <ColorDot color={project.color} />
                        <span className="font-medium">{project.name}</span>
                        {project.template && <span className="rounded bg-secondary px-1 text-[10px]">template</span>}
                        {project.recurring && <span className="rounded bg-secondary px-1 text-[10px]">{project.recurringPeriod}</span>}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {state.clients.find((c) => c.id === project.clientId)?.name ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{taskCount || "—"}</td>
                    <td className="px-3 py-2">
                      {estimate || project.estimatedAmount || project.fixedFee ? (
                        <div className="w-40 space-y-1">
                          <ProgressBar value={tracked} max={estimate ?? tracked} color={project.color} />
                          <p className="text-[11px] text-muted-foreground">
                            {estimate
                              ? `${formatDuration(tracked, state.user.durationFormat)} of ${formatDuration(estimate, state.user.durationFormat)}`
                              : project.estimatedAmount
                                ? `budget ${formatMoney(project.estimatedAmount, project.currency)}`
                                : `fixed fee ${formatMoney(project.fixedFee!, project.currency)}`}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatDuration(tracked, state.user.durationFormat)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                      {project.billable && project.rate != null ? formatMoney(project.rate, project.currency) : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {project.isPrivate ? "Private" : "Workspace"} · {project.memberIds.length} member
                      {project.memberIds.length === 1 ? "" : "s"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon-sm" variant="ghost" onClick={() => onFocusProject(project.id)} aria-label="Open dashboard">
                          <IconTrend className="size-4" />
                        </Button>
                        <Button size="icon-sm" variant="ghost" onClick={() => setEditing(project)} aria-label="Edit project">
                          <IconEdit className="size-4" />
                        </Button>
                        {project.template ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setState((current) => createProjectFromTemplate(current, project.id, `${project.name} copy`, new Date().toISOString()).state)
                              pushToast("Project created from template")
                            }}
                          >
                            Use
                          </Button>
                        ) : (
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() =>
                              setState((current) => updateProject(current, project.id, { active: !project.active }, new Date().toISOString()))
                            }
                            aria-label={project.active ? "Archive project" : "Restore project"}
                          >
                            <IconArchive className="size-4" />
                          </Button>
                        )}
                        <ConfirmButton size="icon-sm" onConfirm={() => setState((current) => deleteProject(current, project.id))}>
                          <IconDelete className="size-4" />
                        </ConfirmButton>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        </>
      )}

      {editing && (
        <ProjectDialog
          state={state}
          setState={setState}
          project={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          pushToast={pushToast}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Project editor
// ---------------------------------------------------------------------------

function ProjectDialog({
  state,
  setState,
  project,
  onClose,
  pushToast,
}: {
  state: TimetrackState
  setState: (updater: (current: TimetrackState) => TimetrackState) => void
  project: Project | null
  onClose: () => void
  pushToast: (text: string, tone?: "info" | "error") => void
}) {
  const todayKey = dateKey(new Date())
  const [draft, setDraft] = useState<Omit<Project, "id" | "workspaceId" | "at" | "createdAt">>(() => ({
    clientId: project?.clientId ?? null,
    name: project?.name ?? "",
    color: project?.color ?? PROJECT_COLORS[state.projects.length % PROJECT_COLORS.length],
    active: project?.active ?? true,
    isPrivate: project?.isPrivate ?? true,
    billable: project?.billable ?? state.workspace.projectsBillableByDefault,
    currency: project?.currency ?? state.workspace.defaultCurrency,
    rate: project?.rate ?? null,
    rateHistory: project?.rateHistory ?? [],
    estimateType: project?.estimateType ?? "hours",
    estimatedSeconds: project?.estimatedSeconds ?? null,
    estimatedAmount: project?.estimatedAmount ?? null,
    autoEstimates: project?.autoEstimates ?? false,
    fixedFee: project?.fixedFee ?? null,
    recurring: project?.recurring ?? false,
    recurringPeriod: project?.recurringPeriod ?? null,
    recurringStart: project?.recurringStart ?? todayKey,
    startDate: project?.startDate ?? null,
    endDate: project?.endDate ?? null,
    template: project?.template ?? false,
    alerts: project?.alerts ?? [],
    memberIds: project?.memberIds ?? state.members.filter((m) => m.isSelf).map((m) => m.id),
  }))
  const [estimateInput, setEstimateInput] = useState(
    project?.estimatedSeconds ? String(project.estimatedSeconds / 3600) : "",
  )
  const [newTask, setNewTask] = useState("")
  const tasks = project ? state.tasks.filter((t) => t.projectId === project.id) : []

  const save = () => {
    if (!draft.name.trim()) {
      pushToast("Project needs a name", "error")
      return
    }
    const estimateSeconds = estimateInput.trim() ? parseDurationInput(`${estimateInput}h`) : null
    const payload = { ...draft, estimatedSeconds: draft.estimateType === "hours" ? estimateSeconds : null }
    setState((current) =>
      project
        ? updateProject(current, project.id, payload, new Date().toISOString())
        : createProject(current, payload, new Date().toISOString()).state,
    )
    pushToast(project ? "Project updated" : "Project created")
    onClose()
  }

  const toggleAlert = (basis: "estimate" | "fixed_fee", threshold: AlertThreshold) => {
    const existing = draft.alerts.find((a) => a.basis === basis && a.threshold === threshold)
    setDraft({
      ...draft,
      alerts: existing
        ? draft.alerts.filter((a) => a !== existing)
        : [...draft.alerts, { id: Date.now() + threshold, basis, threshold, enabled: true }],
    })
  }

  return (
    <Modal
      wide
      title={project ? `Edit ${project.name}` : "New project"}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={save}>
            {project ? "Save project" : "Create project"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} autoFocus />
        </Field>
        <Field label="Client">
          <MiniSelect
            value={draft.clientId === null ? "none" : String(draft.clientId)}
            onChange={(value) => setDraft({ ...draft, clientId: value === "none" ? null : Number(value) })}
            options={[{ id: "none", label: "No client" }, ...state.clients.map((c) => ({ id: String(c.id), label: c.name }))]}
          />
        </Field>

        <Field label="Color" className="sm:col-span-2">
          <div className="flex flex-wrap gap-1.5">
            {PROJECT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setDraft({ ...draft, color })}
                aria-label={`Color ${color}`}
                className={cn("size-6 rounded-full border-2", draft.color === color ? "border-foreground" : "border-transparent")}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </Field>

        <div className="space-y-1 sm:col-span-2">
          <ToggleRow label="Billable by default" checked={draft.billable} onChange={(billable) => setDraft({ ...draft, billable })} />
          <ToggleRow
            label="Private project"
            hint="Only the members you add below can see it"
            checked={draft.isPrivate}
            onChange={(isPrivate) => setDraft({ ...draft, isPrivate })}
          />
          <ToggleRow
            label="Use as template"
            hint="Templates can be copied into new projects, tasks included"
            checked={draft.template}
            onChange={(template) => setDraft({ ...draft, template })}
          />
        </div>

        <Field label="Hourly rate" className="w-full sm:w-48">
          <Input
            type="number"
            value={draft.rate ?? ""}
            onChange={(event) => setDraft({ ...draft, rate: event.target.value ? Number(event.target.value) : null })}
            placeholder="Falls back to the member or workspace rate"
          />
        </Field>
        <Field label="Currency" className="w-full sm:w-40">
          <MiniSelect
            value={draft.currency}
            onChange={(currency) => setDraft({ ...draft, currency })}
            options={CURRENCIES.map((c) => ({ id: c, label: c }))}
          />
        </Field>

        {draft.rateHistory.length > 0 && (
          <div className="sm:col-span-2 rounded-md border border-border p-2 text-xs text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">Rate history</p>
            {[...draft.rateHistory]
              .sort((a, b) => (a.validFrom < b.validFrom ? 1 : -1))
              .map((period) => (
                <p key={period.validFrom}>
                  from {formatDate(period.validFrom, state.user.dateFormat)} → {formatMoney(period.rate, draft.currency)}/h
                </p>
              ))}
            <p className="mt-1">Entries keep the rate that applied on their start date.</p>
          </div>
        )}

        <Field label="Estimate type">
          <Segmented
            value={draft.estimateType}
            onChange={(estimateType) => setDraft({ ...draft, estimateType })}
            options={[
              { id: "hours", label: "Hours" },
              { id: "monetary", label: "Monetary" },
            ]}
          />
        </Field>
        {draft.estimateType === "hours" ? (
          <Field label="Estimated hours" className="w-40" hint="Leave empty for no estimate">
            <Input
              value={estimateInput}
              onChange={(event) => setEstimateInput(event.target.value)}
              placeholder="e.g. 40"
              disabled={draft.autoEstimates}
            />
          </Field>
        ) : (
          <Field label="Monetary budget" className="w-full sm:w-48">
            <Input
              type="number"
              value={draft.estimatedAmount ?? ""}
              onChange={(event) =>
                setDraft({ ...draft, estimatedAmount: event.target.value ? Number(event.target.value) : null })
              }
            />
          </Field>
        )}

        <div className="space-y-1 sm:col-span-2">
          <ToggleRow
            label="Auto-estimates"
            hint="Add up the task estimates instead of setting one for the project"
            checked={draft.autoEstimates}
            onChange={(autoEstimates) => setDraft({ ...draft, autoEstimates })}
          />
          <ToggleRow
            label="Recurring estimate"
            hint="Start the estimate over every period"
            checked={draft.recurring}
            onChange={(recurring) => setDraft({ ...draft, recurring, recurringPeriod: recurring ? draft.recurringPeriod ?? "monthly" : null })}
          />
        </div>

        {draft.recurring && (
          <>
            <Field label="Period">
              <MiniSelect
                value={draft.recurringPeriod ?? "monthly"}
                onChange={(value) => setDraft({ ...draft, recurringPeriod: value as RecurringPeriod })}
                options={RECURRING_PERIODS.map((p) => ({ id: p.id, label: p.label }))}
              />
            </Field>
            <Field label="First period starts">
              <Input
                type="date"
                value={draft.recurringStart ?? todayKey}
                onChange={(event) => setDraft({ ...draft, recurringStart: event.target.value })}
              />
            </Field>
          </>
        )}

        <Field label="Fixed fee" className="w-full sm:w-48">
          <Input
            type="number"
            value={draft.fixedFee ?? ""}
            onChange={(event) => setDraft({ ...draft, fixedFee: event.target.value ? Number(event.target.value) : null })}
            placeholder="Retainer or fixed price"
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Start date">
            <Input
              type="date"
              value={draft.startDate ?? ""}
              onChange={(event) => setDraft({ ...draft, startDate: event.target.value || null })}
            />
          </Field>
          <Field label="End date">
            <Input
              type="date"
              value={draft.endDate ?? ""}
              onChange={(event) => setDraft({ ...draft, endDate: event.target.value || null })}
            />
          </Field>
        </div>

        <Field label="Alerts" className="sm:col-span-2" hint="Each one fires once per period, the first time you cross it">
          <div className="space-y-2">
            {(["estimate", "fixed_fee"] as const).map((basis) => (
              <div key={basis} className="flex flex-wrap items-center gap-1.5">
                <span className="w-24 text-xs text-muted-foreground">{basis === "estimate" ? "Estimate" : "Fixed fee"}</span>
                {ALERT_THRESHOLDS.map((threshold) => {
                  const active = draft.alerts.some((a) => a.basis === basis && a.threshold === threshold)
                  return (
                    <button
                      key={threshold}
                      type="button"
                      onClick={() => toggleAlert(basis, threshold)}
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-xs",
                        active ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground",
                      )}
                    >
                      {threshold}%
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </Field>

        <Field label="Members with access" className="sm:col-span-2">
          <div className="flex flex-wrap gap-1.5">
            {state.members.map((member) => {
              const active = draft.memberIds.includes(member.id)
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      memberIds: active ? draft.memberIds.filter((id) => id !== member.id) : [...draft.memberIds, member.id],
                    })
                  }
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-xs",
                    active ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground",
                  )}
                >
                  {member.name}
                </button>
              )
            })}
          </div>
        </Field>

        {project && (
          <div className="sm:col-span-2 space-y-2 rounded-md border border-border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tasks</p>
            {tasks.length === 0 && <p className="text-xs text-muted-foreground">No tasks yet.</p>}
            {tasks.map((task) => (
              <div key={task.id} className="flex flex-wrap items-center gap-2">
                <Input
                  value={task.name}
                  onChange={(event) => setState((current) => updateTask(current, task.id, { name: event.target.value }))}
                  className="h-8 w-[180px]"
                />
                <Input
                  value={task.estimatedSeconds ? String(task.estimatedSeconds / 3600) : ""}
                  onChange={(event) =>
                    setState((current) =>
                      updateTask(current, task.id, {
                        estimatedSeconds: event.target.value ? Number(event.target.value) * 3600 : null,
                      }),
                    )
                  }
                  placeholder="Est. hours"
                  className="h-8 w-[80px]"
                />
                <MiniSelect
                  className="w-[140px]"
                  value={task.assigneeId === null ? "none" : String(task.assigneeId)}
                  onChange={(value) =>
                    setState((current) => updateTask(current, task.id, { assigneeId: value === "none" ? null : Number(value) }))
                  }
                  options={[{ id: "none", label: "Unassigned" }, ...state.members.map((m) => ({ id: String(m.id), label: m.name }))]}
                />
                <ToggleRow
                  label={task.active ? "Active" : "Done"}
                  checked={task.active}
                  onChange={(active) => setState((current) => updateTask(current, task.id, { active }))}
                />
                <ConfirmButton size="icon-sm" onConfirm={() => setState((current) => deleteTask(current, task.id))}>
                  <IconDelete className="size-4" />
                </ConfirmButton>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                value={newTask}
                onChange={(event) => setNewTask(event.target.value)}
                placeholder="New task name"
                className="h-8"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (!newTask.trim()) return
                  setState((current) => createTask(current, { projectId: project.id, name: newTask.trim() }, new Date().toISOString()).state)
                  setNewTask("")
                }}
              >
                Add task
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Project dashboard
// ---------------------------------------------------------------------------

function ProjectDashboardPanel({
  state,
  setState,
  project,
  nowSec,
  onBack,
  onEdit,
  editing,
  setEditing,
  pushToast,
}: {
  state: TimetrackState
  setState: (updater: (current: TimetrackState) => TimetrackState) => void
  project: Project
  nowSec: number
  onBack: () => void
  onEdit: () => void
  editing: Project | "new" | null
  setEditing: (value: Project | "new" | null) => void
  pushToast: (text: string, tone?: "info" | "error") => void
}) {
  const [periodOffset, setPeriodOffset] = useState(0)
  const todayKey = dateKey(new Date(nowSec * 1000))
  // Stepping the reference date back moves the dashboard to an earlier period
  const referenceDay = useMemo(() => {
    if (periodOffset === 0) return todayKey
    const span = projectPeriod(project, todayKey)
    const length = Math.max(1, Math.round((new Date(span.end).getTime() - new Date(span.start).getTime()) / 86_400_000) + 1)
    return addDays(todayKey, periodOffset * length)
  }, [periodOffset, project, todayKey])

  const dashboard = buildProjectDashboard(state, project.id, referenceDay, nowSec)
  if (!dashboard) return <EmptyState title="Project not found" />

  const verdict = paceVerdict(dashboard, todayKey)
  const currency = project.currency

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← All projects
        </Button>
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <ColorDot color={project.color} size={10} />
          {project.name}
        </h2>
        <span className="text-xs text-muted-foreground">
          {state.clients.find((c) => c.id === project.clientId)?.name ?? "No client"}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPeriodOffset((o) => o - 1)}>
            Previous period
          </Button>
          {periodOffset !== 0 && (
            <Button variant="ghost" size="sm" onClick={() => setPeriodOffset(0)}>
              Current
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onEdit}>
            <IconEdit className="size-4" /> Edit
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Period {formatDate(dashboard.periodStart, state.user.dateFormat)} → {formatDate(dashboard.periodEnd, state.user.dateFormat)}
        {project.recurring ? ` · recurring ${project.recurringPeriod}` : ""} ·{" "}
        {periodDaysRemaining(dashboard, todayKey)} days remaining
      </p>

      {dashboard.triggeredThresholds.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
          <IconAlert className="size-4 text-destructive" />
          Alert thresholds crossed: {dashboard.triggeredThresholds.map((t) => `${t}%`).join(", ")}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatTile label="Tracked" value={formatDuration(dashboard.trackedSeconds, state.user.durationFormat)} sub={verdict.label} />
        <StatTile
          label="Estimate used"
          value={`${Math.round(dashboard.completionPct)}%`}
          sub={
            dashboard.estimatedSeconds
              ? `of ${formatDuration(dashboard.estimatedSeconds, state.user.durationFormat)}`
              : dashboard.estimatedAmount
                ? `of ${formatMoney(dashboard.estimatedAmount, currency)}`
                : "no estimate"
          }
          tone={dashboard.completionPct >= 100 ? "negative" : "default"}
        />
        <StatTile label="Revenue" value={formatMoney(dashboard.revenue, currency)} sub={`cost ${formatMoney(dashboard.cost, currency)}`} />
        <StatTile
          label="Profit"
          value={formatMoney(dashboard.profit, currency)}
          sub={dashboard.fixedFee ? `fixed fee ${formatMoney(dashboard.fixedFee, currency)}` : undefined}
          tone={dashboard.profit >= 0 ? "positive" : "negative"}
        />
      </div>

      <SectionCard
        title="Burn-up and forecast"
        description={
          dashboard.projectedEndDate
            ? `At the current pace the estimate is reached on ${formatDate(dashboard.projectedEndDate, state.user.dateFormat)}`
            : "Set an estimate to see a projected end date"
        }
      >
        <BurnUpChart
          actual={dashboard.burnUp}
          forecast={dashboard.forecast}
          target={dashboard.estimatedSeconds}
          formatValue={(value) => formatCompact(value)}
        />
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="By task">
          {dashboard.taskBreakdown.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nothing tracked in this period.</p>
          ) : (
            <ul className="space-y-2">
              {dashboard.taskBreakdown.map((row) => (
                <li key={String(row.taskId)} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="truncate">{row.label}</span>
                    <span className="tabular-nums">{formatDuration(row.seconds, state.user.durationFormat)}</span>
                  </div>
                  <ProgressBar value={row.seconds} max={dashboard.trackedSeconds} color={project.color} height={4} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
        <SectionCard title="By member">
          {dashboard.memberBreakdown.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nothing tracked in this period.</p>
          ) : (
            <ul className="space-y-2">
              {dashboard.memberBreakdown.map((row) => (
                <li key={row.memberId} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="truncate">{row.label}</span>
                    <span className="tabular-nums">{formatDuration(row.seconds, state.user.durationFormat)}</span>
                  </div>
                  <ProgressBar value={row.seconds} max={dashboard.trackedSeconds} color={project.color} height={4} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {editing && (
        <ProjectDialog
          state={state}
          setState={setState}
          project={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          pushToast={pushToast}
        />
      )}
    </div>
  )
}
