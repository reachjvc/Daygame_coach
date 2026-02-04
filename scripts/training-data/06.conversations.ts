#!/usr/bin/env npx tsx
/**
 * scripts/training-data/06.conversations.ts
 *
 * Conversation Detection using Claude LLM (Pure LLM - No Heuristics)
 *
 * Three-pass architecture:
 * 1. Video Type Classification - infield, talking_head, podcast, compilation
 * 2. Speaker Labeling - SPEAKER_XX -> coach, target, voiceover, other
 * 3. Conversation Boundaries - segment_type + conversation_id
 *
 * Input:  data/05.audio-features/<source>/<video>/*.audio_features.json
 * Output: data/06.conversations/<source>/<video>/*.conversations.json
 *
 * Usage:
 *   npx tsx scripts/training-data/06.conversations.ts "source_name"
 *   npx tsx scripts/training-data/06.conversations.ts --sources
 *   npx tsx scripts/training-data/06.conversations.ts --input path/to/file.json
 */

import { generateObject } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { z } from "zod"
import * as fs from "fs"
import * as path from "path"
import { createHash } from "crypto"

// ============================================================================
// Configuration
// ============================================================================

const MODEL = process.env.AI_MODEL || "claude-3-5-haiku-20241022"
const BATCH_SIZE = 30
const BATCH_OVERLAP = 5
const PROMPT_VERSION = "1.0.0"
const SCHEMA_VERSION = "2.0.0"
const PIPELINE_VERSION = "06.conversations-v1"

// ============================================================================
// Zod Schemas for Structured Output
// ============================================================================

