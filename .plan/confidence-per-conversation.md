# Plan: Per-Conversation/Segment Confidence Scoring for RAG

## Problem

RAG retrieval can't distinguish high-quality vs problematic conversations. Quality signals exist throughout pipeline (Stage 06+) but aren't used at retrieval time.

**Current state**: `relevanceScore` = vector similarity only. Ignores:
- Transcript quality (1-100 from Stage 06)
- Speaker diarization confidence (0-1)
- Collapsed speaker detection
- Interaction completeness (phase progression)
- Investment level (target engagement)
- Verification verdict (APPROVE/FLAG/REJECT)
- Transcript artifacts (ASR errors)

---

## Approach: Quality Score per Chunk

Compute `qualityScore` (0-1) at **Stage 09 chunking time**, store in metadata, use at **retrieval time** for reranking.

### Quality Score Formula

```
qualityScore =
  0.25 × transcriptQuality +    // Stage 06: 1-100 → 0-1
  0.25 × diarizationQuality +   // Stage 06: speaker confidence, collapse detection
  0.20 × enrichmentQuality +    // Stage 07: taxonomy coverage, unlisted concepts
  0.15 × interactionComplete +  // Stage 07: phase progression, investment
  0.15 × verificationWeight     // Stage 06b: APPROVE/FLAG/REJECT
```

### Input Signals (Already Generated)

| Signal | Source | Current Location | Used in RAG? |
|--------|--------|------------------|--------------|
| `transcript_confidence` (1-100) | Stage 06 | `.conversations.json` | ❌ |
| `speaker_confidence` (0-1) | Stage 06 | per-speaker in `.conversations.json` | ❌ |
| `speaker_collapse.detected` | Stage 06 | `.conversations.json` | ❌ |
| `problematicReason[]` | Stage 09 | chunk metadata | ❌ stored but ignored |
| `phase` | Stage 07 | enriched conversations | ❌ |
| `investment_level` | Stage 07 | enriched conversations | ❌ |
| `verification_verdict` | Stage 06b | `.verification.json` | ❌ |
| `unlisted_concepts` | Stage 07 | enriched conversations | ❌ |
| `transcript_artifacts` | Stage 07 | enriched conversations | ❌ |

---

## Implementation Steps

### Phase 1: Flow Quality Signals to Stage 09 (Chunking)

**File**: `scripts/training-data/09.chunk-embed.ts`

1. **Load Stage 06 quality data** alongside enriched files:
   - `transcript_confidence` from video-level metadata
   - `speaker_labels` with per-speaker confidence
   - `speaker_collapse` detection metadata

2. **Load Stage 06b verification** (if exists):
   - `verification_verdict`: APPROVE/FLAG/REJECT
   - Skip REJECT videos entirely

3. **Compute per-chunk qualityScore**:
   ```typescript
   function computeQualityScore(chunk, videoMeta, speakerMeta, verification): number {
     const transcriptQ = mapTranscriptConfidence(videoMeta.transcript_confidence)
     const diarizationQ = computeDiarizationQuality(chunk, speakerMeta)
     const enrichmentQ = computeEnrichmentQuality(chunk)
     const completenessQ = computeInteractionCompleteness(chunk)
     const verificationQ = mapVerificationVerdict(verification)

     return 0.25*transcriptQ + 0.25*diarizationQ + 0.20*enrichmentQ
            + 0.15*completenessQ + 0.15*verificationQ
   }
   ```

4. **Store in chunk metadata**:
   ```typescript
   metadata: {
     ...existingFields,
     qualityScore: 0.85,
     transcriptConfidence: 92,
     diarizationQuality: "high" | "medium" | "low",
     verificationVerdict: "APPROVE" | "FLAG" | null,
     problematicReasons: ["speaker_role:unknown"],
   }
   ```

### Phase 2: Update Embedding Schema

**File**: `scripts/training-data/schemas/chunks.schema.json` (create or update)

```json
{
  "metadata": {
    "qualityScore": { "type": "number", "minimum": 0, "maximum": 1 },
    "transcriptConfidence": { "type": "integer", "minimum": 1, "maximum": 100 },
    "diarizationQuality": { "enum": ["high", "medium", "low"] },
    "verificationVerdict": { "enum": ["APPROVE", "FLAG", null] },
    "problematicReasons": { "type": "array", "items": { "type": "string" } }
  }
}
```

### Phase 3: Update RAG Retrieval

**File**: `src/qa/retrieval.ts`

1. **Modify reranking** to weight by qualityScore:
   ```typescript
   // Current reranking (line ~180)
   const score = 0.85 * match.similarity + 0.15 * tokenOverlap + bonuses

   // New reranking
   const qualityWeight = match.metadata?.qualityScore ?? 0.8
   const baseScore = 0.85 * match.similarity + 0.15 * tokenOverlap + bonuses
   const score = baseScore * (0.7 + 0.3 * qualityWeight)  // quality affects 30% of score
   ```

