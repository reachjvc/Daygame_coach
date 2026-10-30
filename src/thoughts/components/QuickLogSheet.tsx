"use client"

/**
 * WHAT A REMINDER OPENS (Plans/thought.md, screen 2): your thoughts as big
 * buttons, a box for a new one, and "Nothing notable". Nothing else. One tap
 * logs, links the log to the reminder it answers, and closes the sheet.
 *
 * Also what the installed app's "Log a thought" shortcut opens, without a
 * reminder to answer — then "Nothing notable" is not offered, because it only
 * means something as an answer.
 */

import { BottomSheet } from "@/components/BottomSheet"
import { Button } from "@/components/ui/button"
import { sortForButtons } from "../thoughtsService"
import type { Thought } from "../types"
import { ThoughtButtons } from "./ThoughtButtons"
import { ThoughtInput } from "./ThoughtInput"

const QUICK_BUTTONS = 8

export function QuickLogSheet({
  open,
  promptId,
  thoughts,
  pending,
  loading,
  onLog,
  onLogNew,
  onNothing,
  onClose,
}: {
  open: boolean
  promptId: string | null
  thoughts: Thought[]
  pending: Map<string, number>
  loading: boolean
  onLog: (t: Thought) => void
  onLogNew: (text: string) => void
  onNothing: () => void
  onClose: () => void
}) {
  const top = sortForButtons(thoughts).slice(0, QUICK_BUTTONS)

  return (
    <BottomSheet open={open} onClose={onClose} title="What's on your mind?" testId="quick-log">
      <div className="space-y-4 pb-2">
        {loading ? (
          <div className="space-y-2" aria-busy="true" aria-label="Loading your thoughts">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-2xl bg-background/60" />
            ))}
          </div>
        ) : top.length > 0 ? (
          <ThoughtButtons
            thoughts={top}
            pending={pending}
            size="large"
            onTap={(t) => {
              onLog(t)
              onClose()
            }}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Type what you were just thinking. Next time it will be a button here.</p>
        )}
        <ThoughtInput
          thoughts={thoughts}
          placeholder="Something new…"
          onLogExisting={(t) => {
            onLog(t)
            onClose()
          }}
          onLogNew={(text) => {
            onLogNew(text)
            onClose()
          }}
        />
        {promptId && (
          <Button
            variant="outline"
            className="h-12 w-full"
            data-testid="quick-log-nothing"
            onClick={() => {
              onNothing()
              onClose()
            }}
          >
            Nothing notable
          </Button>
        )}
      </div>
    </BottomSheet>
  )
}
