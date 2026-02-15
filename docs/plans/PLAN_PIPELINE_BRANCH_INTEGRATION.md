# Plan: Merge `pipeline-validation-hardening` Into `main` (Full Carry)

## Goal

Bring all committed work from `pipeline-validation-hardening` into `main`, while preserving ongoing work already done on `main`.

This plan is written so an AI agent can execute it directly, step by step.

## Current Facts (as of 2026-02-15)

- Branch point: `ec41a8810350fcaec0aaa9f8c8f7d8176ffd4eab`
- Pipeline branch changed since branch point: `49` files
- Main branch changed since branch point: `464` files
- Overlap between branches: `13` files
- Predicted textual merge conflicts from `merge-tree`: `0`
- `LivePortrait` gitlink was removed from pipeline branch in commit `1af7e02`

Interpretation:
- The large `main..pipeline` diff count is mostly branch divergence, not 500 files of pipeline-only work.
- A full merge is still viable, but must be done with a no-commit inspection checkpoint first.

## Non-Negotiables

- Do not run the merge directly on `main`.
- Do not use `git reset --hard`.
- Do not discard uncommitted user work.
- Stop and report if unexpected high-risk paths are staged.

## Execution Plan

### 1) Preflight

Run:

```bash
git checkout main
git status -sb
git branch --all
git log --oneline -n 5 main
git log --oneline -n 5 pipeline-validation-hardening
```

If `git status` is not clean:
- Create a safety branch from current state, or ask user whether to continue with staged/uncommitted changes present.

### 2) Create Integration Branch

```bash
git checkout -b merge/pipeline-validation-hardening-20260215 main
```

### 3) Dry-Run Merge (No Commit)

```bash
git merge --no-ff --no-commit pipeline-validation-hardening
```

Expected:
- Merge succeeds without textual conflicts.
- Changes are staged but not committed.

If merge conflicts occur:
- Stop.
- Capture conflict file list and request direction.

### 4) Inspect What Will Be Committed

Run:

```bash
git status --short
git diff --name-status --cached | sed -n '1,240p'
git diff --name-only --cached | awk -F/ '{print $1}' | sort | uniq -c | sort -nr
```

Explicitly inspect these paths (they were overlap-prone earlier):

```bash
git diff --cached -- scripts/training-data/01.download
git diff --cached -- scripts/training-data/05.audio-features
git diff --cached -- scripts/training-data/06.video-type
git diff --cached -- scripts/training-data/06b.verify
git diff --cached -- scripts/training-data/06c.patch
git diff --cached -- scripts/training-data/08.taxonomy-validation
git diff --cached -- scripts/training-data/09.chunk-embed.ts
git diff --cached -- scripts/training-data/10.ingest.ts
git diff --cached -- scripts/training-data/batch/sub-batch-pipeline
git diff --cached -- scripts/training-data/schemas/verification.schema.json
git diff --cached -- scripts/training-data/validation/validate_cross_stage.py
```

If staged changes include clearly unwanted paths:
- Remove unwanted staged files before commit with:

```bash
git restore --staged <path>
git restore <path>
```

Then re-check staged diff.

### 5) Commit the Merge

```bash
git commit -m "merge: bring pipeline-validation-hardening into main"
```

### 6) Post-Merge Smoke Checks

Run lightweight checks first:

```bash
./scripts/training-data/06.video-type --help
./scripts/training-data/06d.sanitize --help
./scripts/training-data/06e.reverify --help
python3 scripts/training-data/validation/validate_manifest.py --help
python3 scripts/training-data/validation/validate_stage_report.py --help
node --import tsx/esm scripts/training-data/10.ingest.ts --help
```

Then run app checks as budget allows:

```bash
npm run lint
npm test
```

If heavy checks fail for environment reasons, capture exact failure and continue with clear note.

### 7) Push and Open PR

```bash
git push -u origin merge/pipeline-validation-hardening-20260215
```

PR title suggestion:
- `Merge pipeline-validation-hardening into main (pipeline + retrieval hardening)`

PR body should include:
- Why large historical diff count was misleading
- What changed in pipeline scripts/docs
- Any intentionally included non-pipeline files
- Validation/smoke-check outcomes

## Acceptance Criteria

- Merge commit exists on integration branch.
- `LivePortrait` gitlink is absent.
- Pipeline paths from `pipeline-validation-hardening` are present on integration branch.
- No user-requested `main` work is dropped.
- Smoke checks run and results are documented.

## Fallback Plan (If Full Merge Is Rejected)

If full-carry merge is too broad, do a scoped carry first:

```bash
git checkout -b merge/pipeline-scoped-20260215 main
git restore --source=pipeline-validation-hardening -- scripts/training-data docs/pipeline
git commit -m "merge: carry pipeline scripts and docs from pipeline-validation-hardening"
```

Then add selected extras in follow-up commits:
- `src/db/embeddingsRepo.ts`
- `src/db/server.ts`
- `src/qa/retrieval.ts`
- `analyze_barcelona.py`

## Important Note About Data Artifacts

Runtime artifacts under `data/` are git-ignored and not part of this merge plan.
This plan merges code and docs only.