const VideoTypeSchema = z.object({
  type: z.enum(["infield", "talking_head", "podcast", "compilation"]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().max(300),
})

const SpeakerLabelSchema = z.object({
  speaker_mapping: z.record(
    z.string(),
    z.object({
      role: z.enum(["coach", "target", "voiceover", "other"]),
      confidence: z.number().min(0).max(1),
    })
  ),
})

const SegmentClassificationSchema = z.object({
  segments: z.array(
    z.object({
      id: z.number(),
      segment_type: z.enum(["approach", "commentary", "transition"]),
      conversation_id: z.number().int().min(0),
      is_conversation_start: z.boolean(),
      confidence: z.number().min(0).max(1),
    })
  ),
})

// ============================================================================
// Types
// ============================================================================

interface InputSegment {
  start: number
  end: number
  text: string
  pyannote_speaker: string
  features?: {
    pitch?: { mean_hz: number; std_hz: number }
    energy?: { dynamics_db: number }
    tempo?: { syllable_rate: number }
  }
}

interface InputData {
  source_audio: string
  audio_sha256?: string
  total_duration_sec?: number
  segments: InputSegment[]
}

interface OutputSegment {
  id: number
  start: number
  end: number
  text: string
  speaker_id: string
  speaker_role: "coach" | "target" | "voiceover" | "other"
  segment_type: "approach" | "commentary" | "transition"
  conversation_id: number
  is_conversation_start: boolean
}

interface ConversationSummary {
  conversation_id: number
  segment_ids: number[]
  start_time: number
  end_time: number
  opener_type?: string
}

interface OutputData {
  video_id: string
  source_file: string
  processed_at: string
  video_type: {
    type: "infield" | "talking_head" | "podcast" | "compilation"
    confidence: number
    method: "claude_llm"
    reasoning: string
  }
  speaker_labels: Record<string, { role: string; confidence: number }>
  segments: OutputSegment[]
  conversations: ConversationSummary[]
  metadata: {
    pipeline_version: string
    prompt_version: string
    model_version: string
    schema_version: string
    input_checksum: string
    llm_calls: number
    total_input_tokens: number
    total_output_tokens: number
  }
}

// ============================================================================
// Call Tracking
// ============================================================================

let llmCalls = 0

// ============================================================================
// Prompts
// ============================================================================

const VIDEO_TYPE_SYSTEM_PROMPT = `You are classifying daygame coaching videos. Determine the PRIMARY content type.

VIDEO TYPES:

1. "infield" - Coach DOING live approaches on the street
   - Live interaction with women (not hypothetical)
   - Real-time responses from targets
   - Street/shopping/park environment implied
   - Nervous energy, real rejection/acceptance
   - Incomplete thoughts, interruptions, ambient noise

2. "talking_head" - Coach EXPLAINING concepts to camera
   - Educational/instructional tone
   - No second party responding
   - Abstract examples, theory discussion
   - "Guys", "everyone", "you should"
   - Clean, complete sentences

3. "podcast" - Multiple speakers DISCUSSING topics
   - Back-and-forth dialogue about theory
   - Named co-hosts or guests
   - Interview-style questions
   - Both speakers have long turns

4. "compilation" - Mixed content types
   - Shifts between infield and commentary
   - Multiple approaches with breakdowns between
   - "As you saw..." followed by explanation

Analyze the video title and sample segments to classify.`

const SPEAKER_LABELING_SYSTEM_PROMPT = `You are labeling speakers in a daygame video based on speech patterns.

SPEAKER ROLES:

1. "coach" - The person teaching/demonstrating
   - Opens conversations (excuse me, quick question...)
   - Asks personal questions (name, origin, occupation)
   - Gives compliments
   - Longer, confident statements
   - Commentary to camera between approaches
   - May reference teaching ("guys", "as you can see")

2. "target" - Women being approached
   - Responds to questions (short answers initially)
   - Asked about herself (not asking)
   - Gives name when asked
   - May laugh, show surprise, hesitation
   - Typically shorter turns than coach

3. "voiceover" - Post-production narration
   - Instructional tone disconnected from live action
   - No back-and-forth dialogue
   - Perfect sentences (not fragmented)
   - "Notice how he..." or "Watch what happens..."

4. "other" - Background voices, friends, staff
   - Brief interjections
   - Not involved in approach

RULES:
- Map each SPEAKER_XX to exactly one role
- Coach usually has most dialogue
- In typical infield: 1 coach + multiple targets`

const CONVERSATION_BOUNDARY_SYSTEM_PROMPT = `You are detecting conversation boundaries in infield daygame footage.

SEGMENT TYPES:

1. "approach" - Part of live interaction with a woman
   - Includes: opener, small talk, flirting, number close
   - Gets non-zero conversation_id

2. "commentary" - Coach talking to camera (not to woman)
   - Pre-approach setup, post-approach breakdown
   - conversation_id: 0

3. "transition" - Brief moment between content
   - Walking, repositioning, audio gaps
   - conversation_id: 0

NEW CONVERSATION STARTS WHEN:
- Direct address to new person (excuse me, sorry, quick question)
- Change from commentary to interpersonal dialogue
- Location/context shift implied
- Previous approach clearly ended (goodbye, number, rejection)

SAME CONVERSATION CONTINUES WHEN:
- Same conversational thread
- Questions followed by relevant answers
- Continuous interaction without camera break

APPROACH ENDS WHEN:
- Number exchange ("text you", "send you a message")
- Explicit goodbye
- Rejection ("I have a boyfriend", walking away)
- Coach pivots to camera commentary

RULES:
- When uncertain: default to commentary (safer)
- conversation_id must be sequential (1, 2, 3...)
- Segments with same conversation_id must be contiguous
- Return EXACTLY the same number of segments as provided in input`

// ============================================================================
// LLM Calls with Retry
// ============================================================================

async function callWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error | undefined
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      if (attempt < maxRetries - 1) {
        const delay = 1000 * Math.pow(2, attempt)
        console.log(
          `[06.conversations] Retry ${attempt + 1}/${maxRetries} after ${delay}ms...`
        )
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }
  throw lastError
}

// ============================================================================
// Pass 1: Video Type Classification
// ============================================================================

