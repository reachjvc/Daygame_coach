# Plan: Keep It Going Scenario

**Status:** Core complete. prompt_3 diagnostic done — trajectory MAE 0.17-0.63. Rubric fixes pending.
**Created:** 2026-02-07
**Updated:** 2026-02-12

---

## Summary

Practice the middle of the conversation — after the opener, keep the vibe alive without going into interview mode. System provides setup, user drives the conversation.

**Problem:** User opens fine, but then asks boring questions → interview mode → conversation dies.
**Solution:** Train using statements, cold reads, and interesting questions instead.

---

## Architecture

All evaluation and response generation handled by Claude AI via `chat.ts`. Original regex evaluator and template responses removed. Realism driven by frozen v1 data from 30 extracted videos (367 turns).

### Flow
1. System shows setup (location, opener, her first response)
2. User writes response
3. `evaluateWithAI()` scores the line (1-10, quality, tags)
4. `updateInterestFromRubric()` updates interest/exitRisk state
5. If end condition met → `generateExitResponse()`
6. Otherwise → `generateAIResponse()` with bucket-aware constraints
7. Repeat (~20 turns until close)
8. Milestone feedback every 5 turns

### State Model
- `interestLevel` (1-10, starts 4 = guarded)
- `conversationPhase` (hook ≤4, vibe 5-12, invest 13-18, close 19+)
- `exitRisk` (0-4)
- `realismNotch` (-1|0|+1 difficulty tuning)
- `isEnded` (sticky — no re-evaluation after exit)

### Interest Buckets (from data)
| Bucket | Interest | Words | Questions Back | Style |
|--------|----------|-------|---------------|-------|
| Cold | 1-3 | max 8 | never | short, deflects |
| Guarded | 4-5 | 2-14 | rarely | polite, distant |
| Curious | 6-7 | 6-20 | sometimes | engaged, playful |
| Interested | 8-10 | 8-25 | invests | flirts, warms |

### Key Files
| File | Purpose |
|------|---------|
| `src/scenarios/keepitgoing/chat.ts` | AI eval + response generation |
| `src/scenarios/keepitgoing/generator.ts` | Context mgmt, `updateInterestFromRubric()` |
| `src/scenarios/keepitgoing/realisticProfiles.ts` | Frozen v1 PROFILES + RUBRIC |
| `src/scenarios/keepitgoing/types.ts` | All types |
| `src/scenarios/keepitgoing/data/situations.ts` | 10 situations (da + en) |
| `src/scenarios/keepitgoing/claudeCode.ts` | Claude Code CLI integration |
| `src/scenarios/components/ScenariosHub.tsx` | Situation picker modal |
| `src/scenarios/components/ChatWindow.tsx` | Chat UI |
| `src/scenarios/scenariosService.ts` | Service integration (lines 254-343) |
| `data/woman-responses/final/` | Frozen v1 data artifacts |
| `data/woman-responses/prompts/prompt_N/` | Versioned eval prompts |
| `data/woman-responses/diagnostics/` | Diagnostic outputs |
| `scripts/run-diagnostic.ts` | Run evaluator against extracted video |
| `app/test/calibration/` | Calibration viewer UI |

### Decisions (locked)
| Question | Decision |
|----------|----------|
| LLM or placeholder? | LLM (Claude via AI SDK) |
| Situations? | 10 (bookstore, café, street, metro, mall, gym, grocery, park, busstop, library) |
| Languages? | Danish + English |
| Turns? | ~20 (user drives until close) |

---

## Evaluator Calibration (in progress)

Calibrate evaluator against known-successful conversations. A "blind spot" = evaluator scores a line < 7 that worked in reality.

### What's done
- Versioned prompts: `prompt_0/`, `prompt_1/`, `prompt_2/`, `prompt_3/`
- Calibration viewer UI at `/test/calibration`
- Diagnostic runner + API routes
- Three prompt versions tested against two videos + 2 real encounters

