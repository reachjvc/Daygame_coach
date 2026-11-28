/**
 * THE ONE DOOR TO CLAUDE: EVERY CALL IS BOOKED AGAINST THE PERSON'S CAP FIRST.
 *
 * Every feature of the site that calls Claude calls one of the functions
 * below, and nothing else in src/ or app/ may reach Claude
 * (tests/unit/api_ai/onlyTheGuardCallsClaude.test.ts fails if anything does).
 *
 * Each call:
 *   1. guesses its cost from the prompt's length and its output limit (high on
 *      purpose), and books that guess against the person's cap for the
 *      feature (src/db/aiSpendRepo.ts). The database checks and books under one
 *      lock, so calls fired together cannot all slip under the cap. No room:
 *      `AiCapReachedError`, and Claude is never called.
 *   2. runs.
 *   3. replaces the guess with the real price, counted from the token usage
 *      the API returned (or the price the Claude program reports).
 *
 * HOW FAR OVER THE CAP A PERSON CAN GET: only by what a call really costs
 * above its booked guess, for the calls running at that moment. For the API
 * the guess counts a token per 3 characters (real text runs about 4) and the
 * full output limit, so the real price is almost always lower. For the Claude
 * program the guess prices its hidden instructions as cached; when they are
 * not (the first call after a pause), one call can cost up to about 20 cents
 * more than its guess. Those calls run on the Max subscription, not on money.
 *
 * Fail-closed: if the booking cannot be made (database down), the call is
 * refused with an error. If the settling write fails, the booking keeps its
 * guess. A call the API answered with an error status is settled at 0 (the
 * API bills no tokens for it); any other failure keeps the guess.
 */

import { APICallError, RetryError, generateText } from "ai"
import { anthropic } from "@ai-sdk/anthropic"

import { reserveAiSpend, settleAiSpend, type AiSpendSettlement } from "@/src/db/aiSpendRepo"
import { parseClaudeJSON, queryClaudeHeadlessWithCost } from "@/src/shared/claudeHeadless"
import {
  AI_CAP_REACHED_MESSAGE,
  AI_SPEND_CAPS_CENTS,
  CLI_OUTPUT_TOKENS_GUESS,
  CLI_OVERHEAD_TOKENS,
  ESTIMATE_CHARS_PER_TOKEN,
  pricingFor,
  type CappedAIFeature,
} from "./config"
import { calculateCost } from "./apiAiService"

/** Thrown when a call would pass the person's cap. Its message is the line the person sees. */
export class AiCapReachedError extends Error {
  readonly code = "AI_CAP_REACHED" as const
  constructor(readonly feature: CappedAIFeature) {
    super(AI_CAP_REACHED_MESSAGE)
    this.name = "AiCapReachedError"
  }
}

/** Who is calling, for which feature and step. */
export type AiCall = {
  userId: string
  feature: CappedAIFeature
  operation: string
  scenarioId?: string
}

/** The model the Claude program runs is not known before the call. */
const CLI_MODEL = "claude-cli"

const estimateTokens = (chars: number) => Math.ceil(chars / ESTIMATE_CHARS_PER_TOKEN)

/** Cents for input and output tokens at a model's uncached prices. */
function centsFor(model: string, inputTokens: number, outputTokens: number): number {
  const p = pricingFor(model)
  return ((inputTokens * p.input + outputTokens * p.output) / 1_000_000) * 100
}

const flat = (totalCostCents: number, responseTimeMs: number, error?: string): AiSpendSettlement => ({
  inputTokens: 0,
  outputTokens: 0,
  cacheCreationTokens: 0,
  cacheReadTokens: 0,
  inputCostCents: 0,
  outputCostCents: 0,
  cacheCreationCostCents: 0,
  cacheReadCostCents: 0,
  totalCostCents,
  responseTimeMs,
  error,
})

const shortError = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 200)

/** Book, run, settle. `run` returns its value and what the call really cost. */
async function guarded<T>(
  call: AiCall,
  model: string,
  estimateCents: number,
  run: () => Promise<{ value: T; settlement: (ms: number) => AiSpendSettlement }>,
  costOfFailure: (e: unknown, estimateCents: number) => number
): Promise<T> {
  if (!call.userId) throw new Error("AI call refused: no user to count it against")
  const capCents = AI_SPEND_CAPS_CENTS[call.feature]
  if (capCents === undefined) throw new Error(`AI call refused: feature "${call.feature}" has no cap`)

  const bookingId = await reserveAiSpend({
    userId: call.userId,
    feature: call.feature,
    operation: call.operation,
    model,
    scenarioId: call.scenarioId,
    capCents,
    estimateCents,
  })
  if (!bookingId) throw new AiCapReachedError(call.feature)

  const started = Date.now()
  let settlement: AiSpendSettlement
  let outcome: { ok: true; value: T } | { ok: false; error: unknown }
  try {
    const done = await run()
    settlement = done.settlement(Date.now() - started)
    outcome = { ok: true, value: done.value }
  } catch (e) {
    settlement = flat(costOfFailure(e, estimateCents), Date.now() - started, shortError(e))
    outcome = { ok: false, error: e }
  }

  try {
    await settleAiSpend(bookingId, settlement)
  } catch (e) {
    // The booking keeps its guess: the person is over-counted, never under.
    console.error(`[aiGuard] could not settle booking ${bookingId}:`, shortError(e))
  }

  if (!outcome.ok) throw outcome.error
  return outcome.value
}

