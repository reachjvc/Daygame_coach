# Pipeline Evaluation + Validation Template (Plan + Checklist)

**Status:** Template
**Updated:** 02-07-2026

**Output Filename Convention:**
- Primary plan/audit → `codex_pipeline_validation.md`
- Execution runbook → `pipeline_validation_runbook.md`

---

## Mission

Produce a thorough, high-quality evaluation + validation plan for the full video pipeline. The plan must prioritize correctness, observability, and repeatability over speed. It must be safe to run on sub-batches (1, 2, or 10 videos) and scale to ~150 batches of 10 videos each without introducing new flags or regressions.

**Objectives:**
- Evaluate quality at each stage and localize where failures/quality loss are introduced
- Prevent "silent passes" by requiring explicit evidence/metrics per stage
- Confidently label each video/batch as RAG-ready (or not) with reasons
- Propose improvements (including entirely new flows if warranted)
- Specify automated detection, validators, and prompt-quality upgrades
- Reduce errors and improve output sharpness

**Constraints:**
- This is a planning and validation document only
- Do not change code during analysis
- Do not optimize for speed
- Make the plan detailed and checklist-driven
- Quality over speed — 20 extra hours for better architecture is worth it

---

## Definitions (Use These Terms Precisely)

- **Validation:** Deterministic correctness checks (schemas, file presence, invariants, thresholds).
- **Evaluation:** Quality measurement (metrics, sampling, model-based checks, spot checks).
- **Gating:** A rule that blocks downstream processing or ingestion.
- **RAG-ready:** Meets minimum thresholds for retrieval usefulness; otherwise assign a non-ready label with reasons.
- **No silent pass:** Every stage must emit explicit status + evidence (report + metrics). Missing/empty/invalid outputs are treated as failures (hard or soft) with a reason.

---

## Agent Metadata

| Field | Value |
|-------|-------|
| Agent | |
| Date | |
| Scope | |
| Time Spent | |

---

## 1) Inputs Reviewed

List all pipeline docs, scripts, prompts, configs, and data manifests inspected.

| Category | Files Reviewed |
|----------|----------------|
| Pipeline docs | |
| Stage scripts | |
| Prompts | |
| Configs | |
| Data manifests | |
| Batch scripts | |
| Validation scripts | |

**Files not found or ambiguous references:**
-

---

## 2) Pipeline Context (As Found)

### 2.1 Stage Inventory

| Stage | Script Path | Type | Inputs | Outputs |
|-------|-------------|------|--------|---------|
| 01. Download | scripts/training-data/01.download | Deterministic | YouTube URLs | .wav files |
| 02. Transcribe | scripts/training-data/02.transcribe | ML (Whisper) | .wav | .full.json |
| 03. Align | scripts/training-data/03.align | ML (WhisperX) | .full.json | .full.json |
| 04. Diarize | scripts/training-data/04.diarize | ML (pyannote) | .full.json | .full.json |
| 05. Audio Features | scripts/training-data/05.audio-features | Deterministic | .wav + .full.json | .audio_features.json |
| 06. Video Type | scripts/training-data/06.video-type | LLM (Claude) | All prior | .conversations.json |
| 06b. Verify | scripts/training-data/06b.verify | LLM (Claude) | .conversations.json | .verification.json |
| 06c. Patch | scripts/training-data/06c.patch | Deterministic | .verification.json | .conversations.json |
| 07. Content | scripts/training-data/07.content | LLM (Claude) | .conversations.json | .enriched.json |
| 08. Taxonomy | scripts/training-data/08.taxonomy-validation | Deterministic | .enriched.json | `<label>.report.json` |
| 09. Chunk & Embed | scripts/training-data/09.chunk-embed.ts | ML (Ollama) | .enriched.json | .chunks.json |
| 10. Ingest | scripts/training-data/10.ingest.ts | Deterministic | .chunks.json | Supabase |

### 2.2 Confidence Thresholds (06c.patch)