### Diagnostic Results
- **prompt_0** (baseline): e2dLEB-AwmA → 7/30 pass (23%), 19 blind spots
- **prompt_1** (76 few-shot examples): e2dLEB-AwmA → 6/30 (20%) — all 6 were false 7s
- **prompt_2** (temperature-based defaults): e2dLEB-AwmA → 1/30 (3%)
- **prompt_2** real encounters: 001 → 0/6 pass, 002 → 0/9 pass — all middle-ground 5-6 scores
- **prompt_3** (two-score trajectory system):
  - e2dLEB-AwmA → 7/30 (23%) pass, 8 blind spots, 6 false pos, **line MAE 1.57, trajectory MAE 0.63**
  - DPieYj7nji0.clean → 3/23 (13%) pass, 5 blind spots, 3 false pos, **line MAE 0.87, trajectory MAE 0.48**
  - real-encounter-001 → 1/6 (17%) pass, 0 blind spots, 1 false pos, **line MAE 0.67, trajectory MAE 0.17**
  - real-encounter-002 → 0/9 (0%) pass, 2 blind spots, 3 false pos, **line MAE 1.11, trajectory MAE 0.22**

### Fundamental Finding (prompt_0-2)
Evaluator reliably scores **3** (momentum killers), **5-6** (neutral), **7+** (technique-driven rises). It **cannot** predict momentum-driven interest rises — ordinary lines that work because conversation has built momentum.

### prompt_3 Design Changes
Root cause: per-line evaluation misses conversation arc. The model scores each line in isolation, defaulting to 5-6 for everything, and can't see that a "mediocre" line in a building conversation is actually fine.

| Change | Rationale |
|--------|-----------|
| Two-score system: `line_score` + `trajectory_score` | Separates "how good was this move" from "how is the conversation going" |
| Trajectory reads ALL her responses in sequence | Catches warming/cooling/stalling patterns invisible per-turn |
| Multi-turn calibration examples (3 full conversations) | Teaches model what building vs stalling conversations look like |
| Interview mode detection (3+ questions penalty) | Catches cumulative question fatigue, not just individual question quality |
| Joke recycling penalty | Catches tone-deaf repetition the model previously rated as "neutral" |
| Reduced single-turn examples (extreme scores only) | Cuts middle-range examples that reinforced default-to-5 behavior |
| `trajectory_signals` field in response | Forces model to explain its trajectory reading, aids debugging |

### Blind Spot Patterns (from prompt_0-2)
1. **Turn 1 cascade** — single low score tanks interest to 1, pacing caps prevent recovery
2. **Interview questions over-punished** — scored 3-5 when woman actually warmed up
3. **Interest recovery impossible** — once at 1, rubric diverges from reality
4. **Over-eager exits** — system would have ended 9 times in a smooth 30-turn number close

---

## Remaining Work

### Code changes needed for prompt_3
| File | Change | Status |
|------|--------|--------|
| `types.ts` | Add `trajectory_score`, `trajectory_signals` to `EvalResult` | DONE |
| `chat.ts` | Parse new two-score JSON response from evaluator | DONE |
| `generator.ts` | Use `trajectory_score` to ground interest level (not just score delta) | DONE |
| `run-diagnostic.ts` | Compare `trajectory_score` against ground truth `her_interest` | DONE |
| `chat.ts` | Fix hardcoded prompt path (known bug — should auto-detect latest) | DONE |
| `calibration types.ts` | Add trajectory fields to viewer types | DONE |
| `EvaluationPanel.tsx` | Display trajectory score, signals, ground truth | DONE |
| `TurnViewer.tsx` | Show trajectory MAE, mode in summary | DONE |

### Rubric Fixes (may be partially superseded by trajectory_score)

| Fix | Rationale | Status |
|-----|-----------|--------|
| Use `trajectory_score` directly for interest grounding | Replaces score-delta approach with direct interest assessment | PENDING |
| exitRisk decay when quality isn't deflect/skeptical | Prevents exitRisk ratcheting from one bad turn | PENDING |
| Neuter double-punishment tags | Already lower the score; tag penalty is double-counting | PENDING |
| Raise end thresholds | Current thresholds too aggressive | PENDING |

### Known Bug
`chat.ts` hardcodes prompt path to `prompt_1`. Diagnostic `prompt_version` arg only affects output naming, not which prompt is loaded. Must manually change `chat.ts` to test other prompts.

---

## Data Insights (from 367 turns)

- **Teases: 6.2 avg** (n=83) — most effective
- **Logistics: 6.1 avg** (n=61) — also effective
- **Cold reads: 5.3 avg** (n=47) — NOT as effective as theory claims
- **Interview questions: 5.4 avg** (n=125) — not as bad as theory claims
- **Statements: 5.3 avg** (n=146) — neutral baseline
