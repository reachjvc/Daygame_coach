import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ConversationNode } from "@/src/scenarios/types"

interface NodeEditPanelProps {
  node: ConversationNode
  language: "da" | "en"
  onUpdate: (id: string, updates: Partial<ConversationNode>) => void
  onClose: () => void
  onSave: () => void
}

export default function NodeEditPanel({ node, language, onUpdate, onClose, onSave }: NodeEditPanelProps) {
  const langLabel = language === "da" ? "Dansk" : "English"

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Edit Node</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      {/* Speaker toggle */}
      <div className="flex overflow-hidden rounded-md border border-border">
        <button
          className={`flex-1 px-3 py-1.5 text-sm font-bold transition-colors ${
            node.speaker === "me"
              ? "bg-blue-600 text-white"
              : "bg-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => onUpdate(node.id, { speaker: "me" })}
        >
          Me
        </button>
        <button
          className={`flex-1 px-3 py-1.5 text-sm font-bold transition-colors border-l border-border ${
            node.speaker === "her"
              ? "bg-pink-600 text-white"
              : "bg-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => onUpdate(node.id, { speaker: "her" })}
        >
          Her
        </button>
      </div>

      {/* Single textarea for active language */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">{langLabel}</label>
        <textarea
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[100px] resize-y focus:outline-none focus:ring-2 focus:ring-ring"
          value={node.text[language]}
          onChange={(e) =>
            onUpdate(node.id, { text: { ...node.text, [language]: e.target.value } })
          }
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              onSave()
            }
          }}
          placeholder={`Write the ${language === "da" ? "Danish" : "English"} line...`}
        />
      </div>
    </div>
  )
}
