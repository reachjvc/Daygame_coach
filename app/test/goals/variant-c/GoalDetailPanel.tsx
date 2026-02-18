"use client"

import { X, Calendar, TrendingUp, Repeat, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GOAL_TEMPLATE_MAP, getChildren } from "@/src/goals/data/goalGraph"
import type { MindMapNode } from "./types"

interface GoalDetailPanelProps {
  node: MindMapNode
  onClose: () => void
  onToggleSelect: (nodeId: string) => void
  onExpandAndShow: (nodeId: string) => void
}

/**
 * Right-side detail panel shown when clicking a node in the mind-map.
 * Shows goal details in a whiteboard-note style:
 * - Title and numbering
 * - Nature (Input/Outcome) with color
 * - Template type info
 * - Target value and date
 * - Children preview with click-to-navigate
 * - Toggle to include/exclude from goal plan
 */
export function GoalDetailPanel({
  node,
  onClose,
  onToggleSelect,
  onExpandAndShow,
}: GoalDetailPanelProps) {
  const template = GOAL_TEMPLATE_MAP[node.templateId]
  const childTemplates = template ? getChildren(template.id) : []

  const natureBg = node.nature === "outcome" ? "#dcfce7" : "#fee2e2"
  const natureBorder = node.nature === "outcome" ? "#86efac" : "#fca5a5"
  const natureText = node.nature === "outcome" ? "#166534" : "#991b1b"

  return (
    <div
      className="w-[320px] flex-shrink-0 border-l overflow-y-auto"
      style={{
        backgroundColor: "#fffef5",
        borderColor: "#e5e7eb",
        backgroundImage:
          "repeating-linear-gradient(transparent, transparent 27px, #e8e6df 28px)",
        backgroundSize: "100% 28px",
      }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b"
        style={{
          backgroundColor: "#fffef5ee",
          borderColor: "#e5e7eb",
          backdropFilter: "blur(4px)",
        }}
      >
        <span
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: "#94a3b8" }}
        >
          Goal Details
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-black/5 transition-colors cursor-pointer"
        >
          <X className="size-4" style={{ color: "#94a3b8" }} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Title card */}
        <div
          className="rounded-lg border-2 p-3"
          style={{
            backgroundColor: "#ffffff",
            borderColor: node.isSelected ? "#eab308" : "#e2e8f0",
            boxShadow: node.isSelected ? "0 0 0 3px #eab30820" : "1px 2px 4px rgba(0,0,0,0.06)",
          }}
        >
          {node.numbering && (
            <span
              className="text-xs font-mono block mb-1"
              style={{ color: "#94a3b8" }}
            >
              Goal {node.numbering}
            </span>
          )}
          <h3
            className="text-base font-bold"
            style={{
              color: "#1e293b",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {node.title}
          </h3>

          {/* Nature badge */}
          <div className="flex items-center gap-2 mt-2">
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border"
              style={{
                backgroundColor: natureBg,
                borderColor: natureBorder,
                color: natureText,
                fontFamily: "'Caveat', 'Patrick Hand', cursive, sans-serif",
                fontSize: 14,
              }}
            >
              {node.nature === "outcome" ? "Outcome" : "Input"}
            </span>
            <span className="text-xs" style={{ color: "#94a3b8" }}>
              Level {node.level}
            </span>
          </div>
        </div>

        {/* Template type */}
        {node.templateType && (
          <div className="flex items-center gap-2 text-sm" style={{ color: "#64748b" }}>
            {node.templateType === "milestone_ladder" ? (
              <>
                <TrendingUp className="size-4" />
                <span>Milestone Ladder</span>
              </>
            ) : (
              <>
                <Repeat className="size-4" />
                <span>Habit Ramp</span>
              </>
            )}
          </div>
        )}

        {/* Target value */}
        {node.targetValue && (
          <div
            className="rounded-lg border p-3"
            style={{ borderColor: "#e2e8f0", backgroundColor: "#f8fafc" }}
          >
            <div className="text-xs font-medium mb-1" style={{ color: "#94a3b8" }}>
              Target
            </div>
            <div
              className="text-xl font-bold"
              style={{
                color: "#1e293b",
                fontFamily: "'Caveat', 'Patrick Hand', cursive, sans-serif",
              }}
            >
              {node.targetValue.toLocaleString()}
            </div>
          </div>
        )}

        {/* Target date */}
        <div
          className="flex items-center gap-2 text-sm"
          style={{ color: "#64748b" }}
        >
          <Calendar className="size-4" />
          <span>
            Date: {node.targetDate || "TBD"}
          </span>
        </div>

        {/* Display category */}
        {node.displayCategory && (
          <div className="text-xs px-2 py-1 rounded" style={{ backgroundColor: "#f1f5f9", color: "#64748b" }}>
            Category: {formatCategory(node.displayCategory)}
          </div>
        )}

        {/* Children preview */}
        {childTemplates.length > 0 && (
          <div>
            <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#94a3b8" }}>
              Sub-goals ({childTemplates.length})
            </div>
            <div className="space-y-1">
              {childTemplates.slice(0, 8).map((child) => (
                <button
                  key={child.id}
                  onClick={() => onExpandAndShow(child.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition-colors hover:bg-black/5 cursor-pointer"
                  style={{ color: "#475569" }}
                >
                  <ArrowRight className="size-3 flex-shrink-0" style={{ color: "#94a3b8" }} />
                  <span className="truncate">{child.title}</span>
                  <span
                    className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: child.nature === "outcome" ? "#dcfce7" : "#fee2e2",
                      color: child.nature === "outcome" ? "#166534" : "#991b1b",
                    }}
                  >
                    {child.nature === "outcome" ? "O" : "I"}
                  </span>
                </button>
              ))}
              {childTemplates.length > 8 && (
                <div className="text-xs px-2 py-1" style={{ color: "#94a3b8" }}>
                  +{childTemplates.length - 8} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Selection toggle */}
        <div className="pt-3" style={{ borderTop: "1px solid #e5e7eb" }}>
          <Button
            onClick={() => onToggleSelect(node.id)}
            variant={node.isSelected ? "default" : "outline"}
            className="w-full"
            style={
              node.isSelected
                ? { backgroundColor: "#eab308", color: "#fff", borderColor: "#eab308" }
                : { borderColor: "#cbd5e1", color: "#475569" }
            }
          >
            {node.isSelected ? "Selected — Click to Remove" : "Add to My Goals"}
          </Button>
        </div>
      </div>
    </div>
  )
}

function formatCategory(cat: string): string {
  return cat
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
