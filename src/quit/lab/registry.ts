import type { ComponentType } from "react"
import type { ToolProps } from "../types"
import { BeliefsTool } from "../tools/beliefs/BeliefsTool"
import { CostTool } from "../tools/cost/CostTool"
import { HowTool } from "../tools/how/HowTool"
import { PastTool } from "../tools/past/PastTool"
import { SlipTool } from "../tools/slip/SlipTool"
import { SosTool } from "../tools/sos/SosTool"
import { SymptomsTool } from "../tools/symptoms/SymptomsTool"
import { SosA } from "./sos/a/SosA"
import { SosC } from "./sos/c/SosC"
import { SosD } from "./sos/d/SosD"
import { SosBest } from "./sos/best/SosBest"
import { SosE } from "./sos/e/SosE"

export const LAB_TOOL_IDS = [
  "sos",
  "progress",
  "timeline",
  "quitdate",
  "beliefs",
  "checkin",
  "diary",
  "lessons",
  "cost",
  "past",
  "ifthen",
  "accountability",
  "library",
] as const

export type LabToolId = (typeof LAB_TOOL_IDS)[number]

/** Every variant gets the same props the live tools get. */
export type LabProps = ToolProps

export interface LabVariant {
  Component: ComponentType<LabProps>
  addiction: string
  label: string
  kind: "copy" | "best" | "current"
}

const CURRENT_LABEL = "Current (wave 1)"
const current = (Component: ComponentType<LabProps>): LabVariant => ({
  Component,
  addiction: "nicotine",
  label: CURRENT_LABEL,
  kind: "current",
})

/** Tools with no variants yet have `variants: {}`; the index says "not built yet". */
export const LAB: Record<LabToolId, { name: string; variants: Record<string, LabVariant> }> = {
  sos: {
    name: "Craving SOS",
    variants: {
      current: current(SosTool),
      a: { Component: SosA, addiction: "alcohol", label: "Copy A", kind: "copy" },
      c: { Component: SosC, addiction: "nicotine", label: "Copy C", kind: "copy" },
      d: { Component: SosD, addiction: "nicotine", label: "Copy D", kind: "copy" },
      e: { Component: SosE, addiction: "nicotine", label: "Copy E", kind: "copy" },
      best: { Component: SosBest, addiction: "nicotine", label: "Improved", kind: "best" },
    },
  },
  progress: { name: "Progress home", variants: {} },
  timeline: { name: "Health timeline", variants: { current: current(SymptomsTool) } },
  quitdate: { name: "Quit date and plan", variants: {} },
  beliefs: { name: "Belief test", variants: { current: current(BeliefsTool) } },
  checkin: { name: "Daily check-in", variants: {} },
  diary: { name: "Craving and slip diary", variants: { current: current(SlipTool) } },
  lessons: { name: "Daily lessons", variants: {} },
  cost: { name: "Cost and savings", variants: { current: current(CostTool) } },
  past: { name: "Past attempts", variants: { current: current(PastTool) } },
  ifthen: { name: "If-then plan", variants: {} },
  accountability: { name: "Accountability", variants: {} },
  library: { name: "Library", variants: { current: current(HowTool) } },
}

export function isLabTool(x: string): x is LabToolId {
  return (LAB_TOOL_IDS as readonly string[]).includes(x)
}
