import { Plus, Trash2, CornerDownRight } from "lucide-react"
import type { ConversationNode } from "@/src/scenarios/types"

/** Mutable counter shared across the entire tree render to cap total nodes */
interface RenderBudget {
  remaining: number
}

interface ConversationNodeViewProps {
  nodeId: string
  nodes: Record<string, ConversationNode>
  language: "da" | "en"
  depth: number
  editingNodeId: string | null
  onEdit: (id: string) => void
  onAddChild: (parentId: string) => void
  onDelete: (id: string) => void
  isLastChild?: boolean
  /** Ancestor node IDs on the current path — prevents cycles */
  ancestors?: Set<string>
  /** Shared render budget to prevent DAG explosion */
  budget?: RenderBudget
}

const MAX_RENDER_NODES = 500

export default function ConversationNodeView({
  nodeId,
  nodes,
  language,
  depth,
  editingNodeId,
  onEdit,
  onAddChild,
  onDelete,
  isLastChild = true,
  ancestors,
  budget: parentBudget,
}: ConversationNodeViewProps) {
  const node = nodes[nodeId]
  if (!node) return null

  // Initialize budget at tree root
  const budget = parentBudget ?? { remaining: MAX_RENDER_NODES }

  // Budget exhausted — stop rendering
  if (budget.remaining <= 0) {
    return <div className="pl-6 text-xs text-muted-foreground italic">... (truncated)</div>
  }
  budget.remaining--

  if (depth > 30) return <div className="pl-6 text-xs text-muted-foreground italic">... (depth limit)</div>

  // Cycle detection: if this node is an ancestor of itself
  const isCycle = ancestors?.has(nodeId) ?? false

  const isMe = node.speaker === "me"
  const rawText = node.text[language]
  const text = rawText || "(empty)"
  const isEditing = editingNodeId === nodeId
  const hasChildren = node.children.length > 0

  if (isCycle) {
    return (
      <div className="relative pl-6 min-w-0">
        {depth > 0 && (
          <>
            <div
              className="absolute border-l-2 border-muted-foreground/25"
              style={{ left: 0, top: 0, height: isLastChild ? 18 : "100%" }}
            />
            <div
              className="absolute border-t-2 border-muted-foreground/25"
              style={{ left: 0, top: 18, width: 16 }}
            />
          </>
        )}
        <div
          className="flex items-center gap-1.5 rounded-md border border-dashed border-muted-foreground/30 px-2.5 py-1 mb-1.5 bg-muted/20 cursor-pointer"
          onClick={() => onEdit(nodeId)}
        >
          <CornerDownRight className="size-3 text-muted-foreground shrink-0" />
          <span
            className={`shrink-0 rounded px-1 py-0.5 text-[10px] font-bold leading-none text-white ${
              isMe ? "bg-blue-600/60" : "bg-pink-600/60"
            }`}
          >
            {isMe ? "Me" : "Her"}
          </span>
          <span className="text-xs text-muted-foreground truncate">{text}</span>
          <span className="text-[10px] text-muted-foreground/60 shrink-0">(cycle)</span>
        </div>
      </div>
    )
  }

  // Build new ancestor set for children (each path gets its own copy)
  const childAncestors = new Set(ancestors)
  childAncestors.add(nodeId)

  return (
    <div className="relative pl-6 min-w-0">
      {/* Tree connector lines */}
      {depth > 0 && (
        <>
          <div
            className="absolute border-l-2 border-muted-foreground/25"
            style={{ left: 0, top: 0, height: isLastChild ? 18 : "100%" }}
          />
          <div
            className="absolute border-t-2 border-muted-foreground/25"
            style={{ left: 0, top: 18, width: 16 }}
          />
        </>
      )}

      {/* Node card */}
      <div
        className={`group flex items-start gap-1.5 rounded-md border px-2.5 py-1.5 mb-1.5 transition-colors cursor-pointer min-w-0 ${
          isEditing
            ? "border-primary ring-1 ring-primary/40 bg-primary/10"
            : "border-border bg-card hover:border-muted-foreground/50"
        }`}
        onClick={() => onEdit(nodeId)}
      >
        {/* Speaker badge */}
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold leading-none text-white mt-0.5 ${
            isMe ? "bg-blue-600" : "bg-pink-600"
          }`}
        >
          {isMe ? "Me" : "Her"}
        </span>

        {/* Text — full wrap */}
        <span className={`text-sm min-w-0 break-words ${rawText ? "text-foreground" : "text-muted-foreground italic"}`}>
          {text}
        </span>

        {/* Inline action buttons — show on hover or when editing */}
        <div
          className={`flex gap-0.5 shrink-0 ml-1 ${isEditing ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="rounded p-0.5 hover:bg-accent transition-colors"
            onClick={() => onAddChild(nodeId)}
            title="Add response"
          >
            <Plus className="size-3.5 text-muted-foreground" />
          </button>
          {depth > 0 && (
            <button
              className="rounded p-0.5 hover:bg-destructive/10 transition-colors"
              onClick={() => onDelete(nodeId)}
              title="Delete branch"
            >
              <Trash2 className="size-3.5 text-destructive" />
            </button>
          )}
        </div>
      </div>

      {/* Children — indented, each on its own line */}
      {hasChildren && (
        <div className="relative">
          {node.children.map((childId, i) => (
            <ConversationNodeView
              key={childId}
              nodeId={childId}
              nodes={nodes}
              language={language}
              depth={depth + 1}
              editingNodeId={editingNodeId}
              onEdit={onEdit}
              onAddChild={onAddChild}
              onDelete={onDelete}
              isLastChild={i === node.children.length - 1}
              ancestors={childAncestors}
              budget={budget}
            />
          ))}
        </div>
      )}
    </div>
  )
}
