---
name: debate
description: This skill should be used when the user asks to "debate", "run a debate", "have agents debate", "stress-test this idea", "get multiple perspectives on", or "argue for and against". Orchestrates a structured multi-agent debate using the SMAD protocol.
---

# Structured Multi-Agent Debate (SMAD)

Orchestrate a genuine multi-agent debate that produces better answers than any single agent. Based on research from MAD (EMNLP 2024), A-HMAD (2025), and AutoGen debate patterns.

## Arguments

- **Topic**: `$ARGUMENTS[0]` — The question, model, or idea to debate. Can be a text string or a file path to read.
- **Agents**: `$ARGUMENTS[1]` — (Optional) Agent definitions. Format: `"Name:role, Name:role, ..."` or path to a file listing agents. If omitted, auto-generate 3-4 agents with diverse analytical lenses.

## Critical Rules

1. **FULL CONTEXT ALWAYS.** Every agent in cross-examination receives the COMPLETE transcript of everything said so far. Never truncate, summarize, or omit prior statements.
2. **LOOSE PROMPTS.** Do not constrain agents with word limits, required stance labels, or formatting rules. Suggest lengths ("aim for ~300 words") but never enforce. No "state your stance: agree/disagree" — let positions emerge naturally.
3. **MODERATOR DRIVES FLOW.** After openings, the orchestrator (you) acts as moderator. Route specific questions to specific agents based on emerging disagreements. Never round-robin.
4. **SEQUENTIAL CROSS-EXAMINATION.** Openings can be parallel. Everything after is sequential: one agent responds, moderator analyzes, routes next question.
5. **AGENTS CAN CHANGE THEIR MINDS.** Explicitly tell agents: changing your position when presented with better evidence is good reasoning, not weakness.

## Protocol

### Phase 0: Setup

1. If `$ARGUMENTS[0]` looks like a file path, read it. Otherwise treat as the topic text.
2. If `$ARGUMENTS[1]` is provided, parse agent definitions. Otherwise, select 3-4 agents with diverse lenses from `references/lenses.md`. Match lens domain to the topic.
3. Ensure at least one agent has a critical/contrarian lens.
4. Initialize state:
   ```
   transcript = []          # Array of {speaker, content} entries
   active_disagreements = [] # Claims where agents contradict each other
   converged = []           # Previously disputed claims now agreed
   round = 0
   ```

### Phase 1: Opening Round

Spawn all agents **in parallel** using the Task tool. Each agent sees ONLY the topic — not each other's openings. This produces genuinely independent positions.

**Opening prompt template** (adapt per agent):
```
You are [NAME] — [ROLE/BACKGROUND in 1-2 sentences].

You are participating in a structured debate on the following topic:

[TOPIC TEXT OR FILE CONTENTS]

YOUR ANALYTICAL LENS: [LENS DESCRIPTION — 1-2 sentences explaining what you prioritize]

State your position on this topic. Make 2-3 specific claims backed by evidence
or reasoning. Be direct — if you see a problem, say so plainly. If you think the
approach is sound, explain why and identify the strongest objection someone could raise.

Speak in your authentic voice. Write in prose, not bullet lists.
Aim for roughly 300 words but use what you need.
```

Collect all responses. Append each to `transcript` as `{speaker: "Name", content: "..."}`.

### Phase 2: Moderator Analysis

Read all openings yourself (do NOT spawn an agent for this). Identify:

1. **Points of disagreement**: Where do agents make contradictory claims? List 2-3 specific disagreements, quoting the conflicting claims.
2. **Points of agreement**: Where do agents converge? Note these briefly.
3. **Safety valve**: If ALL agents agree on everything, pick the agent with the most critical lens and spawn them with: "The other panelists all agree with the proposed approach. Construct the strongest possible counter-argument. What are they all missing? Where will this fail?"

Formulate your first routing question:
- Target the **strongest disagreement** (where both sides have evidence, not just opinion)
- Address it to the agent whose position is being challenged
- Quote the specific opposing claim they need to respond to
- Keep the question under 75 words — be precise