2. **Filter REJECT verdict chunks** before reranking:
   ```typescript
   const validChunks = candidates.filter(c =>
     c.metadata?.verificationVerdict !== "REJECT"
   )
   ```

3. **Downrank problematic chunks**:
   ```typescript
   if (match.metadata?.problematicReasons?.length > 0) {
     score *= 0.85  // 15% penalty per problematic chunk
   }
   ```

### Phase 4: Update Confidence Scoring

**File**: `src/qa/confidence.ts`

1. **Add chunk quality factor** to confidence:
   ```typescript
   function computeConfidence(chunks, answer, policyViolations = []) {
     const chunkQuality = computeChunkQuality(chunks)        // NEW: 35% weight
     const retrievalStrength = computeRetrievalStrength(chunks) // 30% weight (was 50%)
     const sourceConsistency = computeSourceConsistency(chunks) // 20% weight (was 30%)
     const policyCompliance = computePolicyCompliance(violations) // 15% weight (was 20%)

     return 0.35 * chunkQuality + 0.30 * retrievalStrength
            + 0.20 * sourceConsistency + 0.15 * policyCompliance
   }

   function computeChunkQuality(chunks) {
     const scores = chunks.map(c => c.metadata?.qualityScore ?? 0.7)
     return mean(scores)
   }
   ```

### Phase 5: Per-Conversation Grouping (Optional Enhancement)

After phases 1-4, can group chunks by `conversationId` for conversation-level confidence:

```typescript
function computeConversationConfidence(chunks) {
  const grouped = groupBy(chunks, c => c.metadata?.conversationId)
  return Object.entries(grouped).map(([convId, convChunks]) => ({
    conversationId: convId,
    confidence: mean(convChunks.map(c => c.metadata?.qualityScore ?? 0.7)),
    phases: unique(convChunks.map(c => c.metadata?.phase)),
    isComplete: hasAllPhases(convChunks),
    investmentLevel: getHighestInvestment(convChunks)
  }))
}
```

---

## Quality Score Mappings

### Transcript Confidence (Stage 06 → qualityScore component)
| Stage 06 Score | Quality | Mapped Value |
|----------------|---------|--------------|
| 90-100 | Excellent | 1.0 |
| 70-89 | Good | 0.9 |
| 50-69 | Fair | 0.7 |
| 30-49 | Poor | 0.4 |
| 1-29 | Unusable | 0.0 (FILTER) |

### Diarization Quality
| Condition | Quality | Value |
|-----------|---------|-------|
| No issues | High | 1.0 |
| speaker_confidence < 0.7 | Medium | 0.7 |
| speaker_role:unknown | Medium | 0.6 |
| speaker_role:collapsed | Low | 0.5 |
| Multiple issues | Low | 0.4 |

### Verification Verdict
| Verdict | Value |
|---------|-------|
| APPROVE | 1.0 |
| null (not verified) | 0.85 |
| FLAG | 0.6 |
| REJECT | FILTER (don't embed) |

### Interaction Completeness
| Condition | Value |
|-----------|-------|
| COMMENTARY (teaching) | 1.0 |
| INTERACTION + close phase | 1.0 |
| INTERACTION + post_hook | 0.95 |
| INTERACTION + pre_hook only | 0.7 |
| INTERACTION + open only | 0.5 |

---

## Files to Modify

| File | Change |
|------|--------|
| `scripts/training-data/09.chunk-embed.ts` | Load Stage 06 data, compute qualityScore |
| `scripts/training-data/schemas/` | Add/update chunk metadata schema |
| `src/qa/retrieval.ts` | Weight reranking by qualityScore |
| `src/qa/confidence.ts` | Add chunkQuality factor |
| `src/qa/types.ts` | Update RetrievedChunk metadata types |

---

## Re-processing Required

After implementation:
1. Re-run Stage 09 on all sources (to compute qualityScore)
2. Re-run Stage 10 to re-ingest with new metadata
3. Existing embeddings without qualityScore: default to 0.8

---

## Testing Strategy

1. **Unit tests** for quality score computation:
   - mapTranscriptConfidence edge cases
   - computeDiarizationQuality with various problematicReasons
   - REJECT filtering

2. **Integration tests**:
   - End-to-end: Stage 09 → Stage 10 → retrieval
   - Verify qualityScore stored and retrieved

3. **RAG quality tests**:
   - Compare retrieval results before/after
   - Verify problematic chunks rank lower
   - Verify high-quality chunks rank higher

---

## Status: PENDING VERIFICATION

Awaiting user approval before implementation.
