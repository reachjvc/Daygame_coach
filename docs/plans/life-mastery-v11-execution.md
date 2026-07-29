# Life Mastery v11 — Exhaustive-Fidelity Execution Plan

## What this is (plain language)

The product's *structure* now matches Stefan James' system, but its *content* was built from samples — a few credo lines, a few quotes, a label where his money system should be. This plan replaces every sampled artifact with the exhaustively-mined real thing, audits every quote, closes the 19 open critique findings, and re-runs the adversarial critique until it comes back clean. User decisions locked in: **hybrid shipped voice** (short quotes verbatim + cited; long material faithful paraphrase), **artifact-complete corpus first** (~60-80 videos; full channel + podcast later), **free sources only**.

What you'll see when it's done: every exercise carries his complete material (the whole manifesto as worked example, the full money system with the jar percentages, the real six-needs journal), every quoted line is traceable to a video, and nothing anywhere claims to be his that we can't prove.

## Phases

**Phase 1 — Exhaustive cited corpus (blocks everything with content).**
Re-download auto-subs for every video ID cited in the canon + os docs (yt-dlp, `--js-runtimes node`; transcripts cached OUTSIDE the repo — re-downloadable, not committed). Then extraction agents per ARTIFACT (not per video), each with a completeness critic pass:
manifesto (~25 lines) · incantations (every one he speaks on camera) · money system (jars %, invest/self-ed %, reserve, debt protocol) · six-needs relationship journal · all question sets (8 empowering, area sweep, evening, weekly) · rules-engineering examples · plateau/mastery-path language · state protocols · consequence menu · resource-escalation language · every quote currently rendered in the UI.
Output: `src/goals/data/lifeMasteryCorpus.ts` — entries `{ id, text, videoId, context, artifact }`. Definition of exhausted per artifact: the critic agent can name no unmined video that mentions it.

**Phase 2 — Quote audit (needs Phase 1).**
Map every his-voice UI string → corpus entry id, or demote to unquoted product-voice paraphrase. Add a unit test: any string in quote marks attributed to him in `lifeMasteryPrinciples.ts` / component copy must reference a corpus id. This makes Rule 2 permanent, not aspirational.

**Phase 3 — Rebuild the under-sampled surfaces on real content (needs Phases 1-2).**
Manifesto worked example = his full credo (collapsed, adoptable per line) · incantation deck rebuilt from real cards (hybrid voice rules) · money system surface (jars + percentages + reserve/debt protocol, feeding Money Tuesday) · relationship journal = bi-weekly six-needs 0-10 + appreciation + love-language check · rules-engineering exercise (elicit → rewrite per value + value-rules affirmations) — new scoreboard row.

**Phase 4 — Mechanical critique fixes (no corpus dependency — runs in parallel with Phase 1).**
SMART template + "creating [feeling]" + optional "…and enjoy the process" · wheel 0-10 (slider + schema migration accepting old 1-10 blobs) · 3 fresh reasons per RPM block · weekly challenges/root-cause question · 8-9-10 aim shipped as default (7 = floor) w/ gentler setting · nightly magic-moment jar · no AI-authored whys on ANY path (LLM drafts arrive why-blank with a guided why elicitation) · captures route into outcomes/adhoc (Capture→Create back half) · plateau doctrine in measurement copy (behind ≠ failing; "two steps back to take ten forward") · consequence menu · resource escalation stub (book/course/coach suggestions per stuck area) · unify minimum-floor copy to 1 minute · sub-7 money fix points at Money Tuesday · RPM delegation pass.

**Phase 5 — Adversarial critique loop.**
Re-run the full-history critique agent. Fix. Repeat until it returns no CONFIRMED findings. Only then does the scoreboard say ALIGNED again.

## Acceptance
- Corpus DB exists with ≥1 cited entry per artifact and critic-certified exhaustion per artifact.
- Quote-provenance unit test green and enforcing.
- All 19 v11 ledger findings closed or explicitly user-deferred.
- Critique agent pass with zero CONFIRMED findings.
- `npm test` green; headless walk green; screenshots visually inspected.

## AI execution notes
- Transcript cache: `~/.cache/lm-corpus/` (gitignored world). Video ID list = grep `[A-Za-z0-9_-]{11}` citations from canon + os docs, deduped, plus the memory's key-ID list.
- Extraction agents get the artifact brief + ALL transcripts mentioning the artifact keyword; they return candidate verbatim strings + videoId + surrounding context; a second agent verifies each string appears in its transcript (no hallucinated quotes).
- Schema migration for 0-10 ratings: accept 0 in `areaRatings` (`min(0)`), UI slider min 0; old blobs stay valid.
- Rules 1-5 at the top of life-mastery-canon.md govern every step.
