# SMAD Protocol Reference

Detailed prompt templates, moderator decision logic, and convergence/deadlock detection for the `/debate` skill.

## Prompt Templates

### Opening Prompt (Phase 1)

```
You are [NAME] — [ROLE/BACKGROUND in 1-2 sentences].

You are participating in a structured debate on the following topic:

---
[TOPIC TEXT — paste full topic, context documents, or model description here]
---

YOUR ANALYTICAL LENS: [LENS NAME]
[LENS DESCRIPTION — what you prioritize, what you're skeptical of, what evidence you trust]

State your position on this topic. Make 2-3 specific claims backed by evidence
or reasoning. Be direct — if you see a problem, say so plainly. If you think
the approach is sound, explain why and identify the strongest objection someone
could raise.

Speak in your authentic voice. Write in prose, not bullet lists.
Aim for roughly 300 words but use what you need.

Do NOT structure your response with headers or numbered sections.
Do NOT use labels like "Claim 1:" or "Evidence:" — weave them naturally.
```

### Cross-Examination Prompt (Phase 3)

```
You are [NAME] — [ROLE/BACKGROUND].

YOUR ANALYTICAL LENS: [LENS NAME]
[LENS DESCRIPTION]

Here is the full debate transcript so far:

---
OPENING STATEMENTS:

[NAME_1]: [Full text of their opening]

[NAME_2]: [Full text of their opening]

[NAME_3]: [Full text of their opening]

CROSS-EXAMINATION:

[Round 1] Moderator to [NAME_X]: [Question]
[NAME_X]: [Full response]

[Round 2] Moderator to [NAME_Y]: [Question]
[NAME_Y]: [Full response]

[... all rounds so far ...]
---

THE MODERATOR'S QUESTION TO YOU:
[SPECIFIC QUESTION — under 75 words, quoting the claim being challenged]

Respond to the specific question asked. Engage with the actual argument being
made against your position — do not just restate what you said in your opening.

If the counter-evidence is strong, acknowledge it and refine your position.
If it's weak, explain specifically why.

You may change your mind. Changing your position when presented with better
evidence is a sign of good reasoning, not weakness.

Aim for roughly 250 words.
```

### Safety Valve Prompt (when all agents agree)

```
You are [NAME] — [ROLE/BACKGROUND].

YOUR ANALYTICAL LENS: [LENS NAME]
[LENS DESCRIPTION]

The other panelists have all taken similar positions on this topic:

---
[SUMMARIZE the shared position in 2-3 sentences]
---

Their openings:
[FULL TEXT of all openings]

Your task: Construct the strongest possible counter-argument. Not a strawman —
a genuine, evidence-backed challenge to the consensus position. What are they
all missing? Where will this approach fail? What second-order effects have they
not considered?

If after genuine reflection you still agree with them, say so and explain why
the consensus is robust. Do not manufacture disagreement for its own sake.
```

## Moderator Decision Logic

### After Openings: Identifying Disagreements

Read all openings and create a list of disagreements. A disagreement exists when:
- Two agents make **contradictory factual claims** ("X is true" vs "X is false")
- Two agents propose **incompatible recommendations** ("do A" vs "do B, not A")
- One agent **challenges the premise** that others accept
- Two agents **weight the same factor differently** ("X is the most important factor" vs "X is secondary to Y")

Rank disagreements by **productivity potential**:
1. **High**: Both sides have evidence. Resolution would change the conclusion.
2. **Medium**: One side has evidence, the other has intuition. Could be resolved with the right question.
3. **Low**: Semantic disagreement (using different words for same concept) or peripheral to the main topic.

Start with the highest-productivity disagreement.

### Routing Question Formulation

A good routing question:
- **Quotes** the specific claim being challenged: "Agent B said [exact quote]. You claimed [exact quote]. How do you reconcile this?"
- **Is falsifiable**: The agent can actually answer it with evidence or reasoning
- **Cannot be answered with a restatement**: Forces the agent to engage with the counter-argument specifically
- Is **under 75 words**