| Fix Type | Required Confidence | Notes |
|----------|---------------------|-------|
| Misattributions | ≥ 0.70 | Speaker assignment fixes |
| Collapse issues | ≥ 0.70 | Merged speaker fixes |
| Video type fixes | ≥ 0.85 | Classification changes |
| Boundary fixes | ≥ 0.90 | merge_with_next, merge_with_previous, split_at_segment_N |

### 2.3 Verdict System (06b.verify)

| Verdict | Meaning | Pipeline Action |
|---------|---------|-----------------|
| APPROVE | No issues found | Copy unchanged to 06c |
| FLAG | Issues with fixes | Apply fixes in 06c |
| REJECT | Critical issues | Halt pipeline |

### 2.4 Parallel/Optional Branches

-

---

## 3) Prompt Inventory

| Stage | Prompt Location | Token Count (approx) | Purpose | Error-Prone Sections |
|-------|-----------------|---------------------|---------|---------------------|
| 06 | | | Video classification + speaker roles | |
| 06b | | | 5-pass verification | |
| 07 | | | Content enrichment | |

---

## 4) Error Taxonomy

### 4.1 Error Categories

| Category | Stage Origin | Detection Stage | Severity | Example | Current Detection |
|----------|-------------|-----------------|----------|---------|-------------------|
| Hallucination | 02 | 06b | Critical | Whisper invents speech | |
| Diarization | 04 | 06/06b | High | Wrong speaker assigned | |
| Role Assignment | 06 | 06b | High | Coach labeled as target | |
| Boundary | 06 | 06b | Medium | Conversation split wrong | |
| Teaser Miss | 06 | 06b | Medium | Intro preview not detected | |
| Taxonomy Gap | 07 | 08 | Low | Unlisted technique | Threshold check |
| Embedding | 09 | 10 | Low | Chunk too large/small | |

### 4.2 Observed Failure Modes and Flags

Enumerate recurring flags, errors, or quality regressions with evidence:

| Issue | Frequency | Example Batch/Video | Root Cause Hypothesis |
|-------|-----------|---------------------|----------------------|
| | | | |
| | | | |
| | | | |

---

## 5) Error Propagation Analysis

Map how errors in early stages manifest later:

| Origin Stage | Error Type | How It Manifests Later | Where Caught | Catch Rate |
|--------------|------------|------------------------|--------------|------------|
| 02 | Hallucination | Wrong text in chunks | 06b | ? |
| 04 | Bad diarization | Wrong speaker roles | 06/06b | ? |
| 06 | Wrong video type | Wrong enrichment prompt | 07 output quality | ? |
| 06 | Bad boundary | Conversation context lost | 07/09 chunks | ? |

---

## 6) Current Quality Baseline

Measure before improving:

| Metric | Current Value | Target | Measurement Method |
|--------|---------------|--------|-------------------|
| 06b APPROVE rate | | >90% | Count verdicts across batches |
| 06b FLAG rate | | <8% | Count verdicts |
| 06b REJECT rate | | <2% | Count verdicts |
| RAG-ready rate (per video) | | ≥X% | Apply readiness rubric to sample batches |
| Silent-pass rate | | 0% | Count stages w/ missing status/metrics/report |
| Avg tokens per 06 call | | Minimize | Token counter |
| Avg tokens per 07 call | | Minimize | Token counter |
| 08 taxonomy pass rate | | 100% | Exit codes |
| End-to-end success rate | | >95% | Full pipeline runs |

---

## 7) Validation Strategy (Overall)

### 7.1 Check Types

| Type | When to Use | Examples |
|------|-------------|----------|
| Deterministic | Schema, file existence, thresholds | JSON schema validation, file counts |
| ML-based | Embedding quality, transcription | Whisper confidence scores |
| LLM-based | Semantic correctness | 06b verification |
| Manual | Ground truth, edge cases | Spot checks |

### 7.2 Gating Criteria

