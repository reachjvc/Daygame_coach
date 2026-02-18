"use client"

import { useState, useCallback, useMemo } from "react"
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react"
import { MindMapNodeRow } from "./MindMapNodeRow"
import type { MindMapNode } from "./types"

interface MindMapCanvasProps {
  tree: MindMapNode
  onToggleExpand: (nodeId: string) => void
  onToggleSelect: (nodeId: string) => void
  onNodeClick: (nodeId: string) => void
}

/**
 * Scrollable canvas that renders the mind-map tree.
 * Has a whiteboard/FigJam aesthetic with:
 * - Dot grid background
 * - Column headers (Goal, Date, Type)
 * - Zoom controls
 * - Horizontal scroll for deep trees
 */
export function MindMapCanvas({
  tree,
  onToggleExpand,
  onToggleSelect,
  onNodeClick,
}: MindMapCanvasProps) {
  const [zoom, setZoom] = useState(1)

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + 0.1, 1.5))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - 0.1, 0.6))
  }, [])

  const handleZoomReset = useCallback(() => {
    setZoom(1)
  }, [])

  // Count total visible nodes for layout
  const visibleCount = useMemo(() => {
    let count = 0
    function walk(node: MindMapNode) {
      count++
      if (node.isExpanded) {
        node.children.forEach(walk)
      }
    }
    walk(tree)
    return count
  }, [tree])

  return (
    <div className="relative flex-1 overflow-hidden rounded-xl" style={{ minHeight: 500 }}>
      {/* Dot grid background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: "#fafbfc",
          backgroundImage:
            "radial-gradient(circle, #d1d5db 0.8px, transparent 0.8px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Column headers */}
      <div
        className="sticky top-0 z-10 flex items-center gap-0 px-4 py-2 border-b"
        style={{
          backgroundColor: "#f8fafcee",
          backdropFilter: "blur(8px)",
          borderColor: "#e2e8f0",
        }}
      >
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#94a3b8" }}>
            Goal Hierarchy
          </span>
        </div>
        <div className="flex-shrink-0" style={{ minWidth: 110 }}>
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#94a3b8" }}>
            Target Date
          </span>
        </div>
        <div className="flex-shrink-0 px-2" style={{ minWidth: 80 }}>
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#94a3b8" }}>
            Type
          </span>
        </div>
        <div className="flex-shrink-0 pl-2 w-5" />
      </div>

      {/* Scrollable content */}
      <div
        className="relative overflow-auto"
        style={{
          maxHeight: `calc(100vh - 300px)`,
          minHeight: Math.min(visibleCount * 44 + 20, 600),
        }}
      >
        <div
          className="p-4 space-y-1"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            minWidth: zoom < 1 ? `${100 / zoom}%` : undefined,
          }}
        >
          {/* Root L1 node */}
          <MindMapNodeRow
            node={tree}
            depth={0}
            onToggleExpand={onToggleExpand}
            onToggleSelect={onToggleSelect}
            onNodeClick={onNodeClick}
          />
        </div>
      </div>

      {/* Zoom controls */}
      <div
        className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg border px-1 py-1"
        style={{
          backgroundColor: "#ffffffdd",
          borderColor: "#e2e8f0",
          backdropFilter: "blur(4px)",
        }}
      >
        <button
          onClick={handleZoomOut}
          className="p-1.5 rounded hover:bg-black/5 transition-colors cursor-pointer"
          title="Zoom out"
        >
          <ZoomOut className="size-3.5" style={{ color: "#64748b" }} />
        </button>
        <span className="text-xs px-1 font-mono" style={{ color: "#64748b", minWidth: 36, textAlign: "center" }}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className="p-1.5 rounded hover:bg-black/5 transition-colors cursor-pointer"
          title="Zoom in"
        >
          <ZoomIn className="size-3.5" style={{ color: "#64748b" }} />
        </button>
        <div className="w-px h-4 mx-0.5" style={{ backgroundColor: "#e2e8f0" }} />
        <button
          onClick={handleZoomReset}
          className="p-1.5 rounded hover:bg-black/5 transition-colors cursor-pointer"
          title="Reset zoom"
        >
          <Maximize2 className="size-3.5" style={{ color: "#64748b" }} />
        </button>
      </div>
    </div>
  )
}
