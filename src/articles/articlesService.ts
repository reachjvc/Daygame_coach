/**
 * Articles service - handles draft revision for articles.
 */

import { generateObject, zodSchema } from "ai"
import { z } from "zod"

import { getStructuredOutputModel } from "@/src/scenarios/providers/structuredModel"
import type {
  ArticlePillar,
  GenerateRevisedDraftRequest,
  GenerateRevisedDraftResponse,
  ArticleFeedbackFlag,
  ArticleSection,
  ArticleManifest,
  ArticleContract,
  ArticleOutline,
  StructureUnlock,
  LearningSuggestion,
  LearningSuggestionType,
  LearningConfidence,
  PhaseTransitionResult,
} from "./types"

// ============================================
// Tone guidance for pillars
// ============================================

export const PILLAR_TONE_GUIDANCE: Record<ArticlePillar, string> = {
  learning:
    "Write in an educational, research-backed tone. Use concrete examples and cite principles from psychology, sports science, or learning theory where relevant.",
  "inner-game":
    "Write with depth and authenticity. Balance practical advice with philosophical insight. Speak to the reader's internal experience.",
  action:
    "Write with energy and directness. Focus on real-world applicability. Be concrete and specific about what to do.",
  tactics:
    "Write with precision and expertise. Be specific about techniques. Use the vocabulary of practitioners without being jargon-heavy.",
}

// ============================================
// Draft Revision
// ============================================

const RevisedDraftSchema = zodSchema(
  z.object({
    sections: z.array(
      z.object({
        id: z.string(),
        content: z.string(),
        wasModified: z.boolean(),
        changeReason: z.string().optional(),
      })
    ),
    changesSummary: z.array(z.string()),
  })
)

export function formatFeedbackForPrompt(
  sections: ArticleSection[],
  feedback: ArticleFeedbackFlag[]
): string {
  const feedbackBySection = new Map<string, ArticleFeedbackFlag[]>()
  feedback.forEach((f) => {
    const existing = feedbackBySection.get(f.sectionId) || []
    existing.push(f)
    feedbackBySection.set(f.sectionId, existing)
  })

  return sections
    .map((section) => {
      const sectionFeedback = feedbackBySection.get(section.id) || []
      let output = `### Section: ${section.id}\n\n**Content:**\n${section.content}\n`

      if (sectionFeedback.length > 0) {
        output += "\n**Feedback:**\n"
        sectionFeedback.forEach((f) => {
          const quoteInfo = f.quote ? ` on: "${f.quote.slice(0, 100)}${f.quote.length > 100 ? "..." : ""}"` : " (whole section)"
          output += `- **${f.type.toUpperCase()}**${quoteInfo}`
          if (f.note) output += `\n  Comment: ${f.note}`
          output += "\n"
        })
      } else {
        output += "\n**Feedback:** None (keep as-is)\n"
      }

      return output
    })
    .join("\n---\n\n")
}

export function buildRevisionSystemPrompt(styleGuide?: string, contract?: ArticleContract): string {
  const styleSection = styleGuide
    ? `\n\nSTYLE GUIDE:\n${styleGuide}`
    : ""

  const contractSection = contract
    ? `\n\nARTICLE CONTRACT (alternatives MUST serve this thesis):
- Thesis: ${contract.thesis}
- Target Reader: ${contract.targetReader}
- Must Include: ${contract.mustInclude.join("; ")}
- Must NOT Include: ${contract.mustNotInclude.join("; ")}
- Tone: ${contract.tone}

⚠️ If a suggested change would violate the contract, add a warning at the end of that section's output:
[CONTRACT WARNING: This alternative may violate the contract because ...]`
    : ""

  return `You are an expert editor revising an article draft based on reviewer feedback.

FEEDBACK TYPE MEANINGS:
- EXCELLENT: This content is perfect. Keep it EXACTLY as-is. Extract what makes it work.
- GOOD: Keep as-is, no changes needed.
- ALMOST: Close but needs minor tweaks. Make small adjustments while preserving the core.
- ANGLE: Wrong direction. Rewrite this section with a completely different approach.
- AI: Too obviously AI-written. Rewrite to sound more natural, specific, and human.
- NOTE: Custom comment from reviewer. Incorporate their suggestion.

REVISION RULES:
1. Sections with EXCELLENT or GOOD feedback: Copy exactly, word-for-word
2. Sections with ALMOST feedback: Make minimal, targeted changes
3. Sections with ANGLE feedback: Complete rewrite with fresh approach
4. Sections with AI feedback: Rewrite to eliminate AI patterns (e.g., "It's important to note", "Let's dive in", generic phrasing)
5. Sections with NOTE feedback: Incorporate the specific suggestion
6. Sections with NO feedback: Keep exactly as-is

QUALITY STANDARDS:
- The writing must be ALIVE - vibrant, specific, counterintuitive
- Avoid AI-isms: "crucial component", "In this article", "Let's explore"
- Lead with surprising claims, not announcements
- Use specific examples over abstract statements
- Vary sentence structure - don't be perfectly parallel${styleSection}${contractSection}

Return the revised sections maintaining the same section IDs.`
}

