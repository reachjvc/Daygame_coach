"use client"

/**
 * Clients, Tags and Team screens — including access levels, per-member billable
 * and cost rates, groups, the member audit and timesheet approvals.
 */

import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { AUDIT_BUCKETS } from "../config"
import { IconAdd, IconArchive, IconDelete } from "../icons"
import { addDays, dateKey, formatDate, formatDuration, weekStartOf } from "../timetrackFormatService"
import {
  approvalFor,
  auditMembers,
  addClient,
  createGroup,
  createMember,
  createTag,
  deleteClient,
  deleteGroup,
  deleteMember,
  deleteTag,
  entriesInRange,
  liveEntries,
  setApprovalStatus,
  sumSeconds,
  tagUsageCount,
  updateClient,
  updateMember,
  updateTag,
} from "../timetrackService"
import type { MemberRole, TimetrackState } from "../types"
import { MiniSelect } from "./pickers"
import { ConfirmButton, EmptyState, SectionCard, Segmented } from "./primitives"

type ManageTab = "clients" | "tags" | "team"

export function ManageView({
  state,
  setState,
  nowSec,
  pushToast,
  tab,
  setTab,
}: {
  state: TimetrackState
  setState: (updater: (current: TimetrackState) => TimetrackState) => void
  nowSec: number
  pushToast: (text: string, tone?: "info" | "error") => void
  tab: ManageTab
  setTab: (tab: ManageTab) => void
}) {
  return (
    <div className="space-y-4">
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { id: "clients", label: "Clients" },
          { id: "tags", label: "Tags" },
          { id: "team", label: "Team" },
        ]}
      />
      {tab === "clients" && <ClientsPanel state={state} setState={setState} nowSec={nowSec} />}
      {tab === "tags" && <TagsPanel state={state} setState={setState} />}
      {tab === "team" && <TeamPanel state={state} setState={setState} nowSec={nowSec} pushToast={pushToast} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

function ClientsPanel({
  state,
  setState,
  nowSec,
}: {
  state: TimetrackState
  setState: (updater: (current: TimetrackState) => TimetrackState) => void
  nowSec: number
}) {
  const [name, setName] = useState("")

  return (
    <SectionCard
      title="Clients"
      description="Group projects under the client they belong to."
      actions={
        <div className="flex gap-2">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="New client" className="h-8 w-[180px]" />
          <Button
            size="sm"
            onClick={() => {
              if (!name.trim()) return
              setState((current) => addClient(current, name.trim(), new Date().toISOString()).state)
              setName("")
            }}
          >
            <IconAdd className="size-4" /> Add
          </Button>
        </div>
      }
    >
      {state.clients.length === 0 ? (
        <EmptyState title="No clients yet" />
      ) : (
        <ul className="divide-y divide-border">
          {state.clients.map((client) => {
            const projectIds = state.projects.filter((p) => p.clientId === client.id).map((p) => p.id)
            const tracked = sumSeconds(
              liveEntries(state).filter((e) => e.projectId !== null && projectIds.includes(e.projectId)),
              nowSec,
            )
            return (
              <li key={client.id} className="flex flex-wrap items-center gap-2 py-2">
                <Input
                  value={client.name}
                  onChange={(event) => setState((current) => updateClient(current, client.id, { name: event.target.value }))}
                  className={cn("h-8 w-[220px]", client.archived && "opacity-60")}
                />
                <span className="text-xs text-muted-foreground">
                  {projectIds.length} project{projectIds.length === 1 ? "" : "s"} · {formatDuration(tracked, state.user.durationFormat)} tracked
                </span>
                <div className="ml-auto flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setState((current) => updateClient(current, client.id, { archived: !client.archived }))}
                  >
                    <IconArchive className="size-4" /> {client.archived ? "Restore" : "Archive"}
                  </Button>
                  <ConfirmButton size="icon-sm" onConfirm={() => setState((current) => deleteClient(current, client.id))}>
                    <IconDelete className="size-4" />
                  </ConfirmButton>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

function TagsPanel({
  state,
  setState,
}: {
  state: TimetrackState
  setState: (updater: (current: TimetrackState) => TimetrackState) => void
}) {
  const [name, setName] = useState("")

  return (
    <SectionCard
      title="Tags"
      description="Renaming a tag updates every entry that uses it; deleting removes it from those entries."
      actions={
        <div className="flex gap-2">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="New tag" className="h-8 w-[160px]" />
          <Button
            size="sm"
            onClick={() => {
              if (!name.trim()) return
              setState((current) => createTag(current, name.trim(), new Date().toISOString()).state)
              setName("")
            }}
          >
            <IconAdd className="size-4" /> Add
          </Button>
        </div>
      }
    >
      {state.tags.length === 0 ? (
        <EmptyState title="No tags yet" />
      ) : (
        <ul className="divide-y divide-border">
          {state.tags.map((tag) => (
            <li key={tag.id} className="flex items-center gap-2 py-2">
              <Input
                value={tag.name}
                onChange={(event) => setState((current) => updateTag(current, tag.id, event.target.value))}
                className="h-8 w-[220px]"
              />
              <span className="text-xs text-muted-foreground">used on {tagUsageCount(state, tag.id)} entries</span>
              <ConfirmButton size="icon-sm" onConfirm={() => setState((current) => deleteTag(current, tag.id))}>
                <IconDelete className="size-4" />
              </ConfirmButton>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------

function TeamPanel({
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
  const [invite, setInvite] = useState({ name: "", email: "" })
  const [groupName, setGroupName] = useState("")
  const [auditBucket, setAuditBucket] = useState<string>("under_10")
  const todayKey = dateKey(new Date(nowSec * 1000))
  const weekStart = weekStartOf(todayKey, state.user.weekStart)
  const [approvalWeek, setApprovalWeek] = useState(weekStart)

  const auditRange = useMemo(() => ({ start: weekStart, end: addDays(weekStart, 6) }), [weekStart])
  const bucket = AUDIT_BUCKETS.find((b) => b.id === auditBucket)!
  const audit = auditMembers(state, auditRange, bucket.maxHours, nowSec)

  return (
    <div className="space-y-4">
      <SectionCard
        title="Members"
        description="Access levels mirror Toggl: basic tracks time, manager sees team reports, admin manages the workspace."
        actions={
          <div className="flex flex-wrap gap-2">
            <Input
              value={invite.name}
              onChange={(event) => setInvite({ ...invite, name: event.target.value })}
              placeholder="Name"
              className="h-8 w-[130px]"
            />
            <Input
              value={invite.email}
              onChange={(event) => setInvite({ ...invite, email: event.target.value })}
              placeholder="email@example.com"
              className="h-8 w-[180px]"
            />
            <Button
              size="sm"
              onClick={() => {
                if (!invite.name.trim() || !invite.email.trim()) {
                  pushToast("Name and email are required", "error")
                  return
                }
                setState((current) => createMember(current, invite, new Date().toISOString()).state)
                setInvite({ name: "", email: "" })
              }}
            >
              <IconAdd className="size-4" /> Add member
            </Button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-2 py-2 text-left font-medium">Member</th>
                <th className="px-2 py-2 text-left font-medium">Access</th>
                <th className="px-2 py-2 text-right font-medium">Billable rate</th>
                <th className="px-2 py-2 text-right font-medium">Cost / h</th>
                <th className="px-2 py-2 text-left font-medium">Groups</th>
                <th className="px-2 py-2 text-right font-medium">Tracked (week)</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {state.members.map((member) => {
                const tracked = sumSeconds(
                  entriesInRange(liveEntries(state).filter((e) => e.userId === member.id), auditRange.start, auditRange.end),
                  nowSec,
                )
                return (
                  <tr key={member.id}>
                    <td className="px-2 py-2">
                      <p className="font-medium">
                        {member.name} {member.isSelf && <span className="text-xs text-muted-foreground">(you)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </td>
                    <td className="px-2 py-2">
                      <MiniSelect
                        className="w-[110px]"
                        value={member.role}
                        onChange={(role) => setState((current) => updateMember(current, member.id, { role: role as MemberRole }))}
                        options={[
                          { id: "basic", label: "Basic" },
                          { id: "manager", label: "Manager" },
                          { id: "admin", label: "Admin" },
                        ]}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="number"
                        value={member.hourlyRate ?? ""}
                        onChange={(event) =>
                          setState((current) =>
                            updateMember(current, member.id, {
                              hourlyRate: event.target.value ? Number(event.target.value) : null,
                            }),
                          )
                        }
                        className="h-8 w-[90px] text-right"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="number"
                        value={member.labourCost ?? ""}
                        onChange={(event) =>
                          setState((current) =>
                            updateMember(current, member.id, {
                              labourCost: event.target.value ? Number(event.target.value) : null,
                            }),
                          )
                        }
                        className="h-8 w-[90px] text-right"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap gap-1">
                        {state.groups.map((group) => {
                          const active = member.groupIds.includes(group.id)
                          return (
                            <button
                              key={group.id}
                              type="button"
                              onClick={() =>
                                setState((current) =>
                                  updateMember(current, member.id, {
                                    groupIds: active
                                      ? member.groupIds.filter((id) => id !== group.id)
                                      : [...member.groupIds, group.id],
                                  }),
                                )
                              }
                              className={cn(
                                "rounded-full border px-2 py-0.5 text-[11px]",
                                active ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground",
                              )}
                            >
                              {group.name}
                            </button>
                          )
                        })}
                        {state.groups.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">{formatDuration(tracked, state.user.durationFormat)}</td>
                    <td className="px-2 py-2 text-right">
                      {!member.isSelf && (
                        <ConfirmButton size="icon-sm" onConfirm={() => setState((current) => deleteMember(current, member.id))}>
                          <IconDelete className="size-4" />
                        </ConfirmButton>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Members here are local records in the sandbox — no invitations are sent and nobody else can sign in.
        </p>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Groups"
          actions={
            <div className="flex gap-2">
              <Input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Group name" className="h-8 w-[140px]" />
              <Button
                size="sm"
                onClick={() => {
                  if (!groupName.trim()) return
                  setState((current) => createGroup(current, groupName.trim(), new Date().toISOString()))
                  setGroupName("")
                }}
              >
                <IconAdd className="size-4" />
              </Button>
            </div>
          }
        >
          {state.groups.length === 0 ? (
            <p className="text-xs text-muted-foreground">No groups yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {state.groups.map((group) => (
                <li key={group.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{group.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {state.members.filter((m) => m.groupIds.includes(group.id)).length} members
                  </span>
                  <ConfirmButton size="icon-sm" onConfirm={() => setState((current) => deleteGroup(current, group.id))}>
                    <IconDelete className="size-4" />
                  </ConfirmButton>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Member audit"
          description={`Who tracked too little between ${formatDate(auditRange.start, state.user.dateFormat)} and ${formatDate(auditRange.end, state.user.dateFormat)}`}
          actions={
            <MiniSelect
              className="w-[150px]"
              value={auditBucket}
              onChange={setAuditBucket}
              options={AUDIT_BUCKETS.map((b) => ({ id: b.id, label: b.label }))}
            />
          }
        >
          {audit.length === 0 ? (
            <p className="text-xs text-muted-foreground">Everyone is above this threshold.</p>
          ) : (
            <ul className="divide-y divide-border">
              {audit.map(({ member, seconds }) => (
                <li key={member.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{member.name}</span>
                  <span className="tabular-nums text-muted-foreground">{formatDuration(seconds, state.user.durationFormat)}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Timesheet approvals"
        description={
          state.workspace.timesheetApprovalsEnabled
            ? "Submitted and approved weeks are locked for editing."
            : "Turn approvals on in Settings → Workspace to lock reviewed weeks."
        }
        actions={
          <Input
            type="date"
            value={approvalWeek}
            onChange={(event) => setApprovalWeek(weekStartOf(event.target.value, state.user.weekStart))}
            className="h-8 w-[160px]"
          />
        }
      >
        <ul className="divide-y divide-border">
          {state.members.map((member) => {
            const approval = approvalFor(state, member.id, approvalWeek)
            const status = approval?.status ?? "open"
            const tracked = sumSeconds(
              entriesInRange(liveEntries(state).filter((e) => e.userId === member.id), approvalWeek, addDays(approvalWeek, 6)),
              nowSec,
            )
            return (
              <li key={member.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <span className="w-40 truncate">{member.name}</span>
                <span className="tabular-nums text-muted-foreground">{formatDuration(tracked, state.user.durationFormat)}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px]",
                    status === "approved" && "bg-[#2da608]/20 text-[#2da608]",
                    status === "submitted" && "bg-primary/20 text-primary",
                    status === "rejected" && "bg-destructive/20 text-destructive",
                    status === "open" && "bg-secondary text-muted-foreground",
                  )}
                >
                  {status}
                </span>
                <div className="ml-auto flex gap-1">
                  {(["submitted", "approved", "rejected", "open"] as const).map((next) => (
                    <Button
                      key={next}
                      size="sm"
                      variant="ghost"
                      className="h-7"
                      disabled={status === next}
                      onClick={() =>
                        setState((current) => setApprovalStatus(current, member.id, approvalWeek, next, new Date().toISOString()))
                      }
                    >
                      {next === "open" ? "reopen" : next}
                    </Button>
                  ))}
                </div>
              </li>
            )
          })}
        </ul>
      </SectionCard>
    </div>
  )
}

export type { ManageTab }
