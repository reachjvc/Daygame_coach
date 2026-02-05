#!/usr/bin/env npx tsx
/**
 * Conversation processing for test videos
 * Uses LLM to verify and correct speaker labels based on transcript content
 */

import * as fs from "fs"
import * as path from "path"
import { createHash } from "crypto"
import { generateObject } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { z } from "zod"

const SCHEMA_VERSION = "2.0.0"
const PIPELINE_VERSION = "06.conversations-v2"
const PROMPT_VERSION = "2.0.0"
const MODEL = "claude-3-5-haiku-20241022"

// Zod schema for speaker label response
const SpeakerLabelResponseSchema = z.object({
  speaker_labels: z.record(
    z.string(),
    z.object({
      role: z.enum(["coach", "target", "voiceover", "other", "unknown"]),
      confidence: z.number().min(0).max(1),
      reasoning: z.string().optional()
    })
  )
})

// Pre-determined video type classifications (these are structural, not speaker-dependent)
const VIDEO_CLASSIFICATIONS: Record<string, {
  type: "infield" | "talking_head" | "podcast" | "compilation"
  confidence: number
  reasoning: string
}> = {
  "H3_8iPikhDw": {
    type: "compilation",
    confidence: 0.85,
    reasoning: "Educational intro/outro addressing audience with infield approach in the middle. Mix of commentary and live interaction."
  },
  "G2sWa8X0EjA": {
    type: "compilation",
    confidence: 0.9,
    reasoning: "Opens with live group approach, includes technique breakdowns and explanations. Infield footage with educational commentary."
  },
  "4x9bvKaVWBc": {
    type: "compilation",
    confidence: 0.9,
    reasoning: "One continuous infield approach with interspersed commentary/breakdown. Narrator explains each step while showing clips."
  },
  "WSFSpbFCPZo": {
    type: "infield",
    confidence: 0.95,
    reasoning: "Pure infield footage with 5 distinct approaches. Multiple targets, real rejections and one success. Minimal commentary at end."
  },
  "dz8w8XUBDXU": {
    type: "talking_head",
    confidence: 0.98,
    reasoning: "Single speaker (100%), direct-to-camera educational content about mindset/purpose. No infield footage, no second party responding."
  }
}

// NO HARDCODED SPEAKER_ROLES - LLM determines these from transcript

interface InputSegment {
  start: number
  end: number
  text: string
  pyannote_speaker: string
}

interface InputData {
  source_audio: string
  audio_sha256?: string
  total_duration_sec?: number
  segments: InputSegment[]
}

interface SpeakerLabel {
  role: "coach" | "target" | "voiceover" | "other" | "unknown"
  confidence: number
  reasoning?: string
}

function extractVideoId(filename: string): string {
  const match = filename.match(/\[([^\]]+)\]/)
  return match ? match[1] : path.basename(filename, ".json")
}

/**
 * Use LLM to determine speaker roles from transcript content
 * Analyzes speech patterns to identify coach vs target vs voiceover
 */