export async function generateRevisedDraft(
  request: GenerateRevisedDraftRequest
): Promise<GenerateRevisedDraftResponse> {
  const startTime = Date.now()

  const system = buildRevisionSystemPrompt(request.styleGuide, request.contract)
  const formattedContent = formatFeedbackForPrompt(request.sections, request.feedback)

  const prompt = `# Article: ${request.title}

Please revise this draft based on the feedback provided for each section.

${formattedContent}

Generate the revised version, keeping section IDs intact.`

  const model = getStructuredOutputModel()

  const result = await generateObject({
    model,
    system,
    prompt,
    schema: RevisedDraftSchema,
    temperature: 0.7,
    maxOutputTokens: 4000,
  })

  const latencyMs = Date.now() - startTime

  // Convert structured output to markdown draft
  const draftMarkdown = [
    `# ${request.title}`,
    "",
    `**Status:** Draft (revised)`,
    `**Updated:** ${new Date().toLocaleDateString("da-DK")}`,
    "",
    "---",
    "",
    ...result.object.sections.map((s: { content: string }) => s.content + "\n\n---"),
  ]
    .join("\n")
    .replace(/\n---$/, "") // Remove trailing separator

  return {
    draft: draftMarkdown,
    changesSummary: result.object.changesSummary as string[],
    meta: {
      model: process.env.AI_MODEL || "claude-3-5-haiku-20241022",
      latencyMs,
    },
  }
}

// ============================================
// Learning Extraction from Comments
// ============================================

const LearningSuggestionsSchema = zodSchema(
  z.object({
    suggestions: z.array(
      z.object({
        type: z.enum(["positive", "anti-pattern"]),
        flagIndex: z.number(),
        suggestedText: z.string(),
        targetSection: z.string(),
        reasoning: z.string(),
        confidence: z.enum(["high", "medium", "low"]),
      })
    ),
  })
)

/**
 * Analyzes feedback flag comments to extract reusable learnings.
 * Returns suggestions for what to add to writing_style.md.
 */
export async function analyzeCommentsForLearnings(
  flags: ArticleFeedbackFlag[],
  styleGuide: string
): Promise<LearningSuggestion[]> {
  // Filter to only flags with notes
  const flagsWithNotes = flags.filter((f) => f.note && f.note.trim().length > 0)

  if (flagsWithNotes.length === 0) {
    return []
  }

  const model = getStructuredOutputModel()

  const flagsForPrompt = flagsWithNotes.map((f, i) => ({
    index: i,
    type: f.type,
    quote: f.quote?.slice(0, 200) || "(whole section)",
    note: f.note,
  }))

  const system = `You are analyzing article review comments to extract reusable writing insights.

Your job is to identify comments that contain GENERAL PRINCIPLES about writing quality - things that should be remembered for future articles.

WHAT COUNTS AS A LEARNING:
- Insights about what makes writing work (e.g., "specificity creates credibility")
- Anti-patterns to avoid (e.g., "'Let's dive in' signals AI authorship")
- Style observations (e.g., "research citations add authority")

WHAT DOES NOT COUNT:
- Specific instructions ("fix this typo", "add a source here")
- Requests ("give me alternatives", "rewrite this")
- Vague approvals ("good", "nice")

FLAG TYPE GUIDANCE (affects confidence):
- "excellent" → likely positive pattern (high confidence)
- "negative" → likely anti-pattern (high confidence)
- "ai" → often reveals what NOT to do (medium-high confidence)
- "angle" → may contain direction insights (medium confidence)
- "note" → often just instructions, rarely learnings (low confidence)
- "source", "alternatives", "good", "almost" → rarely learnings (low confidence)

TARGET SECTIONS in writing_style.md:
- "What We Know" → for positive patterns
- "Anti-patterns" → for things to avoid
- "Still Testing" → for uncertain observations

Format the suggestedText to match the voice of the existing style guide. Be concise.`

  const prompt = `CURRENT STYLE GUIDE:
${styleGuide}

---

COMMENTS TO ANALYZE:
${JSON.stringify(flagsForPrompt, null, 2)}

For each comment that contains a genuine learning, extract it. Skip comments that are just instructions or requests.`

  try {
    const result = await generateObject({
      model,
      system,
      prompt,
      schema: LearningSuggestionsSchema,
      temperature: 0.3,
      maxOutputTokens: 2000,
    })

    // Map the AI response back to full LearningSuggestion objects
    return result.object.suggestions.map((s) => ({
      type: s.type as LearningSuggestionType,
      originalFlag: flagsWithNotes[s.flagIndex],
      suggestedText: s.suggestedText,
      targetSection: s.targetSection,
      reasoning: s.reasoning,
      confidence: s.confidence as LearningConfidence,
    }))
  } catch (error) {
    console.error("Failed to analyze comments for learnings:", error)
    return []
  }
}

