/**
 * The one place this flow asks a model anything.
 *
 * Every other door on the goals tab is deterministic: the 10 is split on
 * punctuation, a written day is read with a regex, a line with a number in it
 * becomes a climb. That is the right default — it works offline, costs nothing,
 * is testable, and never invents a goal somebody did not mean. But it can only
 * ever rearrange what the person already typed, and the person who cannot type
 * anything is exactly who the doors are for.
 *
 * So: one button, one call, candidates that arrive UNTICKED like every other
 * door's. The model is a suggestion engine here, not an author — nothing it
 * returns enters the plan until somebody ticks it.
 *
 * PRIVACY, BECAUSE THIS IS THE PART THAT LEAVES THE BROWSER. The rest of the
 * page runs on localStorage and calls nothing. This sends what the person wrote
 * — their 10, their day, their bucket list — to Anthropic. The route says so,
 * the button says so, and only the fields needed for the ask are sent: never
 * the whole plan, never the north star, never the ratings.
 *
 * IT DOES NOT SPEND API CREDITS. It goes through the Claude Code CLI on the
 * machine running the dev server (`queryClaudeHeadless`, which strips
 * ANTHROPIC_API_KEY from the child's env so it cannot quietly fall back to a
 * metered key). The first version used the API and every button on the page
 * died on "your credit balance is too low" — a bill nobody agreed to for a test
 * page, and an outage besides. Same wrapper the scenario lab and the vision
 * plan already use.
 */

import { z } from "zod"
import { queryClaudeHeadlessJSON } from "@/src/shared/claudeHeadless"

/**
 * What the model is allowed to return.
 *
 * Short lists on purpose. Twenty candidates is a wall to read and a worse
 * version of the catalogue this flow already demoted; twelve is a screen.
 *
 * NOTE THE ABSENCE OF STRING LENGTH CAPS, which is deliberate and was a bug.
 * These used to be `.max(120)` / `.max(200)`, and a reply that was correct in
 * every way except that one sentence ran ten characters long failed the parse —
 * which the caller reports as an error, so the whole answer was thrown away over
 * punctuation. Length is a display concern and is enforced by `clamp` below,
 * after parsing. Structure is a correctness concern and is still strict: a reply
 * missing `goals`, or with a number where a title should be, still fails loudly.
 */
export const GENERATED = z.object({
  goals: z.array(z.object({
    title: z.string(),
    /** One line on why this follows from what they wrote. Shown under the tick. */
    because: z.string(),
  })).max(8),
  experiences: z.array(z.object({
    title: z.string(),
    because: z.string(),
  })).max(12),
})

export type Generated = z.infer<typeof GENERATED>

/**
 * The shape, written out for the prompt.
 *
 * The API path had a schema parameter that constrained decoding; the CLI has a
 * prompt, so the shape is stated in it and the answer is validated on the way
 * back. Zod is still the authority — a reply that does not parse is an error,
 * never a half-filled object handed to the UI.
 */
const GENERATED_SHAPE = `{"goals":[{"title":string,"because":string}],"experiences":[{"title":string,"because":string}]}`

/**
 * One headless call, validated.
 *
 * Fails loudly on both halves — a CLI that returns nothing and a reply that
 * does not match the shape are both errors the route reports, never an empty
 * result dressed up as "nothing found". Telling somebody their notes contain no
 * pattern when in fact the call broke is the worst answer available.
 */
async function ask<T extends z.ZodTypeAny>(schema: T, system: string, body: string, shape: string): Promise<z.infer<T>> {
  const raw = await queryClaudeHeadlessJSON<unknown>(
    `${system}\n\nReply with JSON only, no prose and no code fences, in exactly this shape:\n${shape}\n\n---\n${body}`,
    { timeoutMs: 120_000 },
  )
  const parsed = schema.safeParse(raw)
  if (!parsed.success) throw new Error(`Model reply did not match the expected shape: ${parsed.error.issues[0]?.message ?? "unknown"}`)
  return parsed.data
}

/**
 * Trim a string to what the UI has room for, on a word boundary where it can.
 *
 * This runs after parsing rather than inside the schema on purpose. Rejecting a
 * good answer because a sentence overran its cap is how this feature came to
 * "output nothing"; trimming the sentence keeps the finding and loses a clause.
 * The prompt states the same limits, so this should rarely fire at all — it is
 * the backstop, not the mechanism.
 */
