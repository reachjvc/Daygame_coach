"use client"

import Link from "next/link"
import { useState } from "react"
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Download,
  Mic,
  AlignLeft,
  Users,
  AudioLines,
  Brain,
  CheckCircle2,
  Wrench,
  Shield,
  Search,
  MapPin,
  Scale,
  Layers,
  Tag,
  Box,
  DatabaseZap,
  Flame,
  ShieldAlert,
  OctagonX,
  AlertTriangle,
  Info,
} from "lucide-react"
import { Button } from "@/components/ui/button"

// ─── Types ───────────────────────────────────────────────────────────────

type StageCategory = "ext" | "llm" | "det" | "ts"

interface PipelineStage {
  id: string
  number: string
  name: string
  category: StageCategory
  description: string
  tool: string
  outputs: string[]
  details: string
  gateInfo?: string
}

interface FlagEntry {
  flag: string
  createdBy: string
  consumedBy: string
  purpose: string
}

interface ValidationGate {
  afterStage: string
  condition: string
  action: string
  severity: "critical" | "error" | "warning"
}

// ─── Data ────────────────────────────────────────────────────────────────

const categoryConfig: Record<
  StageCategory,
  { label: string; color: string; bgColor: string; borderColor: string; badgeBg: string; dotColor: string }
> = {
  ext: {
    label: "EXT (External Tools)",
    color: "text-blue-400",
    bgColor: "bg-blue-950/40",
    borderColor: "border-blue-700/50",
    badgeBg: "bg-blue-900/60 text-blue-300",
    dotColor: "bg-blue-400",
  },
  llm: {
    label: "LLM (Claude CLI)",
    color: "text-purple-400",
    bgColor: "bg-purple-950/40",
    borderColor: "border-purple-700/50",
    badgeBg: "bg-purple-900/60 text-purple-300",
    dotColor: "bg-purple-400",
  },
  det: {
    label: "DET (Deterministic)",
    color: "text-emerald-400",
    bgColor: "bg-emerald-950/40",
    borderColor: "border-emerald-700/50",
    badgeBg: "bg-emerald-900/60 text-emerald-300",
    dotColor: "bg-emerald-400",
  },
  ts: {
    label: "TS (TypeScript)",
    color: "text-orange-400",
    bgColor: "bg-orange-950/40",
    borderColor: "border-orange-700/50",
    badgeBg: "bg-orange-900/60 text-orange-300",
    dotColor: "bg-orange-400",
  },
}

const stageIcons: Record<string, typeof Download> = {
  "01": Download,
  "02": Mic,
  "03": AlignLeft,
  "04": Users,
  "05": AudioLines,
  "06": Brain,
  "06b": CheckCircle2,
  "06c": Wrench,
  "06d": Shield,
  "06e": Search,
  "06f": MapPin,
  "06g": Scale,
  "06h": Layers,
  "07": Tag,
  "08": ShieldAlert,
  "09": Box,
  "10": DatabaseZap,
  "11": Flame,
}

