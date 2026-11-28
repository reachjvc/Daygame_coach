/**
 * Shared Claude Code CLI headless caller (Max-subscription OAuth, no API key).
 * Async (execFile, no shell, no event-loop block). Server/script-only.
 *
 * Fail-closed: empty output or a dead CLI throws — callers surface an explicit
 * error, never a fallback (CLAUDE.md rule 15).
 *
 * Users: scripts/scenario-engine/ (`queryClaudeHeadless`), and on the site
 * only the AI guard (src/api_ai/aiGuard.ts, `queryClaudeHeadlessWithCost`),
 * which every feature that calls Claude goes through.
 */

import { execFile } from "child_process"
import { promisify } from "util"
import { existsSync, readdirSync } from "fs"
import { homedir, tmpdir } from "os"
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

/**
 * THE SITE'S CALLS GET A CLAUDE THAT CAN ONLY ANSWER.
 *
 * The site's prompts carry text a signed-in person typed. Run with its
 * defaults, the CLI would have its tools (shell, files, web), the project's
 * and the owner's settings (which may allow every tool) and his MCP
 * connections, in the project folder — so a typed "ignore the scene and run
 * this" could run code on the machine. For the site the CLI gets no tools, no
 * settings files, no MCP servers, no slash commands, and an empty folder.
 */
export const SITE_LOCKDOWN_ARGS = [
  "--tools",
  "",
  "--strict-mcp-config",
  "--setting-sources",
  "",
  "--disable-slash-commands",
]

/** Run the Claude CLI once with `extraArgs` before the prompt; returns its trimmed stdout. */
async function runClaude(
  prompt: string,
  extraArgs: string[],
  options: ClaudeHeadlessOptions,
  cwd?: string
): Promise<string> {
  // ANTHROPIC_API_KEY in the server env (e.g. .env.local) overrides the CLI's
  // Max-subscription OAuth and breaks headless calls — strip it for the child.
  const env = { ...process.env }
  delete env.ANTHROPIC_API_KEY
  // Linux caps a single argv entry at ~128KB (E2BIG) — pipe big prompts via stdin.
  const viaStdin = prompt.length > 100_000
  const args = viaStdin ? ["--print", ...extraArgs] : ["--print", ...extraArgs, "-p", prompt]
  const pending = execFileAsync(getClaudePath(), args, {
    encoding: "utf-8",
    timeout: options.timeoutMs ?? 180_000,
    maxBuffer: 4 * 1024 * 1024,
    env,
    cwd,
  })
  // Write the prompt (stdin mode) or close stdin so the CLI doesn't stall on it.
  if (viaStdin) pending.child.stdin?.write(prompt)
  pending.child.stdin?.end()
  const { stdout } = await pending
  return stdout.trim()
}

/**
 * Run one headless prompt through the Claude CLI and return its raw text.
 * For scripts. The site calls Claude only through src/api_ai/aiGuard.ts,
 * which uses `queryClaudeHeadlessWithCost`.
 */
export async function queryClaudeHeadless(
  prompt: string,
  options: ClaudeHeadlessOptions = {}
): Promise<string> {
  const out = await runClaude(prompt, [], options)
  if (!out) throw new Error("Claude CLI returned no output")
  return out
}

export type ClaudeHeadlessAnswer = {
  text: string
  /** The price the CLI reports for the tokens this call used, in USD; null when it reports none. */
  costUsd: number | null
}

/**
 * One headless prompt for the site, locked down (SITE_LOCKDOWN_ARGS) and
 * answered as the CLI's JSON result so the call's cost comes back with its text (`--output-format json`: `result`, `is_error`,
 * `total_cost_usd`). Fail-closed: no text, or an answer the CLI marks as an
 * error, throws.
 */
export async function queryClaudeHeadlessWithCost(
  prompt: string,
  options: ClaudeHeadlessOptions = {}
): Promise<ClaudeHeadlessAnswer> {
  const out = await runClaude(prompt, [...SITE_LOCKDOWN_ARGS, "--output-format", "json"], options, tmpdir())
  let parsed: { result?: unknown; is_error?: unknown; total_cost_usd?: unknown }
  try {
    parsed = JSON.parse(out)
  } catch {
    throw new Error("Claude CLI returned an answer that is not its JSON result")
  }
  const costUsd = typeof parsed.total_cost_usd === "number" && Number.isFinite(parsed.total_cost_usd)
    ? parsed.total_cost_usd
    : null
  const text = typeof parsed.result === "string" ? parsed.result.trim() : ""
  if (parsed.is_error === true) {
    throw Object.assign(new Error(`Claude CLI reported an error: ${text.slice(0, 200)}`), { costUsd })
  }
  if (!text) throw Object.assign(new Error("Claude CLI returned no output"), { costUsd })
  return { text, costUsd }
}

/** Parse a model answer that must be JSON; strips ``` fences first. */
export function parseClaudeJSON<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim()
  return JSON.parse(cleaned) as T
}

/** Headless prompt that must return JSON; strips ``` fences before parsing. */
export async function queryClaudeHeadlessJSON<T>(
  prompt: string,
  options: ClaudeHeadlessOptions = {}
): Promise<T> {
  return parseClaudeJSON<T>(await queryClaudeHeadless(prompt, options))
}
