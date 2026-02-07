# Stage 08: Taxonomy Validation
**Status:** NEW
**Updated:** 06-02-2026

**Script**: `scripts/training-data/08.taxonomy-validation`

---

## Overview

Quality gate that validates taxonomy coverage before data preparation.
Blocks pipeline if high-frequency unlisted concepts are detected.

## Input
- `data/07.content/**/*.enriched.json`

## Output
- `data/08.taxonomy-validation/report.json`
- Exit code: 0 (PASS) or 1 (FAIL)

## Usage

```bash
# Default (threshold=3)
./scripts/training-data/08.taxonomy-validation

# Custom threshold
./scripts/training-data/08.taxonomy-validation --threshold 5

# Strict mode (fail on ANY unlisted)
./scripts/training-data/08.taxonomy-validation --strict

# Specific source
./scripts/training-data/08.taxonomy-validation --source daily_evolution

# Manifest filter
./scripts/training-data/08.taxonomy-validation --manifest docs/pipeline/batches/P001.1.txt

# JSON output
./scripts/training-data/08.taxonomy-validation --json

# Skip report file
./scripts/training-data/08.taxonomy-validation --no-report
```

## Exit Codes

| Code | Status | Meaning |
|------|--------|---------|
| 0 | PASS | No high-frequency unlisted concepts |
| 1 | FAIL | High-frequency unlisted concepts detected |

## Report Format

```json
{
  "version": 1,
  "stage": "08.taxonomy-validation",
  "generated_at": "2026-02-06T...",
  "validation": {
    "status": "PASS|FAIL|WARNING",
    "reason": "...",
    "threshold": 3,
    "strict_mode": false,
    "high_frequency_unlisted": {
      "techniques": [],
      "topics": []
    }
  },
  "details": {
    "files_processed": 10,
    "files_with_unlisted": 2,
    "techniques": {...},
    "topics": {...}
  }
}
```

## Quality Targets

- Catches taxonomy gaps before expensive embedding generation
- Provides actionable recommendations for taxonomy additions
- Blocks pipeline when critical gaps detected

---

## Verification Status

| Round | Videos | Status | Notes |
|-------|--------|--------|-------|
| R1 | - | NEW | Initial implementation |