/**
 * Inserts a learning into the appropriate section of the style guide.
 * Returns the updated style guide content.
 */
export function insertLearningIntoStyleGuide(
  styleGuide: string,
  suggestion: LearningSuggestion
): string {
  const { targetSection, suggestedText } = suggestion

  // Find the target section
  const sectionPattern = new RegExp(`(## ${targetSection}\\n)`, "i")
  const match = styleGuide.match(sectionPattern)

  if (!match) {
    // Section not found, append to end
    return styleGuide + `\n\n## ${targetSection}\n\n${suggestedText}\n`
  }

  // Find the end of the section (next ## or end of file)
  const sectionStart = match.index! + match[0].length
  const nextSection = styleGuide.slice(sectionStart).search(/\n## /)
  const sectionEnd = nextSection === -1 ? styleGuide.length : sectionStart + nextSection

  // Insert the learning at the end of the section
  const before = styleGuide.slice(0, sectionEnd)
  const after = styleGuide.slice(sectionEnd)

  return before + `\n${suggestedText}\n` + after
}

/**
 * Updates the changelog at the top of writing_style.md.
 */
export function updateStyleGuideChangelog(
  styleGuide: string,
  changeDescription: string
): string {
  const today = new Date().toLocaleDateString("da-DK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).replace(/\./g, "-")

  const changelogEntry = `- ${today} - ${changeDescription}`

  // Find the Changelog section
  const changelogMatch = styleGuide.match(/## Changelog\n/)
  if (!changelogMatch) {
    return styleGuide
  }

  const insertPoint = changelogMatch.index! + changelogMatch[0].length
  const before = styleGuide.slice(0, insertPoint)
  const after = styleGuide.slice(insertPoint)

  return before + changelogEntry + "\n" + after
}

// ============================================
// Phase Transitions (Progressive Commitment)
// ============================================

export function lockContract(
  manifest: ArticleManifest,
  contract: ArticleContract
): PhaseTransitionResult {
  if (manifest.phase !== 1) {
    return { success: false, newPhase: manifest.phase, error: "Can only lock contract from Phase 1" }
  }

  manifest.contract = contract
  manifest.title = contract.title
  manifest.phaseLocks.contractLockedAt = new Date().toISOString()
  manifest.phase = 2

  return { success: true, newPhase: 2 }
}

export function lockOutline(
  manifest: ArticleManifest,
  outline: ArticleOutline
): PhaseTransitionResult {
  if (manifest.phase !== 2) {
    return { success: false, newPhase: manifest.phase, error: "Can only lock outline from Phase 2" }
  }

  manifest.outline = { ...outline, lockedAt: new Date().toISOString() }
  manifest.phase = 3

  return { success: true, newPhase: 3 }
}

export function lockStructure(manifest: ArticleManifest): PhaseTransitionResult {
  if (manifest.phase !== 3) {
    return { success: false, newPhase: manifest.phase, error: "Can only lock structure from Phase 3" }
  }

  manifest.phaseLocks.structureLockedAt = new Date().toISOString()
  manifest.phase = 4

  return { success: true, newPhase: 4 }
}

export function unlockStructure(
  manifest: ArticleManifest,
  reason: string
): PhaseTransitionResult {
  if (manifest.phase !== 4) {
    return { success: false, newPhase: manifest.phase, error: "Can only unlock structure from Phase 4" }
  }

  const unlock: StructureUnlock = {
    timestamp: new Date().toISOString(),
    reason,
    previousOutline: manifest.outline as ArticleOutline
  }

  manifest.structureUnlocks = [...(manifest.structureUnlocks || []), unlock]
  manifest.phaseLocks.structureLockedAt = undefined
  manifest.phase = 2

  return { success: true, newPhase: 2 }
}
