/**
 * THE SPEND-CAP GUARD: BOOK FIRST, CALL ONLY WITH ROOM, SETTLE AT THE REAL PRICE.
 *
 * src/api_ai/aiGuard.ts is the one door to Claude. Here the database booking
 * (src/db/aiSpendRepo.ts, tested against Postgres in
 * tests/integration/repos/aiSpendCap.integration.test.ts) and Claude itself
 * are replaced, so each test checks one thing the guard decides. Claude is
 * never really called: that costs money.
 */
import { describe, test, expect, vi, beforeEach } from "vitest"
import { APICallError } from "ai"

const repo = vi.hoisted(() => ({
  reserveAiSpend: vi.fn(),
  settleAiSpend: vi.fn(),
}))
const ai = vi.hoisted(() => ({ generateText: vi.fn() }))
const cli = vi.hoisted(() => ({ queryClaudeHeadlessWithCost: vi.fn() }))

vi.mock("@/src/db/aiSpendRepo", () => repo)
vi.mock("ai", async (importOriginal) => ({ ...(await importOriginal<typeof import("ai")>()), ...ai }))
vi.mock("@ai-sdk/anthropic", () => ({ anthropic: (modelId: string) => ({ modelId }) }))
vi.mock("@/src/shared/claudeHeadless", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/src/shared/claudeHeadless")>()),
  ...cli,
}))

import { askClaude, askClaudeCli, AiCapReachedError } from "@/src/api_ai/aiGuard"
import { AI_CAP_REACHED_MESSAGE, AI_SPEND_CAPS_CENTS } from "@/src/api_ai/config"

const MODEL = "claude-haiku-4-5-20251001" // $1 in, $5 out, $1.25 cache write, $0.10 cache read per million

const call = { userId: "user-1", feature: "keep-it-going" as const, operation: "evaluate" }
const request = {
  model: MODEL,
  system: "x".repeat(3000),
  messages: [{ role: "user" as const, content: "hello" }],
  maxOutputTokens: 250,
}

const usage = (over: { noCache?: number; cacheRead?: number; cacheWrite?: number; output?: number } = {}) => {
  const noCache = over.noCache ?? 1000
  const cacheRead = over.cacheRead ?? 0
  const cacheWrite = over.cacheWrite ?? 0
  return {
    inputTokens: noCache + cacheRead + cacheWrite,
    inputTokenDetails: { noCacheTokens: noCache, cacheReadTokens: cacheRead, cacheWriteTokens: cacheWrite },
    outputTokens: over.output ?? 100,
    outputTokenDetails: { textTokens: over.output ?? 100, reasoningTokens: 0 },
    totalTokens: noCache + cacheRead + cacheWrite + (over.output ?? 100),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  repo.reserveAiSpend.mockResolvedValue("booking-1")
  repo.settleAiSpend.mockResolvedValue(undefined)
  ai.generateText.mockResolvedValue({ text: "her reply", totalUsage: usage() })
})

