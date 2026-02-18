"use client"

import { Check, ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { MindMapNode } from "./types"

interface ConfirmPanelProps {
  tree: MindMapNode
  selectedNodes: MindMapNode[]
  isCreating: boolean
  onConfirm: () => void
  onBack: () => void
}

/**
 * Confirmation screen showing selected goals in a summary.
 * Whiteboard "sticky note" style cards.
 */
export function ConfirmPanel({
  tree,
  selectedNodes,
  isCreating,
  onConfirm,
  onBack,
}: ConfirmPanelProps) {
  const inputNodes = selectedNodes.filter((n) => n.nature === "input")
  const outcomeNodes = selectedNodes.filter((n) => n.nature === "outcome")

  return (
    <div
      className="max-w-2xl mx-auto rounded-2xl border-2 border-dashed p-8"
      style={{
        backgroundColor: "#fafbfc",
        borderColor: "#cbd5e1",
      }}
    >
      {/* Header */}
      <div className="text-center mb-6">
        <h2
          className="text-2xl font-bold mb-2"
          style={{
            color: "#1e293b",
            fontFamily: "'Caveat', 'Patrick Hand', cursive, sans-serif",
            fontSize: 28,
          }}
        >
          Your Goal Plan
        </h2>
        <p className="text-sm" style={{ color: "#64748b" }}>
          {selectedNodes.length} goals selected from &quot;{tree.title}&quot;
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div
          className="rounded-lg border p-3 text-center"
          style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
        >
          <div
            className="text-2xl font-bold"
            style={{ color: "#1e293b", fontFamily: "'Caveat', 'Patrick Hand', cursive, sans-serif" }}
          >
            {selectedNodes.length}
          </div>
          <div className="text-xs" style={{ color: "#94a3b8" }}>
            Total Goals
          </div>
        </div>
        <div
          className="rounded-lg border p-3 text-center"
          style={{ backgroundColor: "#fee2e2", borderColor: "#fca5a5" }}
        >
          <div
            className="text-2xl font-bold"
            style={{ color: "#991b1b", fontFamily: "'Caveat', 'Patrick Hand', cursive, sans-serif" }}
          >
            {inputNodes.length}
          </div>
          <div className="text-xs" style={{ color: "#991b1b" }}>
            Input Goals
          </div>
        </div>
        <div
          className="rounded-lg border p-3 text-center"
          style={{ backgroundColor: "#dcfce7", borderColor: "#86efac" }}
        >
          <div
            className="text-2xl font-bold"
            style={{ color: "#166534", fontFamily: "'Caveat', 'Patrick Hand', cursive, sans-serif" }}
          >
            {outcomeNodes.length}
          </div>
          <div className="text-xs" style={{ color: "#166534" }}>
            Outcome Goals
          </div>
        </div>
      </div>

      {/* Selected goals list */}
      <div className="space-y-1.5 mb-6 max-h-[300px] overflow-y-auto">
        {selectedNodes.map((node) => (
          <div
            key={node.id}
            className="flex items-center gap-3 px-3 py-2 rounded-lg border"
            style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
          >
            <Check className="size-4 flex-shrink-0" style={{ color: "#22c55e" }} />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium truncate block" style={{ color: "#1e293b" }}>
                {node.title}
              </span>
              {node.numbering && (
                <span className="text-xs font-mono" style={{ color: "#94a3b8" }}>
                  {node.numbering}
                </span>
              )}
            </div>
            <span
              className="text-xs px-2 py-0.5 rounded border flex-shrink-0"
              style={{
                backgroundColor: node.nature === "outcome" ? "#dcfce7" : "#fee2e2",
                borderColor: node.nature === "outcome" ? "#86efac" : "#fca5a5",
                color: node.nature === "outcome" ? "#166534" : "#991b1b",
              }}
            >
              {node.nature === "outcome" ? "Outcome" : "Input"}
            </span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isCreating}
          style={{ borderColor: "#cbd5e1", color: "#64748b" }}
        >
          <ArrowLeft className="size-4 mr-2" />
          Back to Map
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isCreating || selectedNodes.length === 0}
          className="flex-1"
          style={{
            backgroundColor: "#eab308",
            color: "#ffffff",
            borderColor: "#eab308",
          }}
        >
          {isCreating ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Creating Goals...
            </>
          ) : (
            <>
              <Check className="size-4 mr-2" />
              Create {selectedNodes.length} Goals
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
