"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Bot,
  Sparkles,
  MessageSquare,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  X,
  Save,
  Star,
  CircleDot,
  RotateCcw,
  FileEdit,
  Loader2,
  AlertTriangle,
  Shuffle,
  ThumbsDown,
} from "lucide-react"
import {
  type FeedbackType,
  type ArticleFeedbackFlag,
  type ArticlePhase,
  type ArticleContract,
  type ArticleOutline,
  type StructureUnlock,
  type PhaseLocks,
  type LearningSuggestion,
  FEEDBACK_TYPES,
  PHASE_LABELS
} from "@/src/articles/types"

// Types for API responses
interface ArticleInfo {
  id: string
  title: string
  status: string
  phase: ArticlePhase
  drafts: string[]
  feedbacks: string[]
  hasManifest: boolean
}

interface ArticleSection {
  id: string
  content: string
}

interface LoadedArticle {
  id: string
  version: number
  title: string
  sections: ArticleSection[]
  // Progressive commitment fields
  phase: ArticlePhase
  contract: ArticleContract | null
  outline: ArticleOutline | null
  phaseLocks: PhaseLocks
  structureUnlocks: StructureUnlock[]
}


// Icon mapping for feedback types
const FEEDBACK_ICONS: Record<FeedbackType, React.ReactNode> = {
  excellent: <Star className="size-3" />,
  good: <Sparkles className="size-3" />,
  almost: <CircleDot className="size-3" />,
  angle: <RotateCcw className="size-3" />,
  ai: <Bot className="size-3" />,
  note: <MessageSquare className="size-3" />,
  alternatives: <Shuffle className="size-3" />,
  source: <AlertTriangle className="size-3" />,
  negative: <ThumbsDown className="size-3" />,
}

const FEEDBACK_ICONS_LG: Record<FeedbackType, React.ReactNode> = {
  excellent: <Star className="size-4" />,
  good: <Sparkles className="size-4" />,
  almost: <CircleDot className="size-4" />,
  angle: <RotateCcw className="size-4" />,
  ai: <Bot className="size-4" />,
  note: <MessageSquare className="size-4" />,
  alternatives: <Shuffle className="size-4" />,
  source: <AlertTriangle className="size-4" />,
  negative: <ThumbsDown className="size-4" />,
}

