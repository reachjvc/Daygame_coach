import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ConversationNode } from "@/src/scenarios/types"

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
}

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
}: ConversationNodeViewProps) {
  const node = nodes[nodeId]
  if (!node) return null

  const isMe = node.speaker === "me"
  const rawText = node.text[language]
  const text = rawText || "(empty)"
  const isEditing = editingNodeId === nodeId
  const hasChildren = node.children.length > 0

  return (
    <div className="relative pl-6">
      {/* Tree connector lines */}
      {depth > 0 && (
        <>
          {/* Vertical line from parent down to this node */}
          <div
            className="absolute border-l-2 border-muted-foreground/25"
            style={{ left: 0, top: 0, height: isLastChild ? 18 : "100%" }}
          />
          {/* Horizontal branch into this node */}
          <div
            className="absolute border-t-2 border-muted-foreground/25"
            style={{ left: 0, top: 18, width: 16 }}
          />
        </>
      )}

      {/* Node card — compact inline */}
      <div
        className={`group inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 mb-1.5 transition-colors cursor-pointer max-w-full ${
          isEditing
            ? "border-primary ring-1 ring-primary/40 bg-primary/10"
            : "border-border bg-card hover:border-muted-foreground/50"
        }`}
        onClick={() => onEdit(nodeId)}
      >
        {/* Speaker badge */}
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold leading-none text-white ${
            isMe ? "bg-blue-600" : "bg-pink-600"
          }`}
        >
          {isMe ? "Me" : "Her"}
        </span>

        {/* Text — truncate at ~40 chars */}
        <span className={`text-sm truncate max-w-[300px] ${rawText ? "text-foreground" : "text-muted-foreground italic"}`}>
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
            />
          ))}
        </div>
      )}
    </div>
  )
}