describe("askClaude, the guard around every Anthropic API call", () => {
  test("refuses with the cap line, and never calls Claude, when the booking does not fit", async () => {
    repo.reserveAiSpend.mockResolvedValue(null)

    await expect(askClaude(call, request)).rejects.toThrow(AiCapReachedError)
    await expect(askClaude(call, request)).rejects.toThrow(AI_CAP_REACHED_MESSAGE)
    expect(ai.generateText).not.toHaveBeenCalled()
  })

  test("books against the feature's own cap before calling Claude", async () => {
    await askClaude(call, request)

    expect(repo.reserveAiSpend).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", feature: "keep-it-going", capCents: AI_SPEND_CAPS_CENTS["keep-it-going"] })
    )
    expect(repo.reserveAiSpend.mock.invocationCallOrder[0]).toBeLessThan(ai.generateText.mock.invocationCallOrder[0])
  })

  test("books a guess no lower than the call's real price for its prompt and output limit", async () => {
    await askClaude(call, request)

    // 3005 characters are at most ~1002 tokens at the guess's 3 per token, and
    // the output limit is 250: $1 x 1002 + $5 x 250 per million = 0.2252 cents.
    const booked = repo.reserveAiSpend.mock.calls[0][0].estimateCents
    expect(booked).toBeCloseTo(0.2252, 4)
  })

  test("settles at the price of the tokens the API reports, cached ones at their own rates", async () => {
    ai.generateText.mockResolvedValue({
      text: "her reply",
      totalUsage: usage({ noCache: 1000, cacheRead: 2000, cacheWrite: 400, output: 100 }),
    })

    await askClaude(call, request)

    // 1000 x $1 + 2000 x $0.10 + 400 x $1.25 + 100 x $5, per million, in cents.
    expect(repo.settleAiSpend).toHaveBeenCalledWith(
      "booking-1",
      expect.objectContaining({ inputTokens: 1000, cacheReadTokens: 2000, cacheCreationTokens: 400, outputTokens: 100 })
    )
    expect(repo.settleAiSpend.mock.calls[0][1].totalCostCents).toBeCloseTo(0.22, 6)
  })

  test("returns the answer's text", async () => {
    expect(await askClaude(call, request)).toBe("her reply")
  })

  test("settles at nothing when the API answered with an error, and passes the error on", async () => {
    const refused = new APICallError({ message: "model not found", url: "u", requestBodyValues: {}, statusCode: 404 })
    ai.generateText.mockRejectedValue(refused)

    await expect(askClaude(call, request)).rejects.toBe(refused)
    expect(repo.settleAiSpend).toHaveBeenCalledWith("booking-1", expect.objectContaining({ totalCostCents: 0 }))
  })

  test("keeps the booked guess when the call failed without an answer from the API", async () => {
    ai.generateText.mockRejectedValue(new Error("socket hang up"))

    await expect(askClaude(call, request)).rejects.toThrow("socket hang up")
    const booked = repo.reserveAiSpend.mock.calls[0][0].estimateCents
    expect(repo.settleAiSpend).toHaveBeenCalledWith("booking-1", expect.objectContaining({ totalCostCents: booked }))
  })

  test("refuses the call when the booking itself fails", async () => {
    repo.reserveAiSpend.mockRejectedValue(new Error("Failed to book AI spend: database down"))

    await expect(askClaude(call, request)).rejects.toThrow("database down")
    expect(ai.generateText).not.toHaveBeenCalled()
  })

  test("still answers when only the settling write fails", async () => {
    repo.settleAiSpend.mockRejectedValue(new Error("Failed to settle AI spend"))
    vi.spyOn(console, "error").mockImplementation(() => {})

    expect(await askClaude(call, request)).toBe("her reply")
  })
})

describe("askClaudeCli, the guard around the Claude program", () => {
  const cliCall = { userId: "user-1", feature: "scenario-lab" as const, operation: "lab_reply" }

  test("refuses with the cap line, and never runs the program, when the booking does not fit", async () => {
    repo.reserveAiSpend.mockResolvedValue(null)

    await expect(askClaudeCli(cliCall, "prompt")).rejects.toThrow(AiCapReachedError)
    expect(cli.queryClaudeHeadlessWithCost).not.toHaveBeenCalled()
  })

  test("settles at the cost the program reports", async () => {
    cli.queryClaudeHeadlessWithCost.mockResolvedValue({ text: "reply", costUsd: 0.034 })

    expect(await askClaudeCli(cliCall, "prompt")).toBe("reply")
    expect(repo.settleAiSpend.mock.calls[0][1].totalCostCents).toBeCloseTo(3.4, 6)
  })

  test("settles at nothing when the program is not installed", async () => {
    cli.queryClaudeHeadlessWithCost.mockRejectedValue(Object.assign(new Error("spawn claude ENOENT"), { code: "ENOENT" }))

    await expect(askClaudeCli(cliCall, "prompt")).rejects.toThrow("ENOENT")
    expect(repo.settleAiSpend).toHaveBeenCalledWith("booking-1", expect.objectContaining({ totalCostCents: 0 }))
  })
})