async function classifyVideoType(
  title: string,
  segments: InputSegment[]
): Promise<{ type: "infield" | "talking_head" | "podcast" | "compilation"; confidence: number; reasoning: string }> {
  // Sample segments: first 5, middle 5, last 5
  const sampleIndices: number[] = []
  for (let i = 0; i < Math.min(5, segments.length); i++) sampleIndices.push(i)
  if (segments.length > 10) {
    const mid = Math.floor(segments.length / 2)
    for (let i = mid - 2; i <= mid + 2 && i < segments.length; i++) {
      if (i >= 0) sampleIndices.push(i)
    }
  }
  if (segments.length > 15) {
    for (let i = segments.length - 5; i < segments.length; i++) {
      sampleIndices.push(i)
    }
  }
  const uniqueIndices = Array.from(new Set(sampleIndices)).sort((a, b) => a - b).slice(0, 15)

  const sampleText = uniqueIndices
    .map((i) => `[${i}] ${segments[i].text.slice(0, 100)}`)
    .join("\n")

  const userPrompt = `VIDEO TITLE: "${title}"

SAMPLE SEGMENTS:
${sampleText}

Classify this video's content type.`

  const result = await callWithRetry(async () => {
    const response = await generateObject({
      model: anthropic(MODEL),
      system: VIDEO_TYPE_SYSTEM_PROMPT,
      prompt: userPrompt,
      schema: VideoTypeSchema,
      temperature: 0.3,
      maxTokens: 500,
    })

    llmCalls++
    return response.object
  })

  return result
}

// ============================================================================
// Pass 2: Speaker Labeling
// ============================================================================

async function labelSpeakers(
  segments: InputSegment[]
): Promise<Record<string, { role: "coach" | "target" | "voiceover" | "other"; confidence: number }>> {
  // Use first 50 segments for speaker analysis
  const sampleSegments = segments.slice(0, 50)

  const segmentText = sampleSegments
    .map(
      (seg, i) =>
        `[${i}] ${seg.pyannote_speaker}: "${seg.text.slice(0, 80)}"`
    )
    .join("\n")

  // Get unique speakers
  const speakers = Array.from(new Set(segments.map((s) => s.pyannote_speaker)))

  const userPrompt = `SPEAKERS TO LABEL: ${speakers.join(", ")}

SAMPLE DIALOGUE:
${segmentText}

Map each speaker to their role based on their speech patterns.`

  const result = await callWithRetry(async () => {
    const response = await generateObject({
      model: anthropic(MODEL),
      system: SPEAKER_LABELING_SYSTEM_PROMPT,
      prompt: userPrompt,
      schema: SpeakerLabelSchema,
      temperature: 0.3,
      maxTokens: 1000,
    })

    llmCalls++
    return response.object
  })

  // Ensure all speakers have labels (default to "other" if missing)
  const labels: Record<string, { role: "coach" | "target" | "voiceover" | "other"; confidence: number }> = {}
  for (const speaker of speakers) {
    const mapping = result.speaker_mapping[speaker]
    if (mapping) {
      labels[speaker] = {
        role: mapping.role,
        confidence: mapping.confidence,
      }
    } else {
      labels[speaker] = { role: "other", confidence: 0.5 }
    }
  }

  return labels
}

// ============================================================================
// Pass 3: Conversation Boundary Detection
// ============================================================================

interface SegmentClassification {
  id: number
  segment_type: "approach" | "commentary" | "transition"
  conversation_id: number
  is_conversation_start: boolean
  confidence: number
}

