/**
 * Vision-plan LLM caller — thin wrapper over the AI guard's Claude CLI call
 * (src/api_ai/aiGuard.ts), booked against the person's "vision-plan" spend
 * cap. Server-only: used by app/api/test/goals/vision-plan.
 *
 * Fail-closed: empty output or a dead CLI throws — callers surface an explicit
 * error, never a fallback plan (CLAUDE.md rule 15). A used-up cap throws
 * AiCapReachedError.
 */

import { askClaudeCli } from "@/src/api_ai/aiGuard"

/** Run one headless prompt through the Claude CLI and return its raw text. */
export async function queryVisionClaude(userId: string, operation: string, prompt: string): Promise<string> {
  return askClaudeCli({ userId, feature: "vision-plan", operation }, prompt, { timeoutMs: 180_000 })
}