### Phase 3: Cross-Examination (Convergence-Driven, No Fixed Round Limit)

Continue until the debate is genuinely exhausted — agents have cemented their positions and there is nothing left to say. Do NOT stop at a fixed round count. The debate runs as long as new reasoning, new evidence, or genuine position shifts keep emerging.

For each exchange:

1. **Route**: Spawn the target agent with this prompt:

```
You are [NAME] — [ROLE/BACKGROUND].

YOUR ANALYTICAL LENS: [LENS DESCRIPTION]

Here is the full debate transcript so far:

[FULL TRANSCRIPT — every opening and every cross-exam response, verbatim]

THE MODERATOR'S QUESTION TO YOU:
[YOUR ROUTING QUESTION]

Respond to the specific question asked. Engage with the actual argument being
made against your position — do not just restate what you said in your opening.

If the counter-evidence is strong, acknowledge it and refine your position.
If it's weak, explain specifically why. You may change your mind — changing
your position when presented with better evidence is good reasoning.
```

2. **Append** response to transcript.

3. **Analyze** the response (do this yourself, no agent):
   - **Convergence?** Did this agent explicitly agree with or concede a previously disputed point? → Move it to `converged`, note it.
   - **Deadlock?** Did they repeat the same position and evidence from a previous round without adding anything new? → Flag it: "[Name] has restated their position without new evidence."
   - **New insight?** Did they introduce a claim, distinction, or evidence not present in any previous round? → Note it, likely warrants follow-up.
   - **Position shift?** Did they refine, narrow, or modify their earlier claim? This is a sign the debate is working — follow up to see if the opposing agent accepts the refined position.

4. **Decide next action**:
   - Route the same disagreement to the OTHER agent for counter-response? (Do this when the response introduced new evidence or a position shift the challenger should address)
   - Move to the next active disagreement?
   - Invoke a third agent who hasn't spoken on this topic but whose lens is relevant?
   - **Only stop when ALL of these are true:**
     1. Every active disagreement has either converged or deadlocked
     2. The last 2 exchanges produced no new insights or position shifts
     3. No agent has introduced new evidence that another agent hasn't responded to
   - **Hard safety limit**: 15 exchanges maximum (only as a runaway guard, not a target)

### Phase 4: Synthesis

Write the final output yourself (no agent spawn). Structure:

```markdown
## Debate: [Topic]
**Agents**: [Name (lens), Name (lens), ...]
**Rounds**: [N opening + M cross-exam]
**Status**: [Converged / Partially converged / Deadlocked]

### Key Findings
1. **[Finding]** — [Which agents agreed] — [Evidence basis]
2. **[Finding]** — [Which agents agreed] — [Evidence basis]

### Modifications to Original Proposal
- [What should change based on the debate]

### Unresolved Disagreements
1. **[Disagreement]** — [Agent X argues... Agent Y argues...] — [Why unresolved]

### Surprising Insights
[Anything that emerged from the debate that no single agent proposed in their opening]

### Full Transcript
[The complete exchange, round by round]
```

## When the User Provides Custom Agents

If `$ARGUMENTS[1]` specifies named characters (like "Tony Robbins:life coach, David Goggins:discipline"), use those as-is. But still assign each an analytical lens internally — this is what makes the debate productive. A character without a lens produces entertainment; a character with a lens produces insight.

For each custom agent, infer an appropriate lens from their role:
- Life coach → "emotional and motivational factors" lens
- Entrepreneur → "leverage, ROI, and scalability" lens
- Athlete → "deliberate practice and physical performance" lens
- Engineer → "systems, feedback loops, and measurability" lens

## References

- **`references/protocol.md`** — Detailed prompt templates with examples, convergence/deadlock detection logic, moderator decision tree
- **`references/lenses.md`** — Full catalog of analytical lenses organized by topic domain (technical, interpersonal, business, health, creative)