export function clamp(text: string, max: number): string {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  const cut = trimmed.slice(0, max)
  const space = cut.lastIndexOf(" ")
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`
}

/**
 * What the call is for.
 *
 * `candidates` reads a brain dump and sorts it into goals and experiences.
 * `actions` does the one thing the deterministic side cannot do at all: take a
 * 10 written as a STATE — "I wake up happy and excited to start the day" — and
 * say what a person would actually DO about it. No regex turns a mood into a
 * Tuesday, and leaving that gap open is what made the flow offer somebody
 * scenery as their most important thing this season.
 */
export type GenerateMode = "candidates" | "actions"

export interface GenerateInput {
  mode?: GenerateMode
  /** What the person wrote, whichever door they came in through. */
  text: string
  /** The area's name, when the ask is scoped to one. */
  area?: string
  /** What they said a 10 looks like there, when they have written one. */
  ten?: string
  /** Titles already in the plan, so the model does not hand them back. */
  existing?: string[]
}

/**
 * The thread across somebody's notes, when there is one.
 *
 * `term` is the thing itself in their words ("weed", "the phone", "my commute"),
 * `why` says what it is doing to them, and `quotes` are the sentences it was
 * found in — the finding has to carry its own evidence or it is the page
 * telling somebody something about themselves.
 *
 * `found: false` is a first-class answer and the prompt says so. A tool that
 * must always find a pattern will always find one.
 */

export function generateFailureReason(error: unknown): string {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error)
  // The transport is the Claude Code CLI on the machine running the dev server,
  // so these are its failure modes and not an HTTP API's. The credit case is
  // kept because it is what a stray ANTHROPIC_API_KEY reaching the child looks
  // like, and it was the original symptom.
  if (/ENOENT|not found|spawn/i.test(text)) {
    return "The Claude CLI could not be found on this machine, so there was nothing to ask. Set CLAUDE_PATH, or make sure `claude` is on the dev server's PATH, and restart it."
  }
  if (/timed out|ETIMEDOUT|SIGTERM/i.test(text)) {
    return "The CLI took longer than two minutes and was stopped. Worth pressing again — long notes make this slower."
  }
  if (/returned no output/i.test(text)) {
    return "The CLI ran and came back empty, which usually means it is not logged in. Run `claude` once in a terminal on this machine and check it answers."
  }
  if (/did not match the expected shape|JSON|Unexpected token/i.test(text)) {
    return "The reply came back in a shape this page could not read. Pressing again usually fixes it; the log has what arrived."
  }
  if (/credit balance|insufficient|quota|billing/i.test(text)) {
    return "This came back as an out-of-credit API error, which means a metered key reached the CLI instead of its own login. The button is meant to use the subscription and spend nothing."
  }
  return "The model call failed. The server log has the underlying message."
}

/** Nothing over this is a paste of something else, and it is not a goal list. */
export const MAX_INPUT_CHARS = 4000

/**
 * The prompt.
 *
 * Written for a model that follows instructions closely, so it says what to do
 * rather than shouting about what not to. The two rules that matter are the
 * ones this flow has been getting wrong all along: keep the person's own words,
 * and do not turn a thing-to-have-done into a goal with rungs and a deadline.
 */
const SYSTEM_ACTIONS = `Somebody has written what a 10 out of 10 looks like in one area of their life. It is a picture of a state — how things feel when it is right — and states are not things you can do.

Turn it into things they could actually do.

Rules:
- Every suggestion must be something a person can start this week: an action with a frequency, or a target with a number in it. "Lights out by 22:30, six nights a week." "Bench 28 kg." Never "have more energy", never "be more present".
- Work from what they wrote. If their 10 says they wake up without an alarm, the actions are about sleep, not about morning routines in general.
- Where their 10 hints at something in the way — a habit, a substance, a commitment — say the action that addresses it plainly.
- Put anything that is a one-off worth having done, rather than a target to hold, in experiences.
- Say in one short line which part of their 10 each action comes from, quoting their words.
- Six at most. Fewer, better.
- Write in the language they wrote in.

Lengths, so the answer fits on the card: "term" at most 60 characters, "why" at most 300, each quote at most 200, "suggestion" at most 120.`

const SYSTEM = `You help somebody turn what they have written about their life into two lists.

GOALS are things to achieve or practise: something with an end state, a number, or a frequency. "Bench 28 kg", "no pain in my back", "publish the book", "train four times a week".

EXPERIENCES are things to have done once: no target, no schedule, no progress bar. "See the northern lights", "learn to surf", "a month working from another country". Anything somebody would tick off rather than track belongs here, including the private ones.

Rules:
- Use their words. If they wrote "stop feeling wrecked by 3pm", that is the goal — do not translate it into "improve energy levels".
- Only suggest what follows from what they wrote. No generic self-improvement filler.
- Never repeat something already in their list.
- Say in one short line why each suggestion follows from what they wrote, quoting their phrasing where you can.
- Fewer, better suggestions. An empty list is a fine answer if their text does not support any.
- Write in the language they wrote in.

Lengths, so the answer fits on the card: "term" at most 60 characters, "why" at most 300, each quote at most 200, "suggestion" at most 120.`

/**
 * Ask for candidates.
 *
 * `claude-opus-5` because the judgement here — which half of a sentence is a
 * goal and which half is scenery — is the whole value, and this runs once per
 * button press rather than per keystroke.
 */
export async function generateCandidates(input: GenerateInput): Promise<Generated> {
  const text = input.text.trim().slice(0, MAX_INPUT_CHARS)
  if (!text) return { goals: [], experiences: [] }

  const parts = [
    input.area ? `The area they are working on: ${input.area}` : null,
    input.ten?.trim() ? `What they said a 10 looks like there:\n${input.ten.trim().slice(0, MAX_INPUT_CHARS)}` : null,
    `What they wrote:\n${text}`,
    input.existing?.length ? `Already in their list, do not repeat:\n${input.existing.slice(0, 60).join("\n")}` : null,
  ].filter(Boolean)

  const object = await ask(
    GENERATED,
    input.mode === "actions" ? SYSTEM_ACTIONS : SYSTEM,
    parts.join("\n\n"),
    GENERATED_SHAPE,
  )

  // The model is capped by the schema; this is the second cap, because a list
  // nobody reads is the same as no list.
  const tidy = (items: Array<{ title: string; because: string }>, max: number) =>
    items.slice(0, max).map((i) => ({ title: clamp(i.title, 120), because: clamp(i.because, 200) }))
  return { goals: tidy(object.goals, 8), experiences: tidy(object.experiences, 12) }
}