/** An API error with a status code: the API answered, and bills nothing for an error answer. */
function apiAnsweredWithError(e: unknown): boolean {
  if (APICallError.isInstance(e)) return e.statusCode !== undefined
  if (RetryError.isInstance(e)) return apiAnsweredWithError(e.lastError)
  return false
}

export type ClaudeMessage = { role: "user" | "assistant"; content: string }

/** One call to the Anthropic API. Returns the answer's text. */
export async function askClaude(
  call: AiCall,
  request: {
    model: string
    system?: string
    messages: ClaudeMessage[]
    maxOutputTokens: number
    temperature?: number
  }
): Promise<string> {
  const promptChars =
    (request.system?.length ?? 0) + request.messages.reduce((sum, m) => sum + m.content.length, 0)
  const estimateCents = centsFor(request.model, estimateTokens(promptChars), request.maxOutputTokens)

  return guarded(
    call,
    request.model,
    estimateCents,
    async () => {
      const result = await generateText({
        model: anthropic(request.model),
        system: request.system,
        messages: request.messages,
        maxOutputTokens: request.maxOutputTokens,
        temperature: request.temperature,
      })
      return {
        value: result.text,
        settlement: (ms) => settlementFromUsage(request.model, result.totalUsage, estimateCents, ms),
      }
    },
    (e, guess) => (apiAnsweredWithError(e) ? 0 : guess)
  )
}

type Usage = Awaited<ReturnType<typeof generateText>>["totalUsage"]

/** The real price from the API's token counts; the guess when it reported none. */
export function settlementFromUsage(model: string, usage: Usage, estimateCents: number, ms: number): AiSpendSettlement {
  if (typeof usage?.inputTokens !== "number" || typeof usage?.outputTokens !== "number") {
    return flat(estimateCents, ms, "no token usage reported")
  }
  const cacheReadTokens = usage.inputTokenDetails?.cacheReadTokens ?? 0
  const cacheCreationTokens = usage.inputTokenDetails?.cacheWriteTokens ?? 0
  // `inputTokens` is every input token, cached ones included.
  const inputTokens =
    usage.inputTokenDetails?.noCacheTokens ?? Math.max(0, usage.inputTokens - cacheReadTokens - cacheCreationTokens)
  const cost = calculateCost(model, {
    inputTokens,
    outputTokens: usage.outputTokens,
    cacheCreationTokens,
    cacheReadTokens,
  })
  return {
    inputTokens,
    outputTokens: usage.outputTokens,
    cacheCreationTokens,
    cacheReadTokens,
    ...cost,
    responseTimeMs: ms,
  }
}

/**
 * The guess for one Claude program call: its prompt, its own instructions
 * (at the cached price: the program caches them between calls), and an
 * allowance of output.
 */
function cliEstimateCents(prompt: string): number {
  const p = pricingFor(CLI_MODEL)
  const dollars =
    estimateTokens(prompt.length) * p.input + CLI_OVERHEAD_TOKENS * p.cacheRead + CLI_OUTPUT_TOKENS_GUESS * p.output
  return (dollars / 1_000_000) * 100
}

/** One call through the Claude program (Max subscription). Returns the answer's text. */
export async function askClaudeCli(call: AiCall, prompt: string, options: { timeoutMs?: number } = {}): Promise<string> {
  const estimateCents = cliEstimateCents(prompt)
  return guarded(
    call,
    CLI_MODEL,
    estimateCents,
    async () => {
      const answer = await queryClaudeHeadlessWithCost(prompt, options)
      return {
        value: answer.text,
        settlement: (ms) =>
          answer.costUsd === null
            ? flat(estimateCents, ms, "no cost reported")
            : flat(answer.costUsd * 100, ms),
      }
    },
    (e, guess) => {
      // The program never started (not installed here): nothing ran.
      if ((e as { code?: unknown })?.code === "ENOENT") return 0
      const reported = (e as { costUsd?: unknown })?.costUsd
      return typeof reported === "number" ? reported * 100 : guess
    }
  )
}

/** `askClaudeCli` for a prompt whose answer must be JSON. */
export async function askClaudeCliJSON<T>(call: AiCall, prompt: string, options: { timeoutMs?: number } = {}): Promise<T> {
  return parseClaudeJSON<T>(await askClaudeCli(call, prompt, options))
}
