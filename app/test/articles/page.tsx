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
  Loader2
} from "lucide-react"
import { type FeedbackType, type ArticleFeedbackFlag, FEEDBACK_TYPES } from "@/src/articles/types"

// Types for API responses
interface ArticleInfo {
  id: string
  title: string
  status: string
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
}

// Icon mapping for feedback types
const FEEDBACK_ICONS: Record<FeedbackType, React.ReactNode> = {
  excellent: <Star className="size-3" />,
  good: <Sparkles className="size-3" />,
  almost: <CircleDot className="size-3" />,
  angle: <RotateCcw className="size-3" />,
  ai: <Bot className="size-3" />,
  note: <MessageSquare className="size-3" />,
}

const FEEDBACK_ICONS_LG: Record<FeedbackType, React.ReactNode> = {
  excellent: <Star className="size-4" />,
  good: <Sparkles className="size-4" />,
  almost: <CircleDot className="size-4" />,
  angle: <RotateCcw className="size-4" />,
  ai: <Bot className="size-4" />,
  note: <MessageSquare className="size-4" />,
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

  const addFlag = (type: FeedbackType, sectionId: string, quote?: string, note?: string) => {
    setFlags(prev => [...prev, { type, sectionId, quote, note }])
    setSelection(null)
    setCommentMode(false)
    setCommentText("")
  }

  const removeFlag = (index: number) => {
    setFlags(prev => prev.filter((_, i) => i !== index))
  }

  const handleContextMenu = useCallback((e: React.MouseEvent, sectionId: string) => {
    e.preventDefault()

    const sel = window.getSelection()
    const selectedText = sel?.toString().trim()

    let text: string
    let x: number
    let y: number

    if (selectedText && selectedText.length > 0) {
      text = selectedText
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
    }
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.selection-popup')) {
        setTimeout(() => {
          if (!commentMode) {
            setSelection(null)
          }
        }, 100)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [commentMode])

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
      }
    } catch (error) {
      console.error("Failed to save:", error)
    }
  }

  const saveAndDraftNew = async () => {
    if (!loadedArticle) return
    setDraftingNew(true)
    try {
      // Save the feedback (both .md and .json)
      await fetch("/api/test/save-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: loadedArticle.id,
          feedback: exportFeedback(),
          flags: flags
        })
      })

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

      if (pendingResponse.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
        alert(
          "Feedback saved!\n\n" +
          "To generate the next draft, tell Claude Code:\n" +
          "\"process the pending article draft\""
        )
      }
    } catch (error) {
      console.error("Failed to save and draft:", error)
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
    const highlights: { start: number; end: number; type: FeedbackType }[] = []

    sectionFlags.forEach(flag => {
      if (!flag.quote) return
      const idx = result.indexOf(flag.quote)
      if (idx !== -1) {
        highlights.push({ start: idx, end: idx + flag.quote.length, type: flag.type })
      }
    })

    highlights.sort((a, b) => a.start - b.start)

    const segments: React.ReactNode[] = []
    let lastEnd = 0

    highlights.forEach((h, i) => {
      if (h.start > lastEnd) {
        segments.push(<span key={`text-${i}`}>{result.slice(lastEnd, h.start)}</span>)
      }
      const highlightClass =
        h.type === "excellent" ? "bg-purple-200 dark:bg-purple-900/50" :
        h.type === "good" ? "bg-green-200 dark:bg-green-900/50" :
        h.type === "almost" ? "bg-yellow-200 dark:bg-yellow-900/50" :
        h.type === "angle" ? "bg-cyan-200 dark:bg-cyan-900/50" :
        h.type === "ai" ? "bg-orange-200 dark:bg-orange-900/50" :
        "bg-blue-200 dark:bg-blue-900/50"
      segments.push(
        <mark key={`highlight-${i}`} className={`${highlightClass} rounded px-0.5`}>
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
            {!commentMode ? (
              <div className="flex items-center gap-1">
                <FeedbackButton type="excellent" onClick={() => addFlag("excellent", selection.sectionId, selection.text)} size="lg" />
                <FeedbackButton type="good" onClick={() => addFlag("good", selection.sectionId, selection.text)} size="lg" />
                <FeedbackButton type="almost" onClick={() => addFlag("almost", selection.sectionId, selection.text)} size="lg" />
                <div className="w-px h-6 bg-border mx-1" />
                <FeedbackButton type="angle" onClick={() => addFlag("angle", selection.sectionId, selection.text)} size="lg" />
                <FeedbackButton type="ai" onClick={() => addFlag("ai", selection.sectionId, selection.text)} size="lg" />
                <div className="w-px h-6 bg-border mx-1" />
                <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setCommentMode(true)} title="Add a custom comment">
                  <MessageSquare className="size-4 text-blue-600" />
                </Button>
                <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setSelection(null)}>
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
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

      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {/* Article & Version Selectors */}
          <div className="flex items-center gap-4 mb-4">
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

            {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          </div>

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
                  <Button size="sm" variant="outline" onClick={saveFeedback} title="Save feedback and keep current draft">
                    {saved ? <Check className="size-4 mr-1" /> : <Save className="size-4 mr-1" />}
                    {saved ? "Saved!" : "Export"}
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

      {/* Instructions */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
          <strong>How to use:</strong> Right-click any paragraph to flag it (or select specific text first). Hover over buttons to see what each does.
          <div className="flex flex-wrap gap-3 mt-2">
            <span className="inline-flex items-center gap-1" title={FEEDBACK_TYPES.excellent.tooltip}><Star className="size-3 text-purple-600" /> Excellent</span>
            <span className="inline-flex items-center gap-1" title={FEEDBACK_TYPES.good.tooltip}><Sparkles className="size-3 text-green-600" /> Good</span>
            <span className="inline-flex items-center gap-1" title={FEEDBACK_TYPES.almost.tooltip}><CircleDot className="size-3 text-yellow-600" /> Almost</span>
            <span className="inline-flex items-center gap-1" title={FEEDBACK_TYPES.angle.tooltip}><RotateCcw className="size-3 text-cyan-600" /> Angle</span>
            <span className="inline-flex items-center gap-1" title={FEEDBACK_TYPES.ai.tooltip}><Bot className="size-3 text-orange-600" /> AI</span>
            <span className="inline-flex items-center gap-1" title={FEEDBACK_TYPES.note.tooltip}><MessageSquare className="size-3 text-blue-600" /> Note</span>
          </div>
        </div>
      </div>

      {/* Article sections */}
      <div className="max-w-4xl mx-auto px-4 pb-12">
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
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => {
                      setSectionCommentModal({ sectionId: section.id })
                      setSectionCommentText("")
                    }} title={FEEDBACK_TYPES.note.tooltip}>
                      <MessageSquare className="size-4 text-blue-600" />
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
                          className={`${config.bg} cursor-pointer max-w-xs`}
                          onClick={() => removeFlag(globalIdx)}
                        >
                          {FEEDBACK_ICONS[flag.type]}
                          <span className="ml-1 truncate">
                            {flag.quote ? `"${flag.quote.slice(0, 20)}${flag.quote.length > 20 ? '...' : ''}"` : config.label}
                            {flag.note && `: ${flag.note.slice(0, 20)}${flag.note.length > 20 ? '...' : ''}`}
                          </span>
                          <X className="size-3 ml-1 opacity-50" />
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
    </div>
  )
}