async function detectConversationBoundaries(
  segments: InputSegment[],
  speakerLabels: Record<string, { role: string; confidence: number }>
): Promise<SegmentClassification[]> {
  const results: SegmentClassification[] = []
  let currentConversationId = 0

  // Process in batches with overlap
  for (let start = 0; start < segments.length; start += BATCH_SIZE - BATCH_OVERLAP) {
    const end = Math.min(start + BATCH_SIZE, segments.length)
    const batch = segments.slice(start, end)
    const batchStartId = start

    // Build segment text with speaker roles
    const segmentText = batch
      .map((seg, i) => {
        const globalId = batchStartId + i
        const role = speakerLabels[seg.pyannote_speaker]?.role || "unknown"
        return `[${globalId}] ${role.toUpperCase()}: "${seg.text.slice(0, 100)}"`
      })
      .join("\n")

    const userPrompt = `CURRENT CONVERSATION ID: ${currentConversationId}
SEGMENT ID RANGE: ${batchStartId} to ${batchStartId + batch.length - 1}

SEGMENTS:
${segmentText}

Classify each segment. If a new approach starts, increment conversation_id from ${currentConversationId}.
Return exactly ${batch.length} segment classifications.`

    const batchResult = await callWithRetry(async () => {
      const response = await generateObject({
        model: anthropic(MODEL),
        system: CONVERSATION_BOUNDARY_SYSTEM_PROMPT,
        prompt: userPrompt,
        schema: SegmentClassificationSchema,
        temperature: 0.3,
        maxTokens: 3000,
      })

      llmCalls++
      return response.object
    })

    // Process batch results (only non-overlap portion except for first batch)
    const nonOverlapStart = start === 0 ? 0 : BATCH_OVERLAP
    const processedSegments = batchResult.segments.slice(nonOverlapStart)

    for (const seg of processedSegments) {
      // Update conversation ID tracker
      if (seg.conversation_id > currentConversationId) {
        currentConversationId = seg.conversation_id
      }
      results.push(seg)
    }

    // Log progress
    if (results.length % 50 === 0) {
      console.log(
        `[06.conversations] Processed ${results.length}/${segments.length} segments...`
      )
    }
  }

  return results
}

// ============================================================================
// Main Processing
// ============================================================================

function extractVideoTitle(filename: string): string {
  // Remove extensions: "Title [id].audio_features.json" -> "Title"
  let name = path.basename(filename)
  name = name.replace(/\.(audio_features|conversations)\.json$/i, "")
  const match = name.match(/^(.+?)\s*\[/)
  return match ? match[1].trim() : name
}

function extractVideoId(filename: string): string {
  const match = filename.match(/\[([^\]]+)\]/)
  return match ? match[1] : path.basename(filename, ".json")
}

function computeChecksum(data: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(data))
    .digest("hex")
    .slice(0, 16)
}

