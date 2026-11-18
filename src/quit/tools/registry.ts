import type { ComponentType } from "react"
import type { QuitToolId, ToolProps } from "../types"

export interface ToolEntry {
  wave: 1 | 2 | 3
  Component: ComponentType<ToolProps> | null
}

/** Later phases fill `Component`; until then every tool shows the coming-soon state. */
export const TOOL_REGISTRY: Record<QuitToolId, ToolEntry> = {
  beliefs: { wave: 1, Component: null },
  gives: { wave: 1, Component: null },
  past: { wave: 1, Component: null },
  cost: { wave: 1, Component: null },
  how: { wave: 1, Component: null },
  curve: { wave: 1, Component: null },
  ifthen: { wave: 2, Component: null },
  clear: { wave: 2, Component: null },
  stake: { wave: 2, Component: null },
  tell: { wave: 2, Component: null },
  sos: { wave: 1, Component: null },
  symptoms: { wave: 1, Component: null },
  checkin: { wave: 3, Component: null },
  lesson: { wave: 3, Component: null },
  record: { wave: 3, Component: null },
  slip: { wave: 1, Component: null },
  identity: { wave: 3, Component: null },
  besides: { wave: 2, Component: null },
  coach: { wave: 2, Component: null },
}
