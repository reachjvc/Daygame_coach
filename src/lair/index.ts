/**
 * Lair Slice - Public API
 *
 * The Lair is a user-customizable dashboard with drag-drop widgets.
 * Prefer importing from "@/src/lair" instead of deep module paths.
 */

export { LairPageServer as LairPage } from "./components/LairPageServer"
export { LairContent } from "./components/LairContent"

export type {
  UserLairLayout,
  TabConfig,
  UserWidgetConfig,
  WidgetDefinition,
  WidgetSize,
  WidgetCategory,
  WidgetProps,
} from "./types"

export { widgetRegistry, getAllWidgets } from "./data/widgetRegistry"