async function processFile(inputPath: string, outputPath: string): Promise<void> {
  console.log(`[06.conversations] Processing: ${path.basename(inputPath)}`)

  // Reset call counter
  llmCalls = 0

  // Read input
  const rawData = fs.readFileSync(inputPath, "utf-8")
  const inputData: InputData = JSON.parse(rawData)
  const segments = inputData.segments

  console.log(`[06.conversations] Found ${segments.length} segments`)

  const videoTitle = extractVideoTitle(inputPath)
  const videoId = extractVideoId(inputPath)
  console.log(`[06.conversations] Video: "${videoTitle}" [${videoId}]`)

  // Pass 1: Video Type Classification
  console.log("[06.conversations] Pass 1: Classifying video type...")
  const videoTypeResult = await classifyVideoType(videoTitle, segments)
  console.log(
    `[06.conversations] Video type: ${videoTypeResult.type} (${(videoTypeResult.confidence * 100).toFixed(0)}%)`
  )

  let speakerLabels: Record<string, { role: "coach" | "target" | "voiceover" | "other"; confidence: number }> = {}
  let classifications: SegmentClassification[] = []

  if (videoTypeResult.type === "talking_head" || videoTypeResult.type === "podcast") {
    // Skip passes 2-3 for non-infield content
    console.log("[06.conversations] Non-infield content - skipping speaker/boundary detection")

    // Default speaker labels
    const speakers = Array.from(new Set(segments.map((s) => s.pyannote_speaker)))
    for (const speaker of speakers) {
      speakerLabels[speaker] = { role: "coach", confidence: 0.9 }
    }

    // All segments are commentary
    classifications = segments.map((_, i) => ({
      id: i,
      segment_type: "commentary" as const,
      conversation_id: 0,
      is_conversation_start: false,
      confidence: 0.95,
    }))
  } else {
    // Pass 2: Speaker Labeling
    console.log("[06.conversations] Pass 2: Labeling speakers...")
    speakerLabels = await labelSpeakers(segments)
    console.log(
      `[06.conversations] Speaker labels: ${JSON.stringify(speakerLabels)}`
    )

    // Pass 3: Conversation Boundaries
    console.log("[06.conversations] Pass 3: Detecting conversation boundaries...")
    classifications = await detectConversationBoundaries(segments, speakerLabels)
    console.log(`[06.conversations] Classified ${classifications.length} segments`)
  }

  // Build output segments
  const outputSegments: OutputSegment[] = segments.map((seg, i) => {
    const classification = classifications[i] || {
      id: i,
      segment_type: "commentary" as const,
      conversation_id: 0,
      is_conversation_start: false,
      confidence: 0.5,
    }

    return {
      id: i,
      start: seg.start,
      end: seg.end,
      text: seg.text,
      speaker_id: seg.pyannote_speaker,
      speaker_role: speakerLabels[seg.pyannote_speaker]?.role || "other",
      segment_type: classification.segment_type,
      conversation_id: classification.conversation_id,
      is_conversation_start: classification.is_conversation_start,
    }
  })

  // Build conversation summaries
  const conversationMap = new Map<number, OutputSegment[]>()
  for (const seg of outputSegments) {
    if (seg.conversation_id > 0) {
      const existing = conversationMap.get(seg.conversation_id) || []
      existing.push(seg)
      conversationMap.set(seg.conversation_id, existing)
    }
  }

  const conversations: ConversationSummary[] = []
  conversationMap.forEach((segs, convId) => {
    conversations.push({
      conversation_id: convId,
      segment_ids: segs.map((s) => s.id),
      start_time: segs[0].start,
      end_time: segs[segs.length - 1].end,
    })
  })

  // Build output
  const output: OutputData = {
    video_id: videoId,
    source_file: inputPath,
    processed_at: new Date().toISOString(),
    video_type: {
      type: videoTypeResult.type,
      confidence: videoTypeResult.confidence,
      method: "claude_llm",
      reasoning: videoTypeResult.reasoning,
    },
    speaker_labels: speakerLabels,
    segments: outputSegments,
    conversations,
    metadata: {
      pipeline_version: PIPELINE_VERSION,
      prompt_version: PROMPT_VERSION,
      model_version: MODEL,
      schema_version: SCHEMA_VERSION,
      input_checksum: computeChecksum(inputData),
      llm_calls: llmCalls,
      total_input_tokens: 0, // Token tracking not available in AI SDK
      total_output_tokens: 0,
    },
  }

  // Write output
  const outputDir = path.dirname(outputPath)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2))

  // Summary
  const typeCounts: Record<string, number> = {}
  for (const seg of outputSegments) {
    typeCounts[seg.segment_type] = (typeCounts[seg.segment_type] || 0) + 1
  }

  console.log(`[06.conversations] Results:`)
  console.log(`  Video type: ${videoTypeResult.type}`)
  console.log(`  Conversations: ${conversations.length}`)
  console.log(`  Segment types: ${JSON.stringify(typeCounts)}`)
  console.log(`  LLM calls: ${llmCalls}`)
  console.log(`  Output: ${outputPath}`)
}

// ============================================================================
// CLI
// ============================================================================

function repoRoot(): string {
  return path.resolve(__dirname, "../..")
}

function inputRoot(): string {
  return path.join(repoRoot(), "data", "05.audio-features")
}

