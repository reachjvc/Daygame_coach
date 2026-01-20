# Better Training Data Over Time (Plan)

## Why This Plan Exists

We want the Q&A experience to:
- Retrieve the *right* transcript chunks (high precision, not “kind of related”).
- Use *infield* and *principles/theory* content differently (but together) to produce answers that are both **actionable** and **grounded**.
- Improve continuously as we add more data without regressing older behavior.

This document is a living plan for how to improve:
1) the data (quality + metadata + structure),  
2) retrieval (ranking + filtering + hybrid search), and  
3) answer synthesis (how principles + examples get combined).

---

## The Issue We Just Found (Concrete Incident)

**User question:** “What should I say when a girl says she studies medicine?”

**Observed behavior:** The answer cited unrelated sources (e.g. breakup breakdown, “creep her out” mistakes) rather than using the most direct “medicine” infield example.

**Manual verification:** The database *does* contain a highly relevant infield chunk that includes:
> “So you study medicine, yeah? … what area of medicine … Cardiology … Plastic Surgery …”

Example rows we found in Supabase `embeddings`:
- `SocialStoic/How To Safely Meet & Date Women In Bogotá Colombia + Travel Guide 🇨🇴.txt` (row ids: `5055`, `3496`, `6614`, `8433`, `11051`)

**Conclusion:** This is not primarily a “missing training data” issue. It’s a **retrieval/ranking** issue (and possibly a **data consistency/metadata** issue).

**Related contributing bug (already addressed in the UI):**
- The QA UI was hardcoding `minScore: 0.7`, which can easily filter out everything and produce “no data found” even when data exists.
- Fix: remove client-side forced `retrieval` overrides so backend defaults apply.

---

## Core Design Goal: Use Two Kinds of Data, Differently

We effectively have at least two content families:

1) **Infield / interaction data** (dialogue, lines, micro-calibration, “what to say next”)
   - Best for: scripts, phrasing, tone, calibration examples, sequencing.
   - Output expectation: give concrete lines + variations + when to use them.

2) **Principles / breakdown / theory data** (explanations, models, framing, common mistakes)
   - Best for: why something works, decision rules, constraints, “if/then” guidance.
   - Output expectation: summarize principles, then map them onto the user’s situation.

**Target behavior per answer:**
- Retrieve **both** kinds when relevant.
- Prefer infield for “what do I say/do” queries, but anchor it with 1–2 principle chunks.
- Prefer principle chunks for “why/how should I think about” queries, but illustrate with 1–2 infield examples.

This requires improvements to both **data labeling** and **retrieval policy**.

---

## Data Improvements (Make Retrieval Easier and More Reliable)

### 1) Standardize and Version Metadata (Non-negotiable)

Today, metadata appears inconsistent across rows (some rows don’t include keys like `coach`, `channel`, `segmentType`, etc.). That blocks filtering and makes debugging harder.

**Plan: enforce a required metadata schema for every chunk**, including:
- `schemaVersion` (integer)
- `channel` (folder / source group)
- `coach` (human-friendly coach name; may equal channel)
- `video_title`
- `source` (relative transcript path used as stable source ID)
- `chunkIndex`, `totalChunks`
- `contentType` (e.g. `infield`, `breakdown`, `theory`, `intro/outro`, `logistics`)
- `segmentType` (e.g. `INTERACTION`, `EXPLANATION`, `UNKNOWN`)
- `timestamps` (optional; start/end if available)
- `chunkHash` (sha256 of normalized text)
- `embeddingModel` + `chunkerVersion`

**Why it matters:** Without stable metadata, we can’t do type-aware retrieval, dedupe reliably, or analyze failures at scale.

### 2) Dedup + Unify Chunking Strategy

We likely have overlap-driven repetition and/or multiple chunking variants in the DB. This inflates noise and can crowd out the best match.

**Plan:**
- Compute and store `chunkHash` (normalized whitespace, lowercased optional) during ingest.
- Add dedupe policies:
  - Prevent exact duplicates for `(source, chunkHash, embeddingModel, chunkerVersion)`.
  - Prefer best-quality “canonical” chunks when duplicates exist.
- Decide on a single canonical chunker:
  - Sentence/turn-boundary chunking for coherence.
  - Dialogue-turn segmentation for infield when possible.
  - Smaller chunks for dialogue (higher precision), slightly larger for principles (higher context).

### 3) Improve Transcript Normalization

Embeddings degrade when chunks include lots of non-signal content (intro/outro, promotions, travel context around a key line, transcription artifacts).

**Plan:**
- Remove/mark common “non-content” sections: sponsor plugs, CTA, housekeeping.
- Optional: reduce filler tokens (“like”, “you know”) *only* if it improves retrieval (don’t over-clean away style).
- Normalize punctuation and whitespace; keep sentence boundaries.
- When timestamps exist, prefer chunking aligned to conversational turns.

### 4) Label Infield vs Principle at Ingest Time

We already have some classification signals in the pipeline (and can add more).

**Plan:**
- Use multiple signals to label `contentType`:
  - File title heuristics (“Infield”, “Breakdown”, “Mistakes”, “How to…”).
  - Segment classifier (`INTERACTION` vs `EXPLANATION`).
  - Optional lightweight LLM labeling offline to tag `topic` and `contentType` (batch, cached).

---

## Retrieval Improvements (Make the “Right Chunk” Win)

### 1) Two-Stage Retrieval: Recall First, Then Precision

Current behavior is effectively “topK from vector search + threshold”. This can miss the best match.

**Plan:**
1) **Candidate generation** (high recall):
   - Retrieve more than we show (e.g. `topKCandidates = 50–200`).
   - Use a lower threshold (or none) at this stage.
