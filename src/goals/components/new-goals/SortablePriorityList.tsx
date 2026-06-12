"use client"

/**
 * Drag-to-rank list of #1…N priority chips. Reuses the project's @dnd-kit pattern
 * (see GoalCategorySection): PointerSensor{8px}+KeyboardSensor, closestCenter,
 * arrayMove, a GripVertical handle. Generic so it ranks both areas and objectives.
 * `renderTrailing` lets callers hang an extra control (e.g. a date input) on a chip.
 */

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import type { ReactNode } from "react"

export interface PriorityItem {
  id: string
  label: string
  color?: string
}

function Chip({ item, rank, trailing }: { item: PriorityItem; rank: number; trailing?: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  }
  const color = item.color ?? "#a1a1aa"
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 bg-white/5 border rounded-lg pr-3 py-1.5 ${isDragging ? "border-white/30 shadow-lg" : "border-white/10"}`}
    >
      {/* The whole grip+rank+label area is the drag handle — easy to grab anywhere. */}
      <div
        className="flex items-center gap-2 flex-1 min-w-0 pl-1.5 cursor-grab active:cursor-grabbing touch-none select-none"
        aria-label={`Reorder ${item.label}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4 text-zinc-500 shrink-0" />
        <span
          className="text-[10px] font-bold size-5 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: color + "33", color }}
        >
          {rank}
        </span>
        <span className="text-sm text-white truncate">{item.label}</span>
      </div>
      {trailing}
    </div>
  )
}

export function SortablePriorityList({
  items,
  onReorder,
  orientation = "vertical",
  renderTrailing,
}: {
  items: PriorityItem[]
  onReorder: (ids: string[]) => void
  orientation?: "vertical" | "horizontal"
  renderTrailing?: (item: PriorityItem) => ReactNode
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  )
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const ids = items.map((i) => i.id)
    const oldI = ids.indexOf(active.id as string)
    const newI = ids.indexOf(over.id as string)
    if (oldI === -1 || newI === -1) return
    onReorder(arrayMove(ids, oldI, newI))
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={orientation === "horizontal" ? horizontalListSortingStrategy : verticalListSortingStrategy}
      >
        <div className={orientation === "horizontal" ? "flex flex-wrap gap-2" : "flex flex-col gap-2"}>
          {items.map((item, i) => (
            <Chip key={item.id} item={item} rank={i + 1} trailing={renderTrailing?.(item)} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
