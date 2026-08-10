# Ali Abdaal — Life Direction System: Synthesis & Build Spec

Source: 8 parallel research agents, ~500 web fetches, **38 full video transcripts via yt-dlp**, Wayback CDX for product timeline. Detail in `01`–`07`. Spelling is **Abdaal** (two a's).

---

## Part A — Human summary (read this)

### What we found

Ali Abdaal has **the best entry-level packaging** of life-direction work available, and **an incomplete system underneath it**. Three agents converged independently on the same structural verdict:

> His frameworks are **rituals that re-surface intent**, not machinery that transmits it. There is no data model. No `task.goal_id`. The nesting between lifetime → year → quarter → week → day is *procedural* — a human re-reads the layer above during a morning ritual. The only object crossing all levels is a **calendar block**: *"if it's not in the calendar it doesn't exist."*

That's the opportunity. **The thing his system does by hand is exactly what software should do structurally.** If we build only what he teaches, we ship a set of journalling prompts. The value is in restoring the execution halves he dropped.

### The consistent pattern: he keeps the diagnostic, drops the execution

| Element | What the original has | What Ali ships |
|---|---|---|
| Odyssey Plan (*Designing Your Life*) | 6-word titles, 3 test questions, timeline, **dashboard scoring** (Resources/Likability/Confidence/Coherence), share with team, → prototyping | 3 free-write prompts |
| Wheel of Life (Paul J. Meyer, ~1960) | Diagnostic → goal → action → **re-score loop** | Diagnostic only. **Uncredited.** |
| 12 Week Year (Moran) | Weekly **execution score**, 85% rule, lead/lag indicators | Quarterly cadence only |
| Make Time (Knapp) | Highlight + **Reflect loop** + 87 tactics | Highlight only (credited) |
| Self-Determination Theory | Autonomy · Competence · Relatedness + internalisation continuum | Play/Power/People — **autonomy loses its slot** |

His own coach (psychologist Corey Wilks) is the sharpest critic: Ali **had not answered "what do I give a shit about?"** — his frameworks didn't resolve his own direction.

### What's genuinely excellent and worth taking

1. **Divergent → convergent sequencing.** Dump on a 10-min timer → *then* tag horizons → *then* narrow. This is the part that genuinely needs hours and can't be rushed.
2. **Wheel of Life rated on alignment, not satisfaction** — *"my actions in the here and now are consistent with where I think I would like to be."* Then pick not the lowest score, but **the lowest one you actually care about**.
3. **Anti-goals** — *"achieving our goals without torpedoing the other aspects of our life."*
4. **The fit test** — block the goal into your ideal week; **if it doesn't fit, cut the goal.** His only real constraints mechanism.
5. **Project status enum** — 🟢 on track · 🟡 off track **with** a plan · 🔴 off track **without** a plan · 🔵 on ice. The yellow/red split separates "behind" from "adrift".
6. **80% realism floor** — does the plan work in theory? will I follow it in practice? Below 80% on either, rethink the plan.
7. **Effort-gated commitment** — refund conditional on completing the work; reflection surveys as the gate.

### The seven holes we must fill ourselves

Confirmed from two directions (provenance analysis *and* primary-source absence):

| # | Hole | Fill from |
|---|---|---|
| 1 | **No values exercise exists at all** — values are only ever inferred from other outputs | Repo's `valuesFramework.ts` (pairwise ranking + conflict detection) |
| 2 | **No constraints layer** — money, time, dependants, health never enter the plan | New. Biggest single gap. |
| 3 | **No cross-area trade-off budgeting** — the Wheel shows imbalance, then stops | New |
| 4 | **No accountability primitive** in the free system (pods exist only in the $997 tier) | Restore from Productivity Lab: pods of 8–12, coach-led |
| 5 | **No execution measurement** | Restore 12 Week Year: lead indicators + weekly score + 85% rule |
| 6 | **No reality-testing** — pure introspection, never prototyping | Restore DYL: prototyping, AEIOU, gravity problems |
| 7 | **No transmission between layers** | **Software's job.** Real FK links, not a human JOIN. |

Also absent, contrary to common belief: **no ikigai exercise** (one passing 3-circle mention), **no monthly layer** (three independent confirmations — quarter jumps straight to week), **no PARA** (that's Jeff Su's setup, misattributed), **no Bezos regret-minimisation, no 10/10/10, no reversible/irreversible framing**, and **no evidence he credits CGP Grey** for yearly themes. The annual theme itself is one passing mention with no instructions and no example of his own.

### Recommendation

**Ali as the accessible entry layer and tone; restored originals as the execution spine; the repo's existing North Star / PLM chain as the derivation backbone.** Ali alone cannot fill a multi-hour committed process — his own flagship intensive is 3 × 90-min sessions, and the honest student data shows value extraction plateaus in ~one quarter.

---

## Part B — Element inventory (verified)

### B1. Wheel of Life — cross-validated by two agents independently

**9 areas in 3 domains + a 10th off-wheel:**

| Domain | Areas |
|---|---|
| Health | Body · Mind · Soul |
| Relationships | Romance · Family · Friends |
| Work | Mission · Money · Growth |
| — | **Joy** (off-wheel) |

Scale **0–10** ⚠️ *(one agent reported 1–10; the 0–10 reading is verbatim from the Dec-2023 video — treat 0–10 as authoritative, resolve on next primary read)*. Rate **alignment, not satisfaction**. Shade wedges. Circle **one per domain** that needs work — not necessarily lowest, the lowest *you care about*.

### B2. GPS — ⚠️ TWO VERIFIED VERSIONS, DO NOT MERGE SILENTLY

Both are verbatim-sourced from different artefacts and different dates. They are **not** the same framework with renamed fields.

| | **GPS v2024** (quarterly workbook, public Google Doc, verbatim) | **GPS v2025** (video `D_KSR3S6W8I` + GPS Coach GPT) |
|---|---|---|
| **Goal** | **Facts** (what's true when done) · **Feelings** (how you/others feel) · **Function** (what it unlocks) | **What** (specific, numbered) · **Why** (intrinsic) · **Anti-goals** |
| **Plan** | **Steps** (3–5) · **Schedule** · **Support** (who to enlist) · **Snags** (obstacles + how to overcome) | 3–5 major moves · **realism % in theory & in practice, hard 80% floor** · **Crystal Ball** pre-mortem (top 3 failure reasons + mitigation, from Oettingen's WOOP) |
| **System** | **Actions** (daily/weekly habits) · **Accountability** · **Adaptation** | **Tracking** · **Reminders** · **Accountability** |

**Build recommendation: use the union.** 12 distinct text fields; only *Steps*, *Accountability* and *Snags≈Crystal Ball* overlap. The union is strictly richer than either and every field is independently sourced.

Layered formatting rules (v2025): tie to an identity · keep 100% within your control · convert skills into projects ("learn to cook" → "host regular dinner parties") · append *"while enjoying every step of the journey"*.

Worked examples ship pre-filled in his own casual voice — *Operation Banger*, *Operation Gymshark*, with candid Snags→plan pairs (*"Don't let it lol. Pre-book and pre-pay for PT."*). **Pre-filled messy examples are a pedagogy pattern worth copying.**

Superseded but documented: **Anti-Wasteman System** — contains a mechanic worth stealing, *"how surprised would I be if I failed?"* on 1–10. And **NICE goals** from the book, where the **I flipped from *Identity-based* (2023 tweet) to *Input-based* (book, 9 sources) with no acknowledgement anywhere**. Use Input-based; note the discrepancy.

### B3. Feel-Good Productivity

3 parts → 3 chapters → 3 strategies → 2 experiments = **54 experiments**. The adoption unit is deliberately the *experiment*, not the habit.

- **Energise** — Play · Power · People
- **Unblock** — uncertainty · fear · inertia → Seek Clarity, Find Courage, Get Started
- **Sustain** — over-exertion · depletion · **misalignment** → Conserve, Recharge, Align

**Misalignment is the life-direction branch** and it's a real cascade: *"the negative feelings that arise when our goals don't match up to our sense of self."* Detect (tired despite success + rested) → check motivation against SDT hierarchy (External → Introjected → Identified → Intrinsic) → localise via Wheel of Life → Eulogy/Odyssey (long) → 12-Month Celebration (medium) → Three Alignment Quests (daily) → Alignment Experiments (iterate).

Other buildable units: **Energy Investment Portfolio** (List A dreams vs List B active, **hard cap 3–5** — a load audit that forces trade-offs), Magic Post-It, Confidence Switch, 10/10/10, Five Whys, Implementation Intentions, Commander's Intent (Purpose/End State/Key Tasks).

### B4. Direction-finding exercises (verified protocols)

| Exercise | Protocol | Time |
|---|---|---|
| **Odyssey Plan** | 3 × 5-year lives: current path / completely different / money+obligations+opinions irrelevant. Test: *"does the process of getting there excite you?"* | 30–60 min |
| **Gravestone** | 3 things on your gravestone. His — good father/husband/teacher — ended his medical career. | 10 min |
| **Funeral Speakers** | What would family / friends / co-workers / *someone whose life your work impacted* say? Then: *"to what extent am I living in alignment with that?"* | 20 min |
| **Wikipedia Page** | "What's in the achievements section?" — separates impact from character | 10 min |
| **Own Obituary** | Bullet relationships + work → feed to ChatGPT → read the eulogy back. 10 sentence stems recovered verbatim. | 30 min |
| **Ideal Ordinary Week** | Block a blank Google Calendar. Phase 1 now / Phase 2 future. Then *"what's stopping me having this now?"* (credit: Simon Severino) | 15 min |
| **Ideal Tuesday / Sunday** | Bulleted list; diagnostic is the gap between stated wants and actions (Kevin Dahlstrom) | ~1 hr |
| **Energy Audit** | Last 2 weeks of calendar, mark +/++/−/−− (Grace Lordan; DYL's Good Time Journal is the twin) | 30 min |
| **Fear-Setting** | Ferriss, by name, two variants. He filmed himself doing it (`HPcIwHwZIhI`) | 10 min |
| **Purpose Audit + 30-day authenticity experiment** | Joe Hudson, 2025. **Current position: purpose is *how*, not *what*.** | 30 min + 30 days |

**North Star prompts (5):** Ideal Tuesday · Fearless Dream (*"if you knew you couldn't fail"*) · **Fail-Proof Dream** (*"even if you knew you'd fail"*) · Future TED Talk (*you, 20 years on*) · Obituary.

**Annual reflection prompts (8, verbatim):** Key Events (walk the calendar month by month) → Major Milestones (3–5) → Gratitude → Challenges Overcome → Unfulfilled Aspirations → Relationships and Connections → Professional/Academic Growth → Looking Forward.

**Dream dump:** 10-min timer, *"At some point in the next 10 years…"*, 10 prompts (learn/see/have/be/try/do/go/create/contribute/overcome) → tag each 1/3/5/10 years → converge to 3–5 per horizon.

### B5. Cadence loops

| Loop | When | Duration | Output |
|---|---|---|---|
| **Morning Manifesto** — Prime / Remind / Plan | daily | 3–5 min | "Today's adventure" + 1–3 handwritten tasks, all calendar-blocked |
| **Weekly Reflection** — 5 questions, 3 min each | Sunday night | 15–30 min | Top 3 Outcomes + calendar blocks |
| **Weekly Review** ("ward round") | same sitting | folded in | Projects re-sorted; each gets status + next action |
| **Quarterly Quests** | every 90 days | 30–60 min | 1 Work main quest + 1 Life main quest, 2–3 side quests each |
| **Annual** | Dec/Jan | 3h live | Annual review + Year-at-a-Glance + Ideal Week |
| **Monthly** | — | — | **Does not exist** (only a monthly *relationship* review) |

**Weekly questions verbatim:** year's top 3–5 goals → last week's accomplishments → last week's challenges / *"in what way did you not act in line with your best self?"* → create calendar blocks → *"if the week ahead was great, what would be the top 3 things you'd accomplish?"*

**Quest schema:** `title · why · verifiable_criteria[] · emotional_resonance · execution_commitments[]`

**Focus Hour structure** (taught in Productivity Lab): 5 min Align → 5 min Organize → 50 min Focus → 5 min Recharge → 5 min Reflect.

### B6. Pedagogy — what makes people finish (this is the part most relevant to "takes hours")

From the paid programmes, verified via student accounts and Wayback:

- **Squads/pods of 8–12**, matched by time zone and goals, coach-led, scripted 45-min agenda: wins → last week's commitment → one priority → blockers
- **Refund-on-completion** as commitment device; **reflection surveys as the gate** on that refund
- **Effort-gated guarantees with published time costs** (Scorecard 5 min, Pulse 10 min)
- **Drip-release** "so you don't binge and burn out"
- **One reflection instrument reused** at annual and quarterly horizons
- **Sentence stems + 3-min timers** for heavy questions
- **Pre-filled messy worked examples** in the author's real voice
- A published **20-question scored intake assessment** (Vision / Prioritisation / Systems / Presence)

**Honest drop-off data** — a paying member's own words, the most valuable finding for a multi-hour product:

> "Quarter one: huge transformation… Quarter 2: shifting energy, I was less active… I felt like I had already extracted most of the value… Quarter four: life gets in the way." … "I can walk on my own now… I didn't need the scaffolding anymore."

**Design implication: value is extracted in roughly one quarter.** Build for a complete, finishable arc — not an indefinite subscription surface.

---

## Part C — Proposed journey: "Life Direction Intensive"

**~8–11 hours across 6 sessions**, resumable, evidence-gated. Ali-sourced steps marked ⓐ; gap-fills marked ⊕.

### Session 0 — Baseline (~45 min)
- ⓐ 20-question scored intake (Vision / Prioritisation / Systems / Presence) → archetype + weakest dimension
- ⓐ Wheel of Life: 9 areas + Joy, 0–10 **alignment**
- ⓐ Energy audit: last 2 weeks, +/++/−/−−
- ⊕ **Constraints capture**: money, hours actually available, dependants, health, non-negotiables → persists into every later step and gates the plan

### Session 1 — Reflect (~75 min)
- ⓐ 8 annual reflection prompts, calendar walked month by month
- ⓐ Circle one area per domain to work on (lowest *you care about*)

### Session 2 — Direction (~2.5 h) — the longest, deliberately
- ⓐ 5 North Star prompts (Ideal Tuesday · Fearless Dream · Fail-Proof Dream · Future TED Talk · Obituary)
- ⓐ Gravestone · Funeral Speakers · Wikipedia Page · 10 eulogy sentence stems
- ⓐ Odyssey Plan — 3 × 5-year lives … ⊕ **plus the restored DYL dashboard**: score each on Resources / Likability / Confidence / Coherence
- ⊕ **Values elicitation** — pairwise forced ranking + conflict detection (`valuesFramework.ts`). *He has no values exercise; this is a genuine hole.*
- ⓐ Fear-setting on the scariest viable option

### Session 3 — Converge (~1.75 h)
- ⓐ Dream dump, 10-min timer, 10 prompts → tag 1/3/5/10 years
- ⓐ 12-Month Celebration → boil to one per domain → add why + *"while enjoying every step"*
- ⓐ Energy Investment Portfolio — **hard cap 3–5 active**
- ⊕ **Trade-off budget** — allocate finite weekly hours across areas; over-allocation blocks progress. The Wheel shows imbalance and stops; this makes the user *resolve* it.
- ⊕ **Coherence check** — flag goals that contradict the top-ranked values or each other

### Session 4 — Goal formation (~2 h)
- ⓐ **Full GPS union, 11 fields** (B2)
- ⓐ Crystal Ball pre-mortem · **80% realism gate** (below → rethink, cannot advance) · *"how surprised would I be if I failed?"* 1–10
- ⓐ Identity phrasing · 100%-controllable check · skill→project conversion
- ⊕ **Lead indicators** per goal (12WY restoration) — the weekly-scoreable input, not the outcome

### Session 5 — Reality-test & install (~1.5 h)
- ⓐ Ideal Ordinary Week on a blank calendar
- ⓐ **Fit test — block every quest in; if it doesn't fit, cut the goal.** Now enforced against the Session 0 constraints, not vibes.
- ⓐ Install cadence: Morning Manifesto · Weekly Reflection (5 Qs) · Quarterly review. **No monthly layer** — matches his model and the evidence.
- ⓐ Project status enum 🟢🟡🔴🔵
- ⊕ **Accountability setup** — partner or pod, scripted 45-min agenda
- ⊕ **Prototyping assignment** (DYL restoration) — one cheap real-world test of the riskiest assumption, before committing a year to it

### Then: recurring loops
Daily manifesto → weekly reflection + execution score (⊕ 85% rule) → quarterly re-quest → annual re-run from Session 1.

---

## Part D — Build notes (AI execution)

**Read `08` findings in-thread for the repo map.** Key points:

- **State model:** extend `NsPlan` in [types.ts](../../../src/goals/types.ts) — only life-direction service with clean `plan → plan` reducers, a migration path (`loadNsPlan`), and `nsProgress`/`planAsText`. Not `VisionPlanState` (~45 loose fields).
- **Step engine:** [useSteppedFlow.ts](../../../src/shared/useSteppedFlow.ts) + `HistoryBarrierContext`. Session gating: copy `GUIDE_SESSIONS` / `guideProgress` / `guideSessionSatisfied` from [visionPlanService.ts](../../../src/goals/visionPlanService.ts) (evidence-driven completion, not click-through).
- **Wizard chrome:** `setup/GoalSetupWizard.tsx`, `AnimatedStep`, `BottomBar`, `GlassCard`. Container `max-w-3xl` (dominant) — **grep siblings before choosing**.
- **⚠️ Persistence is a hard blocker.** Nothing in this domain is persisted — no table for vision, north star, areas, area reviews, values ranking, rituals, weekly reviews, beliefs, identity. An 8–11 hour journey **cannot** run on localStorage. Requires a migration + **RLS review with the user** (goals/reviews are user-entered, but any computed scores are system-only per CLAUDE.md §5). Canon plan already flags this as deferred pending security review.
- **⚠️ Copy provenance.** `lifeMasteryCopyLint.test.ts` enforces provenance-or-silence against `lifeMasteryCorpus.ts` (1,264 quotes). Quoting Abdaal in UI requires an **equivalent verified corpus file** built from the 38 transcripts these agents pulled — not paraphrase.
- **⚠️ Do not merge the three existing systems** without an explicit decision — each service header refuses it deliberately.
- **Icons:** any new icon needs `iconRoles.ts` check + user approval.

---

## Part E — Verification status

**Strong:** Wheel of Life (2 independent agents), GPS v2024 (verbatim public workbook), GPS v2025 (video transcripts), annual reflection prompts, cadence loops, FGP skeleton, product timeline (Wayback CDX), pedagogy (first-hand student accounts).

**Unverified / gated:**
- FGP printed instruction wording for most of the 54 experiments — pirated texts deliberately not mined. Names and intent solid; **verbatim boxes are not**. Closing this needs a legitimate copy of the book.
- LifeOS Notion schema — **paywalled $297, no property names public.** Any circulating "Ali's LifeOS schema" is reconstruction. Do not present one.
- Wheel of Life quiz item wording (form-gated) · Year-at-a-Glance columns (email-gated) · Spark 2026 workbook (404) · 2024 workbook §3b (Scribd images only)
- Annual theme selection — **no source at all**
- Whether Quarterly Quests formally derive from 12-Month Celebrations
- Real completion rates — **no published figures exist anywhere**

**Assumptions in the original briefs that the research falsified:** ikigai exercise · CGP Grey yearly-theme credit · PARA as his schema · monthly review layer · "4-week experiment" framing in goal content · Bezos/10-10-10/reversibility frameworks · substantive Guardian/FT critical reviews (the FT line is jacket blurb) · Trustpilot corpus (page 404s).

**Rejected sources** (documented in `06`/`07`): ScamRisk (lead-gen funnel), austinplease.com (AI-generated, fabricated statistics), piracy-site "curricula" (either stolen sales copy or synonym-spun).
