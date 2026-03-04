"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Save, Plus, MessageSquare, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ConversationScript, ConversationNode } from "@/src/scenarios/types"
import ConversationNodeView from "./ConversationNodeView"
import NodeEditPanel from "./NodeEditPanel"
import OpenerAccordion from "./OpenerAccordion"

function createNode(speaker: "me" | "her"): ConversationNode {
  return { id: crypto.randomUUID(), speaker, text: { da: "", en: "" }, children: [] }
}

function createEmptyScript(): ConversationScript {
  const root = createNode("me")
  return {
    id: crypto.randomUUID(),
    name: "Untitled Script",
    language: "da",
    rootNodeId: root.id,
    nodes: { [root.id]: root },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

type SavedEntry = { id: string; name: string; updatedAt: string }

export default function ScriptBuilder() {
  const [script, setScript] = useState<ConversationScript>(createEmptyScript)
  const [language, setLanguage] = useState<"da" | "en">("da")
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [savedScripts, setSavedScripts] = useState<SavedEntry[]>([])
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  // Fetch saved scripts on mount
  useEffect(() => {
    fetch("/api/test/scripts").then(r => r.json()).then(setSavedScripts).catch(() => {})
  }, [])

  const mutate = useCallback((fn: (s: ConversationScript) => ConversationScript) => {
    setScript(prev => fn(prev))
    setDirty(true)
  }, [])

  const handleAddChild = useCallback((parentId: string) => {
    mutate(s => {
      const parent = s.nodes[parentId]
      if (!parent) return s
      const child = createNode(parent.speaker === "me" ? "her" : "me")
      return {
        ...s,
        nodes: {
          ...s.nodes,
          [parentId]: { ...parent, children: [...parent.children, child.id] },
          [child.id]: child,
        },
      }
    })
  }, [mutate])

  const handleDeleteNode = useCallback((nodeId: string) => {
    mutate(s => {
      // Collect all descendants
      const toRemove = new Set<string>()
      const queue = [nodeId]
      while (queue.length > 0) {
        const id = queue.pop()!
        toRemove.add(id)
        const node = s.nodes[id]
        if (node) queue.push(...node.children)
      }

      // Remove from parent's children
      const newNodes = { ...s.nodes }
      for (const id of Object.keys(newNodes)) {
        const node = newNodes[id]
        if (node.children.some(c => toRemove.has(c))) {
          newNodes[id] = { ...node, children: node.children.filter(c => !toRemove.has(c)) }
        }
      }

      // Delete nodes
      for (const id of toRemove) delete newNodes[id]

      return { ...s, nodes: newNodes }
    })
    setEditingNodeId(prev => prev === nodeId ? null : prev)
  }, [mutate])

  const handleUpdateNode = useCallback((id: string, updates: Partial<ConversationNode>) => {
    mutate(s => ({
      ...s,
      nodes: { ...s.nodes, [id]: { ...s.nodes[id], ...updates } },
    }))
  }, [mutate])

  // Refs for autosave to always see latest state
  const scriptRef = useRef(script)
  const languageRef = useRef(language)
  scriptRef.current = script
  languageRef.current = language

  const save = useCallback(async () => {
    setSaving(true)
    try {
      const toSave = { ...scriptRef.current, language: languageRef.current, updatedAt: new Date().toISOString() }
      await fetch("/api/test/scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSave),
      })
      setScript(toSave)
      setDirty(false)
      const list = await fetch("/api/test/scripts").then(r => r.json())
      setSavedScripts(list)
    } finally {
      setSaving(false)
    }
  }, [])

  // Ctrl+S / Cmd+S to save immediately
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        if (dirty) save()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [dirty, save])

  // Autosave 800ms after last mutation
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!dirty) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => { save() }, 800)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [dirty, script, save])

  const handleLoad = async (name: string) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "")
    const res = await fetch(`/api/test/scripts/${slug}`)
    if (res.ok) {
      const loaded: ConversationScript = await res.json()
      setScript(loaded)
      setLanguage(loaded.language)
      setEditingNodeId(null)
      setDirty(false)
    }
  }

  const handleNew = () => {
    setScript(createEmptyScript())
    setEditingNodeId(null)
    setDirty(false)
  }

  const editingNode = editingNodeId ? script.nodes[editingNodeId] : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <MessageSquare className="size-8 text-primary" />
        <h1 className="text-3xl font-bold">Script Builder</h1>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          className="w-64"
          value={script.name}
          onChange={(e) => mutate(s => ({ ...s, name: e.target.value }))}
          placeholder="Script name"
        />

        {savedScripts.length > 0 && (
          <Select onValueChange={handleLoad}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Load script..." />
            </SelectTrigger>
            <SelectContent>
              {savedScripts.map(s => (
                <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Language toggle */}
        <div className="flex overflow-hidden rounded-md border border-border">
          <button
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              language === "da"
                ? "bg-primary text-primary-foreground"
                : "bg-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setLanguage("da")}
          >
            DA
          </button>
          <button
            className={`px-3 py-1.5 text-sm font-medium transition-colors border-l border-border ${
              language === "en"
                ? "bg-primary text-primary-foreground"
                : "bg-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setLanguage("en")}
          >
            EN
          </button>
        </div>

        <Button size="sm" onClick={save} disabled={saving || !dirty} variant={dirty ? "default" : "outline"}>
          {saving ? (
            <><Save className="size-4 mr-1 animate-pulse" />Saving...</>
          ) : dirty ? (
            <><Save className="size-4 mr-1" />Save</>
          ) : (
            <><Check className="size-4 mr-1 text-green-500" />Saved</>
          )}
        </Button>

        <Button size="sm" variant="outline" onClick={handleNew}>
          <Plus className="size-4 mr-1" />
          New
        </Button>
      </div>

      {/* Main area: tree + edit panel */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Tree — use accordion view when root has multiple children */}
        <div>
          {script.nodes[script.rootNodeId]?.children.length > 1 ? (
            <OpenerAccordion
              rootNodeId={script.rootNodeId}
              nodes={script.nodes}
              language={language}
              editingNodeId={editingNodeId}
              onEdit={setEditingNodeId}
              onAddChild={handleAddChild}
              onDelete={handleDeleteNode}
            />
          ) : (
            <ConversationNodeView
              nodeId={script.rootNodeId}
              nodes={script.nodes}
              language={language}
              depth={0}
              editingNodeId={editingNodeId}
              onEdit={setEditingNodeId}
              onAddChild={handleAddChild}
              onDelete={handleDeleteNode}
            />
          )}
        </div>

        {/* Edit panel */}
        {editingNode && (
          <div className="lg:sticky lg:top-4 self-start">
            <NodeEditPanel
              node={editingNode}
              language={language}
              onUpdate={handleUpdateNode}
              onClose={() => setEditingNodeId(null)}
              onSave={save}
            />
          </div>
        )}
      </div>
    </div>
  )
}