const stages: PipelineStage[] = [
  {
    id: "01",
    number: "01",
    name: "download",
    category: "ext",
    description: "Downloads YouTube audio",
    tool: "yt-dlp",
    outputs: [".wav", ".mp3", ".info.json"],
    details: "Fetches audio from YouTube URLs specified in the manifest. Produces WAV for processing, MP3 for playback, and info.json metadata.",
  },
  {
    id: "02",
    number: "02",
    name: "transcribe",
    category: "ext",
    description: "Transcribes audio to word-timestamped JSON",
    tool: "faster-whisper large-v3",
    outputs: [".transcript.json", ".flagged.json"],
    details: "Uses faster-whisper with large-v3 model for word-level timestamps. Creates .flagged.json with CRITICAL/WARNING quality flags.",
  },
  {
    id: "03",
    number: "03",
    name: "align",
    category: "ext",
    description: "Forced alignment to sentence boundaries",
    tool: "whisperx",
    outputs: [".aligned.json"],
    details: "Re-aligns transcript to sentence boundaries using WhisperX forced alignment. Produces cleaner sentence-level segments.",
    gateInfo: "GATE: Skips videos with CRITICAL flag from 02",
  },
  {
    id: "04",
    number: "04",
    name: "diarize",
    category: "ext",
    description: "Speaker diarization (SPEAKER_00/01)",
    tool: "pyannote",
    outputs: [".diarized.json"],
    details: "Identifies and labels distinct speakers using pyannote speaker diarization. Assigns SPEAKER_00, SPEAKER_01 labels.",
    gateInfo: "GATE: Skips videos with CRITICAL flag from 02",
  },
  {
    id: "05",
    number: "05",
    name: "audio-features",
    category: "ext",
    description: "Audio features (pitch, energy, tempo)",
    tool: "librosa + pyin",
    outputs: [".audio_features.json"],
    details: "Extracts acoustic features: fundamental frequency (pyin), energy envelope, speaking rate, and tempo markers per segment.",
    gateInfo: "GATE: Skips videos with CRITICAL flag from 02",
  },
  {
    id: "06",
    number: "06",
    name: "video-type",
    category: "llm",
    description: "Classifies video type, speaker roles, conversation boundaries",
    tool: "Claude CLI",
    outputs: [".video_type.json", ".video_type_state.json"],
    details: "LLM classifies the video format (infield, podcast, lecture, etc.), identifies speaker roles, and marks conversation boundaries. Produces structured JSON with confidence scores.",
  },
  {
    id: "06b",
    number: "06b",
    name: "verify",
    category: "llm",
    description: "Independent verification of 06 output",
    tool: "Claude (opus->sonnet fallback)",
    outputs: [".06b_verify.json", ".06b_verify_state.json"],
    details: "A second LLM pass independently verifies the video type classification. Produces a verdict: APPROVE, FLAG, or REJECT. Uses opus with sonnet fallback.",
  },
  {
    id: "06c",
    number: "06c",
    name: "patch",
    category: "det",
    description: "Auto-applies high-confidence fixes from 06b",
    tool: "Python (deterministic)",
    outputs: [".video_type.json (patched)", "patch_metadata"],
    details: "Deterministically applies fixes that 06b flagged with high confidence. Tracks all patches in metadata for downstream audit.",
  },
  {
    id: "06d",
    number: "06d",
    name: "sanitize",
    category: "det",
    description: "Teaser detection, mixed-mode flagging, evidence allowlists",
    tool: "Python (deterministic)",
    outputs: [".video_type.json (sanitized)"],
    details: "Detects and marks teaser segments, flags mixed-mode content, and applies evidence allowlists to filter noise.",
  },
  {
    id: "06e",
    number: "06e",
    name: "quality-check",
    category: "llm",
    description: "ASR quality assessment: low-quality segments + artifacts",
    tool: "Claude CLI",
    outputs: [".quality_check.json"],
    details: "LLM evaluates transcript quality at the segment level. Identifies low-quality segments, ASR artifacts, and noise contamination.",
  },
  {
    id: "06f",
    number: "06f",
    name: "damage-map",
    category: "det",
    description: "Builds damage map with contamination windows from 06e",
    tool: "Python (deterministic)",
    outputs: [".damage_map.json"],
    details: "Aggregates quality issues from 06e into contamination windows. Maps damaged regions with severity levels and affected segment ranges.",
  },
  {
    id: "06g",
    number: "06g",
    name: "damage-adjudicator",
    category: "llm",
    description: "Per-seed LLM adjudication of damaged segments",
    tool: "Claude CLI",
    outputs: [".damage_adjudicated.json"],
    details: "LLM reviews each damaged segment individually and decides: salvageable (with edits), discard, or keep-as-is. Per-seed processing for consistency.",
  },
  {
    id: "06h",
    number: "06h",
    name: "confidence-propagation",
    category: "det",
    description: "Merges all confidence data into final annotated file",
    tool: "Python (deterministic)",
    outputs: [".annotated.json"],
    details: "Merges confidence scores from all upstream stages into a single annotated transcript with per-segment quality metadata.",
  },
  {
    id: "07",
    number: "07",
    name: "content",
    category: "llm",
    description: "Content enrichment: techniques, topics, turn phases, hooks",
    tool: "Claude CLI",
    outputs: [".content.json"],
    details: "LLM enriches each segment with technique labels, topic tags, conversational turn phases, and hook identifiers. Core knowledge extraction stage.",
  },
  {
    id: "08",
    number: "08",
    name: "taxonomy-validation",
    category: "det",
    description: "Validates concepts against known taxonomy",
    tool: "Python (deterministic)",
    outputs: ["validation report"],
    details: "Hard gate: validates all technique/topic labels from 07 against the known taxonomy. Exits with code 1 on any unknown concept.",
    gateInfo: "HARD GATE: exit 1 on unknown taxonomy concept",
  },
  {
    id: "09",
    number: "09",
    name: "chunk-embed",
    category: "ts",
    description: "Chunks + embeds content for RAG",
    tool: "Ollama embeddings",
    outputs: [".chunks.json", ".chunk_state.json"],
    details: "Splits enriched content into overlapping chunks and generates vector embeddings using local Ollama models for RAG retrieval.",
  },
  {
    id: "10",
    number: "10",
    name: "ingest",
    category: "ts",
    description: "Ingests chunks into Supabase pgvector",
    tool: "Supabase pgvector",
    outputs: ["DB rows in pgvector"],
    details: "Uploads chunk embeddings and metadata into Supabase pgvector tables for production vector similarity search.",
  },
  {
    id: "11",
    number: "11",
    name: "retrieval-smoke",
    category: "ts",
    description: "Smoke-tests vector retrieval end-to-end",
    tool: "Supabase pgvector queries",
    outputs: ["smoke test report"],
    details: "Runs a suite of representative queries against the vector store and validates result relevance, latency, and completeness.",
  },
]

const flags: FlagEntry[] = [
  { flag: ".flagged.json (CRITICAL/WARNING)", createdBy: "02", consumedBy: "03, 04, 05", purpose: "Skip unusable transcripts" },
  { flag: ".video_type_state.json", createdBy: "06", consumedBy: "06", purpose: "Resume state" },
  { flag: ".06b_verify_state.json", createdBy: "06b", consumedBy: "06b", purpose: "Resume state" },
  { flag: ".06c_patch_state.json", createdBy: "06c", consumedBy: "06c", purpose: "Resume state" },
  { flag: "quarantine/<sub-id>.json", createdBy: "quarantine_updater.py", consumedBy: "07, 09", purpose: "Block REJECT/failed videos" },
  { flag: "waivers/<sub-id>.json", createdBy: "Manual", consumedBy: "validate_manifest.py", purpose: "Override specific checks" },
  { flag: "<batch>.status.json", createdBy: "sub-batch-pipeline", consumedBy: "orchestrator", purpose: "Track batch status" },
  { flag: ".chunk_state.json", createdBy: "09", consumedBy: "09", purpose: "Track processed chunks" },
  { flag: "patch_metadata", createdBy: "06c", consumedBy: "downstream", purpose: "Track applied fixes" },
]

