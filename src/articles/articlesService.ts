/**
 * Articles service - handles AI-powered content generation for articles.
 */

import { generateObject, zodSchema } from "ai"
import { z } from "zod"

import { getStructuredOutputModel } from "@/src/scenarios/providers/structuredModel"
import type {
  ContentAlternative,
  ContentUnit,
  GenerateAlternativesRequest,
  GenerateAlternativesResponse,
  ArticlePillar,
  GenerateRevisedDraftRequest,
  GenerateRevisedDraftResponse,
  ArticleFeedbackFlag,
  ArticleSection,
} from "./types"

// ============================================
// Schema for AI output
// ============================================

const AlternativeSchema = z.object({
  content: z.string().min(1),
  approach: z.string().min(1),
  rationale: z.string().min(1),
})

const AlternativesResponseSchema = zodSchema(
  z.object({
    alternatives: z.array(AlternativeSchema).length(3),
  })
)

// ============================================
// Prompt building
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

const RHETORICAL_STRATEGIES = `
REQUIRED: Each alternative MUST use a DIFFERENT rhetorical strategy from this list:
1. Research claim - Lead with a specific study, statistic, or named researcher (e.g., "Kluger & DeNisi's meta-analysis of 607 studies found...")
2. Domain analogy - Draw parallel from another field: sports, military, poker, BJJ, aviation, music (e.g., "In Brazilian Jiu-Jitsu, coaches call this...")
3. Concrete scene - Describe a specific observable moment without first-person (e.g., "A practitioner finishes a session. Twenty interactions logged...")
4. Provocative claim - State something counterintuitive that demands attention (e.g., "Detailed notes make you worse.")
5. Question hook - Pose a question that reframes the reader's assumptions (e.g., "What if the problem isn't what you're doing, but what you're writing afterward?")

DO NOT generate multiple alternatives using the same strategy. If you write two research claims, you've failed.
`

const UNIT_GUIDANCE: Record<ContentUnit, string> = {
  sentence:
    `Generate exactly 3 alternative sentences. Each MUST use a different rhetorical strategy.\n${RHETORICAL_STRATEGIES}`,
  paragraph:
    `Generate exactly 3 alternative paragraphs. Each MUST use a different rhetorical strategy to open and develop the idea.\n${RHETORICAL_STRATEGIES}`,
  section:
    `Generate exactly 3 alternative sections. Each MUST use a different rhetorical strategy as its organizing principle.\n${RHETORICAL_STRATEGIES}`,
}

export function buildSystemPrompt(unit: ContentUnit, pillar?: ArticlePillar): string {
  const toneGuidance = pillar ? PILLAR_TONE_GUIDANCE[pillar] : "Write in a clear, engaging style."

  return `You are an expert content writer helping to refine article content.

Your task: Generate exactly 3 alternative versions of the provided content.

${UNIT_GUIDANCE[unit]}

Tone guidance: ${toneGuidance}

For each alternative, provide:
1. "content" - The rewritten text
2. "approach" - A 3-5 word label describing the angle (e.g., "More direct", "Story-driven", "Research-backed")
3. "rationale" - One sentence explaining why this version works

Rules:
- Each alternative MUST use a different rhetorical strategy (research, analogy, scene, claim, question)
- NEVER write in first person - no "I did X" or fake personal anecdotes
- Write in scientific third person - reference research, cite practitioners, describe observable behavior
- Preserve the core message and facts
- Match the original's approximate length (±20%)
- No filler, no fluff, no AI phrases ("Let's dive in", "It's important to note")
- The "approach" field must name which rhetorical strategy you used`
}

export function buildUserPrompt(request: GenerateAlternativesRequest): string {
  const { originalContent, unit, context } = request

  let prompt = `Original ${unit}:\n${originalContent}`

  if (context) {
    const contextParts: string[] = []

    if (context.articleTitle) {
      contextParts.push(`Article title: "${context.articleTitle}"`)
    }
    if (context.before) {
      contextParts.push(`Content before:\n${context.before}`)
    }
    if (context.after) {
      contextParts.push(`Content after:\n${context.after}`)
    }

    if (contextParts.length > 0) {
      prompt = `Context:\n${contextParts.join("\n\n")}\n\n${prompt}`
    }
  }

  return prompt
}

// ============================================
// Main function
// ============================================

export async function generateAlternatives(
  request: GenerateAlternativesRequest
): Promise<GenerateAlternativesResponse> {
  const startTime = Date.now()

  const system = buildSystemPrompt(request.unit, request.context?.pillar)
  const prompt = buildUserPrompt(request)

  const model = getStructuredOutputModel()

  const result = await generateObject({
    model,
    system,
    prompt,
    schema: AlternativesResponseSchema,
    temperature: 0.7, // Higher temperature for creative variety
    maxOutputTokens: 1500,
  })

  const latencyMs = Date.now() - startTime

  return {
    alternatives: result.object.alternatives as ContentAlternative[],
    meta: {
      model: process.env.AI_MODEL || "claude-3-5-haiku-20241022",
      latencyMs,
    },
  }
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
