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

export function buildRevisionSystemPrompt(styleGuide?: string): string {
  const styleSection = styleGuide
    ? `\n\nSTYLE GUIDE:\n${styleGuide}`
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
- Vary sentence structure - don't be perfectly parallel${styleSection}

Return the revised sections maintaining the same section IDs.`
}

export async function generateRevisedDraft(
  request: GenerateRevisedDraftRequest
): Promise<GenerateRevisedDraftResponse> {
  const startTime = Date.now()

  const system = buildRevisionSystemPrompt(request.styleGuide)
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
