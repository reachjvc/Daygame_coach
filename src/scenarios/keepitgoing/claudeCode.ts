/**
 * Keep It Going - Claude Code Integration
 *
 * Wrapper for calling Claude Code CLI in headless mode.
 * Uses Max subscription OAuth instead of API key.
 *
 * For beta testing only. Switch to API for production.
 */

import { execSync } from "child_process"
import { existsSync } from "fs"
import { homedir } from "os"
import { join } from "path"

// Find the claude binary path
function findClaudePath(): string {
  // Check env override first
  if (process.env.CLAUDE_PATH && existsSync(process.env.CLAUDE_PATH)) {
    return process.env.CLAUDE_PATH
  }

  // Check common locations
  const possiblePaths = [
    join(homedir(), ".local", "bin", "claude"),
    "/usr/local/bin/claude",
    // VSCode extension path (Linux/WSL)
    ...findVSCodeExtensionPaths(),
  ]

  for (const p of possiblePaths) {
    if (existsSync(p)) {
      return p
    }
  }

  // Fallback to just "claude" and hope it's in PATH
  return "claude"
}

function findVSCodeExtensionPaths(): string[] {
  const home = homedir()
  const paths: string[] = []

  // Try to find the latest Claude Code extension
  const vscodeServerPath = join(home, ".vscode-server", "extensions")
  const vscodeLocalPath = join(home, ".vscode", "extensions")

  for (const basePath of [vscodeServerPath, vscodeLocalPath]) {
    try {
      const { readdirSync } = require("fs")
      const dirs = readdirSync(basePath).filter((d: string) => d.startsWith("anthropic.claude-code"))
      for (const dir of dirs) {
        paths.push(join(basePath, dir, "resources", "native-binary", "claude"))
      }
    } catch {
      // Directory doesn't exist, skip
    }
  }

  return paths
}

// Cache the claude path
let cachedClaudePath: string | null = null

function getClaudePath(): string {
  if (!cachedClaudePath) {
    cachedClaudePath = findClaudePath()
    console.log("[ClaudeCode] Found claude at:", cachedClaudePath)
  }
  return cachedClaudePath
}

// Check if Claude Code should be used (env flag)
export function useClaudeCode(): boolean {
  return process.env.USE_CLAUDE_CODE === "true"
}

/**
 * Query Claude Code CLI in headless mode.
 * Returns the raw text response.
 */
export function queryClaudeCode(prompt: string): string {
  // Escape the prompt for shell
  const escapedPrompt = prompt
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\$/g, "\\$")
    .replace(/`/g, "\\`")

  const claudePath = getClaudePath()
  const command = `"${claudePath}" --print -p "${escapedPrompt}"`

  console.log("[ClaudeCode] USE_CLAUDE_CODE =", process.env.USE_CLAUDE_CODE)
  console.log("[ClaudeCode] Executing command (truncated):", command.slice(0, 100) + "...")

  try {
    const result = execSync(command, {
      encoding: "utf-8",
      timeout: 60000, // 60s timeout for longer responses
      maxBuffer: 1024 * 1024, // 1MB buffer
    })
    console.log("[ClaudeCode] Success, response length:", result.length)
    return result.trim()
  } catch (error) {
    console.error("[ClaudeCode] Command failed:", error)
    throw error
  }
}

/**
 * Query Claude Code and parse JSON response.
 * Throws if response is not valid JSON.
 */
export function queryClaudeCodeJSON<T>(prompt: string): T {
  const response = queryClaudeCode(prompt)

  // Claude might wrap JSON in markdown code blocks, strip them
  let jsonStr = response
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.slice(7)
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.slice(3)
  }
  if (jsonStr.endsWith("```")) {
    jsonStr = jsonStr.slice(0, -3)
  }
  jsonStr = jsonStr.trim()

  return JSON.parse(jsonStr) as T
}
