"use client"

import { useState } from "react"
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CircleDot, GripVertical, Plus, X } from "lucide-react"
import { MAX_TILES, MIN_TILES, metricDefFor } from "../../metricsService"
import { MetricPickerDialog } from "./MetricPickerDialog"
import type { DashboardWidget, DashboardWidgetInput } from "../../types"
import type { UserGoalRow } from "@/src/db/goalTypes"

interface DashboardTilesDialogProps {
  open: boolean
  onClose: () => void
  widgets: DashboardWidget[]
  goals: UserGoalRow[]
  onOpenPicker: () => void
  onSave: (widgets: DashboardWidgetInput[]) => Promise<boolean>
  error: string | null
}

/**
 * Rearrange the stat row: drag to reorder, X to remove, Add to pick a new one.
 *
 * Edits are held locally and only written on Save, so a half-finished rearrange
 * never reaches the database and Cancel really cancels.
 */
export function DashboardTilesDialog({
  open,
  onClose,
  widgets,
  goals,
  onOpenPicker,
  onSave,
  error,
}: DashboardTilesDialogProps) {
  const [draft, setDraft] = useState<string[]>(() => metricIds(widgets))
  const [pickerOpen, setPickerOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  // Re-seed the draft each time the dialog is opened, so a cancelled edit is
  // genuinely discarded rather than lingering until remount.
  const [seededFor, setSeededFor] = useState(open)
  if (open !== seededFor) {
    setSeededFor(open)
    if (open) {
      setDraft(metricIds(widgets))
      setLocalError(null)
    }
  }

  if (!open) return null

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setDraft((prev) => {
      const from = prev.indexOf(active.id as string)
      const to = prev.indexOf(over.id as string)
      return from === -1 || to === -1 ? prev : arrayMove(prev, from, to)
    })
  }

  const remove = (id: string) => {
    if (draft.length <= MIN_TILES) {
      setLocalError(`Keep at least ${MIN_TILES} tiles`)
      return
    }
    setLocalError(null)
    setDraft((prev) => prev.filter((d) => d !== id))
  }

  const add = (id: string) => {
    setPickerOpen(false)
    setLocalError(null)
    setDraft((prev) => (prev.includes(id) || prev.length >= MAX_TILES ? prev : [...prev, id]))
  }

  const save = async () => {
    setIsSaving(true)
    const ok = await onSave(draft.map((metricId) => ({ widget_type: "metric_tile" as const, metric_id: metricId })))
    setIsSaving(false)
    if (ok) onClose()
  }

  const shown = localError ?? error

  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 pt-safe pb-safe">
        <Card
          className="w-full max-w-lg max-h-[calc(var(--app-vh)*90)] overflow-hidden flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tiles-dialog-title"
          data-testid="tiles-dialog"
        >
          <div className="flex items-center justify-between p-5 border-b">
            <div>
              <h2 id="tiles-dialog-title" className="text-xl font-bold">Your stat tiles</h2>
              <p className="text-sm text-muted-foreground">Drag to reorder. {MIN_TILES}–{MAX_TILES} tiles.</p>
            </div>
            <button onClick={onClose} aria-label="Close" className="p-2 rounded-lg hover:bg-muted transition-colors">
              <X className="size-5" />
            </button>
          </div>

          <div className="overflow-y-auto p-4 space-y-2">
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={draft} strategy={verticalListSortingStrategy}>
                {draft.map((id) => (
                  <SortableTileRow key={id} id={id} goals={goals} onRemove={remove} />
                ))}
              </SortableContext>
            </DndContext>

            {draft.length < MAX_TILES && (
              <button
                type="button"
                onClick={() => { onOpenPicker(); setPickerOpen(true) }}
                data-testid="add-tile"
                className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-border hover:border-primary/50 hover:bg-muted/50 text-sm text-muted-foreground transition-colors"
              >
                <Plus className="size-4" />
                Add a tile
              </button>
            )}
          </div>

          {shown && (
            <p className="px-5 pb-2 text-sm text-destructive" role="alert" data-testid="tiles-error">{shown}</p>
          )}

          <div className="flex items-center justify-end gap-2 p-4 border-t">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={save} disabled={isSaving} data-testid="save-tiles">
              {isSaving ? "Saving…" : "Save"}
            </Button>
          </div>
        </Card>
      </div>

      <MetricPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={add}
        goals={goals}
        usedIds={draft}
      />
    </>
  )
}

function SortableTileRow({
  id,
  goals,
  onRemove,
}: {
  id: string
  goals: UserGoalRow[]
  onRemove: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const def = metricDefFor(id, goals)
  const Icon = def?.icon ?? CircleDot

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      data-testid={`tile-row-${id}`}
      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
    >
      <button
        {...attributes}
        {...listeners}
        aria-label="Reorder"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="size-4" />
      </button>
      <Icon className={`size-4 shrink-0 ${def?.accent ?? "text-primary"}`} />
      <span className="flex-1 min-w-0 text-sm truncate">
        {def?.label ?? "Unknown metric"}
      </span>
      <button
        type="button"
        onClick={() => onRemove(id)}
        aria-label={`Remove ${def?.label ?? id}`}
        data-testid={`remove-tile-${id}`}
        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

function metricIds(widgets: DashboardWidget[]): string[] {
  return widgets.map((w) => w.metric_id).filter((id): id is string => !!id)
}
