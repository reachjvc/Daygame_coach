"use client"

/**
 * Drag-to-rerank, shared by the two places values are put in order.
 *
 * The whole-life list on the values step is a column of rows; an area's values
 * on the milestones step are a wrapped row of chips. Same gesture, same store,
 * different shapes — so the plumbing lives here and each site renders its own
 * markup and picks its own sorting strategy.
 *
 * It replaced a pair of up/down arrows on every item. Nudging a value one place
 * at a time turned "health is really number two" into five clicks and a recount,
 * and on the chips the two arrows were 16px targets wedged inside an 11px pill.
 *
 * Reuses the project's existing @dnd-kit idiom (see `SortablePriorityList` and
 * `WidgetGrid`): PointerSensor at 8px so an item's own buttons still take a
 * click, KeyboardSensor so the same reorder works without a mouse, closestCenter.
 */

import {
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

/**
 * Stable drag ids for a list of values. The value itself, because that survives
 * a reorder and an index does not — an item whose id changed mid-drag loses its
 * animation. A repeat gets a counter suffix so React and dnd-kit still see two
 * items; every list here refuses duplicates on the way in, so this is belt and
 * braces rather than a real case.
 */
export function valueIds(values: string[]): string[] {
  const seen = new Map<string, number>()
  return values.map((v) => {
    const n = (seen.get(v) ?? 0) + 1
    seen.set(v, n)
    return n === 1 ? v : `${v}#${n}`
  })
}

/**
 * Everything a values list needs to be draggable. Spread `dnd` onto a
 * `DndContext` and feed `ids` to the `SortableContext`.
 *
 * `onMove` is handed the value and the index it landed on — not a direction — so
 * a long drag slides the items between along instead of swapping the two ends.
 */
export function useValueDrag(values: string[], onMove: (value: string, toIndex: number) => void) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const ids = valueIds(values)
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    if (from < 0 || to < 0) return
    onMove(values[from], to)
  }
  return { ids, dnd: { sensors, collisionDetection: closestCenter, onDragEnd } }
}

/**
 * One draggable item. `handle` goes on whatever the user should be able to grab —
 * make that the item's whole body, minus its own buttons, so the grab target is
 * the value rather than an icon-sized strip. `touch-none` is what makes it work
 * on a phone at all: without it the browser scrolls the page instead of lifting.
 *
 * `rank` is the number to print, and it is live: while a drag is in progress it
 * is the place this item would take if you dropped now, not the place it came
 * from. On a list whose whole subject is the number, watching the numbers
 * rearrange under your hand IS the feedback — a column that still reads 1, 2, 3
 * while the rows have visibly moved is the reason the old arrows felt safer.
 */
export function useValueHandle(id: string) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, newIndex } = useSortable({ id })
  return {
    ref: setNodeRef,
    isDragging,
    rank: newIndex + 1,
    style: {
      transform: CSS.Transform.toString(transform),
      transition,
      zIndex: isDragging ? 10 : undefined,
    },
    handle: { ...attributes, ...listeners },
  }
}
