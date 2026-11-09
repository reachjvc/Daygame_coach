"use client"

/** MUTE THE PINGS (D-MUTE): 30 min · 1 h · 2 h · until morning, or unmute. */

import { useState } from "react"
import { BottomSheet } from "@/components/BottomSheet"
import { Button } from "@/components/ui/button"
import type { MuteOption } from "../auditService"
import { clockLabel } from "../quarterService"

const CHOICES: { option: MuteOption; label: string }[] = [
  { option: "30m", label: "30 min" },
  { option: "1h", label: "1 h" },
  { option: "2h", label: "2 h" },
  { option: "morning", label: "Until morning" },
]

export function mutedLine(mutedUntil: string | null, timezone: string, now: number): string | null {
  if (!mutedUntil || Date.parse(mutedUntil) <= now) return null
  const sameDay = Date.parse(mutedUntil) - now < 20 * 60 * 60_000
  return `Muted until ${clockLabel(Date.parse(mutedUntil), timezone)}${sameDay ? "" : " tomorrow"}`
}

export function MuteSheet({
  open,
  onClose,
  mutedUntil,
  timezone,
  onMute,
}: {
  open: boolean
  onClose: () => void
  mutedUntil: string | null
  timezone: string
  onMute: (option: MuteOption) => Promise<string | null>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const line = mutedLine(mutedUntil, timezone, Date.now())

  const pick = async (option: MuteOption) => {
    setBusy(true)
    setError(null)
    const failed = await onMute(option)
    setBusy(false)
    if (failed) setError(failed)
    else onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Mute pings" testId="audit-mute-sheet">
      {line && (
        <p className="mb-2 text-sm" data-testid="audit-muted-line">
          {line}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        {CHOICES.map((c) => (
          <Button key={c.option} variant="outline" disabled={busy} onClick={() => void pick(c.option)}>
            {c.label}
          </Button>
        ))}
      </div>
      {line && (
        <Button className="mt-2 w-full" variant="secondary" disabled={busy} onClick={() => void pick("off")} data-testid="audit-unmute">
          Unmute
        </Button>
      )}
      {error && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">You can still answer while muted. Only the pings stop.</p>
    </BottomSheet>
  )
}