async function detectSpeakerRoles(
  segments: InputSegment[],
  videoType: "infield" | "talking_head" | "podcast" | "compilation"
): Promise<Record<string, SpeakerLabel>> {
  // Get unique speakers
  const speakers = [...new Set(segments.map(s => s.pyannote_speaker))]
  console.log(`[06.conversations] Detecting roles for ${speakers.length} speakers: ${speakers.join(", ")}`)

  // For talking_head, single speaker is always coach
  if (videoType === "talking_head") {
    const labels: Record<string, SpeakerLabel> = {}
    for (const speaker of speakers) {
      labels[speaker] = { role: "coach", confidence: 0.95, reasoning: "Single speaker in talking_head video" }
    }
    return labels
  }

  // Build transcript for each speaker - ALL segments, no sampling
  // LLM needs full context to determine roles accurately
  const speakerSamples: Record<string, Array<{ text: string; index: number }>> = {}
  for (const speaker of speakers) {
    speakerSamples[speaker] = []
  }

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    speakerSamples[seg.pyannote_speaker].push({ text: seg.text, index: i })
  }

  // Build prompt for LLM
  const speakerTranscripts = speakers.map(speaker => {
    const samples = speakerSamples[speaker]
    const sampleText = samples.map(s => `[${s.index}] "${s.text}"`).join("\n")
    return `=== ${speaker} (${samples.length} samples) ===\n${sampleText}`
  }).join("\n\n")

  const systemPrompt = `You are analyzing a dating/social skills video transcript to identify speaker roles.

ROLES:
- coach: The instructor/host. Opens approaches ("excuse me", "I saw you"), asks questions, gives compliments, longer confident statements, addresses camera ("guys", "notice how"), teaches techniques.
- target: Women being approached. Short responses, answers questions about herself, gives name when asked, laughs/hesitation, shorter turns, reactive not proactive.
- voiceover: Post-production narration. Perfect sentences, instructional tone disconnected from action ("Notice how he...", "Watch what happens..."), explains what viewer is seeing.
- other: Background voices, brief interjections, not involved in main interaction.
- unknown: Cannot determine with confidence - flag for manual review.

CRITICAL RULES:
1. The person who delivers approach OPENERS ("excuse me", "I just saw you", "you looked really cute") is ALWAYS the coach, NEVER the target
2. The person giving SHORT RESPONSES to questions is typically the target
3. If unsure, mark as "unknown" with low confidence - DO NOT GUESS
4. Consider speech patterns across ALL samples, not just one or two

Respond with JSON only:
{
  "speaker_labels": {
    "SPEAKER_XX": { "role": "coach|target|voiceover|other|unknown", "confidence": 0.0-1.0, "reasoning": "brief explanation" }
  }
}`

  const userPrompt = `Video type: ${videoType}

Analyze these speaker transcripts and determine each speaker's role:

${speakerTranscripts}`

  try {
    const { object: result } = await generateObject({
      model: anthropic(MODEL),
      schema: SpeakerLabelResponseSchema,
      system: systemPrompt,
      prompt: userPrompt,
    })

    // Ensure all speakers have labels
    const labels: Record<string, SpeakerLabel> = {}
    for (const speaker of speakers) {
      if (result.speaker_labels[speaker]) {
        labels[speaker] = result.speaker_labels[speaker]
      } else {
        labels[speaker] = { role: "unknown", confidence: 0.3, reasoning: "Not labeled by LLM" }
      }
    }

    // Log results
    for (const [speaker, label] of Object.entries(labels)) {
      const conf = (label.confidence * 100).toFixed(0)
      console.log(`[06.conversations]   ${speaker}: ${label.role} (${conf}%) - ${label.reasoning || "no reasoning"}`)
    }

    return labels

  } catch (error) {
    // FAIL HARD - do not silently fallback to unknown
    console.error("[06.conversations] FATAL: LLM speaker detection failed")
    console.error(error)
    throw new Error(`LLM speaker detection failed: ${error}`)
  }
}

function computeChecksum(data: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(data))
    .digest("hex")
    .slice(0, 16)
}