// Phase indicator component
function PhaseIndicator({ currentPhase, phaseLocks }: { currentPhase: ArticlePhase; phaseLocks: PhaseLocks }) {
  const phases: ArticlePhase[] = [1, 2, 3, 4]

  return (
    <div className="flex items-center gap-1 text-sm">
      {phases.map((phase, idx) => {
        const isActive = phase === currentPhase
        const isCompleted = phase < currentPhase
        const isLocked = phase === 1 ? !!phaseLocks.contractLockedAt :
                        phase === 2 ? !!phaseLocks.structureLockedAt : false

        return (
          <div key={phase} className="flex items-center">
            <div
              className={`
                px-2 py-1 rounded text-xs font-medium transition-colors
                ${isActive ? 'bg-primary text-primary-foreground' : ''}
                ${isCompleted ? 'bg-green-500/20 text-green-600' : ''}
                ${!isActive && !isCompleted ? 'bg-muted text-muted-foreground' : ''}
              `}
              title={isLocked ? `Locked at ${isLocked}` : undefined}
            >
              {PHASE_LABELS[phase]}
              {isLocked && <span className="ml-1">🔒</span>}
            </div>
            {idx < phases.length - 1 && (
              <span className={`mx-1 ${isCompleted ? 'text-green-600' : 'text-muted-foreground'}`}>→</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Contract display (read-only, collapsible)
function ContractDisplay({ contract, isCollapsed, onToggle, onUnlock }: {
  contract: ArticleContract
  isCollapsed: boolean
  onToggle: () => void
  onUnlock?: () => void
}) {
  return (
    <div className="border rounded-lg bg-muted/30">
      <button
        onClick={onToggle}
        className="w-full px-4 py-2 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
      >
        <span className="font-medium text-sm flex items-center gap-2">
          📜 Article Contract
          <span className="text-xs text-muted-foreground">(locked)</span>
        </span>
        {isCollapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
      </button>

      {!isCollapsed && (
        <div className="px-4 pb-4 space-y-3 text-sm">
          <div>
            <span className="text-muted-foreground">Thesis:</span>
            <p className="font-medium">{contract.thesis}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Target Reader:</span>
            <p>{contract.targetReader}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Must Include:</span>
            <ul className="list-disc list-inside text-xs mt-1">
              {contract.mustInclude.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
          {contract.mustNotInclude.length > 0 && (
            <div>
              <span className="text-muted-foreground">Must NOT Include:</span>
              <ul className="list-disc list-inside text-xs mt-1 text-red-600">
                {contract.mustNotInclude.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Tone:</span>
            <p className="text-xs">{contract.tone}</p>
          </div>

          {onUnlock && (
            <div className="pt-2 border-t mt-3">
              <button
                onClick={(e) => { e.stopPropagation(); onUnlock(); }}
                className="text-xs text-red-600 hover:text-red-700 hover:underline flex items-center gap-1"
              >
                🔓 Unlock Structure (reset to outline phase)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Contract form (Phase 1 - editable)
function ContractForm({ contract, onSave, saving }: {
  contract: ArticleContract
  onSave: (contract: ArticleContract) => void
  saving: boolean
}) {
  const [form, setForm] = useState<ArticleContract>(contract)
  const [mustIncludeInput, setMustIncludeInput] = useState("")
  const [mustNotIncludeInput, setMustNotIncludeInput] = useState("")

  const addMustInclude = () => {
    if (mustIncludeInput.trim()) {
      setForm(prev => ({ ...prev, mustInclude: [...prev.mustInclude, mustIncludeInput.trim()] }))
      setMustIncludeInput("")
    }
  }

  const addMustNotInclude = () => {
    if (mustNotIncludeInput.trim()) {
      setForm(prev => ({ ...prev, mustNotInclude: [...prev.mustNotInclude, mustNotIncludeInput.trim()] }))
      setMustNotIncludeInput("")
    }
  }

  const removeMustInclude = (idx: number) => {
    setForm(prev => ({ ...prev, mustInclude: prev.mustInclude.filter((_, i) => i !== idx) }))
  }

  const removeMustNotInclude = (idx: number) => {
    setForm(prev => ({ ...prev, mustNotInclude: prev.mustNotInclude.filter((_, i) => i !== idx) }))
  }

  const isValid = form.title.trim() && form.thesis.trim() && form.targetReader.trim() && form.mustInclude.length > 0

  return (
    <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">📝</span>
        <h3 className="font-bold">Phase 1: Define Article Contract</h3>
      </div>

      <p className="text-sm text-muted-foreground">
        Lock in the core decisions before writing. This prevents drift during revisions.
      </p>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium block mb-1">Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
            className="w-full p-2 rounded border bg-background text-sm"
            placeholder="The article title"
          />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Thesis (one sentence)</label>
          <textarea
            value={form.thesis}
            onChange={(e) => setForm(prev => ({ ...prev, thesis: e.target.value }))}
            className="w-full p-2 rounded border bg-background text-sm resize-none"
            rows={2}
            placeholder="The core claim this article makes"
          />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Target Reader</label>
          <input
            type="text"
            value={form.targetReader}
            onChange={(e) => setForm(prev => ({ ...prev, targetReader: e.target.value }))}
            className="w-full p-2 rounded border bg-background text-sm"
            placeholder="Who is this for?"
          />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Must Include</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={mustIncludeInput}
              onChange={(e) => setMustIncludeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMustInclude())}
              className="flex-1 p-2 rounded border bg-background text-sm"
              placeholder="Add non-negotiable point..."
            />
            <Button size="sm" onClick={addMustInclude} disabled={!mustIncludeInput.trim()}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {form.mustInclude.map((item, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {item}
                <X className="size-3 ml-1 cursor-pointer" onClick={() => removeMustInclude(i)} />
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Must NOT Include (scope boundaries)</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={mustNotIncludeInput}
              onChange={(e) => setMustNotIncludeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMustNotInclude())}
              className="flex-1 p-2 rounded border bg-background text-sm"
              placeholder="Explicit scope boundary..."
            />
            <Button size="sm" variant="outline" onClick={addMustNotInclude} disabled={!mustNotIncludeInput.trim()}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {form.mustNotInclude.map((item, i) => (
              <Badge key={i} variant="outline" className="text-xs text-red-600 border-red-300">
                {item}
                <X className="size-3 ml-1 cursor-pointer" onClick={() => removeMustNotInclude(i)} />
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Tone</label>
          <input
            type="text"
            value={form.tone}
            onChange={(e) => setForm(prev => ({ ...prev, tone: e.target.value }))}
            className="w-full p-2 rounded border bg-background text-sm"
            placeholder="e.g., 'Analytical and credible', 'Conversational but not casual'"
          />
        </div>
      </div>

      <div className="pt-4 border-t flex justify-end">
        <Button
          onClick={() => onSave(form)}
          disabled={!isValid || saving}
          className="bg-green-600 hover:bg-green-700"
        >
          {saving ? <Loader2 className="size-4 mr-1 animate-spin" /> : null}
          🔒 Lock Contract & Continue to Outline
        </Button>
      </div>
    </div>
  )
}

// Outline editor (Phase 2 - editable)
function OutlineEditor({ outline, onSave, saving }: {
  outline: ArticleOutline
  onSave: (outline: ArticleOutline) => void
  saving: boolean
}) {
  const [sections, setSections] = useState<Array<{ id: string; purpose: string; notes?: string }>>(
    outline.sections || []
  )
  const [newSectionId, setNewSectionId] = useState("")
  const [newSectionPurpose, setNewSectionPurpose] = useState("")

  const addSection = () => {
    if (newSectionId.trim() && newSectionPurpose.trim()) {
      setSections(prev => [...prev, { id: newSectionId.trim(), purpose: newSectionPurpose.trim() }])
      setNewSectionId("")
      setNewSectionPurpose("")
    }
  }

  const removeSection = (idx: number) => {
    setSections(prev => prev.filter((_, i) => i !== idx))
  }

  const updateSection = (idx: number, field: 'purpose' | 'notes', value: string) => {
    setSections(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }

  const moveSection = (idx: number, direction: 'up' | 'down') => {
    if (direction === 'up' && idx > 0) {
      setSections(prev => {
        const newSections = [...prev]
        ;[newSections[idx - 1], newSections[idx]] = [newSections[idx], newSections[idx - 1]]
        return newSections
      })
    } else if (direction === 'down' && idx < sections.length - 1) {
      setSections(prev => {
        const newSections = [...prev]
        ;[newSections[idx], newSections[idx + 1]] = [newSections[idx + 1], newSections[idx]]
        return newSections
      })
    }
  }

  const isValid = sections.length >= 2

  return (
    <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">📋</span>
        <h3 className="font-bold">Phase 2: Define Outline</h3>
      </div>

      <p className="text-sm text-muted-foreground">
        Define what each section must accomplish (not the content, just the purpose).
      </p>

      <div className="space-y-3">
        {sections.map((section, idx) => (
          <div key={idx} className="p-3 border rounded bg-background">
            <div className="flex items-start gap-2">
              <div className="flex flex-col gap-1">
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => moveSection(idx, 'up')} disabled={idx === 0}>
                  <ChevronUp className="size-3" />
                </Button>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => moveSection(idx, 'down')} disabled={idx === sections.length - 1}>
                  <ChevronDown className="size-3" />
                </Button>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{section.id}</span>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 ml-auto text-red-500" onClick={() => removeSection(idx)}>
                    <X className="size-3" />
                  </Button>
                </div>
                <input
                  type="text"
                  value={section.purpose}
                  onChange={(e) => updateSection(idx, 'purpose', e.target.value)}
                  className="w-full p-2 rounded border bg-background text-sm mb-1"
                  placeholder="What must this section accomplish?"
                />
                <input
                  type="text"
                  value={section.notes || ''}
                  onChange={(e) => updateSection(idx, 'notes', e.target.value)}
                  className="w-full p-1 rounded border bg-muted/50 text-xs text-muted-foreground"
                  placeholder="Optional notes..."
                />
              </div>
            </div>
          </div>
        ))}

        <div className="p-3 border-2 border-dashed rounded bg-muted/10">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newSectionId}
              onChange={(e) => setNewSectionId(e.target.value)}
              className="w-32 p-2 rounded border bg-background text-sm font-mono"
              placeholder="section-id"
            />
            <input
              type="text"
              value={newSectionPurpose}
              onChange={(e) => setNewSectionPurpose(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSection())}
              className="flex-1 p-2 rounded border bg-background text-sm"
              placeholder="What must this section accomplish?"
            />
            <Button size="sm" onClick={addSection} disabled={!newSectionId.trim() || !newSectionPurpose.trim()}>
              Add Section
            </Button>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t flex justify-end">
        <Button
          onClick={() => onSave({ sections, lockedAt: new Date().toISOString() })}
          disabled={!isValid || saving}
          className="bg-green-600 hover:bg-green-700"
        >
          {saving ? <Loader2 className="size-4 mr-1 animate-spin" /> : null}
          🔒 Lock Outline & Start Draft
        </Button>
      </div>
    </div>
  )
}

// Unlock history panel
function UnlockHistory({ unlocks }: { unlocks: StructureUnlock[] }) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (unlocks.length === 0) return null

  return (
    <div className="border rounded-lg bg-yellow-500/10 border-yellow-500/30">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 flex items-center justify-between text-left hover:bg-yellow-500/20 transition-colors"
      >
        <span className="font-medium text-sm flex items-center gap-2 text-yellow-600">
          🔓 Structure Unlocks ({unlocks.length})
        </span>
        {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-2">
          {unlocks.map((unlock, i) => (
            <div key={i} className="text-xs p-2 bg-background rounded border">
              <div className="text-muted-foreground">
                {new Date(unlock.timestamp).toLocaleDateString()}
              </div>
              <div className="font-medium">{unlock.reason}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface SelectionPopup {
  x: number
  y: number
  text: string
  sectionId: string
}

export default function ArticleEditorPage() {
  // Article selection state
  const [articles, setArticles] = useState<ArticleInfo[]>([])
  const [selectedArticleId, setSelectedArticleId] = useState<string>("")
  const [selectedDraftVersion, setSelectedDraftVersion] = useState<number>(1)
  const [loadedArticle, setLoadedArticle] = useState<LoadedArticle | null>(null)
  const [loading, setLoading] = useState(true)

  // Feedback state
  const [flags, setFlags] = useState<ArticleFeedbackFlag[]>([])
  const [selection, setSelection] = useState<SelectionPopup | null>(null)
  const [commentMode, setCommentMode] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [sectionCommentModal, setSectionCommentModal] = useState<{ sectionId: string } | null>(null)
  const [sectionCommentText, setSectionCommentText] = useState("")
  const [draftingNew, setDraftingNew] = useState(false)
  const [sourceModal, setSourceModal] = useState<{ sectionId: string; quote?: string } | null>(null)
  // Progressive commitment state
  const [contractCollapsed, setContractCollapsed] = useState(true)
  const [unlockModal, setUnlockModal] = useState(false)
  const [unlockReason, setUnlockReason] = useState("")
  const [unlocking, setUnlocking] = useState(false)
  const [savingPhase, setSavingPhase] = useState(false)
  // Sub-menu state for AI, Excellent, Negative, and generic flags with optional notes
  const [subMenu, setSubMenu] = useState<"ai" | "excellent" | "negative" | "good" | "almost" | "angle" | "alternatives" | null>(null)
  const [subMenuComment, setSubMenuComment] = useState("")
  // Track recently added flags for visual feedback
  const [recentlyAdded, setRecentlyAdded] = useState<FeedbackType | null>(null)
  // Learning suggestions modal state
  const [suggestionsModal, setSuggestionsModal] = useState(false)
  const [learningSuggestions, setLearningSuggestions] = useState<LearningSuggestion[]>([])
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set())
  const [editedSuggestions, setEditedSuggestions] = useState<Record<number, string>>({})
  const [analyzingComments, setAnalyzingComments] = useState(false)
  const [approvingLearnings, setApprovingLearnings] = useState(false)

  // Count blocking flags (source flags that need review before publishing)
  const blockingFlagsCount = flags.filter(f => f.type === "source").length

  // Fetch articles list on mount
  useEffect(() => {
    async function fetchArticles() {
      try {
        const res = await fetch("/api/test/articles")
        const data = await res.json()
        setArticles(data.articles || [])

        // Auto-select first article if available
        if (data.articles?.length > 0) {
          const first = data.articles[0]
          setSelectedArticleId(first.id)
          // Select latest draft
          if (first.drafts.length > 0) {
            const latestDraft = first.drafts[first.drafts.length - 1]
            const version = parseInt(latestDraft.match(/\d+/)?.[0] || "1")
            setSelectedDraftVersion(version)
          }
        }
      } catch (error) {
        console.error("Failed to fetch articles:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchArticles()
  }, [])

  // Fetch draft content when selection changes
  useEffect(() => {
    if (!selectedArticleId || !selectedDraftVersion) return

    async function fetchDraft() {
      setLoading(true)
      try {
        const res = await fetch(
          `/api/test/articles?id=${selectedArticleId}&draft=${selectedDraftVersion}`
        )
        const data = await res.json()
        setLoadedArticle({
          id: data.id,
          version: data.version,
          title: data.title,
          sections: data.sections,
          // Progressive commitment fields
          phase: data.phase || 1,
          contract: data.contract || null,
          outline: data.outline || null,
          phaseLocks: data.phaseLocks || {},
          structureUnlocks: data.structureUnlocks || [],
        })
        // Clear flags when switching drafts
        setFlags([])
      } catch (error) {
        console.error("Failed to fetch draft:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchDraft()
  }, [selectedArticleId, selectedDraftVersion])

  // Get available drafts for selected article
  const selectedArticle = articles.find((a) => a.id === selectedArticleId)
  const availableDrafts = selectedArticle?.drafts || []

  const addFlag = (type: FeedbackType, sectionId: string, quote?: string, note?: string, closePopup = false) => {
    setFlags(prev => [...prev, { type, sectionId, quote, note }])
    // Show visual feedback
    setRecentlyAdded(type)
    setTimeout(() => setRecentlyAdded(null), 1500)
    // Reset sub-menu state
    setSubMenu(null)
    setSubMenuComment("")
    setCommentMode(false)
    setCommentText("")
    // Only close popup if explicitly requested
    if (closePopup) {
      setSelection(null)
    }
  }

  const removeFlag = (index: number) => {
    setFlags(prev => prev.filter((_, i) => i !== index))
  }

  // Shared helper to refresh article data after phase transitions
  const refreshArticleData = useCallback(async () => {
    if (!loadedArticle) return
    try {
      const res = await fetch(
        `/api/test/articles?id=${loadedArticle.id}&draft=${loadedArticle.version}`
      )
      if (!res.ok) {
        console.error("Failed to refresh article data")
        return
      }
      const data = await res.json()
      setLoadedArticle({
        id: data.id,
        version: data.version,
        title: data.title,
        sections: data.sections,
        phase: data.phase || 1,
        contract: data.contract || null,
        outline: data.outline || null,
        phaseLocks: data.phaseLocks || {},
        structureUnlocks: data.structureUnlocks || [],
      })
      // Sync selectedDraftVersion if version changed
      if (data.version !== selectedDraftVersion) {
        setSelectedDraftVersion(data.version)
      }
    } catch (error) {
      console.error("Failed to refresh article data:", error)
    }
  }, [loadedArticle, selectedDraftVersion])

  // Unlock structure to allow changes (Phase 4 → Phase 2)
  const handleUnlockStructure = async () => {
    if (!loadedArticle || !unlockReason.trim()) return

    setUnlocking(true)
    try {
      const response = await fetch("/api/test/articles/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: loadedArticle.id,
          reason: unlockReason.trim()
        })
      })

      if (response.ok) {
        await refreshArticleData()
        setUnlockModal(false)
        setUnlockReason("")
      }
    } catch (error) {
      console.error("Failed to unlock structure:", error)
    } finally {
      setUnlocking(false)
    }
  }

  // Save contract and advance to Phase 2
  const handleSaveContract = async (contract: ArticleContract) => {
    if (!loadedArticle) return

    setSavingPhase(true)
    try {
      const response = await fetch("/api/test/articles/phase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: loadedArticle.id,
          action: "lock-contract",
          contract
        })
      })

      if (response.ok) {
        await refreshArticleData()
      }
    } catch (error) {
      console.error("Failed to save contract:", error)
    } finally {
      setSavingPhase(false)
    }
  }

  // Save outline and advance to Phase 3
  const handleSaveOutline = async (outline: ArticleOutline) => {
    if (!loadedArticle) return

    setSavingPhase(true)
    try {
      const response = await fetch("/api/test/articles/phase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: loadedArticle.id,
          action: "lock-outline",
          outline
        })
      })

      if (response.ok) {
        await refreshArticleData()
      }
    } catch (error) {
      console.error("Failed to save outline:", error)
    } finally {
      setSavingPhase(false)
    }
  }

  // Advance from Phase 3 to Phase 4
  const handleLockStructure = async () => {
    if (!loadedArticle) return

    setSavingPhase(true)
    try {
      const response = await fetch("/api/test/articles/phase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: loadedArticle.id,
          action: "lock-structure"
        })
      })

      if (response.ok) {
        await refreshArticleData()
      }
    } catch (error) {
      console.error("Failed to lock structure:", error)
    } finally {
      setSavingPhase(false)
    }
  }

  const handleContextMenu = useCallback((e: React.MouseEvent, sectionId: string) => {
    e.preventDefault()

    const sel = window.getSelection()
    const selectedText = sel?.toString().trim()

    let text: string
    let x: number
    let y: number

    if (selectedText && selectedText.length > 0) {
      // Normalize whitespace: collapse multiple spaces/newlines into single space
      // This handles cross-paragraph selections and browser whitespace quirks
      text = selectedText.replace(/\s+/g, ' ')
      const range = sel?.getRangeAt(0)
      const rect = range?.getBoundingClientRect()
      if (!rect) return
      x = rect.left + rect.width / 2
      y = rect.top - 10
    } else {
      const target = e.target as HTMLElement
      const paragraph = target.closest('p')
      if (!paragraph) return
      text = paragraph.textContent || ''
      x = e.clientX
      y = e.clientY - 10
    }

    if (text) {
      setSelection({ x, y, text, sectionId })
      setCommentMode(false)
      setCommentText("")
      setSubMenu(null)
      setSubMenuComment("")
    }
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.selection-popup')) {
        setTimeout(() => {
          if (!commentMode && !subMenu) {
            setSelection(null)
            setSubMenu(null)
            setSubMenuComment("")
          }
        }, 100)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [commentMode, subMenu])

  const exportFeedback = () => {
    if (!loadedArticle) return "No article loaded"

    let output = `# Feedback: ${loadedArticle.title}\n`
    output += `Generated: ${new Date().toISOString()}\n\n`

    const bySection: Record<string, ArticleFeedbackFlag[]> = {}
    flags.forEach(flag => {
      if (!bySection[flag.sectionId]) bySection[flag.sectionId] = []
      bySection[flag.sectionId].push(flag)
    })

    loadedArticle.sections.forEach(section => {
      const sectionFlags = bySection[section.id]
      if (!sectionFlags || sectionFlags.length === 0) return

      output += `## Section: ${section.id}\n\n`
      output += `### Original text:\n\`\`\`\n${section.content}\n\`\`\`\n\n`
      output += `### Feedback:\n`

      sectionFlags.forEach(flag => {
        if (flag.quote) {
          output += `\n**${FEEDBACK_TYPES[flag.type].label}** on: "${flag.quote}"\n`
          if (flag.note) output += `> ${flag.note}\n`
        } else {
          output += `\n**${FEEDBACK_TYPES[flag.type].label}** (whole section)`
          if (flag.note) output += `: ${flag.note}`
          output += `\n`
        }
      })
      output += `\n---\n\n`
    })

    return output || "No feedback yet"
  }

  const copyFeedback = async () => {
    await navigator.clipboard.writeText(exportFeedback())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const saveFeedback = async () => {
    if (!loadedArticle) return
    try {
      const response = await fetch("/api/test/save-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: loadedArticle.id,
          feedback: exportFeedback(),
          flags: flags
        })
      })
      if (response.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)

        // Check for flags with notes and analyze them for learnings
        const flagsWithNotes = flags.filter(f => f.note && f.note.trim().length > 0)
        if (flagsWithNotes.length > 0) {
          setAnalyzingComments(true)
          try {
            const analyzeResponse = await fetch("/api/test/analyze-comments", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ flags })
            })
            if (analyzeResponse.ok) {
              const { suggestions } = await analyzeResponse.json()
              if (suggestions && suggestions.length > 0) {
                setLearningSuggestions(suggestions)
                // Pre-select all suggestions
                setSelectedSuggestions(new Set(suggestions.map((_: LearningSuggestion, i: number) => i)))
                setEditedSuggestions({})
                setSuggestionsModal(true)
              }
            }
          } catch (analyzeError) {
            console.error("Failed to analyze comments:", analyzeError)
            // Don't block - feedback was already saved
          } finally {
            setAnalyzingComments(false)
          }
        }
      }
    } catch (error) {
      console.error("Failed to save:", error)
    }
  }

  const approveLearnings = async () => {
    if (selectedSuggestions.size === 0) {
      setSuggestionsModal(false)
      return
    }

    setApprovingLearnings(true)
    try {
      const approvedSuggestions = learningSuggestions
        .filter((_, i) => selectedSuggestions.has(i))
        .map((s, i) => ({
          ...s,
          suggestedText: editedSuggestions[learningSuggestions.indexOf(s)] ?? s.suggestedText
        }))

      const response = await fetch("/api/test/analyze-comments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvedSuggestions })
      })

      if (response.ok) {
        setSuggestionsModal(false)
        setLearningSuggestions([])
        setSelectedSuggestions(new Set())
        setEditedSuggestions({})
        // Show success feedback
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch (error) {
      console.error("Failed to approve learnings:", error)
    } finally {
      setApprovingLearnings(false)
    }
  }

  const toggleSuggestion = (index: number) => {
    setSelectedSuggestions(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const saveAndDraftNew = async () => {
    if (!loadedArticle) return
    setDraftingNew(true)
    try {
      // Save the feedback (both .md and .json)
      const saveResponse = await fetch("/api/test/save-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: loadedArticle.id,
          feedback: exportFeedback(),
          flags: flags
        })
      })

      if (!saveResponse.ok) {
        alert("Failed to save feedback. Please try again.")
        return
      }

      // Save pending draft request for Claude Code to process
      const pendingResponse = await fetch("/api/test/pending-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: loadedArticle.id,
          title: loadedArticle.title,
          sections: loadedArticle.sections,
          feedback: flags
        })
      })

      if (!pendingResponse.ok) {
        alert("Feedback saved, but failed to create pending draft request.")
        return
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      alert(
        "Feedback saved!\n\n" +
        "To generate the next draft, tell Claude Code:\n" +
        "\"process the pending article draft\""
      )
    } catch (error) {
      console.error("Failed to save and draft:", error)
      alert("An error occurred. Please try again.")
    } finally {
      setDraftingNew(false)
    }
  }

  const getFlagsForSection = (sectionId: string) => flags.filter(f => f.sectionId === sectionId)

  const renderHighlightedText = (text: string, sectionId: string) => {
    const sectionFlags = flags.filter(f => f.sectionId === sectionId && f.quote)
    if (sectionFlags.length === 0) {
      return text
    }

    const result = text
    // Normalize text for searching (collapse whitespace)
    const normalizedText = text.replace(/\s+/g, ' ')
    const highlights: { start: number; end: number; type: FeedbackType }[] = []

    sectionFlags.forEach(flag => {
      if (!flag.quote) return
      // Try exact match first
      let idx = result.indexOf(flag.quote)
      if (idx !== -1) {
        highlights.push({
          start: idx,
          end: idx + flag.quote.length,
          type: flag.type,
        })
      } else {
        // Try normalized match (handles whitespace differences)
        const normalizedQuote = flag.quote.replace(/\s+/g, ' ')
        const normalizedIdx = normalizedText.indexOf(normalizedQuote)
        if (normalizedIdx !== -1) {
          // Map normalized position back to original text
          // Count actual characters up to the normalized position
          let originalPos = 0
          let normalizedPos = 0
          while (normalizedPos < normalizedIdx && originalPos < text.length) {
            if (/\s/.test(text[originalPos])) {
              // Skip consecutive whitespace in original
              while (originalPos < text.length && /\s/.test(text[originalPos])) {
                originalPos++
              }
              normalizedPos++ // One space in normalized
            } else {
              originalPos++
              normalizedPos++
            }
          }
          // Find end position similarly
          let endOriginalPos = originalPos
          let endNormalizedPos = 0
          while (endNormalizedPos < normalizedQuote.length && endOriginalPos < text.length) {
            if (/\s/.test(text[endOriginalPos])) {
              while (endOriginalPos < text.length && /\s/.test(text[endOriginalPos])) {
                endOriginalPos++
              }
              endNormalizedPos++
            } else {
              endOriginalPos++
              endNormalizedPos++
            }
          }
          highlights.push({
            start: originalPos,
            end: endOriginalPos,
            type: flag.type,
          })
        }
      }
    })

    highlights.sort((a, b) => a.start - b.start)

    const segments: React.ReactNode[] = []
    let lastEnd = 0

    highlights.forEach((h, i) => {
      if (h.start > lastEnd) {
        segments.push(<span key={`text-${i}`}>{result.slice(lastEnd, h.start)}</span>)
      }
      const baseClass =
        h.type === "excellent" ? "bg-purple-200 dark:bg-purple-900/50" :
        h.type === "good" ? "bg-green-200 dark:bg-green-900/50" :
        h.type === "almost" ? "bg-yellow-200 dark:bg-yellow-900/50" :
        h.type === "angle" ? "bg-cyan-200 dark:bg-cyan-900/50" :
        h.type === "ai" ? "bg-orange-200 dark:bg-orange-900/50" :
        h.type === "alternatives" ? "bg-pink-200 dark:bg-pink-900/50" :
        h.type === "negative" ? "bg-rose-200 dark:bg-rose-900/50" :
        h.type === "source" ? "bg-red-300 dark:bg-red-800/70 font-bold border-2 border-red-500" :
        "bg-blue-200 dark:bg-blue-900/50"

      segments.push(
        <mark
          key={`highlight-${i}`}
          className={`${baseClass} rounded px-0.5`}
        >
          {result.slice(h.start, h.end)}
        </mark>
      )
      lastEnd = h.end
    })

    if (lastEnd < result.length) {
      segments.push(<span key="text-end">{result.slice(lastEnd)}</span>)
    }

    return segments
  }

  // Feedback button with tooltip
  const FeedbackButton = ({ type, onClick, size = "sm" }: { type: FeedbackType; onClick: () => void; size?: "sm" | "lg" }) => {
    const config = FEEDBACK_TYPES[type]
    const icon = size === "lg" ? FEEDBACK_ICONS_LG[type] : FEEDBACK_ICONS[type]
    return (
      <Button
        size="sm"
        variant="ghost"
        className={`${size === "lg" ? "h-8 px-2" : "h-7 px-2"}`}
        onClick={onClick}
        title={config.tooltip}
      >
        <span className={config.color}>{icon}</span>
      </Button>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Selection popup */}
      {selection && (
        <div
          className="selection-popup fixed z-50 transform -translate-x-1/2 -translate-y-full"
          style={{ left: selection.x, top: selection.y }}
        >
          <div className="bg-popover border rounded-lg shadow-lg p-2 flex flex-col gap-2">
            {/* Visual feedback for recently added flag */}
            {recentlyAdded && (
              <div className={`text-xs px-2 py-1 rounded ${FEEDBACK_TYPES[recentlyAdded].bg} ${FEEDBACK_TYPES[recentlyAdded].color} flex items-center gap-1`}>
                <Check className="size-3" /> Added {FEEDBACK_TYPES[recentlyAdded].label}
              </div>
            )}

            {/* Main buttons */}
            {!commentMode && !subMenu && (
              <div className="flex items-center gap-1">
                {/* Excellent - opens sub-menu */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2"
                  onClick={() => setSubMenu("excellent")}
                  title="Mark as excellent - extract learnings"
                >
                  <Star className="size-4 text-purple-600" />
                </Button>
                <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setSubMenu("good")} title="Mark as good">
                  <Sparkles className="size-4 text-green-600" />
                </Button>
                <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setSubMenu("almost")} title="Mark as almost there">
                  <CircleDot className="size-4 text-yellow-600" />
                </Button>
                <div className="w-px h-6 bg-border mx-1" />
                <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setSubMenu("angle")} title="Wrong angle - needs rewrite">
                  <RotateCcw className="size-4 text-cyan-600" />
                </Button>
                {/* AI - opens sub-menu */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2"
                  onClick={() => setSubMenu("ai")}
                  title="Mark as AI-sounding"
                >
                  <Bot className="size-4 text-orange-600" />
                </Button>
                {/* Negative learning - opens sub-menu */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2"
                  onClick={() => setSubMenu("negative")}
                  title="Anti-pattern - what NOT to do"
                >
                  <ThumbsDown className="size-4 text-rose-600" />
                </Button>
                <div className="w-px h-6 bg-border mx-1" />
                <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setCommentMode(true)} title="Add a custom comment">
                  <MessageSquare className="size-4 text-blue-600" />
                </Button>
                <div className="w-px h-6 bg-border mx-1" />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50"
                  onClick={() => {
                    setSourceModal({ sectionId: selection.sectionId, quote: selection.text })
                  }}
                  title="Needs source citation - BLOCKS publishing"
                >
                  <AlertTriangle className="size-4 text-red-600 font-bold" />
                </Button>
                <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setSelection(null)}>
                  <X className="size-4" />
                </Button>
              </div>
            )}

            {/* AI sub-menu */}
            {subMenu === "ai" && (
              <div className="flex flex-col gap-2 min-w-[280px]">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-1">
                    <Bot className="size-4 text-orange-600" /> AI Flag Options
                  </span>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setSubMenu(null)}>
                    <X className="size-3" />
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  &quot;{selection.text.slice(0, 50)}{selection.text.length > 50 ? '...' : ''}&quot;
                </div>
                <div className="space-y-1">
                  <button
                    className="w-full text-left p-2 rounded border hover:bg-muted transition-colors text-sm"
                    onClick={() => addFlag("ai", selection.sectionId, selection.text)}
                  >
                    <div className="font-medium">Just flag as AI</div>
                    <div className="text-xs text-muted-foreground">Mark for rewrite, no additional context</div>
                  </button>
                  <button
                    className="w-full text-left p-2 rounded border hover:bg-muted transition-colors text-sm"
                    onClick={() => {
                      setSubMenu(null)
                      setCommentMode(true)
                    }}
                  >
                    <div className="font-medium">AI + Comment</div>
                    <div className="text-xs text-muted-foreground">Add note explaining what&apos;s wrong</div>
                  </button>
                  <button
                    className="w-full text-left p-2 rounded border hover:bg-muted transition-colors text-sm"
                    onClick={() => {
                      addFlag("ai", selection.sectionId, selection.text)
                      addFlag("alternatives", selection.sectionId, selection.text)
                    }}
                  >
                    <div className="font-medium">AI + Request 3 Alternatives</div>
                    <div className="text-xs text-muted-foreground">Flag as AI and request alternative versions</div>
                  </button>
                </div>
              </div>
            )}

            {/* Excellent sub-menu */}
            {subMenu === "excellent" && (
              <div className="flex flex-col gap-2 min-w-[280px]">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-1">
                    <Star className="size-4 text-purple-600" /> Excellent - What Works?
                  </span>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setSubMenu(null)}>
                    <X className="size-3" />
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  &quot;{selection.text.slice(0, 50)}{selection.text.length > 50 ? '...' : ''}&quot;
                </div>
                <div className="space-y-1">
                  <button
                    className="w-full text-left p-2 rounded border hover:bg-muted transition-colors text-sm"
                    onClick={() => addFlag("excellent", selection.sectionId, selection.text)}
                  >
                    <div className="font-medium">Just mark Excellent</div>
                    <div className="text-xs text-muted-foreground">Extract to learnings without note</div>
                  </button>
                </div>
                <div className="border-t pt-2 mt-1">
                  <div className="text-xs text-muted-foreground mb-1">Why does this work? (goes to learnings)</div>
                  <textarea
                    autoFocus
                    placeholder="e.g., 'Specific detail makes it credible', 'Unexpected angle grabs attention'..."
                    value={subMenuComment}
                    onChange={(e) => setSubMenuComment(e.target.value)}
                    className="text-sm p-2 rounded border bg-background resize-none w-full"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        addFlag("excellent", selection.sectionId, selection.text, subMenuComment.trim() || undefined)
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => addFlag("excellent", selection.sectionId, selection.text, subMenuComment.trim() || undefined)}
                  >
                    {subMenuComment.trim() ? "Add with Learning Note" : "Add without Note"}
                  </Button>
                </div>
              </div>
            )}

            {/* Negative learning sub-menu */}
            {subMenu === "negative" && (
              <div className="flex flex-col gap-2 min-w-[280px]">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-1">
                    <ThumbsDown className="size-4 text-rose-600" /> Don&apos;t Do This
                  </span>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setSubMenu(null)}>
                    <X className="size-3" />
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  &quot;{selection.text.slice(0, 50)}{selection.text.length > 50 ? '...' : ''}&quot;
                </div>
                <div className="border-t pt-2 mt-1">
                  <div className="text-xs text-rose-600 font-medium mb-1">Why is this bad? (required - goes to learnings)</div>
                  <textarea
                    autoFocus
                    placeholder="e.g., 'Too vague, no specifics', 'Generic phrasing anyone could write', 'Announces instead of delivers'..."
                    value={subMenuComment}
                    onChange={(e) => setSubMenuComment(e.target.value)}
                    className="text-sm p-2 rounded border bg-background resize-none w-full"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        if (subMenuComment.trim()) {
                          addFlag("negative", selection.sectionId, selection.text, subMenuComment.trim())
                        }
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    className="w-full mt-2"
                    disabled={!subMenuComment.trim()}
                    onClick={() => {
                      if (subMenuComment.trim()) {
                        addFlag("negative", selection.sectionId, selection.text, subMenuComment.trim())
                      }
                    }}
                  >
                    Add Anti-Pattern to Learnings
                  </Button>
                </div>
              </div>
            )}

            {/* Generic sub-menu for good, almost, angle, alternatives */}
            {(subMenu === "good" || subMenu === "almost" || subMenu === "angle" || subMenu === "alternatives") && (
              <div className="flex flex-col gap-2 min-w-[280px]">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-1">
                    {subMenu === "good" && <><Sparkles className="size-4 text-green-600" /> Good</>}
                    {subMenu === "almost" && <><CircleDot className="size-4 text-yellow-600" /> Almost</>}
                    {subMenu === "angle" && <><RotateCcw className="size-4 text-cyan-600" /> Wrong Angle</>}
                    {subMenu === "alternatives" && <><Shuffle className="size-4 text-pink-600" /> 3 Alternatives</>}
                  </span>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setSubMenu(null)}>
                    <X className="size-3" />
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  &quot;{selection.text.slice(0, 50)}{selection.text.length > 50 ? '...' : ''}&quot;
                </div>
                <div className="space-y-1">
                  <button
                    className="w-full text-left p-2 rounded border hover:bg-muted transition-colors text-sm"
                    onClick={() => addFlag(subMenu, selection.sectionId, selection.text)}
                  >
                    <div className="font-medium">Just add flag</div>
                    <div className="text-xs text-muted-foreground">No additional comment</div>
                  </button>
                </div>
                <div className="border-t pt-2 mt-1">
                  <div className="text-xs text-muted-foreground mb-1">Add comment (optional)</div>
                  <textarea
                    autoFocus
                    placeholder="Why are you flagging this?..."
                    value={subMenuComment}
                    onChange={(e) => setSubMenuComment(e.target.value)}
                    className="text-sm p-2 rounded border bg-background resize-none w-full"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        addFlag(subMenu, selection.sectionId, selection.text, subMenuComment.trim() || undefined)
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => addFlag(subMenu, selection.sectionId, selection.text, subMenuComment.trim() || undefined)}
                  >
                    {subMenuComment.trim() ? "Add with Comment" : "Add without Comment"}
                  </Button>
                </div>
              </div>
            )}

            {/* Comment mode (for Note flag) */}
            {commentMode && !subMenu && (
              <div className="flex flex-col gap-2 min-w-[250px]">
                <div className="text-xs text-muted-foreground truncate max-w-[250px]">
                  &quot;{selection.text.slice(0, 40)}{selection.text.length > 40 ? '...' : ''}&quot;
                </div>
                <textarea
                  autoFocus
                  placeholder="Your comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="text-sm p-2 rounded border bg-background resize-none w-full"
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      if (commentText.trim()) {
                        addFlag("note", selection.sectionId, selection.text, commentText.trim())
                      }
                    }
                  }}
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setCommentMode(false)}>Back</Button>
                  <Button size="sm" onClick={() => { if (commentText.trim()) addFlag("note", selection.sectionId, selection.text, commentText.trim()) }}>Add</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section comment modal */}
      {sectionCommentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSectionCommentModal(null)}>
          <div className="bg-popover border rounded-lg shadow-lg p-4 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Comment on section</h3>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setSectionCommentModal(null)}>
                <X className="size-4" />
              </Button>
            </div>
            <textarea
              autoFocus
              placeholder="Your comment on this section..."
              value={sectionCommentText}
              onChange={(e) => setSectionCommentText(e.target.value)}
              className="text-sm p-3 rounded border bg-background resize-none w-full"
              rows={3}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (sectionCommentText.trim()) {
                    addFlag("note", sectionCommentModal.sectionId, undefined, sectionCommentText.trim())
                    setSectionCommentModal(null)
                    setSectionCommentText("")
                  }
                }
                if (e.key === 'Escape') {
                  setSectionCommentModal(null)
                }
              }}
            />
            <div className="flex justify-end gap-2 mt-3">
              <Button size="sm" variant="ghost" onClick={() => setSectionCommentModal(null)}>Cancel</Button>
              <Button size="sm" onClick={() => {
                if (sectionCommentText.trim()) {
                  addFlag("note", sectionCommentModal.sectionId, undefined, sectionCommentText.trim())
                  setSectionCommentModal(null)
                  setSectionCommentText("")
                }
              }}>Add Comment</Button>
            </div>
          </div>
        </div>
      )}

      {/* Source citation modal - 3 options for how to cite */}
      {sourceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSourceModal(null)}>
          <div className="bg-popover border-2 border-red-500 rounded-lg shadow-lg p-4 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-red-600" />
                <h3 className="font-bold text-red-600">Needs Source Citation</h3>
              </div>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setSourceModal(null)}>
                <X className="size-4" />
              </Button>
            </div>

            {sourceModal.quote && (
              <div className="text-sm text-muted-foreground bg-muted p-2 rounded mb-4 italic">
                &quot;{sourceModal.quote.slice(0, 100)}{sourceModal.quote.length > 100 ? '...' : ''}&quot;
              </div>
            )}

            <p className="text-sm text-muted-foreground mb-4">
              This content needs a source. Choose how to handle it:
            </p>

            <div className="space-y-2">
              <button
                className="w-full text-left p-3 rounded border hover:bg-muted transition-colors"
                onClick={() => {
                  addFlag("source", sourceModal.sectionId, sourceModal.quote, "CITATION STYLE: General mention (e.g., 'Research suggests...', 'Experts recommend...')")
                  setSourceModal(null)
                }}
              >
                <div className="font-medium">1. General Mention</div>
                <div className="text-sm text-muted-foreground">Vague attribution: &quot;Research suggests...&quot;, &quot;Experts say...&quot;</div>
              </button>

              <button
                className="w-full text-left p-3 rounded border hover:bg-muted transition-colors"
                onClick={() => {
                  addFlag("source", sourceModal.sectionId, sourceModal.quote, "CITATION STYLE: Short source (e.g., 'According to [Author/Publication]...')")
                  setSourceModal(null)
                }}
              >
                <div className="font-medium">2. Short Citation</div>
                <div className="text-sm text-muted-foreground">Named source: &quot;According to [Author]...&quot;, &quot;A study in [Journal]...&quot;</div>
              </button>

              <button
                className="w-full text-left p-3 rounded border hover:bg-muted transition-colors"
                onClick={() => {
                  addFlag("source", sourceModal.sectionId, sourceModal.quote, "CITATION STYLE: In-depth (full citation with link, quote, and context)")
                  setSourceModal(null)
                }}
              >
                <div className="font-medium">3. In-Depth Citation</div>
                <div className="text-sm text-muted-foreground">Full reference with link, direct quote, and context</div>
              </button>
            </div>

            <p className="text-xs text-red-600 mt-4 font-medium">
              ⚠️ This flag BLOCKS publishing until resolved
            </p>
          </div>
        </div>
      )}

      {/* Unlock Structure Modal */}
      {unlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setUnlockModal(false)}>
          <div className="bg-popover border-2 border-red-500 rounded-lg shadow-lg p-4 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔓</span>
                <h3 className="font-bold text-red-600">Unlock Structure</h3>
              </div>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setUnlockModal(false)}>
                <X className="size-4" />
              </Button>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 mb-4">
              <p className="text-sm text-yellow-600 font-medium">
                ⚠️ This will reset to Phase 2 (Outline)
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Current prose will be preserved but marked as outdated. You&apos;ll need to revise the outline before continuing.
              </p>
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">
                Why does the structure need to change?
              </label>
              <textarea
                autoFocus
                placeholder="e.g., 'Feedback suggests the research section should come before the analogy', 'Need to add a new section on common mistakes'..."
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                className="text-sm p-3 rounded border bg-background resize-none w-full"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setUnlockModal(false)}>Cancel</Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={!unlockReason.trim() || unlocking}
                onClick={handleUnlockStructure}
              >
                {unlocking ? <Loader2 className="size-4 mr-1 animate-spin" /> : null}
                Unlock & Reset to Phase 2
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Learning Suggestions Modal */}
      {suggestionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSuggestionsModal(false)}>
          <div className="bg-popover border rounded-lg shadow-lg p-4 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-purple-600" />
                <h3 className="font-bold text-lg">Suggested Learnings</h3>
              </div>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setSuggestionsModal(false)}>
                <X className="size-4" />
              </Button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Based on your comments, these insights could be added to the writing style guide.
            </p>

            <div className="space-y-4">
              {learningSuggestions
                .filter(s => s.originalFlag?.note)
                .map((suggestion, idx) => (
                <div
                  key={idx}
                  className={`border rounded-lg p-4 transition-colors ${
                    selectedSuggestions.has(idx) ? 'border-purple-500 bg-purple-500/5' : 'border-muted'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedSuggestions.has(idx)}
                      onChange={() => toggleSuggestion(idx)}
                      className="mt-1 size-4"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={suggestion.type === 'positive' ? 'default' : 'destructive'}>
                          {suggestion.type === 'positive' ? '✅ Positive' : '❌ Anti-pattern'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {suggestion.confidence} confidence
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          → {suggestion.targetSection}
                        </span>
                      </div>

                      <div className="text-sm text-muted-foreground mb-2">
                        Your comment on <strong>{suggestion.originalFlag?.type}</strong> flag:
                        <br />
                        <em>&ldquo;{suggestion.originalFlag?.note}&rdquo;</em>
                      </div>

                      <div className="bg-muted rounded p-2 mb-2">
                        <div className="text-xs text-muted-foreground mb-1">Suggested text:</div>
                        <textarea
                          value={editedSuggestions[idx] ?? suggestion.suggestedText}
                          onChange={(e) => setEditedSuggestions(prev => ({
                            ...prev,
                            [idx]: e.target.value
                          }))}
                          className="w-full p-2 text-sm bg-background rounded border resize-none"
                          rows={2}
                        />
                      </div>

                      <div className="text-xs text-muted-foreground">
                        <strong>Why:</strong> {suggestion.reasoning}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center mt-6 pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                {selectedSuggestions.size} of {learningSuggestions.length} selected
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => {
                  if (selectedSuggestions.size > 0 &&
                      !confirm(`Skip ${selectedSuggestions.size} selected learning${selectedSuggestions.size > 1 ? 's' : ''}? They won't be added to the style guide.`)) {
                    return
                  }
                  setSuggestionsModal(false)
                  setLearningSuggestions([])
                  setSelectedSuggestions(new Set())
                }}>
                  Skip All
                </Button>
                <Button
                  onClick={approveLearnings}
                  disabled={selectedSuggestions.size === 0 || approvingLearnings}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {approvingLearnings ? <Loader2 className="size-4 mr-1 animate-spin" /> : null}
                  Add to Style Guide
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="mx-auto px-4 py-4 max-w-4xl">
          {/* Article & Version Selectors */}
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground">Article:</label>
              <select
                value={selectedArticleId}
                onChange={(e) => {
                  setSelectedArticleId(e.target.value)
                  const article = articles.find(a => a.id === e.target.value)
                  if (article?.drafts.length) {
                    const latestDraft = article.drafts[article.drafts.length - 1]
                    const version = parseInt(latestDraft.match(/\d+/)?.[0] || "1")
                    setSelectedDraftVersion(version)
                  }
                }}
                className="text-sm border rounded px-2 py-1 bg-background"
              >
                {articles.map(article => (
                  <option key={article.id} value={article.id}>
                    {article.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground">Version:</label>
              <select
                value={selectedDraftVersion}
                onChange={(e) => setSelectedDraftVersion(parseInt(e.target.value))}
                className="text-sm border rounded px-2 py-1 bg-background"
              >
                {availableDrafts.map(draft => {
                  const version = parseInt(draft.match(/\d+/)?.[0] || "1")
                  return (
                    <option key={draft} value={version}>
                      Draft {version}
                    </option>
                  )
                })}
              </select>
            </div>

            {loading && <Loader2 className="size-4 animate-spin text-muted-foreground ml-auto" />}
          </div>

          {/* Phase indicator */}
          {loadedArticle && (
            <div className="mb-4">
              <PhaseIndicator
                currentPhase={loadedArticle.phase}
                phaseLocks={loadedArticle.phaseLocks}
              />
            </div>
          )}

          {/* Contract display (Phase 4 - read-only) */}
          {loadedArticle?.contract && loadedArticle.phase === 4 && (
            <div className="mb-4">
              <ContractDisplay
                contract={loadedArticle.contract}
                isCollapsed={contractCollapsed}
                onToggle={() => setContractCollapsed(!contractCollapsed)}
                onUnlock={() => setUnlockModal(true)}
              />
            </div>
          )}

          {/* Unlock history */}
          {loadedArticle && loadedArticle.structureUnlocks.length > 0 && (
            <div className="mb-4">
              <UnlockHistory unlocks={loadedArticle.structureUnlocks} />
            </div>
          )}

          {/* Blocking flags warning */}
          {blockingFlagsCount > 0 && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border-2 border-red-500 rounded-lg flex items-center gap-3">
              <AlertTriangle className="size-5 text-red-600 flex-shrink-0" />
              <div>
                <span className="font-bold text-red-600">
                  {blockingFlagsCount} {blockingFlagsCount === 1 ? 'flag needs' : 'flags need'} review before publishing
                </span>
                <p className="text-sm text-red-600/80">Resolve all &quot;Needs Source&quot; flags to unblock publishing</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <Badge variant="outline" className="mb-2">
                Draft {selectedDraftVersion}
              </Badge>
              <h1 className="text-xl font-semibold">
                {loadedArticle?.title || "Loading..."}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {blockingFlagsCount > 0 && (
                <Badge variant="destructive" className="font-bold">
                  <AlertTriangle className="size-3 mr-1" />
                  {blockingFlagsCount} blocking
                </Badge>
              )}
              <Badge variant="secondary">{flags.length} flags</Badge>
              <Button variant="outline" size="sm" onClick={() => setFlags([])}>Clear</Button>
              <Button variant="outline" size="sm" onClick={() => setShowExport(!showExport)}>
                {showExport ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                Export
              </Button>
            </div>
          </div>

          {showExport && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Feedback Summary</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={copyFeedback} title="Copy feedback to clipboard">
                    {copied ? <Check className="size-4 mr-1" /> : <Copy className="size-4 mr-1" />}
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={saveFeedback} disabled={analyzingComments} title="Save feedback and analyze for learnings">
                    {analyzingComments ? <Loader2 className="size-4 mr-1 animate-spin" /> : saved ? <Check className="size-4 mr-1" /> : <Save className="size-4 mr-1" />}
                    {analyzingComments ? "Analyzing..." : saved ? "Saved!" : "Export"}
                  </Button>
                  <Button size="sm" variant="default" onClick={saveAndDraftNew} disabled={draftingNew} title="Save feedback for Claude Code to generate new draft">
                    {draftingNew ? <RotateCcw className="size-4 mr-1 animate-spin" /> : <FileEdit className="size-4 mr-1" />}
                    {draftingNew ? "Saving..." : "Export for Claude"}
                  </Button>
                </div>
              </div>
              <pre className="text-xs bg-background p-3 rounded border overflow-auto max-h-48 whitespace-pre-wrap">
                {exportFeedback()}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Phase 1: Contract Form */}
      {loadedArticle && loadedArticle.phase === 1 && (
        <div className="mx-auto px-4 py-4 max-w-4xl">
          <ContractForm
            contract={loadedArticle.contract || {
              title: loadedArticle.title,
              thesis: "",
              targetReader: "",
              mustInclude: [],
              mustNotInclude: [],
              tone: "Conversational but credible"
            }}
            onSave={handleSaveContract}
            saving={savingPhase}
          />
        </div>
      )}

      {/* Phase 2: Outline Editor */}
      {loadedArticle && loadedArticle.phase === 2 && (
        <div className="mx-auto px-4 py-4 max-w-4xl">
          {/* Show locked contract above */}
          {loadedArticle.contract && (
            <div className="mb-4">
              <ContractDisplay
                contract={loadedArticle.contract}
                isCollapsed={contractCollapsed}
                onToggle={() => setContractCollapsed(!contractCollapsed)}
              />
            </div>
          )}
          <OutlineEditor
            outline={loadedArticle.outline || { sections: [] }}
            onSave={handleSaveOutline}
            saving={savingPhase}
          />
        </div>
      )}

      {/* Phase 3: First Draft - show structure lock button */}
      {loadedArticle && loadedArticle.phase === 3 && (
        <div className="mx-auto px-4 py-4 max-w-4xl">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-blue-600">Phase 3: First Draft</h3>
                <p className="text-sm text-muted-foreground">
                  Review the draft below. When the structure looks good, lock it to begin refinement.
                </p>
              </div>
              <Button
                onClick={handleLockStructure}
                disabled={savingPhase}
                className="bg-green-600 hover:bg-green-700"
              >
                {savingPhase ? <Loader2 className="size-4 mr-1 animate-spin" /> : null}
                🔒 Lock Structure & Begin Refinement
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions (Phase 3 & 4 only) */}
      {loadedArticle && (loadedArticle.phase === 3 || loadedArticle.phase === 4) && (
        <div className="mx-auto px-4 py-4 max-w-4xl">
          <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            <strong>How to use:</strong> Right-click any paragraph to flag it (or select specific text first). You can select multiple sentences. Hover over buttons to see what each does.
            <div className="flex flex-wrap gap-3 mt-2">
              <span className="inline-flex items-center gap-1" title={FEEDBACK_TYPES.excellent.tooltip}><Star className="size-3 text-purple-600" /> Excellent</span>
              <span className="inline-flex items-center gap-1" title={FEEDBACK_TYPES.good.tooltip}><Sparkles className="size-3 text-green-600" /> Good</span>
              <span className="inline-flex items-center gap-1" title={FEEDBACK_TYPES.almost.tooltip}><CircleDot className="size-3 text-yellow-600" /> Almost</span>
              <span className="inline-flex items-center gap-1" title={FEEDBACK_TYPES.angle.tooltip}><RotateCcw className="size-3 text-cyan-600" /> Angle</span>
              <span className="inline-flex items-center gap-1" title={FEEDBACK_TYPES.ai.tooltip}><Bot className="size-3 text-orange-600" /> AI</span>
              <span className="inline-flex items-center gap-1" title={FEEDBACK_TYPES.negative.tooltip}><ThumbsDown className="size-3 text-rose-600" /> Don&apos;t</span>
              <span className="inline-flex items-center gap-1" title={FEEDBACK_TYPES.alternatives.tooltip}><Shuffle className="size-3 text-pink-600" /> 3 Alts</span>
              <span className="inline-flex items-center gap-1" title={FEEDBACK_TYPES.note.tooltip}><MessageSquare className="size-3 text-blue-600" /> Note</span>
              <span className="inline-flex items-center gap-1 font-bold" title={FEEDBACK_TYPES.source.tooltip}><AlertTriangle className="size-3 text-red-600" /> <span className="text-red-600">Needs Source</span></span>
            </div>
          </div>
        </div>
      )}

      {/* Article sections (Phase 3 & 4 only) */}
      {loadedArticle && (loadedArticle.phase === 3 || loadedArticle.phase === 4) && (
      <div className="mx-auto px-4 pb-12 max-w-4xl">
          {loading && !loadedArticle ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : loadedArticle?.sections.map((section, idx) => {
            const sectionFlags = getFlagsForSection(section.id)

            return (
              <Card key={section.id} className="mb-6 group">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-mono text-muted-foreground">
                      Section {idx + 1}: {section.id}
                    </CardTitle>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs text-muted-foreground mr-2">Whole section:</span>
                      <FeedbackButton type="excellent" onClick={() => addFlag("excellent", section.id)} />
                      <FeedbackButton type="good" onClick={() => addFlag("good", section.id)} />
                      <FeedbackButton type="almost" onClick={() => addFlag("almost", section.id)} />
                      <FeedbackButton type="angle" onClick={() => addFlag("angle", section.id)} />
                      <FeedbackButton type="ai" onClick={() => addFlag("ai", section.id)} />
                      <FeedbackButton type="alternatives" onClick={() => addFlag("alternatives", section.id)} />
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => {
                        setSectionCommentModal({ sectionId: section.id })
                        setSectionCommentText("")
                      }} title={FEEDBACK_TYPES.note.tooltip}>
                        <MessageSquare className="size-4 text-blue-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50"
                        onClick={() => setSourceModal({ sectionId: section.id })}
                        title={FEEDBACK_TYPES.source.tooltip}
                      >
                        <AlertTriangle className="size-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {sectionFlags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {sectionFlags.map((flag, i) => {
                        const globalIdx = flags.indexOf(flag)
                        const config = FEEDBACK_TYPES[flag.type]

                        return (
                          <Badge
                            key={i}
                            variant="outline"
                            className={`${config.bg} max-w-xs`}
                          >
                            {FEEDBACK_ICONS[flag.type]}
                            <span className="ml-1 truncate">
                              {flag.quote ? `"${flag.quote.slice(0, 30)}${flag.quote.length > 30 ? '...' : ''}"` : config.label}
                              {flag.note && `: ${flag.note.slice(0, 20)}${flag.note.length > 20 ? '...' : ''}`}
                            </span>
                            <X className="size-3 ml-1 opacity-50 cursor-pointer" onClick={() => removeFlag(globalIdx)} />
                          </Badge>
                        )
                      })}
                    </div>
                  )}

                  <div className="prose prose-neutral dark:prose-invert max-w-none select-text" onContextMenu={(e) => handleContextMenu(e, section.id)}>
                    {section.content.split('\n\n').map((paragraph, pIdx) => (
                      <p key={pIdx} className="text-base leading-relaxed mb-4 last:mb-0">
                        {renderHighlightedText(paragraph, section.id)}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
