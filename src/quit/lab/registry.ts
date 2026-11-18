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
import { ProgressA } from "./progress/a/ProgressA"
import { ProgressB } from "./progress/b/ProgressB"
import { ProgressC } from "./progress/c/ProgressC"
import { ProgressD } from "./progress/d/ProgressD"
import { ProgressE } from "./progress/e/ProgressE"
import { QuitdateA } from "./quitdate/a/QuitdateA"
import { QuitdateB } from "./quitdate/b/QuitdateB"
import { QuitdateD } from "./quitdate/d/QuitdateD"
import { QuitdateE } from "./quitdate/e/QuitdateE"
import { TimelineA } from "./timeline/a/TimelineA"
import { TimelineB } from "./timeline/b/TimelineB"
import { TimelineC } from "./timeline/c/TimelineC"
import { TimelineD } from "./timeline/d/TimelineD"
import { TimelineE } from "./timeline/e/TimelineE"
import { BeliefsA } from "./beliefs/a/BeliefsA"
import { BeliefsB } from "./beliefs/b/BeliefsB"
import { BeliefsC } from "./beliefs/c/BeliefsC"
import { CheckinA } from "./checkin/a/CheckinA"
import { CheckinB } from "./checkin/b/CheckinB"
import { CheckinC } from "./checkin/c/CheckinC"
import { CheckinD } from "./checkin/d/CheckinD"
import { BeliefsBest } from "./beliefs/best/BeliefsBest"
import { CostB } from "./cost/b/CostB"
import { CostC } from "./cost/c/CostC"
import { CostE } from "./cost/e/CostE"
import { DiaryB } from "./diary/b/DiaryB"
import { DiaryC } from "./diary/c/DiaryC"
import { DiaryD } from "./diary/d/DiaryD"
import { DiaryE } from "./diary/e/DiaryE"
import { DiaryBest } from "./diary/best/DiaryBest"
import { CheckinBest } from "./checkin/best/CheckinBest"
import { ProgressBest } from "./progress/best/ProgressBest"
import { QuitdateBest } from "./quitdate/best/QuitdateBest"
import { PastA } from "./past/a/PastA"
import { PastB } from "./past/b/PastB"
import { TimelineBest } from "./timeline/best/TimelineBest"

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
  progress: {
    name: "Progress home",
    variants: {
      a: { Component: ProgressA, addiction: "alcohol", label: "Copy A", kind: "copy" },
      b: { Component: ProgressB, addiction: "nicotine", label: "Copy B", kind: "copy" },
      c: { Component: ProgressC, addiction: "alcohol", label: "Copy C", kind: "copy" },
      d: { Component: ProgressD, addiction: "nicotine", label: "Copy D", kind: "copy" },
      e: { Component: ProgressE, addiction: "alcohol", label: "Copy E", kind: "copy" },
      best: { Component: ProgressBest, addiction: "nicotine", label: "Improved", kind: "best" },
    },
  },
  timeline: {
    name: "Health timeline",
    variants: {
      current: current(SymptomsTool),
      a: { Component: TimelineA, addiction: "nicotine", label: "Copy A", kind: "copy" },
      b: { Component: TimelineB, addiction: "nicotine", label: "Copy B", kind: "copy" },
      c: { Component: TimelineC, addiction: "nicotine", label: "Copy C", kind: "copy" },
      d: { Component: TimelineD, addiction: "nicotine", label: "Copy D", kind: "copy" },
      e: { Component: TimelineE, addiction: "weed", label: "Copy E", kind: "copy" },
      best: { Component: TimelineBest, addiction: "nicotine", label: "Improved", kind: "best" },
    },
  },
  quitdate: {
    name: "Quit date and plan",
    variants: {
      a: { Component: QuitdateA, addiction: "alcohol", label: "Copy A", kind: "copy" },
      b: { Component: QuitdateB, addiction: "alcohol", label: "Copy B", kind: "copy" },
      d: { Component: QuitdateD, addiction: "nicotine", label: "Copy D", kind: "copy" },
      e: { Component: QuitdateE, addiction: "nicotine", label: "Copy E", kind: "copy" },
      best: { Component: QuitdateBest, addiction: "nicotine", label: "Improved", kind: "best" },
    },
  },
  beliefs: {
    name: "Belief test",
    variants: {
      current: current(BeliefsTool),
      a: { Component: BeliefsA, addiction: "alcohol", label: "Copy A", kind: "copy" },
      b: { Component: BeliefsB, addiction: "nicotine", label: "Copy B", kind: "copy" },
      c: { Component: BeliefsC, addiction: "alcohol", label: "Copy C", kind: "copy" },
      best: { Component: BeliefsBest, addiction: "nicotine", label: "Improved", kind: "best" },
    },
  },
  checkin: {
    name: "Daily check-in",
    variants: {
      a: { Component: CheckinA, addiction: "alcohol", label: "Copy A", kind: "copy" },
      b: { Component: CheckinB, addiction: "alcohol", label: "Copy B", kind: "copy" },
      c: { Component: CheckinC, addiction: "porn", label: "Copy C", kind: "copy" },
      d: { Component: CheckinD, addiction: "alcohol", label: "Copy D", kind: "copy" },
      best: { Component: CheckinBest, addiction: "nicotine", label: "Improved", kind: "best" },
    },
  },
  diary: {
    name: "Craving and slip diary",
    variants: {
      current: current(SlipTool),
      b: { Component: DiaryB, addiction: "nicotine", label: "Copy B", kind: "copy" },
      c: { Component: DiaryC, addiction: "weed", label: "Copy C", kind: "copy" },
      d: { Component: DiaryD, addiction: "nicotine", label: "Copy D", kind: "copy" },
      e: { Component: DiaryE, addiction: "nicotine", label: "Copy E", kind: "copy" },
      best: { Component: DiaryBest, addiction: "nicotine", label: "Improved", kind: "best" },
    },
  },
  lessons: { name: "Daily lessons", variants: {} },
  cost: {
    name: "Cost and savings",
    variants: {
      current: current(CostTool),
      b: { Component: CostB, addiction: "nicotine", label: "Copy B", kind: "copy" },
      c: { Component: CostC, addiction: "nicotine", label: "Copy C", kind: "copy" },
      e: { Component: CostE, addiction: "nicotine", label: "Copy E", kind: "copy" },
    },
  },
  past: {
    name: "Past attempts",
    variants: {
      current: current(PastTool),
      a: { Component: PastA, addiction: "porn", label: "Copy A", kind: "copy" },
      b: { Component: PastB, addiction: "alcohol", label: "Copy B", kind: "copy" },
    },
  },
  ifthen: { name: "If-then plan", variants: {} },
  accountability: { name: "Accountability", variants: {} },
  library: { name: "Library", variants: { current: current(HowTool) } },
}

export function isLabTool(x: string): x is LabToolId {
  return (LAB_TOOL_IDS as readonly string[]).includes(x)
}
