"use client"

/**
 * PROJECT ALERTS: the bell in the tracker's header, on the PC and on the phone
 * (where it sits in the place of Toggl's minimise button, Plans/toggl-parity.md
 * Phase 1). Opening it marks what fired as read.
 */

import { cn } from "@/lib/utils"
import { IconAlert, IconBell } from "../icons"
import { markAlertsRead } from "../timetrackService"
import type { AlertEvent, TimetrackState } from "../types"
import { Dropdown, touchTarget } from "./primitives"

export function AlertsBell({
  state,
  setState,
  unread,
}: {
  state: TimetrackState
  setState: (updater: (current: TimetrackState) => TimetrackState) => void
  /** what fired and has not been looked at: counted on the bell */
  unread: AlertEvent[]
}) {
  return (
    <Dropdown
      align="right"
      width="w-80"
      ariaLabel="Project alerts"
      onOpenChange={(open) => {
        if (open && unread.length > 0) setState((current) => markAlertsRead(current))
      }}
      trigger={() => (
        <span className={cn(touchTarget, "relative rounded-md text-muted-foreground hover:bg-secondary/60")}>
          <IconBell className="size-5 sm:size-4" />
          {/*
            9px was the smallest text anywhere in the slice, on the one badge
            whose whole job is to be read at a glance, and at 4.17:1 it was under
            the 4.5:1 contrast floor as well. 10px in a slightly larger circle,
            at full-strength white on the destructive fill.
          */}
          {unread.length > 0 && (
            <span className="absolute -right-1 -top-1 flex size-[18px] items-center justify-center rounded-full bg-destructive text-[10px] font-semibold leading-none text-white">
              {unread.length}
            </span>
          )}
        </span>
      )}
    >
      {() => (
        <div className="max-h-72 overflow-y-auto p-2">
          <p className="px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Project alerts
          </p>
          {state.alerts.length === 0 ? (
            <p className="px-1 py-2 text-xs text-muted-foreground">No alerts have fired.</p>
          ) : (
            state.alerts.slice(0, 20).map((alert) => (
              <div key={alert.id} className="flex items-start gap-2 rounded px-1 py-1.5 text-xs">
                <IconAlert className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                <span>
                  <strong>{state.projects.find((p) => p.id === alert.projectId)?.name ?? "Project"}</strong> passed{" "}
                  {alert.threshold}% of its {alert.basis === "fixed_fee" ? "fixed fee" : "estimate"} for the period
                  starting {alert.periodStart}.
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </Dropdown>
  )
}