| Stage | Gate Condition | Action on Fail |
|-------|----------------|----------------|
| 06b | REJECT verdict | Halt, quarantine video |
| 08 | Exit code 1 | Block ingest, review unlisted |
| All | Missing output file | Halt, report |
| All | Missing/invalid stage report (status+metrics) | Treat as failure, block downstream unless explicitly waived |

### 7.3 Rollback Strategy

| Scenario | Rollback Procedure | Data Cleanup |
|----------|-------------------|--------------|
| Stage X fails mid-batch | | |
| Bad data reaches 10 | | |
| Prompt regression detected | | |

### 7.4 Evidence + Observability Contract (No Silent Pass)

For every stage, define a concrete "evidence bundle" so failures can be localized quickly:

- **Stage status:** `PASS` / `WARN` / `FAIL` (or your chosen scheme) with a short machine-readable reason code.
- **Artifacts:** exact output paths produced (and expected counts).
- **Metrics:** a small set of stage metrics (counts, rates, confidences, durations).
- **Validator:** how to check the artifacts + metrics (schema + invariants + thresholds).
- **Run identity:** batch id, video id, stage name, tool versions (enough to reproduce).

Minimum requirement: the plan must specify *where the stage report lives* and *what fields it contains*.

---

## 8) Stage-by-Stage Validation Table

| Stage | Purpose | Current Checks | Gaps | Proposed Checks | Prompt Improvements | Tests to Run | Success Criteria (Quantitative) |
|-------|---------|----------------|------|-----------------|--------------------|--------------|---------------------------------|
| 01 | Download audio | | | | N/A | | |
| 02 | Transcribe | | | | N/A | | |
| 03 | Align | | | | N/A | | |
| 04 | Diarize | | | | N/A | | |
| 05 | Audio features | | | | N/A | | |
| 06 | Video type + roles | | | | | | |
| 06b | Verify | | | | | | |
| 06c | Patch | | | | N/A | | |
| 07 | Content enrich | | | | | | |
| 08 | Taxonomy validate | | | | N/A | | |
| 09 | Chunk + embed | | | | N/A | | |
| 10 | Ingest | | | | N/A | | |

Required for each row above:
- **Evaluation metrics:** what you log to judge quality (not just "pass/fail")
- **Failure localization:** what evidence tells you "the problem was introduced in this stage"
- **Downstream action:** continue, quarantine, re-run with different settings, or hard-stop

---

## 9) Prompt Quality Plan

### 9.1 High-Impact Prompts

| Prompt | Impact Level | Error Rate | Priority |
|--------|-------------|------------|----------|
| 06 video-type | Critical | | 1 |
| 06b verify | Critical | | 2 |
| 07 content | High | | 3 |

### 9.2 Sharpness Rubric

Define what "sharp" output means:

| Dimension | Poor | Acceptable | Sharp |
|-----------|------|------------|-------|
| Role assignment | Wrong roles | Correct but uncertain | Correct with high confidence |
| Boundaries | Off by >2 segments | Off by 1 segment | Exact |
| Techniques | Missing >30% | Missing <15% | Complete |
| Consistency | Contradictions | Minor inconsistencies | Fully coherent |

### 9.3 Evaluation Protocol

- [ ] A/B test methodology defined
- [ ] Number of runs per prompt variant:
- [ ] Comparison metrics specified
- [ ] Statistical significance threshold:

### 9.4 Prompt Improvements Needed

| Prompt | Issue | Proposed Change | Expected Impact |
|--------|-------|-----------------|-----------------|
| | | | |

---

## 10) Confidence Threshold Calibration

| Threshold | Current | Observed False Positive Rate | Observed False Negative Rate | Proposed |
|-----------|---------|------------------------------|------------------------------|----------|
| Misattribution (0.70) | 0.70 | | | |
| Collapse (0.70) | 0.70 | | | |
| Video type (0.85) | 0.85 | | | |
| Boundary (0.90) | 0.90 | | | |

---

## 11) Batch Testing Plan

### 11.1 Test Video Selection Criteria