const validationGates: ValidationGate[] = [
  { afterStage: "02", condition: "CRITICAL flag in .flagged.json", action: "Skip stages 03, 04, 05", severity: "critical" },
  { afterStage: "06b", condition: "Verdict = REJECT", action: "Quarantine video, skip downstream", severity: "critical" },
  { afterStage: "07", condition: "Cross-stage validation (06c vs 07)", action: "Flag inconsistencies for review", severity: "warning" },
  { afterStage: "08", condition: "Unknown taxonomy concept detected", action: "Hard fail (exit 1)", severity: "error" },
  { afterStage: "09", condition: "Chunk integrity validation", action: "Block ingest on malformed chunks", severity: "error" },
]

const pipelineConfig = {
  quarantine_level: "error",
  allow_review_ingest: false,
  max_warning_checks: 3,
  perTypeLimits: {
    transcript_artifact: 1,
    evidence_mismatch: 0,
  },
}

// Gate positions: which stages have a gate AFTER them
const gateAfterStages = new Set(["02", "06b", "07", "08", "09"])

// ─── Components ──────────────────────────────────────────────────────────

function Legend() {
  return (
    <div className="flex flex-wrap gap-4 rounded-lg border border-border bg-card/50 px-4 py-3">
      {(Object.entries(categoryConfig) as [StageCategory, typeof categoryConfig.ext][]).map(([key, cfg]) => (
        <div key={key} className="flex items-center gap-2">
          <div className={`size-3 rounded-full ${cfg.dotColor}`} />
          <span className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</span>
        </div>
      ))}
      <div className="flex items-center gap-2 ml-4">
        <OctagonX className="size-3.5 text-red-400" />
        <span className="text-sm font-medium text-red-400">Validation Gate</span>
      </div>
    </div>
  )
}

