"use client"

/**
 * Project / task / tag pickers, and the description field with Toggl's inline
 * `@project` and `#tag` autocomplete.
 */

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react"
import { createPortal } from "react-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { IconAdd, IconDown, IconMoney, IconTag } from "../icons"
import { projectGroups } from "../pickerService"
import { activeToken, projectsForDescription, removeToken, searchProjects } from "../timetrackService"
import { inlineChoices, type InlineChoice } from "../inlineChoicesService"
import type { Id, TimetrackState } from "../types"
import {
  CheckOption,
  ColorDot,
  Dropdown,
  panelStyle,
  touchRow,
  touchTarget,
  useClickOutside,
  usePanelPosition,
} from "./primitives"

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
  fill,
  align = "left",
  autoOpen,
  onClose,
  initialQuery = "",
  renderTrigger,
}: {
  state: TimetrackState
  projectId: Id | null
  taskId: Id | null
  onChange: (projectId: Id | null, taskId: Id | null) => void
  onCreateProject?: (name: string) => void
  compact?: boolean
  /** stretch to the width of the surrounding grid cell instead of hugging the label */
  fill?: boolean
  align?: "left" | "right"
  autoOpen?: boolean
  onClose?: () => void
  initialQuery?: string
  /** the trigger drawn by the caller — the phone sheet's chip — instead of "+ Project" */
  renderTrigger?: () => ReactNode
}) {
  const [query, setQuery] = useState(initialQuery)
  const project = state.projects.find((p) => p.id === projectId) ?? null
  const task = state.tasks.find((t) => t.id === taskId) ?? null
  const search = useRef<HTMLInputElement | null>(null)

  /**
   * MOST RECENTLY USED FIRST, UNDER EACH CLIENT, AS TOGGL TRACK GROUPS THEM
   * (D-PICKERS, Phase 6 of Plans/toggl-parity.md).
   *
   * It was one flat list, because client headings in alphabetical order had
   * spent a line of a phone screen on "No client" over every project. Now the
   * projects with no client come first with no heading at all, so that cost is
   * gone, and each client heads its own projects, as in Toggl [W25 11:07].
   * Matching and ordering inside a group still come from `searchProjects`, so
   * this list and the description field's autocomplete cannot disagree.
   */
  const visible = useMemo(() => searchProjects(state, query), [state, query])
  const groups = useMemo(() => projectGroups(state, visible), [state, visible])

  return (
    <Dropdown
      align={align}
      className={fill ? "min-w-0" : undefined}
      width="w-80"
      openOnMount={autoOpen}
      onOpenChange={(open) => {
        if (!open) {
          setQuery("")
          onClose?.()
        }
      }}
      trigger={() => renderTrigger?.() ?? (
        <span
          className={cn(
            "flex min-h-11 items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-secondary/60 sm:min-h-0",
            fill ? "w-full" : compact ? "max-w-[240px]" : "max-w-[280px]",
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
              ref={search}
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              // Ctrl+Enter creates what was typed, as in Toggl Track (D-PICKERS)
              onKeyDown={(event) => {
                if (event.key !== "Enter" || !(event.ctrlKey || event.metaKey) || !onCreateProject || !query.trim()) return
                event.preventDefault()
                onCreateProject(query.trim())
                close()
              }}
              // Toggl Track's words: a task or a client name finds the project too (`projectMatches`)
              placeholder="Search by project, task or client"
              className="h-11 sm:h-8"
            />
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            <button
              type="button"
              data-picker-line
              onClick={() => {
                onChange(null, null)
                close()
              }}
              className={cn("flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-muted-foreground hover:bg-secondary/60", touchRow)}
            >
              <ColorDot color={null} />
              No Project
            </button>
            {groups.map((group) => (
              <div key={group.client?.id ?? "no-client"}>
                {group.client && (
                  <p
                    data-picker-line
                    data-picker-heading
                    className="truncate px-3 pb-0.5 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {group.client.name}
                  </p>
                )}
            {group.projects.map((candidate) => {
              const tasks = state.tasks.filter((t) => t.projectId === candidate.id && t.active)
              return (
                <div key={candidate.id}>
                  <button
                    type="button"
                    data-picker-line
                    onClick={() => {
                      onChange(candidate.id, null)
                      close()
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-secondary/60",
                      touchRow,
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
            {visible.length === 0 && (
              <p className="px-3 py-3 text-xs text-muted-foreground">
                {state.projects.length === 0 ? "No projects yet — type a name to add one" : `No project matches “${query}”`}
              </p>
            )}
          </div>
          {/* pinned at the bottom, typed or not, as in Toggl Track (D-PICKERS) */}
          {onCreateProject && (
            <div data-picker-pinned className="border-t border-border p-2">
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                title="Ctrl+Enter"
                onClick={() => {
                  // nothing typed yet: the name goes in the box above
                  if (!query.trim()) {
                    search.current?.focus()
                    return
                  }
                  // creating and selecting happen in one state update upstream
                  onCreateProject(query.trim())
                  close()
                }}
              >
                <IconAdd className="size-3.5" /> {query.trim() ? `Create “${query.trim()}”` : "Create a new project"}
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
  fill,
  align = "left",
  autoOpen,
  onClose,
  initialQuery = "",
  renderTrigger,
}: {
  state: TimetrackState
  tagIds: Id[]
  onChange: (tagIds: Id[]) => void
  onCreateTag?: (name: string) => void
  /** stretch to the width of the surrounding grid cell instead of hugging the label */
  fill?: boolean
  align?: "left" | "right"
  autoOpen?: boolean
  onClose?: () => void
  initialQuery?: string
  /** the trigger drawn by the caller — the phone sheet's chip — instead of "# Tags" */
  renderTrigger?: () => ReactNode
}) {
  const [query, setQuery] = useState(initialQuery)
  const search = useRef<HTMLInputElement | null>(null)
  const selected = state.tags.filter((t) => tagIds.includes(t.id))
  const isNew = query.trim() !== "" && !state.tags.some((t) => t.name.toLowerCase() === query.trim().toLowerCase())
  const visible = state.tags.filter((t) => !query.trim() || t.name.toLowerCase().includes(query.trim().toLowerCase()))

  return (
    <Dropdown
      align={align}
      className={fill ? "min-w-0" : undefined}
      width="w-64"
      openOnMount={autoOpen}
      onOpenChange={(open) => {
        if (!open) {
          setQuery("")
          onClose?.()
        }
      }}
      trigger={() => renderTrigger?.() ?? (
        <span
          className={cn(
            "flex min-h-11 items-center gap-1.5 rounded-md px-2 py-1.5 text-sm hover:bg-secondary/60 sm:min-h-0",
            fill ? "w-full" : "max-w-[200px]",
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
              ref={search}
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              // Ctrl+Enter creates what was typed, as in Toggl Track (D-PICKERS)
              onKeyDown={(event) => {
                if (event.key !== "Enter" || !(event.ctrlKey || event.metaKey) || !onCreateTag || !isNew) return
                event.preventDefault()
                onCreateTag(query.trim())
                setQuery("")
                close()
              }}
              placeholder="Add/filter tags"
              className="h-11 sm:h-8"
            />
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {visible.map((tag) => (
              <CheckOption
                key={tag.id}
                checkbox
                label={tag.name}
                checked={tagIds.includes(tag.id)}
                onClick={() =>
                  onChange(tagIds.includes(tag.id) ? tagIds.filter((id) => id !== tag.id) : [...tagIds, tag.id])
                }
              />
            ))}
            {visible.length === 0 &&
              (state.tags.length === 0 ? (
                // Toggl Track's words for an empty list [W25 11:28]
                <div className="px-3 py-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">There are no tags yet</p>
                  <p className="mt-1">Start typing and press Ctrl+Enter to create a new tag.</p>
                </div>
              ) : (
                <p className="px-3 py-3 text-xs text-muted-foreground">No tag matches</p>
              ))}
          </div>
          {/* pinned at the bottom, typed or not, as in Toggl Track (D-PICKERS) */}
          {onCreateTag && (query.trim() === "" || isNew) && (
            <div data-picker-pinned className="border-t border-border p-2">
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                title="Ctrl+Enter"
                onClick={() => {
                  // nothing typed yet: the name goes in the box above
                  if (!isNew) {
                    search.current?.focus()
                    return
                  }
                  onCreateTag(query.trim())
                  setQuery("")
                  close()
                }}
              >
                <IconAdd className="size-3.5" /> {isNew ? `Create “${query.trim()}”` : "Create tag"}
              </Button>
            </div>
          )}
        </div>
      )}
    </Dropdown>
  )
}

// ---------------------------------------------------------------------------
// Client picker (the project form)
// ---------------------------------------------------------------------------

/**
 * THE PROJECT FORM'S CLIENT, WHICH CAN MAKE ONE (Phase 8 findability of
 * Plans/toggl-parity.md).
 *
 * It was a plain list of "No client" and the clients that exist, so a project
 * for a new client meant leaving the form for Manage → Clients and coming back
 * (a fresh user gave up after 15 actions). Toggl Track's project dialog makes
 * a client from its own client picker. Here a name that does not exist is
 * offered as "Create client “x”"; Enter or Ctrl+Enter makes it and picks it,
 * and a name that does exist picks that one rather than making it twice.
 */
export function ClientPicker({
  state,
  clientId,
  onChange,
  onCreateClient,
}: {
  state: TimetrackState
  clientId: Id | null
  onChange: (clientId: Id | null) => void
  /** makes the client and picks it */
  onCreateClient?: (name: string) => void
}) {
  const [query, setQuery] = useState("")
  const client = state.clients.find((c) => c.id === clientId) ?? null
  const text = query.trim().toLowerCase()
  // archived clients are not offered, except the one already chosen
  const visible = state.clients.filter((c) => (!c.archived || c.id === clientId) && (!text || c.name.toLowerCase().includes(text)))
  const exact = text ? (state.clients.find((c) => c.name.toLowerCase() === text) ?? null) : null
  const isNew = text !== "" && exact === null

  return (
    <Dropdown
      width="w-72"
      ariaLabel="Client"
      onOpenChange={(open) => {
        if (!open) setQuery("")
      }}
      trigger={() => (
        <span
          className={cn(
            "flex h-11 w-full items-center gap-1.5 rounded-md border border-border px-2 text-base sm:h-8 sm:text-sm",
            client ? "text-foreground" : "text-muted-foreground",
          )}
        >
          <span className="min-w-0 flex-1 truncate text-left">{client ? client.name : "No client"}</span>
          <IconDown className="size-3 text-muted-foreground" />
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
              onKeyDown={(event) => {
                if (event.key !== "Enter" || !text) return
                event.preventDefault()
                if (exact) onChange(exact.id)
                else if (onCreateClient) onCreateClient(query.trim())
                else return
                close()
              }}
              placeholder="Find or create a client"
              className="h-11 sm:h-8"
            />
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => {
                onChange(null)
                close()
              }}
              className={cn("flex w-full items-center px-3 py-1.5 text-left text-sm text-muted-foreground hover:bg-secondary/60", touchRow)}
            >
              No client
            </button>
            {visible.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                onClick={() => {
                  onChange(candidate.id)
                  close()
                }}
                className={cn(
                  "flex w-full items-center px-3 py-1.5 text-left text-sm hover:bg-secondary/60",
                  touchRow,
                  candidate.id === clientId && "text-primary",
                )}
              >
                <span className="truncate">{candidate.name}</span>
              </button>
            ))}
          </div>
          {onCreateClient && isNew && (
            <div data-picker-pinned className="border-t border-border p-2">
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                title="Enter"
                onClick={() => {
                  onCreateClient(query.trim())
                  close()
                }}
              >
                <IconAdd className="size-3.5" /> {`Create client “${query.trim()}”`}
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
        touchTarget,
        "rounded-md transition-colors hover:bg-secondary/60 disabled:opacity-40",
        billable ? "text-[#2da608]" : "text-muted-foreground",
      )}
    >
      <IconMoney className="size-5 sm:size-4" />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Description field with @project / #tag autocomplete
// ---------------------------------------------------------------------------

export function DescriptionField({
  state,
  value,
  projectId = null,
  onChange,
  onPickProject,
  onPickTag,
  onSubmit,
  onBlur,
  placeholder = "What are you working on?",
  className,
  autoFocus,
  inline,
  askProject,
}: {
  state: TimetrackState
  value: string
  /** what is already chosen — plain text stops proposing projects once one is */
  projectId?: Id | null
  onChange: (value: string) => void
  onPickProject: (projectId: Id, taskId: Id | null) => void
  onPickTag: (tagId: Id) => void
  onSubmit?: () => void
  /** A half-typed description belongs to the entry before focus leaves the field */
  onBlur?: () => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
  /**
   * Toggl's inline lists (the phone sheet, Plans/toggl-parity.md Phase 3):
   * @ offers "No Project", the projects grouped by client and a row creating
   * what was typed; # the tags and "Create “x”" (`inlineChoices`).
   */
  inline?: { onClearProject: () => void; onCreateProject: (name: string) => void; onCreateTag: (name: string) => void }
  /**
   * Bumped by the phone sheet's "@ Add a project" chip, which has put an @ at
   * the end of the name: the field takes the focus with the caret after it,
   * and the inline list opens, as Toggl's chip does (V1 0:32).
   */
  askProject?: number
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [token, setToken] = useState<ReturnType<typeof activeToken>>(null)
  const [highlight, setHighlight] = useState(0)
  const wrapperRef = useClickOutside<HTMLDivElement>(() => setToken(null), panelRef)
  // createPortal needs document, which does not exist during server rendering
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  /**
   * PLAIN TEXT FINDS A PROJECT TOO, not only `@`.
   *
   * `@` was the only way in, and on a phone that is a switch to the symbol
   * layer and back for the most-used field in the app. Worse, the only place
   * the convention was written down is the keyboard-shortcut overlay, whose
   * button is `hidden sm:inline-flex` — so at phone width nothing on the screen
   * said the feature existed. Typing the project's name is what somebody does
   * without being told, so that is what now works.
   *
   * Deliberately narrow, because this panel sits over the entry list: only
   * while no project has been chosen, only from two characters, and not again
   * after Escape until the text changes. `projectsForDescription` holds the
   * rest of the restraint.
   */
  const dismissed = useRef<string | null>(null)
  const looseQuery = token || projectId !== null || dismissed.current === value ? "" : value.trim()
  const loose = looseQuery.length >= 2

  const suggestions = useMemo((): { id: Id; label: string; color: string | null; choice?: InlineChoice }[] => {
    if (inline && token) {
      return inlineChoices(state, token).map((choice) => ({ id: choice.key, label: choice.label, color: choice.kind === "project" ? choice.color : null, choice }))
    }
    if (loose) {
      return projectsForDescription(state, looseQuery).map((p) => ({ id: p.id, label: p.name, color: p.color }))
    }
    if (!token) return []
    if (token.kind === "project") {
      return searchProjects(state, token.query, 6).map((p) => ({ id: p.id, label: p.name, color: p.color }))
    }
    const query = token.query.toLowerCase()
    return state.tags
      .filter((t) => t.name.toLowerCase().includes(query))
      .slice(0, 6)
      .map((t) => ({ id: t.id, label: t.name, color: null }))
  }, [loose, looseQuery, token, state, inline])

  // gated on exactly what renders the panel: measuring while it is absent
  // would leave it hidden for good, since nothing would re-measure
  const suggestionsOpen = (token !== null || loose) && suggestions.length > 0 && mounted
  const offeringTags = token?.kind === "tag"
  const suggestionPosition = usePanelPosition(wrapperRef, panelRef, suggestionsOpen, {
    onDetached: () => setToken(null),
  })

  // the panel is capped to the space below the field, so arrowing down the list
  // can walk the highlight past the bottom of the box
  useEffect(() => {
    if (!suggestionsOpen) return
    panelRef.current?.querySelectorAll("button")[highlight]?.scrollIntoView({ block: "nearest" })
  }, [highlight, suggestionsOpen])

  const syncToken = (text: string, caret: number) => {
    const found = activeToken(text, caret)
    setToken(found)
    // A typed `@` means you asked for the list, so the first row is already
    // chosen. Plain text means you were writing, so nothing is chosen yet.
    // (On the inline lists the first row is "No Project", which is a choice too.)
    setHighlight(found ? 0 : -1)
  }

  useEffect(() => {
    const input = inputRef.current
    if (!askProject || !input) return
    input.focus()
    const end = input.value.length
    input.setSelectionRange(end, end)
    syncToken(input.value, end)
    // only a new ask: `syncToken` reads nothing that changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [askProject])

  /** a header names a client; Enter and the arrows go past it */
  const pickable = (index: number) => suggestions[index]?.choice?.kind !== "header"
  const step = (from: number, by: 1 | -1) => {
    for (let i = 1; i <= suggestions.length; i++) {
      const at = (from + by * i + suggestions.length * 2) % suggestions.length
      if (pickable(at)) return at
    }
    return from
  }

  const choose = (id: Id) => {
    const inlineChoice = suggestions.find((s) => s.id === id)?.choice
    if (inline && token && inlineChoice) {
      if (inlineChoice.kind === "header") return
      onChange(removeToken(value, token))
      if (inlineChoice.kind === "project") onPickProject(inlineChoice.id, null)
      else if (inlineChoice.kind === "tag") onPickTag(inlineChoice.id)
      else if (inlineChoice.kind === "no-project") inline.onClearProject()
      else if (inlineChoice.kind === "create-project") inline.onCreateProject(inlineChoice.name)
      else inline.onCreateTag(inlineChoice.name)
      setToken(null)
      inputRef.current?.focus()
      return
    }
    if (!token) {
      // Plain text: the words are the description somebody meant to write, so
      // they stay. Only the project is set. (`@wri` is a command, and its text
      // is removed; "writing" is not.)
      if (!loose) return
      onPickProject(id, null)
      dismissed.current = value
      setHighlight(-1)
      inputRef.current?.focus()
      return
    }
    const cleaned = removeToken(value, token)
    onChange(cleaned)
    if (token.kind === "project") onPickProject(id, null)
    else onPickTag(id)
    setToken(null)
    inputRef.current?.focus()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (suggestionsOpen) {
      if (event.key === "ArrowDown") {
        event.preventDefault()
        setHighlight((h) => step(h, 1))
        return
      }
      if (event.key === "ArrowUp") {
        event.preventDefault()
        setHighlight((h) => step(h, -1))
        return
      }
      if (event.key === "Escape") {
        event.preventDefault()
        if (token) setToken(null)
        else dismissed.current = value
        setHighlight(-1)
        return
      }
      /**
       * `@wri` is a command you are in the middle of typing, so Enter completes
       * it. A plain description is not, so Enter keeps meaning "start" until
       * you have arrowed into the list on purpose — otherwise the key that
       * starts your timer would quietly start meaning something else the
       * moment a project happened to match what you were writing.
       */
      const picking = token !== null || highlight >= 0
      if (picking && (event.key === "Enter" || event.key === "Tab")) {
        event.preventDefault()
        choose(suggestions[Math.max(0, highlight)].id)
        return
      }
      if (event.key === "Tab") {
        event.preventDefault()
        choose(suggestions[0].id)
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
        onBlur={onBlur}
        // text-base on a phone, not text-sm: iOS Safari zooms the whole page when
        // you tap a field under 16px, and this is the most-tapped field in the app
        className="h-11 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground sm:h-10 sm:text-sm"
      />
      {suggestionsOpen && createPortal(
        <div
          ref={panelRef}
          data-dropdown-panel=""
          style={panelStyle(suggestionPosition)}
          className="fixed z-[9650] w-72 max-w-[calc(100vw-1.5rem)] overflow-y-auto overflow-x-hidden rounded-md border border-border bg-card shadow-xl"
        >
          <p className="border-b border-border px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            {offeringTags ? <>Tags · #{token?.query}</> : token ? <>Projects · @{token.query}</> : <>Set project to</>}
          </p>
          {suggestions.map((suggestion, index) =>
            suggestion.choice?.kind === "header" ? (
              <p key={suggestion.id} className="px-3 pb-0.5 pt-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                {suggestion.label}
              </p>
            ) : (
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
              {suggestion.choice?.kind === "create-project" || suggestion.choice?.kind === "create-tag" ? (
                <IconAdd className="size-3.5" />
              ) : offeringTags ? (
                <IconTag className="size-3" />
              ) : (
                <ColorDot color={suggestion.color} />
              )}
              <span className="truncate">{suggestion.label}</span>
            </button>
            ),
          )}
          {/* The one place the `@` and `#` grammar is written down where a
              phone can read it. The shortcut overlay that used to be its only
              home is `hidden sm:inline-flex`. */}
          <p className="border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground">
            <span className="font-medium">@</span> a project · <span className="font-medium">#</span> a tag
          </p>
        </div>,
        document.body,
      )}
    </div>
  )
}


export function MiniSelect({
  value,
  options,
  onChange,
  className,
  ariaLabel,
}: {
  value: string
  options: { id: string; label: string }[]
  onChange: (value: string) => void
  className?: string
  /** what a screen reader calls it where no `<label>` wraps it: "Group by", "Chart shows" */
  ariaLabel?: string
}) {
  return (
    <div className={cn("relative", className)}>
      <select
        value={value}
        aria-label={ariaLabel}
        onChange={(event) => onChange(event.target.value)}
        // Every <select> in this slice is this component — there is exactly one —
        // so 40px here was 40px on the Reports grouping, the Settings formats,
        // the rounding, the reminder project and the member role. The sweep never
        // saw any of them, because it only queried <button>.
        className="h-11 w-full appearance-none rounded-md border border-border bg-transparent pl-2 pr-7 text-base outline-none sm:h-8 sm:text-sm"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id} className="bg-card">
            {option.label}
          </option>
        ))}
      </select>
      <IconDown className="pointer-events-none absolute right-2 top-4 size-3 text-muted-foreground sm:top-2.5" />
    </div>
  )
}
