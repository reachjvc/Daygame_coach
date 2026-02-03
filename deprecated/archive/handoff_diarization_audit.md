# Handoff: Diarization Quality Audit

Status: VERIFIED
Created: 02-02-2026 17:45
Updated: 02-02-2026 18:00 - **VERIFIED: Diarization is real and working**

## Verification Result (02-02-2026)

**Diarization IS working correctly.** Verified with Python script across all 233 files:

| Metric | Value |
|--------|-------|
| Total files | 233 |
| **With diarization** | **230 (98%)** |
| Two speakers (conversations) | 90 |
| One speaker (monologues) | 140 |
| Without diarization | 3 |

The 140 "one speaker" files are correctly identified monologues where pyannote detected only one person.

## Context

Previous session claimed 230/234 transcribed files have diarization (SPEAKER_00/SPEAKER_01 labels). User was skeptical - the compute time seemed too much. Verification confirmed the data is real.

## Task

**Audit the diarization quality in `data/02.transcribe/daily_evolution/` files.**

### Step 1: Sample 10 random files

```bash
find data/02.transcribe/daily_evolution -name "*.full.json" ! -name "*.*.full.json" | shuf | head -10
```

### Step 2: For each sampled file, check:

1. **Does it have speaker labels?**
   ```bash
   grep -c '"speaker"' FILE.full.json
   ```

2. **What speakers are present?**
   ```bash
   grep -o '"speaker": "[^"]*"' FILE.full.json | sort | uniq -c
   ```

3. **Is it just one speaker (monologue) or two (conversation)?**
   - Monologue = only SPEAKER_00
   - Conversation = SPEAKER_00 + SPEAKER_01

4. **Sanity check speaker distribution:**
   - For talking_head videos: expect ~95%+ single speaker
   - For infield videos: expect ~60-80% coach, ~20-40% target

### Step 3: Check timestamps make sense

Look at a few segments - do the speaker changes happen at reasonable times?

```bash
# Get first 5 speaker changes
grep -E '"(start|end|speaker)"' FILE.full.json | head -30
```

### Step 4: Cross-reference with original whisperx output

The `.full.json` is copied from `.full.whisperx.json`. Check if they match:

```bash
diff FILE.full.json FILE.full.whisperx.json
```

If `.full.json` has diarization but `.full.whisperx.json` doesn't (or vice versa), something is wrong.

## Expected Findings

Report:
- How many of the 10 samples actually have diarization?
- How many have 2 speakers vs 1 speaker?
- Any files where diarization looks broken/fake?
- Total compute time estimate based on findings

## Suspicious Signs to Look For

- All segments have same speaker (diarization didn't run)
- Speaker labels present but timestamps don't vary (copy-paste artifact)
- `.full.json` differs significantly from `.full.whisperx.json`
- Files processed in Jan 28 timeframe (before diarization was enabled)

## Files to Update

After audit, update:
- `docs/overviews/PIPELINE/PIPELINE_STATUS.md` - correct the diarization count if wrong
