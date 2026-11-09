"use client"

/**
 * THE LIST OF THIS PERSON'S DEVICES, each with its switch and a remove button.
 * Moved out of the Thoughts settings sheet (Plans/energy-audit.md, Phase 1).
 */

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import type { PushDeviceState } from "../hooks/usePushDevice"

const SWITCH = "data-[state=unchecked]:bg-muted-foreground/30"

export interface PushDeviceListWords {
  empty: string
  switchLabel: (deviceLabel: string) => string
}

export function PushDeviceList({ push, words }: { push: PushDeviceState; words: PushDeviceListWords }) {
  if (push.devices.length === 0) return <p className="text-sm text-muted-foreground">{words.empty}</p>
  return (
    <ul className="divide-y divide-border rounded-xl border border-border">
      {push.devices.map((d) => (
        <li key={d.id} className="flex min-h-12 items-center justify-between gap-2 px-3.5 py-1.5">
          <span className="min-w-0 text-sm">
            {d.label || "A device"}
            {push.thisDevice?.id === d.id && <span className="text-muted-foreground"> (this one)</span>}
          </span>
          <span className="flex items-center gap-1">
            <Switch className={SWITCH} checked={d.enabled} onCheckedChange={(v) => void push.setEnabled(d.id, v)} aria-label={words.switchLabel(d.label)} />
            <Button variant="ghost" size="icon-sm" aria-label={`Remove ${d.label}`} onClick={() => void push.remove(d.id)}>
              <X className="size-4" />
            </Button>
          </span>
        </li>
      ))}
    </ul>
  )
}
