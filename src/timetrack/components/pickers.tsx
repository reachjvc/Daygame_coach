"use client"

/**
 * Project / task / tag pickers, and the description field with Toggl's inline
 * `@project` and `#tag` autocomplete.
 */

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"
import { createPortal } from "react-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { IconAdd, IconDown, IconMoney, IconTag } from "../icons"
import { activeToken, clientById, projectsForDescription, removeToken, searchProjects } from "../timetrackService"
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
}) {
  const [query, setQuery] = useState(initialQuery)
  const project = state.projects.find((p) => p.id === projectId) ?? null
  const task = state.tasks.find((t) => t.id === taskId) ?? null

  /**
   * ONE FLAT LIST, MOST RECENTLY USED FIRST.
   *
   * It used to be grouped under client headings in alphabetical order, which
   * asked you to know where your own project sat in someone else's ordering —
   * and spent a line of a phone screen on a heading reading "No client", which
   * is what every project here has. The client is still shown, on the row it
   * belongs to. Matching and ordering both come from `searchProjects`, so this
   * list and the description field's autocomplete cannot disagree.
   */
  const visible = useMemo(() => searchProjects(state, query), [state, query])

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
      trigger={() => (
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
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              // "add" stays the headline: creating is the primary act here, and
              // matching a task or a client name is forgiveness, not a feature
              // to advertise in eleven characters of placeholder.
              placeholder="Search or add a project…"
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
              className={cn("flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-muted-foreground hover:bg-secondary/60", touchRow)}
            >
              <ColorDot color={null} />
              No project
            </button>
            {visible.map((candidate) => {
              const tasks = state.tasks.filter((t) => t.projectId === candidate.id && t.active)
              const client = clientById(state, candidate.clientId)
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
                      touchRow,
                      candidate.id === projectId && !taskId && "text-primary",
                    )}
                  >
                    <ColorDot color={candidate.color} />
                    <span className="flex-1 truncate">{candidate.name}</span>
                    {client && <span className="shrink-0 truncate text-xs text-muted-foreground">{client.name}</span>}
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
            {visible.length === 0 && (
              <p className="px-3 py-3 text-xs text-muted-foreground">
                {state.projects.length === 0 ? "No projects yet — type a name to add one" : `No project matches “${query}”`}
              </p>
            )}
          </div>
          {onCreateProject && query.trim() && (
            <div className="border-t border-border p-2">
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => {
                  // creating and selecting happen in one state update upstream
                  onCreateProject(query.trim())
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
  fill,
  align = "left",
  autoOpen,
  onClose,
  initialQuery = "",
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
}) {
  const [query, setQuery] = useState(initialQuery)
  const selected = state.tags.filter((t) => tagIds.includes(t.id))
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
      trigger={() => (
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
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search or add a tag…"
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
            {visible.length === 0 && (
              <p className="px-3 py-3 text-xs text-muted-foreground">
                {state.tags.length === 0 ? "No tags yet — type a name to add one" : "No tag matches"}
              </p>
            )}
          </div>
          {onCreateTag && query.trim() && !state.tags.some((t) => t.name.toLowerCase() === query.trim().toLowerCase()) && (
            <div className="border-t border-border p-2">
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => {
                  onCreateTag(query.trim())
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

  const suggestions = useMemo(() => {
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
  }, [loose, looseQuery, token, state])

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
    setHighlight(found ? 0 : -1)
  }

  const choose = (id: Id) => {
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
        setHighlight((h) => (h + 1) % suggestions.length)
        return
      }
      if (event.key === "ArrowUp") {
        event.preventDefault()
        setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length)
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
              {offeringTags ? <IconTag className="size-3" /> : <ColorDot color={suggestion.color} />}
              <span className="truncate">{suggestion.label}</span>
            </button>
          ))}
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
