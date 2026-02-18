"use client"

import { ChevronRight, ChevronDown } from "lucide-react"
import type { MindMapNode } from "./types"

interface MindMapNodeRowProps {
  node: MindMapNode
  depth: number
  onToggleExpand: (nodeId: string) => void
  onToggleSelect: (nodeId: string) => void
  onNodeClick: (nodeId: string) => void
  parentNumbering?: string
}

/**
 * A single row in the mind-map tree.
 * Renders as a whiteboard-style box with:
 * - Indentation based on depth
 * - Numbering (Goal 1.2.3)
 * - Title
 * - Target date column
 * - Input/Outcome label with color coding
 *
 * Matches the FigJam/whiteboard aesthetic from the pictures.
 */
export function MindMapNodeRow({
  node,
  depth,
  onToggleExpand,
  onToggleSelect,
  onNodeClick,
}: MindMapNodeRowProps) {
  const hasChildren = node.children.length > 0
  const indent = depth * 32

  // Nature badge colors matching the pictures
  const natureBg = node.nature === "outcome" ? "#dcfce7" : "#fee2e2"
  const natureBorder = node.nature === "outcome" ? "#86efac" : "#fca5a5"
  const natureText = node.nature === "outcome" ? "#166534" : "#991b1b"
  const natureLabel = node.nature === "outcome" ? "Outcome" : "Input"

  // Box styling - whiteboard/hand-drawn feel
  const boxBg = node.isSelected
    ? "#fef9c3"
    : node.level === 1
      ? "#f8fafc"
      : node.level === 2
        ? "#ffffff"
        : "#ffffff"

  const boxBorder = node.isSelected
    ? "#eab308"
    : node.level === 1
      ? "#94a3b8"
      : node.level === 2
        ? "#cbd5e1"
        : "#e2e8f0"

  const boxShadow = node.isSelected
    ? "0 0 0 2px #eab30840"
    : "1px 1px 2px rgba(0,0,0,0.06)"

  // Target date (mock based on level)
  const targetDate = node.targetDate || getEstimatedDate(node)

  return (
    <>
      <div
        className="flex items-center gap-0 group"
        style={{ paddingLeft: indent }}
      >
        {/* Connector line */}
        {depth > 0 && (
          <div className="relative" style={{ width: 20, height: 40 }}>
            <div
              style={{
                position: "absolute",
                left: 0,
                top: "50%",
                width: 20,
                height: 1,
                backgroundColor: "#cbd5e1",
              }}
            />
          </div>
        )}

        {/* Expand/collapse toggle */}
        <div className="w-6 flex-shrink-0 flex items-center justify-center">
          {hasChildren && (
            <button
              onClick={() => onToggleExpand(node.id)}
              className="p-0.5 rounded hover:bg-black/5 transition-colors cursor-pointer"
            >
              {node.isExpanded ? (
                <ChevronDown className="size-3.5" style={{ color: "#64748b" }} />
              ) : (
                <ChevronRight className="size-3.5" style={{ color: "#64748b" }} />
              )}
            </button>
          )}
        </div>

        {/* Goal box */}
        <button
          onClick={() => onNodeClick(node.id)}
          className="flex items-center gap-3 px-3 py-2 rounded-md transition-all cursor-pointer hover:shadow-md flex-1 min-w-0"
          style={{
            backgroundColor: boxBg,
            border: `1.5px solid ${boxBorder}`,
            boxShadow,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {/* Numbering */}
          {node.numbering && (
            <span
              className="text-xs font-mono flex-shrink-0"
              style={{
                color: "#94a3b8",
                minWidth: node.level === 3 ? 36 : 20,
              }}
            >
              {node.numbering}
            </span>
          )}

          {/* Title */}
          <span
            className="text-sm font-medium truncate"
            style={{
              color: "#1e293b",
              fontWeight: node.level <= 2 ? 600 : 500,
              fontSize: node.level === 1 ? 15 : node.level === 2 ? 14 : 13,
            }}
          >
            {node.title}
          </span>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Target value for L3 */}
          {node.level === 3 && node.targetValue && (
            <span
              className="text-xs flex-shrink-0 px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: "#f1f5f9",
                color: "#64748b",
                fontFamily: "'Caveat', 'Patrick Hand', cursive, sans-serif",
                fontSize: 13,
              }}
            >
              {node.targetValue}
            </span>
          )}
        </button>

        {/* Target date column */}
        <div
          className="flex-shrink-0 px-3 py-1 text-xs"
          style={{
            minWidth: 110,
            color: "#64748b",
            fontFamily: "'Caveat', 'Patrick Hand', cursive, sans-serif",
            fontSize: 13,
          }}
        >
          {targetDate && (
            <span
              className="px-2 py-0.5 rounded border"
              style={{
                backgroundColor: "#f8fafc",
                borderColor: "#e2e8f0",
              }}
            >
              {targetDate}
            </span>
          )}
        </div>

        {/* Nature badge */}
        <div className="flex-shrink-0" style={{ minWidth: 80 }}>
          {node.level >= 2 && (
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
              {natureLabel}
            </span>
          )}
        </div>

        {/* Selection checkbox */}
        <div className="flex-shrink-0 pl-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleSelect(node.id)
            }}
            className="size-5 rounded border-2 flex items-center justify-center transition-colors cursor-pointer"
            style={{
              borderColor: node.isSelected ? "#eab308" : "#cbd5e1",
              backgroundColor: node.isSelected ? "#fef08a" : "transparent",
            }}
          >
            {node.isSelected && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6L5 9L10 3" stroke="#854d0e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Render children if expanded */}
      {node.isExpanded &&
        node.children.map((child) => (
          <MindMapNodeRow
            key={child.id}
            node={child}
            depth={depth + 1}
            onToggleExpand={onToggleExpand}
            onToggleSelect={onToggleSelect}
            onNodeClick={onNodeClick}
          />
        ))}
    </>
  )
}

/**
 * Generate mock estimated dates based on goal level.
 * In the pictures, dates range from near-term for L3s to far-future for L1s.
 */
function getEstimatedDate(node: MindMapNode): string {
  const now = new Date()
  if (node.level === 1) {
    const d = new Date(now.getFullYear() + 2, 2, 19)
    return formatDate(d)
  }
  if (node.level === 2) {
    const d = new Date(now.getFullYear() + 1, 2, 19)
    return formatDate(d)
  }
  // L3 - spread across next 6-18 months
  const monthsOut = 3 + Math.floor(Math.random() * 12)
  const d = new Date(now.getFullYear(), now.getMonth() + monthsOut, 1)
  return formatDate(d)
}

function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const yyyy = d.getFullYear()
  return `${dd}.${mm}.${yyyy}`
}