| Requirement | Video ID | Reason |
|-------------|----------|--------|
| 1 infield video | | Covers main use case |
| 1 talking_head | | Different enrichment path |
| 1 podcast | | Multi-speaker complexity |
| 1 compilation | | Multiple approaches |
| 1 with known diarization issue | | Tests 06 correction |
| 1 that previously triggered FLAG | | Tests edge cases |

### 11.2 Batch Size Runs

| Batch Size | Number of Runs | Purpose |
|------------|----------------|---------|
| 1 video | 5+ | Isolate single-video issues |
| 2 videos | 3+ | Test minimal parallelism |
| 10 videos | 2+ | Validate batch behavior |

### 11.3 Sampling Strategy

How to select test batches from 150 total:
-
-
-

### 11.4 Acceptance Thresholds

| Metric | Threshold | Action if Failed |
|--------|-----------|------------------|
| | | |

---

## 12) Automation and Detection Improvements

### 12.1 Missing Instrumentation

| Gap | Proposed Solution | Priority |
|-----|-------------------|----------|
| | | |

### 12.2 Proposed Validators

| Validator | Stage | What It Checks | Implementation |
|-----------|-------|----------------|----------------|
| | | | |

### 12.3 Schema Checks

| Stage | Schema Path | Current Status | Gaps |
|-------|-------------|----------------|------|
| | | | |

---

## 13) Detailed Plan

### 13.1 Stage Validation Plan

1.
2.
3.
4.
5.

### 13.2 Cross-Stage Validation Plan

6.
7.
8.
9.
10.

### 13.3 Prompt Improvement Plan

11.
12.
13.
14.
15.

### 13.4 Automation Implementation Plan

16.
17.
18.
19.
20.

### 13.5 Regression Testing Plan

21.
22.
23.
24.
25.

---

## 14) Execution Checklist

### Stage Analysis
- [ ] Read and document all stage scripts
- [ ] Identify all prompt files
- [ ] Map input/output dependencies
- [ ] Document current validation logic
- [ ] Identify where each stage can "silently pass" today (missing checks/metrics) and how to make it observable

### Error Analysis
- [ ] Collect FLAG/REJECT examples from existing runs
- [ ] Categorize by error type
- [ ] Identify root causes
- [ ] Map error propagation paths

### Baseline Measurement
- [ ] Count current APPROVE/FLAG/REJECT rates
- [ ] Define per-video RAG readiness rubric + label distribution
- [ ] Measure silent-pass rate (missing/invalid evidence bundles)
- [ ] Measure token usage per LLM call
- [ ] Document current processing time per video
- [ ] Identify highest-error batches

### Prompt Review
- [ ] Analyze 06 video-type prompt
- [ ] Analyze 06b verify prompt
- [ ] Analyze 07 content prompt (infield variant)
- [ ] Analyze 07 content prompt (talking_head variant)
- [ ] Identify ambiguous instructions
- [ ] Identify missing constraints

### Threshold Calibration
- [ ] Sample fixes at each confidence level
- [ ] Measure accuracy of applied fixes
- [ ] Identify threshold adjustments needed

### Test Execution
- [ ] Select test videos per criteria
- [ ] Run 1-video tests
- [ ] Run 2-video tests
- [ ] Run 10-video tests
- [ ] Compare results across runs

### Improvement Proposals
- [ ] Document all proposed changes
- [ ] Prioritize by impact
- [ ] Estimate implementation complexity
- [ ] Identify dependencies between changes

---

## 15) Open Questions

### Assumptions Needing Confirmation
-

### Decisions Required Before Implementation
-

### Disagreement Log
(Agent notes things it disagrees with or finds unclear in current implementation)
-

---

## 16) Summary and Recommendations

### Top 3 Critical Issues
1.
2.
3.

### Quick Wins (Low effort, high impact)
1.
2.
3.

### Major Refactors Needed
1.
2.

### Recommended Next Steps
1.
2.
3.