// Heuristic approach detection patterns
const APPROACH_OPENERS = [
  /excuse me/i,
  /sorry.*second/i,
  /quick question/i,
  /had to say/i,
  /just (had to|wanted to) (say|tell|ask)/i,
  /what's your name/i,
  /where.*from/i,
  /i('m| am) (\w+)/i,  // name introduction
]

const COMMENTARY_PATTERNS = [
  /welcome back/i,
  /in this video/i,
  /guys/i,
  /subscribe/i,
  /link (is|in)/i,
  /comment.*below/i,
  /coaching/i,
  /next video/i,
  /thank you for watching/i,
  /peace( out)?$/i,
  /let me (explain|show|tell)/i,
  /as you (can see|saw)/i,
  /notice how/i,
  /this is (called|known|what)/i,
]

function isLikelyCommentary(text: string, speakerRole: string): boolean {
  if (speakerRole !== "coach") return false
  return COMMENTARY_PATTERNS.some(p => p.test(text))
}

function isApproachOpener(text: string): boolean {
  return APPROACH_OPENERS.some(p => p.test(text))
}

function detectConversations(
  segments: InputSegment[],
  speakerRoles: Record<string, { role: string; confidence: number }>,
  videoType: "infield" | "talking_head" | "podcast" | "compilation"
): { classifications: Array<{ segment_type: string; conversation_id: number; is_conversation_start: boolean }>; conversations: any[] } {

  // For talking_head/podcast, everything is commentary
  if (videoType === "talking_head" || videoType === "podcast") {
    return {
      classifications: segments.map(() => ({
        segment_type: "commentary",
        conversation_id: 0,
        is_conversation_start: false
      })),
      conversations: []
    }
  }

  const classifications: Array<{ segment_type: string; conversation_id: number; is_conversation_start: boolean }> = []
  const conversations: any[] = []

  let currentConversationId = 0
  let inApproach = false
  let approachStartIdx = -1

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    const role = speakerRoles[seg.pyannote_speaker]?.role || "other"
    const text = seg.text

    // Check for commentary patterns
    if (isLikelyCommentary(text, role)) {
      // End any ongoing approach
      if (inApproach && approachStartIdx >= 0) {
        conversations.push({
          conversation_id: currentConversationId,
          segment_ids: Array.from({ length: i - approachStartIdx }, (_, j) => approachStartIdx + j),
          start_time: segments[approachStartIdx].start,
          end_time: segments[i - 1].end
        })
      }
      inApproach = false
      approachStartIdx = -1
      classifications.push({
        segment_type: "commentary",
        conversation_id: 0,
        is_conversation_start: false
      })
      continue
    }

    // Check for approach opener (starts new conversation)
    if (isApproachOpener(text) && role === "coach") {
      // End any ongoing approach
      if (inApproach && approachStartIdx >= 0) {
        conversations.push({
          conversation_id: currentConversationId,
          segment_ids: Array.from({ length: i - approachStartIdx }, (_, j) => approachStartIdx + j),
          start_time: segments[approachStartIdx].start,
          end_time: segments[i - 1].end
        })
      }

      // Start new approach
      currentConversationId++
      inApproach = true
      approachStartIdx = i
      classifications.push({
        segment_type: "approach",
        conversation_id: currentConversationId,
        is_conversation_start: true
      })
      continue
    }

    // If target is speaking, likely in approach
    if (role === "target" && !inApproach) {
      // Check if we should start an approach (look back for coach)
      let foundCoachBefore = false
      for (let j = Math.max(0, i - 3); j < i; j++) {
        const prevRole = speakerRoles[segments[j].pyannote_speaker]?.role
        if (prevRole === "coach" && classifications[j]?.segment_type !== "commentary") {
          foundCoachBefore = true
          // Retroactively mark as approach
          currentConversationId++
          for (let k = j; k < i; k++) {
            if (classifications[k].segment_type !== "commentary") {
              classifications[k].segment_type = "approach"
              classifications[k].conversation_id = currentConversationId
              classifications[k].is_conversation_start = k === j
            }
          }
          inApproach = true
          approachStartIdx = j
          break
        }
      }
    }

    // Continue current approach or mark as commentary
    if (inApproach) {
      classifications.push({
        segment_type: "approach",
        conversation_id: currentConversationId,
        is_conversation_start: false
      })
    } else {
      // Default: if coach speaking without clear approach markers, it's commentary
      // If target speaking without approach context, might be from a clip
      classifications.push({
        segment_type: role === "target" ? "approach" : "commentary",
        conversation_id: role === "target" ? (currentConversationId || 1) : 0,
        is_conversation_start: false
      })
    }
  }

  // Close final approach
  if (inApproach && approachStartIdx >= 0) {
    conversations.push({
      conversation_id: currentConversationId,
      segment_ids: Array.from({ length: segments.length - approachStartIdx }, (_, j) => approachStartIdx + j),
      start_time: segments[approachStartIdx].start,
      end_time: segments[segments.length - 1].end
    })
  }

  return { classifications, conversations }
}

