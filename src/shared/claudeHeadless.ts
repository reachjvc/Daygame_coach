/**
 * Shared Claude Code CLI headless caller (Max-subscription OAuth, no API key).
 * Async (execFile, no shell, no event-loop block). Server/script-only.
 *
 * Fail-closed: empty output or a dead CLI throws — callers surface an explicit
 * error, never a fallback (CLAUDE.md rule 15).
 *
 * Users: src/goals/visionPlanClaude.ts, scripts/scenario-engine/,
 * src/scenarios/ lab chat. The sync variant in scenarios/keepitgoing/claudeCode.ts
 * predates this and is intentionally untouched.
 */

import { execFile } from "child_process"
import { promisify } from "util"
import { existsSync, readdirSync } from "fs"
import { homedir } from "os"
import { join } from "path"

const execFileAsync = promisify(execFile)

function findClaudePath(): string {
  if (process.env.CLAUDE_PATH && existsSync(process.env.CLAUDE_PATH)) return process.env.CLAUDE_PATH
  const candidates = [join(homedir(), ".local", "bin", "claude"), "/usr/local/bin/claude"]
  for (const base of [join(homedir(), ".vscode-server", "extensions"), join(homedir(), ".vscode", "extensions")]) {
    try {
      for (const dir of readdirSync(base).filter((d) => d.startsWith("anthropic.claude-code"))) {
        candidates.push(join(base, dir, "resources", "native-binary", "claude"))
      }
    } catch { /* extensions dir absent */ }
  }
  for (const p of candidates) if (existsSync(p)) return p
  return "claude" // hope it's in PATH
}

let cachedPath: string | null = null
function getClaudePath(): string {
  if (!cachedPath) cachedPath = findClaudePath()
  return cachedPath
}

export type ClaudeHeadlessOptions = {
  /** Milliseconds before the CLI call is killed. Default 180s. */
  timeoutMs?: number
}

/** Run one headless prompt through the Claude CLI and return its raw text. */
export async function queryClaudeHeadless(
  prompt: string,
  options: ClaudeHeadlessOptions = {}
): Promise<string> {
  // ANTHROPIC_API_KEY in the server env (e.g. .env.local) overrides the CLI's
  // Max-subscription OAuth and breaks headless calls — strip it for the child.
  const env = { ...process.env }
  delete env.ANTHROPIC_API_KEY
  // Linux caps a single argv entry at ~128KB (E2BIG) — pipe big prompts via stdin.
  const viaStdin = prompt.length > 100_000
  const args = viaStdin ? ["--print"] : ["--print", "-p", prompt]
  const pending = execFileAsync(getClaudePath(), args, {
    encoding: "utf-8",
    timeout: options.timeoutMs ?? 180_000,
    maxBuffer: 4 * 1024 * 1024,
    env,
  })
  // Write the prompt (stdin mode) or close stdin so the CLI doesn't stall on it.
  if (viaStdin) pending.child.stdin?.write(prompt)
  pending.child.stdin?.end()
  const { stdout } = await pending
  const out = stdout.trim()
  if (!out) throw new Error("Claude CLI returned no output")
  return out
}

/** Headless prompt that must return JSON; strips ``` fences before parsing. */
export async function queryClaudeHeadlessJSON<T>(
  prompt: string,
  options: ClaudeHeadlessOptions = {}
): Promise<T> {
  const raw = await queryClaudeHeadless(prompt, options)
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim()
  return JSON.parse(cleaned) as T
}