Bad routing questions:
- "What do you think about what Agent B said?" (too vague)
- "Do you agree or disagree?" (binary, not productive)
- "Can you elaborate on your position?" (invites restatement)

### Convergence Detection

After each cross-examination response, check:

**Explicit convergence**: The agent uses language like:
- "I agree with [Name]'s point about..."
- "[Name] is right that..."
- "I concede that..."
- "I was wrong about... because..."
- "After hearing [Name]'s evidence, I'd revise my position to..."

When detected: Move the claim to `converged`. Note it in the transcript: "**[Moderator note: [Name_A] and [Name_B] have converged on [claim].]**"

**Implicit convergence**: The agent shifts their position without explicitly acknowledging it. Their new statement is compatible with the opposing view. This is softer — note it but don't mark as fully converged unless explicit.

### Deadlock Detection

After each response, check:

**Repetition deadlock**: Compare the response to the agent's previous statements. If the core claim and evidence are substantively the same as a previous round — no new reasoning, no new evidence, no refined position — it's a deadlock.

When detected: Note in transcript: "**[Moderator note: [Name] has restated their position from Round [N] without new evidence. Moving to next topic.]**"

**Circular deadlock**: Two agents alternate making the same arguments to each other. A says X, B says Y, A says X again, B says Y again.

When detected: Note it and move on, or ask a THIRD agent to weigh in as a tiebreaker.

### Stop Conditions (Convergence-Driven)

The debate runs until agents have genuinely exhausted their arguments — until there is nothing left to say. There is NO fixed round limit. Stop ONLY when ALL of these are true:

1. Every active disagreement has either converged or deadlocked
2. The last 2 exchanges produced no new insights (no new claims, no position shifts, no new evidence)
3. No agent has introduced new evidence that another agent hasn't had the chance to respond to
4. The moderator cannot formulate a routing question that would produce new reasoning

**Hard safety limit**: 15 exchanges maximum. This is a runaway guard, not a target. Most debates will naturally exhaust in 6-10 exchanges. If you hit 15, something is wrong — summarize remaining disagreements as unresolved.

**Do NOT stop early because:**
- A set number of rounds was reached
- "The agents have had a chance to speak" (having a chance is not the same as being done)
- The debate feels long — length is fine if new reasoning keeps emerging
- You want to be efficient — thoroughness beats speed in debates

## Transcript Formatting

Maintain the transcript as a growing string. Format:

```
=== OPENING STATEMENTS ===

[NAME_1] ([Lens]):
[Full text]

[NAME_2] ([Lens]):
[Full text]

[NAME_3] ([Lens]):
[Full text]

=== CROSS-EXAMINATION ===

[Round 1] Moderator → [NAME_X]:
"[Routing question]"

[NAME_X]:
[Full response]

[Moderator note: ...]

[Round 2] Moderator → [NAME_Y]:
"[Routing question]"

[NAME_Y]:
[Full response]

...
```

This format is what gets pasted into each agent's prompt as "the full debate transcript so far." It must be human-readable because agents need to parse it.

## Anti-Patterns to Avoid

1. **Parallel cross-examination**: Spawning multiple agents at once during cross-exam. This produces parallel monologues. Always sequential after openings.

2. **Summarizing prior rounds**: Replacing full agent quotes with summaries like "Agent A argued that the model is missing X." This loses nuance and forces agents to respond to your interpretation, not the original argument.

3. **Enforcing format**: Telling agents to structure responses as "Claim: ... Evidence: ... Warrant: ..." Toulmin structure should emerge naturally from good prompts, not from formatting constraints.

4. **Asking all agents about everything**: Not every agent needs to speak on every disagreement. Route questions to the 1-2 agents most relevant to each specific point.

5. **Stopping at a fixed round count**: The right number of rounds depends on the debate, not a timer. Monitor convergence/deadlock/insight signals.

6. **Adding your own opinions as moderator**: The moderator routes questions and detects patterns. Do not inject your own position into the debate. If you have a view, spawn another agent to argue it.
