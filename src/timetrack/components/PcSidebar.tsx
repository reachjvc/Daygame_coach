"use client"

/**
 * THE PC'S LEFT SIDEBAR, IN TOGGL TRACK'S ORDER (D-PC-SHELL, Phase 5 item 1 of
 * Plans/toggl-parity.md).
 *
 * Toggl's web app keeps its sections down the left: Track (Timer), Analyze
 * (Reports), Manage (Projects, Clients, Tags…), Admin (Settings) [W25 9:44;
 * LIVE web-02]. While a timer runs, "Timer" becomes the running clock with a
 * pencil beside it that opens the running entry [W25 13:03; LIVE web-05]. Our
 * PC had a row of six tabs instead; every one of them is still here:
 * Calendar moved onto the Timer page (its "Calendar | List view" switch), and
 * Manage's three parts are rows of their own.
 *
 * Shown from 640px; the phone keeps its bottom bar. The app's own top bar
 * stays above all of this (decided 2026-11-03).
 */

import { cn } from "@/lib/utils"
import { IconClient, IconEdit, IconProjects, IconReports, IconSettings, IconTag, IconTeam, IconTimer } from "../icons"
import { entrySeconds } from "../timetrackService"
import { formatClock } from "../timetrackFormatService"
import type { TimeEntry } from "../types"
import type { Section } from "../trackerAddressService"
import type { ManageTab } from "./ManageView"

/** Where a sidebar row goes: a section, and for Manage's rows the tab inside it */
export type SidebarPlace = { section: Section; manageTab?: ManageTab }

interface Row {
  label: string
  icon: typeof IconTimer
  place: SidebarPlace
}

const GROUPS: { heading: string; rows: Row[] }[] = [
  { heading: "Track", rows: [{ label: "Timer", icon: IconTimer, place: { section: "timer" } }] },
  { heading: "Analyze", rows: [{ label: "Reports", icon: IconReports, place: { section: "reports" } }] },
  {
    heading: "Manage",
    rows: [
      { label: "Projects", icon: IconProjects, place: { section: "projects" } },
      { label: "Clients", icon: IconClient, place: { section: "manage", manageTab: "clients" } },
      { label: "Tags", icon: IconTag, place: { section: "manage", manageTab: "tags" } },
      { label: "Team", icon: IconTeam, place: { section: "manage", manageTab: "team" } },
    ],
  },
  { heading: "Admin", rows: [{ label: "Settings", icon: IconSettings, place: { section: "settings" } }] },
]

/** Whether `place` is where the tracker is now; the Timer page is "timer", and "calendar" on a PC */
function isHere(place: SidebarPlace, screen: Section, manageTab: ManageTab): boolean {
  if (place.section === "timer") return screen === "timer" || screen === "calendar"
  if (place.section !== screen) return false
  return place.manageTab === undefined || place.manageTab === manageTab
}

export function PcSidebar({
  screen,
  manageTab,
  running,
  nowSec,
  onGo,
  onEditRunning,
}: {
  screen: Section
  manageTab: ManageTab
  running: TimeEntry | null
  nowSec: number
  onGo: (place: SidebarPlace) => void
  /** the ✎ beside the running clock: opens the running entry */
  onEditRunning: (entry: TimeEntry) => void
}) {
  return (
    <nav
      aria-label="Tracker"
      className="sticky top-12 hidden max-h-[calc(100vh-3rem)] w-48 shrink-0 flex-col gap-4 overflow-y-auto border-r border-border px-2 py-4 sm:flex lg:w-52"
    >
      {GROUPS.map((group) => (
        <div key={group.heading} className="space-y-0.5">
          <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{group.heading}</p>
          {group.rows.map((row) => {
            const Icon = row.icon
            const here = isHere(row.place, screen, manageTab)
            const clock = row.place.section === "timer" && running
            return (
              <div
                key={row.label}
                className={cn(
                  "flex items-center rounded-md",
                  here ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                <button
                  type="button"
                  onClick={() => onGo(row.place)}
                  aria-current={here ? "page" : undefined}
                  // the clock replaces the word, so the button still says where it goes
                  aria-label={clock ? `Timer, running ${formatClock(entrySeconds(running, nowSec))}` : undefined}
                  className={cn("flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left text-sm", here && "font-medium")}
                >
                  <Icon className={cn("size-4 shrink-0", clock && "text-primary")} />
                  {clock ? (
                    <span className="tabular-nums text-primary">{formatClock(entrySeconds(running, nowSec))}</span>
                  ) : (
                    <span className="truncate">{row.label}</span>
                  )}
                </button>
                {clock && (
                  <button
                    type="button"
                    onClick={() => onEditRunning(running)}
                    aria-label="Edit the running time entry"
                    title="Edit the running time entry"
                    className="mr-1 flex size-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <IconEdit className="size-3.5" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
