"use client"

/**
 * Project / task / tag pickers, and the description field with Toggl's inline
 * `@project` and `#tag` autocomplete.
 */

import { useMemo, useRef, useState, type KeyboardEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { IconAdd, IconClose, IconDown, IconMoney, IconTag } from "../icons"
import { activeToken, removeToken } from "../timetrackService"
import type { Id, TimetrackState } from "../types"
import { CheckOption, ColorDot, Dropdown, useClickOutside } from "./primitives"

// ---------------------------------------------------------------------------
// Project + task picker
// ---------------------------------------------------------------------------

export function ProjectPicker({
  state,
  projectId,
  taskId,
  onChange,
  onCreateProject,
  compact,
  align = "left",
  autoOpen,
  onClose,
  initialQuery = "",
}: {
  state: TimetrackState
  projectId: Id | null
  taskId: Id | null
  onChange: (projectId: Id | null, taskId: Id | null) => void
  onCreateProject?: (name: string) => Id
  compact?: boolean
  align?: "left" | "right"
  autoOpen?: boolean
  onClose?: () => void
  initialQuery?: string
}) {
  const [query, setQuery] = useState(initialQuery)
  const project = state.projects.find((p) => p.id === projectId) ?? null
  const task = state.tasks.find((t) => t.id === taskId) ?? null

  const grouped = useMemo(() => {
    const text = query.trim().toLowerCase()
    const visible = state.projects.filter(
      (p) => p.active && !p.template && (!text || p.name.toLowerCase().includes(text)),
    )
    const byClient = new Map<string, typeof visible>()
    for (const candidate of visible) {
      const clientName = state.clients.find((c) => c.id === candidate.clientId)?.name ?? "No client"
      const bucket = byClient.get(clientName)
      if (bucket) bucket.push(candidate)
      else byClient.set(clientName, [candidate])
    }
    return [...byClient.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [state.projects, state.clients, query])

  return (
    <Dropdown
      align={align}
      width="w-80"
      openOnMount={autoOpen}
      onOpenChange={(open) => {
        if (!open) {
          setQuery("")
          onClose?.()
        }
      }}
      trigger={() => (
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-secondary/60",
            compact ? "max-w-[180px]" : "max-w-[260px]",
            project ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {project ? <ColorDot color={project.color} /> : <IconAdd className="size-3.5" />}
          <span className="truncate">
            {project ? (task ? `${project.name} · ${task.name}` : project.name) : "Project"}
          </span>
        </span>
      )}
    >
      {(close) => (
        <div>
          <div className="border-b border-border p-2">
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search projects…"
              className="h-8"
            />
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => {
                onChange(null, null)
                close()
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-muted-foreground hover:bg-secondary/60"
            >
              <ColorDot color={null} />
              No project
            </button>
            {grouped.map(([clientName, projects]) => (
              <div key={clientName}>
                <p className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {clientName}
                </p>
                {projects.map((candidate) => {
                  const tasks = state.tasks.filter((t) => t.projectId === candidate.id && t.active)
                  return (
                    <div key={candidate.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onChange(candidate.id, null)
                          close()
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-secondary/60",
                          candidate.id === projectId && !taskId && "text-primary",
                        )}
                      >
                        <ColorDot color={candidate.color} />
                        <span className="flex-1 truncate">{candidate.name}</span>
                        {candidate.billable && <IconMoney className="size-3 text-muted-foreground" />}
                      </button>
                      {tasks.map((candidateTask) => (
                        <button
                          key={candidateTask.id}
                          type="button"
                          onClick={() => {
                            onChange(candidate.id, candidateTask.id)
                            close()
                          }}
                          className={cn(
                            "flex w-full items-center gap-2 pl-9 pr-3 py-1 text-left text-xs text-muted-foreground hover:bg-secondary/60",
                            candidateTask.id === taskId && "text-primary",
                          )}
                        >
                          <span className="flex-1 truncate">{candidateTask.name}</span>
                        </button>
                      ))}
                    </div>
                  )
                })}
              </div>
            ))}
            {grouped.length === 0 && (
              <p className="px-3 py-3 text-xs text-muted-foreground">No project matches “{query}”</p>
            )}
          </div>
          {onCreateProject && query.trim() && (
            <div className="border-t border-border p-2">
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => {
                  const id = onCreateProject(query.trim())
                  onChange(id, null)
                  close()
                }}
              >
                <IconAdd className="size-3.5" /> Create “{query.trim()}”
              </Button>
            </div>
          )}
        </div>
      )}
    </Dropdown>
  )
}

// ---------------------------------------------------------------------------
// Tag picker
// ---------------------------------------------------------------------------

export function TagPicker({
  state,
  tagIds,
  onChange,
  onCreateTag,
  align = "left",
  autoOpen,
  onClose,
  initialQuery = "",
}: {
  state: TimetrackState
  tagIds: Id[]
  onChange: (tagIds: Id[]) => void
  onCreateTag?: (name: string) => Id
  align?: "left" | "right"
  autoOpen?: boolean
  onClose?: () => void
  initialQuery?: string
}) {
  const [query, setQuery] = useState(initialQuery)
  const selected = state.tags.filter((t) => tagIds.includes(t.id))
  const visible = state.tags.filter((t) => !query.trim() || t.name.toLowerCase().includes(query.trim().toLowerCase()))

  return (
    <Dropdown
      align={align}
      width="w-64"
      openOnMount={autoOpen}
      onOpenChange={(open) => {
        if (!open) {
          setQuery("")
          onClose?.()
        }
      }}
      trigger={() => (
        <span
          className={cn(
            "flex max-w-[200px] items-center gap-1.5 rounded-md px-2 py-1.5 text-sm hover:bg-secondary/60",
            selected.length ? "text-foreground" : "text-muted-foreground",
          )}
        >
          <IconTag className="size-3.5" />
          <span className="truncate">{selected.length ? selected.map((t) => t.name).join(", ") : "Tags"}</span>
        </span>
      )}
    >
      {(close) => (
        <div>
          <div className="border-b border-border p-2">
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tags…"
              className="h-8"
            />
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {visible.map((tag) => (
              <CheckOption
                key={tag.id}
                label={tag.name}
                checked={tagIds.includes(tag.id)}
                onClick={() =>
                  onChange(tagIds.includes(tag.id) ? tagIds.filter((id) => id !== tag.id) : [...tagIds, tag.id])
                }
              />
            ))}
            {visible.length === 0 && <p className="px-3 py-3 text-xs text-muted-foreground">No tag matches</p>}
          </div>
          {onCreateTag && query.trim() && !state.tags.some((t) => t.name.toLowerCase() === query.trim().toLowerCase()) && (
            <div className="border-t border-border p-2">
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => {
                  const id = onCreateTag(query.trim())
                  onChange([...tagIds, id])
                  setQuery("")
                  close()
                }}
              >
                <IconAdd className="size-3.5" /> Create “{query.trim()}”
              </Button>
            </div>
          )}
        </div>
      )}
    </Dropdown>
  )
}

// ---------------------------------------------------------------------------
// Billable toggle
// ---------------------------------------------------------------------------

export function BillableToggle({
  billable,
  onChange,
  disabled,
}: {
  billable: boolean
  onChange: (billable: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!billable)}
      title={billable ? "Billable" : "Non-billable"}
      aria-label={billable ? "Billable" : "Non-billable"}
      aria-pressed={billable}
      className={cn(
        "rounded-md p-1.5 transition-colors hover:bg-secondary/60 disabled:opacity-40",
        billable ? "text-[#2da608]" : "text-muted-foreground",
      )}
    >
      <IconMoney className="size-4" />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Description field with @project / #tag autocomplete
// ---------------------------------------------------------------------------

export function DescriptionField({
  state,
  value,
  onChange,
  onPickProject,
  onPickTag,
  onSubmit,
  placeholder = "What are you working on?",
  className,
  autoFocus,
}: {
  state: TimetrackState
  value: string
  onChange: (value: string) => void
  onPickProject: (projectId: Id, taskId: Id | null) => void
  onPickTag: (tagId: Id) => void
  onSubmit?: () => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [token, setToken] = useState<ReturnType<typeof activeToken>>(null)
  const [highlight, setHighlight] = useState(0)
  const wrapperRef = useClickOutside<HTMLDivElement>(() => setToken(null))

  const suggestions = useMemo(() => {
    if (!token) return []
    const query = token.query.toLowerCase()
    if (token.kind === "project") {
      return state.projects
        .filter((p) => p.active && !p.template && p.name.toLowerCase().includes(query))
        .slice(0, 6)
        .map((p) => ({ id: p.id, label: p.name, color: p.color }))
    }
    return state.tags
      .filter((t) => t.name.toLowerCase().includes(query))
      .slice(0, 6)
      .map((t) => ({ id: t.id, label: t.name, color: null }))
  }, [token, state.projects, state.tags])

  const syncToken = (text: string, caret: number) => {
    const found = activeToken(text, caret)
    setToken(found)
    setHighlight(0)
  }

  const choose = (id: Id) => {
    if (!token) return
    const cleaned = removeToken(value, token)
    onChange(cleaned)
    if (token.kind === "project") onPickProject(id, null)
    else onPickTag(id)
    setToken(null)
    inputRef.current?.focus()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (token && suggestions.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault()
        setHighlight((h) => (h + 1) % suggestions.length)
        return
      }
      if (event.key === "ArrowUp") {
        event.preventDefault()
        setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length)
        return
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault()
        choose(suggestions[highlight].id)
        return
      }
      if (event.key === "Escape") {
        setToken(null)
        return
      }
    }
    if (event.key === "Enter" && onSubmit) {
      event.preventDefault()
      onSubmit()
    }
  }

  return (
    <div ref={wrapperRef} className={cn("relative flex-1", className)}>
      <input
        ref={inputRef}
        autoFocus={autoFocus}
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          onChange(event.target.value)
          syncToken(event.target.value, event.target.selectionStart ?? event.target.value.length)
        }}
        onKeyUp={(event) => syncToken(value, event.currentTarget.selectionStart ?? value.length)}
        onKeyDown={handleKeyDown}
        className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
      {token && suggestions.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-md border border-border bg-card shadow-xl">
          <p className="border-b border-border px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            {token.kind === "project" ? "Projects" : "Tags"} · {token.kind === "project" ? "@" : "#"}
            {token.query}
          </p>
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              onMouseEnter={() => setHighlight(index)}
              onClick={() => choose(suggestion.id)}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm",
                index === highlight ? "bg-secondary" : "hover:bg-secondary/60",
              )}
            >
              {token.kind === "project" ? <ColorDot color={suggestion.color} /> : <IconTag className="size-3" />}
              <span className="truncate">{suggestion.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function TagChips({
  state,
  tagIds,
  onRemove,
}: {
  state: TimetrackState
  tagIds: Id[]
  onRemove?: (tagId: Id) => void
}) {
  if (tagIds.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1">
      {tagIds.map((id) => {
        const tag = state.tags.find((t) => t.id === id)
        if (!tag) return null
        return (
          <span key={id} className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[11px]">
            {tag.name}
            {onRemove && (
              <button type="button" onClick={() => onRemove(id)} className="text-muted-foreground hover:text-foreground">
                <IconClose className="size-2.5" />
              </button>
            )}
          </span>
        )
      })}
    </div>
  )
}

export function MiniSelect({
  value,
  options,
  onChange,
  className,
}: {
  value: string
  options: { id: string; label: string }[]
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <div className={cn("relative", className)}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-full appearance-none rounded-md border border-border bg-transparent pl-2 pr-7 text-sm outline-none"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id} className="bg-card">
            {option.label}
          </option>
        ))}
      </select>
      <IconDown className="pointer-events-none absolute right-2 top-2.5 size-3 text-muted-foreground" />
    </div>
  )
}
