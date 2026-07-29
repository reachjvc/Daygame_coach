/**
 * Vision-plan LLM caller — thin wrapper over the shared Claude CLI headless
 * helper (src/shared/claudeHeadless.ts). Server-only: used by
 * app/api/goals/vision-plan.
 *
 * Fail-closed: empty output or a dead CLI throws — callers surface an explicit
 * error, never a fallback plan (CLAUDE.md rule 15).
 */

import { queryClaudeHeadless } from "@/src/shared/claudeHeadless"

/** Run one headless prompt through the Claude CLI and return its raw text. */
export async function queryVisionClaude(prompt: string): Promise<string> {
  return queryClaudeHeadless(prompt, { timeoutMs: 180_000 })
}
