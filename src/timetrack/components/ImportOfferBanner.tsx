"use client"

/**
 * "This browser has 19 entries your account does not."
 *
 * WHY IT EXPANDS: the first version was a single Upload / Not now choice on a
 * number. Nineteen is not a number you can make a decision about — some of it
 * may be junk from testing, some of it may be a week you cannot afford to lose,
 * and the banner told you nothing about which. So it opens, lists every entry
 * with its day, project and length, and lets you pick.
 *
 * Choosing nothing is a real answer too: "Not now" leaves this browser's copy
 * exactly where it is, and Settings can offer the upload again later.
 */

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { formatCompact, formatDayHeader } from "../timetrackFormatService"
import type { ImportItem, ImportOffer } from "../hooks/useTimetrackSync"

export function ImportOfferBanner({
  offer,
  todayKey,
  onUpload,
  onDismiss,
}: {
  offer: ImportOffer
  todayKey: string
  onUpload: (only?: string[]) => void
  onDismiss: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(offer.items.map((item) => item.id)))

  const byDay = new Map<string, ImportItem[]>()
  for (const item of offer.items) byDay.set(item.day, [...(byDay.get(item.day) ?? []), item])

  const allChosen = chosen.size === offer.items.length
  const noneChosen = chosen.size === 0

  const toggle = (id: string) =>
    setChosen((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleDay = (day: string) =>
    setChosen((current) => {
      const next = new Set(current)
      const ids = (byDay.get(day) ?? []).map((item) => item.id)
      const allOn = ids.every((id) => next.has(id))
      for (const id of ids) {
        if (allOn) next.delete(id)
        else next.add(id)
      }
      return next
    })

  return (
    <div className="rounded-lg border border-primary/40 bg-primary/5 text-sm">
      <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
        <p className="flex-1">
          This browser has <strong>{offer.entries}</strong> {offer.entries === 1 ? "time entry" : "time entries"}
          {offer.projects > 0 && (
            <>
              {" "}
              and <strong>{offer.projects}</strong> {offer.projects === 1 ? "project" : "projects"}
            </>
          )}{" "}
          that your account does not.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setExpanded((open) => !open)}>
            {expanded ? "Hide" : `Show ${offer.entries}`}
          </Button>
          <Button size="sm" disabled={noneChosen} onClick={() => onUpload(allChosen ? undefined : [...chosen])}>
            {allChosen ? "Upload all" : `Upload ${chosen.size}`}
          </Button>
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            Not now
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-primary/30">
          <div className="flex items-center gap-3 px-3 py-2 text-xs text-muted-foreground">
            <button type="button" className="underline hover:text-foreground" onClick={() => setChosen(new Set(offer.items.map((i) => i.id)))}>
              Select all
            </button>
            <button type="button" className="underline hover:text-foreground" onClick={() => setChosen(new Set())}>
              Select none
            </button>
            <span className="ml-auto tabular-nums">
              {chosen.size} of {offer.items.length} chosen
            </span>
          </div>

          <ul className="max-h-72 overflow-y-auto border-t border-primary/20">
            {[...byDay.entries()].map(([day, items]) => (
              <li key={day}>
                <button
                  type="button"
                  onClick={() => toggleDay(day)}
                  className="flex w-full items-center gap-2 bg-secondary/40 px-3 py-1.5 text-left text-xs font-medium hover:bg-secondary/60"
                >
                  <span className="flex-1">{formatDayHeader(day, todayKey)}</span>
                  <span className="text-muted-foreground">
                    {items.filter((i) => chosen.has(i.id)).length}/{items.length}
                  </span>
                </button>
                <ul>
                  {items.map((item) => (
                    <li key={item.id}>
                      <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-secondary/30">
                        <input
                          type="checkbox"
                          className="size-4 shrink-0"
                          checked={chosen.has(item.id)}
                          onChange={() => toggle(item.id)}
                          aria-label={`Include ${item.description || "(no description)"}`}
                        />
                        <span className={cn("min-w-0 flex-1 truncate", !item.description && "text-muted-foreground")}>
                          {item.description || "(no description)"}
                        </span>
                        <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                          {item.project ?? "No project"}
                        </span>
                        <span className="shrink-0 tabular-nums text-xs">{formatCompact(item.seconds)}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
