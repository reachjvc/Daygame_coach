/**
 * Keep It Going - Claude Code switch
 *
 * With USE_CLAUDE_CODE=true the chat runs through the Claude CLI (Max
 * subscription) instead of the Anthropic API. For local testing only.
 *
 * The CLI call itself goes through the AI guard (src/api_ai/aiGuard.ts,
 * `askClaudeCli`) like every other call to Claude. Until 2026-11-28 this file
 * ran the CLI itself, through a shell, with no spend cap.
 */

// Check if Claude Code should be used (env flag)
export function useClaudeCode(): boolean {
  return process.env.USE_CLAUDE_CODE === "true"
}