function StageCard({ stage, isExpanded, onToggle }: { stage: PipelineStage; isExpanded: boolean; onToggle: () => void }) {
  const cfg = categoryConfig[stage.category]
  const Icon = stageIcons[stage.number] || Brain

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={`w-full text-left rounded-lg border ${cfg.borderColor} ${cfg.bgColor} p-3 transition-all hover:brightness-110 cursor-pointer`}
      >
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 rounded-md p-1.5 ${cfg.badgeBg}`}>
            <Icon className="size-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono font-bold ${cfg.color}`}>{stage.number}</span>
              <span className="text-sm font-semibold text-foreground">{stage.name}</span>
              {isExpanded ? (
                <ChevronDown className="size-3.5 text-muted-foreground ml-auto shrink-0" />
              ) : (
                <ChevronRight className="size-3.5 text-muted-foreground ml-auto shrink-0" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{stage.description}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${cfg.badgeBg}`}>{stage.tool}</span>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
            <p className="text-xs text-muted-foreground leading-relaxed">{stage.details}</p>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Outputs:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {stage.outputs.map((o) => (
                  <span key={o} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-foreground/5 text-foreground/70 border border-border/50">
                    {o}
                  </span>
                ))}
              </div>
            </div>
            {stage.gateInfo && (
              <div className="flex items-center gap-1.5 mt-1">
                <AlertTriangle className="size-3 text-amber-400 shrink-0" />
                <span className="text-[10px] text-amber-400 font-medium">{stage.gateInfo}</span>
              </div>
            )}
          </div>
        )}
      </button>
    </div>
  )
}

function GateLine({ gate }: { gate: ValidationGate }) {
  const severityColors = {
    critical: "border-red-500/70 bg-red-950/30 text-red-400",
    error: "border-red-500/50 bg-red-950/20 text-red-400",
    warning: "border-amber-500/50 bg-amber-950/20 text-amber-400",
  }

  const iconColors = {
    critical: "text-red-400",
    error: "text-red-400",
    warning: "text-amber-400",
  }

  return (
    <div className="relative my-1">
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px border-t-2 border-dashed border-red-500/40" />
      <div className={`relative mx-auto w-fit flex items-center gap-2 px-3 py-1 rounded-full border ${severityColors[gate.severity]} text-[10px] font-medium`}>
        <OctagonX className={`size-3 ${iconColors[gate.severity]}`} />
        <span>{gate.condition}</span>
        <span className="opacity-60">-&gt;</span>
        <span className="font-semibold">{gate.action}</span>
      </div>
    </div>
  )
}

function ConnectorArrow() {
  return (
    <div className="flex justify-center py-0.5">
      <div className="flex flex-col items-center">
        <div className="w-px h-3 bg-border" />
        <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-border" />
      </div>
    </div>
  )
}

function ParallelBranch({ stages: branchStages, expandedStages, onToggle }: {
  stages: PipelineStage[]
  expandedStages: Set<string>
  onToggle: (id: string) => void
}) {
  return (
    <div className="relative">
      {/* Bracket top */}
      <div className="flex justify-center py-0.5">
        <div className="flex items-end">
          <div className="w-16 h-3 border-l border-t border-border rounded-tl-md" />
          <div className="w-px h-3 bg-border" />
          <div className="w-16 h-3 border-r border-t border-border rounded-tr-md" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {branchStages.map((stage) => (
          <StageCard
            key={stage.id}
            stage={stage}
            isExpanded={expandedStages.has(stage.id)}
            onToggle={() => onToggle(stage.id)}
          />
        ))}
      </div>

      {/* Bracket bottom */}
      <div className="flex justify-center py-0.5">
        <div className="flex items-start">
          <div className="w-16 h-3 border-l border-b border-border rounded-bl-md" />
          <div className="w-px h-3 bg-border" />
          <div className="w-16 h-3 border-r border-b border-border rounded-br-md" />
        </div>
      </div>
    </div>
  )
}

function PipelineFlow() {
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set())

  function toggleStage(id: string) {
    setExpandedStages((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Group parallel stages 03/04/05
  const parallelStages = stages.filter((s) => ["03", "04", "05"].includes(s.id))
  const beforeParallel = stages.filter((s) => ["01", "02"].includes(s.id))
  const afterParallel = stages.filter(
    (s) => !["01", "02", "03", "04", "05"].includes(s.id)
  )

  const gateMap = new Map(validationGates.map((g) => [g.afterStage, g]))

  function renderStageWithGate(stage: PipelineStage, index: number, arr: PipelineStage[]) {
    const gate = gateMap.get(stage.id)
    const isLast = index === arr.length - 1
    return (
      <div key={stage.id}>
        <StageCard
          stage={stage}
          isExpanded={expandedStages.has(stage.id)}
          onToggle={() => toggleStage(stage.id)}
        />
        {gate && <GateLine gate={gate} />}
        {!isLast && !gate && <ConnectorArrow />}
        {gate && !isLast && <ConnectorArrow />}
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-0">
      {/* Before parallel */}
      {beforeParallel.map((stage, i) => {
        const gate = gateMap.get(stage.id)
        return (
          <div key={stage.id}>
            <StageCard
              stage={stage}
              isExpanded={expandedStages.has(stage.id)}
              onToggle={() => toggleStage(stage.id)}
            />
            {gate && <GateLine gate={gate} />}
            <ConnectorArrow />
          </div>
        )
      })}

      {/* Parallel branch */}
      <ParallelBranch
        stages={parallelStages}
        expandedStages={expandedStages}
        onToggle={toggleStage}
      />
      <ConnectorArrow />

      {/* After parallel */}
      {afterParallel.map((stage, i, arr) => renderStageWithGate(stage, i, arr))}
    </div>
  )
}

function FlagsTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Flag</th>
            <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Created By</th>
            <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Consumed By</th>
            <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Purpose</th>
          </tr>
        </thead>
        <tbody>
          {flags.map((f, i) => (
            <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
              <td className="py-2 px-3 font-mono text-xs text-foreground/80">{f.flag}</td>
              <td className="py-2 px-3 font-mono text-xs text-muted-foreground">{f.createdBy}</td>
              <td className="py-2 px-3 font-mono text-xs text-muted-foreground">{f.consumedBy}</td>
              <td className="py-2 px-3 text-xs text-muted-foreground">{f.purpose}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ValidationGatesSection() {
  return (
    <div className="space-y-3">
      {validationGates.map((gate, i) => {
        const severityColors = {
          critical: "border-l-red-500 bg-red-950/20",
          error: "border-l-orange-500 bg-orange-950/20",
          warning: "border-l-amber-500 bg-amber-950/20",
        }
        const severityBadge = {
          critical: "bg-red-900/60 text-red-300",
          error: "bg-orange-900/60 text-orange-300",
          warning: "bg-amber-900/60 text-amber-300",
        }
        return (
          <div
            key={i}
            className={`border-l-4 ${severityColors[gate.severity]} rounded-r-lg p-3 flex items-start gap-3`}
          >
            <div className="shrink-0 mt-0.5">
              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${severityBadge[gate.severity]}`}>
                {gate.severity}
              </span>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground">
                After stage <span className="font-mono font-bold">{gate.afterStage}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                <span className="font-medium">If:</span> {gate.condition}
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Then:</span> {gate.action}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function PipelineConfigSection() {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-4">
      <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Info className="size-4 text-muted-foreground" />
        Pipeline Configuration
      </h4>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md bg-muted/20 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">quarantine_level</div>
          <div className="text-sm font-mono font-medium text-foreground">{pipelineConfig.quarantine_level}</div>
        </div>
        <div className="rounded-md bg-muted/20 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">allow_review_ingest</div>
          <div className="text-sm font-mono font-medium text-foreground">{String(pipelineConfig.allow_review_ingest)}</div>
        </div>
        <div className="rounded-md bg-muted/20 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">max_warning_checks</div>
          <div className="text-sm font-mono font-medium text-foreground">{pipelineConfig.max_warning_checks}</div>
        </div>
        <div className="rounded-md bg-muted/20 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Per-type limits</div>
          <div className="text-xs font-mono text-foreground mt-0.5 space-y-0.5">
            <div>transcript_artifact: {pipelineConfig.perTypeLimits.transcript_artifact}</div>
            <div>evidence_mismatch: {pipelineConfig.perTypeLimits.evidence_mismatch}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Optimized Pipeline (Debate Consensus) ──────────────────────────────

type OptCategory = "merge" | "new" | "optimize" | "infrastructure"
type RiskLevel = "low" | "medium"

interface Optimization {
  id: string
  title: string
  category: OptCategory
  current: string
  proposed: string
  impact: string
  risk: RiskLevel
  rationale: string
}

interface OptStage {
  id: string
  number: string
  name: string
  category: StageCategory
  description: string
  badge?: "merged" | "new" | "modified"
  badgeDetail?: string
}

const optCategoryConfig: Record<OptCategory, { label: string; color: string; badgeBg: string }> = {
  merge: { label: "MERGE", color: "text-cyan-400", badgeBg: "bg-cyan-900/60 text-cyan-300" },
  new: { label: "NEW", color: "text-emerald-400", badgeBg: "bg-emerald-900/60 text-emerald-300" },
  optimize: { label: "OPTIMIZE", color: "text-purple-400", badgeBg: "bg-purple-900/60 text-purple-300" },
  infrastructure: { label: "INFRASTRUCTURE", color: "text-amber-400", badgeBg: "bg-amber-900/60 text-amber-300" },
}

const riskColors: Record<RiskLevel, string> = {
  low: "bg-emerald-900/50 text-emerald-300 border-emerald-700/50",
  medium: "bg-amber-900/50 text-amber-300 border-amber-700/50",
}

const optimizations: Optimization[] = [
  {
    id: "R1",
    title: "Batch 06g Seeds (5-10 per prompt)",
    category: "optimize",
    current: "2,564 individual LLM calls across 59 files (some videos need 500+ calls)",
    proposed: "Group adjacent seeds by conversation, batch 5-10 per prompt",
    impact: "~80% reduction in 06g LLM calls (~256-512 calls instead of 2,564)",
    risk: "low",
    rationale: "Highest-impact single optimization. Adjacent damage seeds within the same conversation share context, making batched adjudication natural and more consistent. Reduces both cost and latency dramatically.",
  },
  {
    id: "R2",
    title: "Skip 06g for Non-Infield Videos",
    category: "optimize",
    current: "06g runs on all video types including lectures and podcasts",
    proposed: "Non-infield videos (lectures, podcasts) have no conversations to adjudicate — skip 06g entirely",
    impact: "Eliminates 06g entirely for ~30-40% of videos",
    risk: "low",
    rationale: "06g adjudicates damaged conversation segments. Non-infield videos have no multi-speaker conversations, so there are no conversation seeds to adjudicate. Checking video_type from 06 output is trivial.",
  },
  {
    id: "R3",
    title: "Tiered Model for 06b Verification",
    category: "optimize",
    current: "06b always uses Opus/Sonnet for verification regardless of classification confidence",
    proposed: "06b ALWAYS runs (100% verification). Uses Haiku for videos where 06 confidence scores are all >0.85. Uses Opus/Sonnet for uncertain ones.",
    impact: "~10x cost reduction for easy verification cases",
    risk: "low",
    rationale: "High-confidence classifications from 06 rarely need full Opus reasoning to verify. Haiku can confirm obvious correct classifications at a fraction of the cost. Full Opus is reserved for genuinely uncertain cases where verification adds real value.",
  },
  {
    id: "R4",
    title: "Pipeline-Runner Subprocess Optimization",
    category: "infrastructure",
    current: "110 subprocess invocations for 10 videos (one per stage per video)",
    proposed: "Options: --videos flag (batch videos per stage), in-process DET stages, --stdin mode",
    impact: "Reduce subprocess overhead for fast DET stages",
    risk: "low",
    rationale: "DET stages often complete in <1s but each subprocess invocation adds Python startup, JSON loading, and IPC overhead. Batching multiple videos per invocation or running DET stages in-process eliminates this overhead.",
  },
  {
    id: "R5",
    title: 'Merge 06c + 06d into "06c.DET.patch-sanitize"',
    category: "merge",
    current: "Two separate DET stages: 06c (patch) reads/writes JSON, then 06d (sanitize) reads/writes again",
    proposed: "Single stage does patch then sanitize in memory. --debug flag outputs intermediate state. One I/O cycle instead of two.",
    impact: "-1 stage, -1 I/O cycle per video",
    risk: "low",
    rationale: "Both stages apply deterministic transforms to the same JSON file in sequence. Merging eliminates redundant parse/serialize and file I/O. Debug flag preserves ability to inspect intermediate patch state when needed.",
  },
  {
    id: "R6",
    title: 'Merge 06g + 06h into "06g.LLM.adjudicate-propagate"',
    category: "merge",
    current: "06g (LLM adjudication) writes results, then 06h (DET confidence propagation) reads and merges",
    proposed: "Merged stage does batched adjudication + confidence propagation. 06f (damage-map) kept separate as diagnostic artifact.",
    impact: "-1 stage, cleaner data flow",
    risk: "low",
    rationale: "06h is a thin deterministic wrapper that merges 06g output with upstream confidence data. Keeping it separate adds a stage boundary with no diagnostic value. 06f remains separate because the damage map is a useful artifact for debugging quality issues.",
  },
  {
    id: "R7",
    title: "Cross-Video Deduplication (NEW stage 09b.DET.cross-dedup)",
    category: "new",
    current: "ZERO cross-video dedup in pipeline. Only within-video teaser dedup exists in 06d.",
    proposed: "Compares chunk embeddings via cosine similarity across all videos in batch. Two-tier thresholds: Verbatim (>0.96 auto-mark), Semantic (>0.90 flag for review). Canonical selection using confidence scores from 06g. Marks duplicates with dedup_canonical_ref (no deletion, preserves provenance). Stage 10 ingests only canonical chunks. Supports --reference-index for cross-batch comparison.",
    impact: "Eliminate duplicate content from vector store",
    risk: "medium",
    rationale: "Content creators frequently repeat advice across videos. Without cross-video dedup, the vector store contains redundant chunks that dilute retrieval quality. Two-tier thresholds allow safe auto-dedup for near-verbatim copies while flagging semantic duplicates for human review. No data is deleted — provenance is preserved via canonical references.",
  },
]

const optimizedStages: OptStage[] = [
  { id: "opt-01", number: "01", name: "download", category: "ext", description: "Downloads YouTube audio" },
  { id: "opt-02", number: "02", name: "transcribe", category: "ext", description: "Transcribes audio to word-timestamped JSON" },
  { id: "opt-03", number: "03", name: "align", category: "ext", description: "Forced alignment to sentence boundaries" },
  { id: "opt-04", number: "04", name: "diarize", category: "ext", description: "Speaker diarization" },
  { id: "opt-05", number: "05", name: "audio-features", category: "ext", description: "Audio features (pitch, energy, tempo)" },
  { id: "opt-06", number: "06", name: "video-type", category: "llm", description: "Classifies video type, speaker roles, boundaries" },
  { id: "opt-06b", number: "06b", name: "verify", category: "llm", description: "Independent verification (tiered: Haiku/Opus)", badge: "modified", badgeDetail: "Tiered model" },
  { id: "opt-06c", number: "06c", name: "patch-sanitize", category: "det", description: "Auto-patch + teaser/mixed-mode sanitization", badge: "merged", badgeDetail: "06c + 06d" },
  { id: "opt-06e", number: "06e", name: "quality-check", category: "llm", description: "ASR quality assessment" },
  { id: "opt-06f", number: "06f", name: "damage-map", category: "det", description: "Builds damage map with contamination windows" },
  { id: "opt-06g", number: "06g", name: "adjudicate-propagate", category: "llm", description: "Batched adjudication + confidence propagation (skip for non-infield)", badge: "merged", badgeDetail: "06g + 06h" },
  { id: "opt-07", number: "07", name: "content", category: "llm", description: "Content enrichment: techniques, topics, turn phases" },
  { id: "opt-08", number: "08", name: "taxonomy-validation", category: "det", description: "Validates concepts against known taxonomy" },
  { id: "opt-09", number: "09", name: "chunk-embed", category: "ts", description: "Chunks + embeds content for RAG" },
  { id: "opt-09b", number: "09b", name: "cross-dedup", category: "det", description: "Cross-video semantic deduplication", badge: "new", badgeDetail: "NEW" },
  { id: "opt-10", number: "10", name: "ingest", category: "ts", description: "Ingests canonical chunks into Supabase pgvector" },
  { id: "opt-11", number: "11", name: "retrieval-smoke", category: "ts", description: "Smoke-tests vector retrieval end-to-end" },
]

const optimizedFlags: FlagEntry[] = [
  { flag: ".flagged.json (CRITICAL/WARNING)", createdBy: "02", consumedBy: "03, 04, 05", purpose: "Skip unusable transcripts" },
  { flag: ".video_type_state.json", createdBy: "06", consumedBy: "06", purpose: "Resume state" },
  { flag: ".06b_verify_state.json", createdBy: "06b", consumedBy: "06b", purpose: "Resume state" },
  { flag: ".06c_patch_sanitize_state.json", createdBy: "06c", consumedBy: "06c", purpose: "Resume state (merged)" },
  { flag: "quarantine/<sub-id>.json", createdBy: "quarantine_updater.py", consumedBy: "07, 09", purpose: "Block REJECT/failed videos" },
  { flag: "waivers/<sub-id>.json", createdBy: "Manual", consumedBy: "validate_manifest.py", purpose: "Override specific checks" },
  { flag: "<batch>.status.json", createdBy: "sub-batch-pipeline", consumedBy: "orchestrator", purpose: "Track batch status" },
  { flag: ".chunk_state.json", createdBy: "09", consumedBy: "09", purpose: "Track processed chunks" },
  { flag: "patch_metadata + sanitize_report", createdBy: "06c", consumedBy: "downstream", purpose: "Track applied fixes (merged)" },
  { flag: "dedup_canonical_ref", createdBy: "09b", consumedBy: "10", purpose: "Canonical chunk selection" },
  { flag: ".dedup_report.json", createdBy: "09b", consumedBy: "audit", purpose: "Cross-video dedup results" },
]

const optimizedGates: ValidationGate[] = [
  { afterStage: "02", condition: "CRITICAL flag in .flagged.json", action: "Skip stages 03, 04, 05", severity: "critical" },
  { afterStage: "06b", condition: "Verdict = REJECT", action: "Quarantine video, skip downstream", severity: "critical" },
  { afterStage: "07", condition: "Cross-stage validation (06c vs 07)", action: "Flag inconsistencies for review", severity: "warning" },
  { afterStage: "08", condition: "Unknown taxonomy concept detected", action: "Hard fail (exit 1)", severity: "error" },
  { afterStage: "09b", condition: "Chunk integrity + dedup report", action: "Block ingest on malformed/unresolved chunks", severity: "error" },
]

function OptStageCard({ stage, isExpanded, onToggle }: { stage: OptStage; isExpanded: boolean; onToggle: () => void }) {
  const cfg = categoryConfig[stage.category]
  const Icon = stageIcons[stage.number] || Brain

  const badgeStyles: Record<string, string> = {
    merged: "bg-cyan-900/60 text-cyan-300 border-cyan-600/50",
    new: "bg-emerald-900/60 text-emerald-300 border-emerald-600/50",
    modified: "bg-purple-900/60 text-purple-300 border-purple-600/50",
  }

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={`w-full text-left rounded-lg border-2 ${stage.badge ? "border-dashed" : ""} ${
          stage.badge === "merged" ? "border-cyan-500/60" : stage.badge === "new" ? "border-emerald-500/60" : stage.badge === "modified" ? "border-purple-500/60" : cfg.borderColor
        } ${cfg.bgColor} p-3 transition-all hover:brightness-110 cursor-pointer`}
      >
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 rounded-md p-1.5 ${cfg.badgeBg}`}>
            <Icon className="size-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono font-bold ${cfg.color}`}>{stage.number}</span>
              <span className="text-sm font-semibold text-foreground">{stage.name}</span>
              {stage.badge && (
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${badgeStyles[stage.badge]}`}>
                  {stage.badgeDetail}
                </span>
              )}
              {isExpanded ? (
                <ChevronDown className="size-3.5 text-muted-foreground ml-auto shrink-0" />
              ) : (
                <ChevronRight className="size-3.5 text-muted-foreground ml-auto shrink-0" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{stage.description}</p>
          </div>
        </div>
      </button>
    </div>
  )
}

function OptimizedPipelineFlow() {
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set())

  function toggleStage(id: string) {
    setExpandedStages((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const parallelStages = optimizedStages.filter((s) => ["03", "04", "05"].includes(s.number))
  const beforeParallel = optimizedStages.filter((s) => ["01", "02"].includes(s.number))
  const afterParallel = optimizedStages.filter(
    (s) => !["01", "02", "03", "04", "05"].includes(s.number)
  )

  const gateMap = new Map(optimizedGates.map((g) => [g.afterStage, g]))

  return (
    <div className="max-w-lg mx-auto space-y-0">
      {beforeParallel.map((stage) => {
        const gate = gateMap.get(stage.number)
        return (
          <div key={stage.id}>
            <OptStageCard
              stage={stage}
              isExpanded={expandedStages.has(stage.id)}
              onToggle={() => toggleStage(stage.id)}
            />
            {gate && <GateLine gate={gate} />}
            <ConnectorArrow />
          </div>
        )
      })}

      <ParallelBranch
        stages={parallelStages.map((s) => ({
          id: s.id,
          number: s.number,
          name: s.name,
          category: s.category,
          description: s.description,
          tool: "",
          outputs: [],
          details: "",
        }))}
        expandedStages={expandedStages}
        onToggle={toggleStage}
      />
      <ConnectorArrow />

      {afterParallel.map((stage, i, arr) => {
        const gate = gateMap.get(stage.number)
        const isLast = i === arr.length - 1
        return (
          <div key={stage.id}>
            <OptStageCard
              stage={stage}
              isExpanded={expandedStages.has(stage.id)}
              onToggle={() => toggleStage(stage.id)}
            />
            {gate && <GateLine gate={gate} />}
            {!isLast && <ConnectorArrow />}
          </div>
        )
      })}
    </div>
  )
}

function OptimizationCard({ opt, isExpanded, onToggle }: { opt: Optimization; isExpanded: boolean; onToggle: () => void }) {
  const catCfg = optCategoryConfig[opt.category]

  return (
    <div className="rounded-lg border border-border/70 bg-card/30 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full text-left p-4 transition-all hover:bg-muted/10 cursor-pointer"
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold text-muted-foreground">{opt.id}</span>
              <span className="text-sm font-semibold text-foreground">{opt.title}</span>
              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${catCfg.badgeBg}`}>
                {catCfg.label}
              </span>
              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${riskColors[opt.risk]}`}>
                {opt.risk} risk
              </span>
              {isExpanded ? (
                <ChevronDown className="size-3.5 text-muted-foreground ml-auto shrink-0" />
              ) : (
                <ChevronRight className="size-3.5 text-muted-foreground ml-auto shrink-0" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{opt.impact}</p>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-md bg-red-950/20 border border-red-800/30 p-3">
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-red-400 mb-1">Current</h4>
              <p className="text-xs text-foreground/80 leading-relaxed">{opt.current}</p>
            </div>
            <div className="rounded-md bg-emerald-950/20 border border-emerald-800/30 p-3">
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 mb-1">Proposed</h4>
              <p className="text-xs text-foreground/80 leading-relaxed">{opt.proposed}</p>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Rationale</h4>
            <p className="text-xs text-foreground/80 leading-relaxed">{opt.rationale}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function OptimizedFlagsTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Flag</th>
            <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Created By</th>
            <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Consumed By</th>
            <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Purpose</th>
          </tr>
        </thead>
        <tbody>
          {optimizedFlags.map((f, i) => (
            <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
              <td className="py-2 px-3 font-mono text-xs text-foreground/80">{f.flag}</td>
              <td className="py-2 px-3 font-mono text-xs text-muted-foreground">{f.createdBy}</td>
              <td className="py-2 px-3 font-mono text-xs text-muted-foreground">{f.consumedBy}</td>
              <td className="py-2 px-3 text-xs text-muted-foreground">{f.purpose}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function OptimizedGatesSection() {
  return (
    <div className="space-y-3">
      {optimizedGates.map((gate, i) => {
        const severityColors = {
          critical: "border-l-red-500 bg-red-950/20",
          error: "border-l-orange-500 bg-orange-950/20",
          warning: "border-l-amber-500 bg-amber-950/20",
        }
        const severityBadge = {
          critical: "bg-red-900/60 text-red-300",
          error: "bg-orange-900/60 text-orange-300",
          warning: "bg-amber-900/60 text-amber-300",
        }
        return (
          <div
            key={i}
            className={`border-l-4 ${severityColors[gate.severity]} rounded-r-lg p-3 flex items-start gap-3`}
          >
            <div className="shrink-0 mt-0.5">
              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${severityBadge[gate.severity]}`}>
                {gate.severity}
              </span>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground">
                After stage <span className="font-mono font-bold">{gate.afterStage}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                <span className="font-medium">If:</span> {gate.condition}
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Then:</span> {gate.action}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function OptimizedPipelineSection() {
  const [optTab, setOptTab] = useState<"flow" | "flags" | "gates" | "optimizations">("flow")
  const [expandedOpts, setExpandedOpts] = useState<Set<string>>(new Set())

  function toggleOpt(id: string) {
    setExpandedOpts((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <section className="mt-16">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-xl font-bold text-foreground">Optimized Pipeline (Proposed)</h2>
          <span className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-amber-900/50 text-amber-300 border border-amber-700/50">
            PROPOSED
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          17-stage optimized pipeline based on advocate debate consensus. 7 optimizations: 2 merges, 1 new stage,
          3 behavioral optimizations, 1 infrastructure improvement. All quality signals and validation gates preserved.
        </p>
      </div>

      {/* Optimized Legend with merge/new indicators */}
      <div className="flex flex-wrap gap-4 rounded-lg border border-border bg-card/50 px-4 py-3 mb-6">
        {(Object.entries(categoryConfig) as [StageCategory, typeof categoryConfig.ext][]).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-2">
            <div className={`size-3 rounded-full ${cfg.dotColor}`} />
            <span className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border">
          <div className="size-3 rounded border-2 border-dashed border-cyan-500/60" />
          <span className="text-sm font-medium text-cyan-400">Merged</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-3 rounded border-2 border-dashed border-emerald-500/60" />
          <span className="text-sm font-medium text-emerald-400">New</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-3 rounded border-2 border-dashed border-purple-500/60" />
          <span className="text-sm font-medium text-purple-400">Modified</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 rounded-lg bg-muted/30 p-1 mb-8 w-fit">
        {(
          [
            { key: "flow", label: "Pipeline Flow" },
            { key: "flags", label: "Flags & State" },
            { key: "gates", label: "Validation Gates" },
            { key: "optimizations", label: "7 Optimizations" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setOptTab(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              optTab === tab.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Flow tab */}
      {optTab === "flow" && <OptimizedPipelineFlow />}

      {/* Flags tab */}
      {optTab === "flags" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-foreground mb-3">Optimized Flags & State Files</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Updated flags reflecting merged stage names and new dedup-related entries.
            </p>
            <div className="rounded-lg border border-border bg-card/50 overflow-hidden">
              <OptimizedFlagsTable />
            </div>
          </div>
        </div>
      )}

      {/* Gates tab */}
      {optTab === "gates" && (
        <div>
          <h3 className="text-lg font-bold text-foreground mb-3">Optimized Validation Gates</h3>
          <p className="text-sm text-muted-foreground mb-4">
            All gates preserved. Chunk integrity gate repositioned after 09b (cross-dedup) instead of after 09.
          </p>
          <div className="max-w-2xl">
            <OptimizedGatesSection />
          </div>
        </div>
      )}

      {/* Optimizations tab */}
      {optTab === "optimizations" && (
        <div className="space-y-3">
          {optimizations.map((opt) => (
            <OptimizationCard
              key={opt.id}
              opt={opt}
              isExpanded={expandedOpts.has(opt.id)}
              onToggle={() => toggleOpt(opt.id)}
            />
          ))}
        </div>
      )}

      {/* Impact Summary */}
      <div className="mt-8 rounded-lg border border-border/50 bg-card/30 p-5">
        <h3 className="text-sm font-bold text-foreground mb-3">Impact Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-md bg-muted/20 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Stage Count</div>
            <div className="text-sm font-mono font-medium text-foreground">
              <span className="text-red-400 line-through">18</span>
              <span className="mx-1 text-muted-foreground">{"->"}</span>
              <span className="text-emerald-400">17</span>
            </div>
          </div>
          <div className="rounded-md bg-muted/20 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">06g LLM Calls</div>
            <div className="text-sm font-mono font-medium text-foreground">
              <span className="text-red-400">~2,564</span>
              <span className="mx-1 text-muted-foreground">{"->"}</span>
              <span className="text-emerald-400">~256-512</span>
            </div>
          </div>
          <div className="rounded-md bg-muted/20 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">06b Easy Cases</div>
            <div className="text-sm font-mono font-medium text-foreground">
              <span className="text-emerald-400">~10x cheaper</span>
            </div>
          </div>
          <div className="rounded-md bg-muted/20 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Quality Signals</div>
            <div className="text-sm font-mono font-medium text-emerald-400">All preserved</div>
          </div>
        </div>
        <div className="mt-3 text-xs text-muted-foreground space-y-1">
          <div><span className="font-medium">Non-infield 06g:</span> Eliminated entirely (~30-40% of videos)</div>
          <div><span className="font-medium">Validation gates:</span> All 5 preserved (1 repositioned from after 09 to after 09b)</div>
          <div><span className="font-medium">New capability:</span> Cross-video semantic deduplication (09b)</div>
        </div>
      </div>

      {/* Debate Process Note */}
      <div className="mt-4 rounded-lg border border-border/30 bg-muted/10 px-4 py-3">
        <div className="flex items-start gap-2">
          <Info className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-medium">Debate process:</span> Alpha initially claimed 06g produced zero output.
            Beta caught this with comprehensive data analysis (2,564 actual seeds, 24 repairs, 229 anchors).
            Alpha corrected and adopted Beta{"'"}s counter-proposals. Final consensus reflects contributions from both advocates.
          </p>
        </div>
      </div>
    </section>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────

export default function PipelineTestPage() {
  const [activeTab, setActiveTab] = useState<"flow" | "flags" | "gates">("flow")

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-8 py-12">
        {/* Header */}
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href="/test">
            <ArrowLeft className="size-4 mr-2" />
            Back to Test Pages
          </Link>
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Training Data Pipeline</h1>
          <p className="text-muted-foreground mt-2">
            18-stage pipeline for processing YouTube content into vector-embedded training data.
            Click any stage to expand details.
          </p>
        </div>

        {/* Legend */}
        <div className="mb-8">
          <Legend />
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 rounded-lg bg-muted/30 p-1 mb-8 w-fit">
          {(
            [
              { key: "flow", label: "Pipeline Flow" },
              { key: "flags", label: "Flags & State" },
              { key: "gates", label: "Validation Gates" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                activeTab === tab.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === "flow" && (
          <section>
            <PipelineFlow />
          </section>
        )}

        {activeTab === "flags" && (
          <section className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4">Flags & State Files</h2>
              <p className="text-sm text-muted-foreground mb-4">
                State files and flags that control pipeline flow, enable resumability, and enforce quality gates.
              </p>
              <div className="rounded-lg border border-border bg-card/50 overflow-hidden">
                <FlagsTable />
              </div>
            </div>

            <PipelineConfigSection />
          </section>
        )}

        {activeTab === "gates" && (
          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">Validation Gates</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Hard and soft gates that block, quarantine, or flag content at critical pipeline boundaries.
            </p>
            <div className="max-w-2xl">
              <ValidationGatesSection />
            </div>
          </section>
        )}

        {/* Section 3: Optimized Pipeline Proposals */}
        <OptimizedPipelineSection />
      </div>
    </div>
  )
}
