import type { ComponentType } from "react"
import { BeliefsTool } from "./beliefs/BeliefsTool"
import { CostTool } from "./cost/CostTool"
import { DateTool } from "./date/DateTool"
import { GivesTool } from "./gives/GivesTool"
import { HowTool } from "./how/HowTool"
import { PastTool } from "./past/PastTool"
import { RecordTool } from "./record/RecordTool"
import { SlipTool } from "./slip/SlipTool"
import { SosTool } from "./sos/SosTool"
import { SymptomsTool } from "./symptoms/SymptomsTool"
import type { QuitToolId, ToolProps } from "../types"

export interface ToolEntry {
  wave: 1 | 2 | 3
  Component: ComponentType<ToolProps> | null
}

/** Later phases fill `Component`; until then every tool shows the coming-soon state. */
export const TOOL_REGISTRY: Record<QuitToolId, ToolEntry> = {
  beliefs: { wave: 1, Component: BeliefsTool },
  gives: { wave: 1, Component: GivesTool },
  past: { wave: 1, Component: PastTool },
  cost: { wave: 1, Component: CostTool },
  how: { wave: 1, Component: HowTool },
  date: { wave: 1, Component: DateTool },
  ifthen: { wave: 2, Component: null },
  clear: { wave: 2, Component: null },
  stake: { wave: 2, Component: null },
  tell: { wave: 2, Component: null },
  sos: { wave: 1, Component: SosTool },
  symptoms: { wave: 1, Component: SymptomsTool },
  checkin: { wave: 3, Component: null },
  lesson: { wave: 3, Component: null },
  record: { wave: 1, Component: RecordTool },
  slip: { wave: 1, Component: SlipTool },
  identity: { wave: 3, Component: null },
  besides: { wave: 2, Component: null },
  coach: { wave: 2, Component: null },
}