function outputRoot(): string {
  return path.join(repoRoot(), "data", "06.conversations")
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Usage:
  npx tsx scripts/training-data/06.conversations.ts <source_name>
  npx tsx scripts/training-data/06.conversations.ts --input <file.json>
  npx tsx scripts/training-data/06.conversations.ts --sources [sources.txt]

Options:
  --input <path>     Process a specific input file
  --output <path>    Specify output path
  --sources [file]   Process all sources from file (default: docs/sources.txt)
  --overwrite        Overwrite existing outputs
  --dry-run          Print what would happen without writing
`)
    return
  }

  const overwrite = args.includes("--overwrite")
  const dryRun = args.includes("--dry-run")

  // Handle --input mode
  const inputIdx = args.indexOf("--input")
  if (inputIdx !== -1) {
    const inputPath = args[inputIdx + 1]
    if (!inputPath) {
      console.error("Error: --input requires a path")
      process.exit(1)
    }

    const outputIdx = args.indexOf("--output")
    let outputPath: string
    if (outputIdx !== -1) {
      outputPath = args[outputIdx + 1]
    } else {
      const basename = path.basename(inputPath).replace(/\.audio_features\.json$/, ".conversations.json")
      outputPath = path.join(outputRoot(), basename)
    }

    if (fs.existsSync(outputPath) && !overwrite) {
      console.log(`[06.conversations] Output exists, skipping: ${outputPath}`)
      return
    }

    if (dryRun) {
      console.log(`[dry-run] Would process: ${inputPath} -> ${outputPath}`)
      return
    }

    await processFile(inputPath, outputPath)
    return
  }

  // Handle --sources mode
  const sourcesIdx = args.indexOf("--sources")
  if (sourcesIdx !== -1) {
    const sourcesFile = args[sourcesIdx + 1] || "docs/sources.txt"
    const sourcesPath = path.isAbsolute(sourcesFile)
      ? sourcesFile
      : path.join(repoRoot(), sourcesFile)

    if (!fs.existsSync(sourcesPath)) {
      console.error(`Error: Sources file not found: ${sourcesPath}`)
      process.exit(1)
    }

    const lines = fs.readFileSync(sourcesPath, "utf-8").split("\n")
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue

      let sourceName: string
      if (trimmed.includes("|")) {
        sourceName = trimmed.split("|")[0].trim()
      } else {
        sourceName = trimmed.split(/\s+/)[0]
      }

      const sourceInputDir = path.join(inputRoot(), sourceName)
      const sourceOutputDir = path.join(outputRoot(), sourceName)

      if (!fs.existsSync(sourceInputDir)) {
        console.log(`[06.conversations] Input not found: ${sourceInputDir}`)
        continue
      }

      const files = fs
        .readdirSync(sourceInputDir, { recursive: true })
        .filter((f) => String(f).endsWith(".audio_features.json"))

      console.log(`[06.conversations] Source: ${sourceName} (${files.length} files)`)

      for (const file of files) {
        const inputPath = path.join(sourceInputDir, String(file))
        const outputFile = String(file).replace(
          /\.audio_features\.json$/,
          ".conversations.json"
        )
        const outputPath = path.join(sourceOutputDir, outputFile)

        if (fs.existsSync(outputPath) && !overwrite) {
          continue
        }

        if (dryRun) {
          console.log(`[dry-run] Would process: ${inputPath}`)
          continue
        }

        await processFile(inputPath, outputPath)
      }
    }
    return
  }

  // Handle positional source name
  const sourceName = args.find((a) => !a.startsWith("--"))
  if (!sourceName) {
    console.error("Error: Provide a source name, --input, or --sources")
    process.exit(1)
  }

  const sourceInputDir = path.join(inputRoot(), sourceName)
  const sourceOutputDir = path.join(outputRoot(), sourceName)

  if (!fs.existsSync(sourceInputDir)) {
    console.error(`Error: Input directory not found: ${sourceInputDir}`)
    process.exit(1)
  }

  const files = fs
    .readdirSync(sourceInputDir, { recursive: true })
    .filter((f) => String(f).endsWith(".audio_features.json"))

  console.log(`[06.conversations] Processing ${files.length} files from ${sourceName}`)

  let processed = 0
  let skipped = 0

  for (const file of files) {
    const inputPath = path.join(sourceInputDir, String(file))
    const outputFile = String(file).replace(
      /\.audio_features\.json$/,
      ".conversations.json"
    )
    const outputPath = path.join(sourceOutputDir, outputFile)

    if (fs.existsSync(outputPath) && !overwrite) {
      skipped++
      continue
    }

    if (dryRun) {
      console.log(`[dry-run] Would process: ${inputPath}`)
      processed++
      continue
    }

    await processFile(inputPath, outputPath)
    processed++
  }

  console.log(`[06.conversations] Done: ${processed} processed, ${skipped} skipped`)
}

main().catch((err) => {
  console.error("[06.conversations] Fatal error:", err)
  process.exit(1)
})