async function processFile(inputPath: string, outputPath: string): Promise<void> {
  console.log(`[06.conversations] Processing: ${path.basename(inputPath)}`)

  const rawData = fs.readFileSync(inputPath, "utf-8")
  const inputData: InputData = JSON.parse(rawData)
  const segments = inputData.segments

  const videoId = extractVideoId(inputPath)
  console.log(`[06.conversations] Video ID: ${videoId}, Segments: ${segments.length}`)

  // Get video type classification
  const videoType = VIDEO_CLASSIFICATIONS[videoId]
  if (!videoType) {
    console.error(`[06.conversations] No video type classification for: ${videoId}`)
    console.error(`[06.conversations] Add this video to VIDEO_CLASSIFICATIONS or use the full LLM script`)
    process.exit(1)
  }
  console.log(`[06.conversations] Video type: ${videoType.type} (${(videoType.confidence * 100).toFixed(0)}%)`)

  // Detect speaker roles using LLM (no hardcoded mappings)
  console.log(`[06.conversations] Analyzing speaker roles with LLM...`)
  const speakerLabels = await detectSpeakerRoles(segments, videoType.type)

  // VALIDATION: Check for unknown speakers after LLM has tried
  const unknownSpeakers = Object.entries(speakerLabels)
    .filter(([_, label]) => label.role === "unknown" || label.confidence < 0.5)

  const unknownCount = unknownSpeakers.length
  const totalSpeakers = Object.keys(speakerLabels).length
  const unknownRatio = unknownCount / totalSpeakers

  // Flag if more than 50% of speakers are unknown/low-confidence
  const needsManualReview = unknownRatio > 0.5

  if (unknownCount > 0) {
    const unknownList = unknownSpeakers
      .map(([speaker, label]) => `${speaker} (${label.role}, ${(label.confidence * 100).toFixed(0)}%)`)
      .join(", ")
    console.warn(`[06.conversations] WARNING: Low confidence speakers: ${unknownList}`)
  }

  if (needsManualReview) {
    console.error(`[06.conversations] FLAG: ${unknownCount}/${totalSpeakers} speakers unknown - NEEDS MANUAL REVIEW`)
  }

  // Detect conversations
  const { classifications, conversations } = detectConversations(segments, speakerLabels, videoType.type)

  // VALIDATION: Flag 0 conversations in infield/compilation videos
  if ((videoType.type === "infield" || videoType.type === "compilation") && conversations.length === 0) {
    console.error(`[06.conversations] FLAG: 0 conversations detected in ${videoType.type} video - NEEDS MANUAL REVIEW`)
    console.error(`[06.conversations] This likely indicates speaker labeling or boundary detection failure`)
  }

  // Build output segments
  const outputSegments = segments.map((seg, i) => ({
    id: i,
    start: seg.start,
    end: seg.end,
    text: seg.text,
    speaker_id: seg.pyannote_speaker,
    speaker_role: speakerLabels[seg.pyannote_speaker]?.role || "other",
    segment_type: classifications[i].segment_type,
    conversation_id: classifications[i].conversation_id,
    is_conversation_start: classifications[i].is_conversation_start
  }))

  // Count segment types
  const typeCounts: Record<string, number> = {}
  for (const seg of outputSegments) {
    typeCounts[seg.segment_type] = (typeCounts[seg.segment_type] || 0) + 1
  }

  // Build review flags
  const reviewFlags: string[] = []
  if (needsManualReview) {
    reviewFlags.push(`speakers_unknown_${unknownCount}_of_${totalSpeakers}`)
  }
  if ((videoType.type === "infield" || videoType.type === "compilation") && conversations.length === 0) {
    reviewFlags.push("zero_conversations_in_infield")
  }

  // Build output
  const output = {
    video_id: videoId,
    source_file: inputPath,
    processed_at: new Date().toISOString(),
    video_type: {
      type: videoType.type,
      confidence: videoType.confidence,
      method: "predefined_with_llm_speakers" as const,
      reasoning: videoType.reasoning
    },
    speaker_labels: speakerLabels,
    segments: outputSegments,
    conversations,
    review_flags: reviewFlags.length > 0 ? reviewFlags : undefined,
    metadata: {
      pipeline_version: PIPELINE_VERSION,
      prompt_version: PROMPT_VERSION,
      model_version: MODEL,
      schema_version: SCHEMA_VERSION,
      input_checksum: computeChecksum(inputData),
      llm_calls: 1, // Speaker role detection
      total_input_tokens: 0, // Not tracked in this version
      total_output_tokens: 0
    }
  }

  // Write output
  const outputDir = path.dirname(outputPath)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2))

  console.log(`[06.conversations] Results:`)
  console.log(`  Video type: ${videoType.type}`)
  console.log(`  Conversations: ${conversations.length}`)
  console.log(`  Segment types: ${JSON.stringify(typeCounts)}`)
  console.log(`  Output: ${outputPath}`)
}

async function main(): Promise<void> {
  // CRITICAL: Check for API key BEFORE processing
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("[06.conversations] FATAL: ANTHROPIC_API_KEY environment variable not set")
    console.error("[06.conversations] Run with: ANTHROPIC_API_KEY=your-key npx tsx scripts/training-data/06.conversations-manual.ts")
    process.exit(1)
  }

  const inputDir = path.join(__dirname, "../../data/test/05.audio-features")
  const outputDir = path.join(__dirname, "../../data/test/06.conversations")

  if (!fs.existsSync(inputDir)) {
    console.error(`Input directory not found: ${inputDir}`)
    process.exit(1)
  }

  const files = fs.readdirSync(inputDir).filter(f => f.endsWith(".audio_features.json"))
  console.log(`[06.conversations] Found ${files.length} files to process`)

  for (const file of files) {
    const inputPath = path.join(inputDir, file)
    const outputFile = file.replace(/\.audio_features\.json$/, ".conversations.json")
    const outputPath = path.join(outputDir, outputFile)

    await processFile(inputPath, outputPath)
    console.log("")
  }

  console.log(`[06.conversations] Done! Processed ${files.length} files`)
}

main().catch(err => {
  console.error("[06.conversations] Fatal error:", err)
  process.exit(1)
})