2) **Rerank + filter** (high precision):
   - Rerank candidates using:
     - keyword overlap / phrase hit boosts (“study medicine”, “cardiology”, “plastic surgery”)
     - metadata match boosts (`contentType`, `segmentType`)
     - diversity constraints (avoid 5 near-duplicates from same source)

### 2) Add Hybrid Search (Vector + Lexical)

Some queries are entity/keyword heavy (medicine, cardiology, city names). Vector-only retrieval often underperforms on these.

**Plan:**
- Add Postgres full-text search (BM25-ish) over `content`.
- Hybrid score = `w_vec * similarity + w_lex * bm25 + bonuses`.
- Use lexical retrieval as:
  - fallback when vector confidence is low, and/or
  - always-on additional candidates for reranking.

### 3) Intent-Aware Retrieval (Script vs Principle)

We should decide *what mix* of chunk types we want before answering.

**Plan:**
- Classify query intent:
  - “what should I say / text / respond” → **script intent**
  - “why / principle / mindset / framework” → **principle intent**
  - “logistics” → logistics intent
- Retrieval policy per intent:
  - Script intent: `3–4` infield + `1–2` principle chunks
  - Principle intent: `3–4` principle + `1–2` infield chunks

### 4) Diversity + Source-Level Aggregation

We want the best coverage, not five variations of the same chunk.

**Plan:**
- Limit per-source to `N` chunks (e.g. 1–2).
- Prefer different coaches when available (source diversity).
- Add “novelty” penalty for high-overlap chunks.

---

## Answer Synthesis Improvements (Use Infield + Principles Correctly)

### 1) Explicit “Principle → Example → Adaptation” Structure

We want the model to:
- extract *principles* from theory/breakdown content,
- pull *lines/tone* from infield content,
- and then adapt to the user scenario without going generic.

**Plan:**
- Update prompts so the model must:
  - cite which sources are **infield** vs **principle**
  - use infield sources for concrete lines (or close paraphrases)
  - use principle sources for rationale + calibration rules
- If no relevant infield chunks exist, it should explicitly say: “I can give principle guidance, but I don’t have a direct infield example for this.”

### 2) Prevent “Generic Interview Mode”

The current failure mode often becomes “ask open-ended questions” because it’s a safe default.

**Plan:**
- Add stronger constraints:
  - require at least 2 concrete suggested lines for script-intent queries
  - require calibration cues (tone, timing, body language) pulled from sources
  - penalize purely generic Qs unless the sources explicitly recommend them

---

## Continuous Improvement Loop (Make It Better Every Time We Add Data)

### 1) Create a “Golden Queries” Evaluation Set

We need repeatable retrieval tests that catch regressions.

**Plan:**
- Maintain `training-data/evals/golden_queries.json` (or similar) with:
  - `query`
  - expected `source` patterns (or must-include phrases)
  - expected `contentType` mix (e.g. must include ≥1 infield)
  - tags (topic, intent)
- Add the **medicine** scenario as a first “golden query”.

**Metrics to track over time:**
- retrieval recall@k for expected sources/phrases
- MRR (how high the best source ranks)
- % queries returning 0 chunks
- % chunks missing required metadata
- duplication rate by `chunkHash`

### 2) Use New Data to Validate Old Data

As new transcripts arrive, we can validate and improve existing data.

**Plan:**
- Topic coverage tracking:
  - detect which topics are newly covered
  - detect which topics remain sparse
- Cross-source consistency checks:
  - cluster semantically similar chunks across time
  - flag contradictions/outliers for review
- Regression checks:
  - rerun golden queries after each ingest
  - block “data releases” when key queries regress

### 3) Logging + Feedback in Production

We need real-world signals to guide improvements.

**Plan:**
- Log for each QA request:
  - query text + intent classification
  - retrieval options + retrieved chunk ids/sources/scores
  - user feedback (thumbs up/down + optional note)
- Periodically curate:
  - a list of “bad retrieval” examples
  - add them to golden queries

---

## Implementation Phases (Practical Roadmap)

### Phase 0 — Stop the Bleeding (Days)
- Ensure no client-side forced thresholds cause empty retrieval (fixed).
- Increase recall (higher candidate count) and rerank with simple heuristics.
- Add “medicine” to golden queries + run it after ingest.

### Phase 1 — Data Consistency + Re-ingest (Week)
- Decide the canonical ingest path and align docs + code.
- Add metadata schema versioning and required fields.
- Add `chunkHash`, `chunkerVersion`, `embeddingModel` tracking.
- Full re-ingest to normalize the entire vector store.

### Phase 2 — Hybrid Retrieval + Intent Routing (Week–2)
- Implement lexical search (Postgres FTS) and hybrid scoring.
- Implement intent classification + retrieval mix policies.
- Add diversity constraints and source-level aggregation.

### Phase 3 — “Principles Index” (Optional, High Leverage)
- Create a secondary index of extracted principles:
  - one entry per topic per coach (or per video section)
  - short, clean, high-signal summaries derived from explanation segments
- Retrieval returns:
  - direct infield evidence (for scripts)
  - principle summaries (for reasoning and calibration)

### Phase 4 — Continuous Data QA (Ongoing)
- Monthly ingest cadence + evaluation run.
- Dashboard/alerts for retrieval failures and metadata drift.
- Periodic re-embedding when models or chunker versions change.

---

## Definition of “Better”

We’ll consider this plan successful when:
- The “medicine” question consistently retrieves and uses the direct medicine infield chunk within top 5.
- The model’s sources panel shows a healthy mix of infield + principles for most queries (intent-dependent).
- Retrieval failures (0 chunks) are rare for in-scope questions.
- Data quality metrics improve monotonically as we add new transcripts (metadata completeness, lower duplication, stable recall@k).

