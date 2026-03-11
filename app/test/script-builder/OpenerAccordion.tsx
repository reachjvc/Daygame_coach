"use client"

import { useState } from "react"
import { ChevronRight } from "lucide-react"
import type { ConversationNode } from "@/src/scenarios/types"
import ConversationNodeView from "./ConversationNodeView"

interface OpenerAccordionProps {
  rootNodeId: string
  nodes: Record<string, ConversationNode>
  language: "da" | "en"
  editingNodeId: string | null
  onEdit: (id: string) => void
  onAddChild: (parentId: string) => void
  onDelete: (id: string) => void
}

export default function OpenerAccordion({
  rootNodeId,
  nodes,
  language,
  editingNodeId,
  onEdit,
  onAddChild,
  onDelete,
}: OpenerAccordionProps) {
  const rootNode = nodes[rootNodeId]
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  if (!rootNode) return null

  const toggle = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const expandAll = () => setExpandedIds(new Set(rootNode.children))
  const collapseAll = () => setExpandedIds(new Set())

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground font-medium">
          {rootNode.children.length} opener variation{rootNode.children.length !== 1 ? "s" : ""}
        </span>
        <div className="flex gap-1.5">
          <button
            onClick={expandAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-0.5 rounded border border-border hover:border-muted-foreground/50"
          >
            Expand all
          </button>
          <button
            onClick={collapseAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-0.5 rounded border border-border hover:border-muted-foreground/50"
          >
            Collapse all
          </button>
        </div>
      </div>

      {/* Opener cards */}
      {rootNode.children.map((childId, i) => {
        const child = nodes[childId]
        if (!child) return null
        const isExpanded = expandedIds.has(childId)
        const text = child.text[language] || "(empty)"
        const isMe = child.speaker === "me"
        const descendantCount = countDescendants(childId, nodes)

        return (
          <div
            key={childId}
            className={`border rounded-lg overflow-hidden transition-colors ${
              isExpanded ? "border-primary/40 bg-primary/5" : "border-border"
            }`}
          >
            {/* Collapsible header */}
            <button
              onClick={() => toggle(childId)}
              className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
            >
              <ChevronRight
                className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                  isExpanded ? "rotate-90" : ""
                }`}
              />
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold leading-none text-white ${
                  isMe ? "bg-blue-600" : "bg-pink-600"
                }`}
              >
                {i + 1}
              </span>
              <span className="text-sm truncate flex-1">{text}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {descendantCount} turn{descendantCount !== 1 ? "s" : ""}
              </span>
            </button>

            {/* Expanded subtree */}
            {isExpanded && (
              <div className="border-t border-border/50 px-3 py-3 bg-card/50">
                <ConversationNodeView
                  nodeId={childId}
                  nodes={nodes}
                  language={language}
                  depth={0}
                  editingNodeId={editingNodeId}
                  onEdit={onEdit}
                  onAddChild={onAddChild}
                  onDelete={onDelete}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function countDescendants(nodeId: string, nodes: Record<string, ConversationNode>): number {
  const visited = new Set<string>()
  const queue = [nodeId]
  let count = -1 // exclude the node itself
  while (queue.length > 0) {
    const id = queue.pop()!
    if (visited.has(id)) continue
    visited.add(id)
    count++
    const node = nodes[id]
    if (node?.children) queue.push(...node.children)
  }
  return Math.max(0, count)
}
