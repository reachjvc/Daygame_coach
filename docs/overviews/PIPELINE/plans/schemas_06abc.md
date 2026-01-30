# Schemas for 06a/06b/06c (Plan)

Status: Implemented
Updated: 30-01-2026 21:35 - All 5 JSON schema files created in scripts/training-data/schemas/

## Join Keys
All three outputs must include:
- video_id
- conversation_id
- interaction_id

These three fields are used to merge in Phase 4.

---

## 06a.structure.schema.json (Plan)

### Required Top-Level Fields
- video_id: string
- source_file: string
- processed_at: ISO timestamp
- interactions: array
- summary: {total_interactions, total_turns}

### Interaction Object
- interaction_id: integer
- conversation_id: integer
- segment_ids: array<int>
- turns: array of {index, speaker, text}
- phases: {opener, attraction, connection, close}
- phases.*: {start_turn, end_turn}

### Notes
- This file should NOT include techniques/topics/outcomes.

---

## 06b.content.schema.json (Plan)

### Required Top-Level Fields
- video_id: string
- source_file: string
- processed_at: ISO timestamp
- taxonomy_version: string
- interactions: array
- summary: {total_interactions, unique_techniques, unique_topics}

### Interaction Object
- interaction_id: integer
- conversation_id: integer
- techniques_used: array of {technique, turn_index, evidence}
- topics_discussed: array of {topic, turn_index, evidence}

### Notes
- Outputs must be taxonomy-only.
- Unknowns should be flagged for review, not silently added.

---

## 06c.outcomes.schema.json (Plan)

### Required Top-Level Fields
- video_id: string
- source_file: string
- processed_at: ISO timestamp
- interactions: array
- summary: {total_interactions, outcomes_distribution}

### Interaction Object
- interaction_id: integer
- conversation_id: integer
- outcome: enum (number/instagram/instant_date/rejection/flake/unknown)
- outcome_confidence: number (0-1)
- interaction_quality: {overall_score, strengths, areas_for_improvement}

---

## Merge Contract (Phase 4)

- Every interaction_id present in 06a must appear in 06b and 06c.
- Missing joins are a hard failure before ingest.
