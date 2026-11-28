/**
 * NOTHING ON THE SITE CALLS CLAUDE EXCEPT THROUGH THE SPEND-CAP GUARD.
 *
 * Every call to Claude is booked against the person's spend cap in
 * src/api_ai/aiGuard.ts before it runs. Until 2026-11-28 each feature called
 * Claude its own way and checked (or did not check) a budget itself. This
 * reads every file under src/ and app/ and fails if anything other than the
 * guard reaches Claude: the Anthropic SDKs, the AI SDK's model calls, the
 * Claude CLI helper, the API's address, or a child process running `claude`.
 * A new route that calls Claude without the guard fails here the day it is
 * written.
 *
 * scripts/ is not the site and is not scanned (scripts/scenario-engine runs
 * the CLI on the owner's machine).
 */
import { describe, test, expect } from "vitest"
import * as fs from "fs"
import * as path from "path"

const root = path.resolve(__dirname, "../../..")

/** The only files allowed to reach Claude, and why. */
const ALLOWED = new Map([
  ["src/api_ai/aiGuard.ts", "the guard itself"],
  ["src/shared/claudeHeadless.ts", "runs the Claude CLI; on the site only the guard imports it"],
])

/** Each way code could reach Claude, as a pattern on code with comments blanked. */
const WAYS_TO_CLAUDE: Array<[string, RegExp]> = [
  ["imports the AI SDK's Anthropic provider", /from\s+["']@ai-sdk\/anthropic["']|require\(\s*["']@ai-sdk\/anthropic["']\s*\)/],
  ["imports the Anthropic SDK", /from\s+["']@anthropic-ai\/[^"']+["']|require\(\s*["']@anthropic-ai\//],
  [
    "imports a model call from the AI SDK",
    /import\s*\{[^}]*\b(generateText|streamText|generateObject|streamObject)\b[^}]*\}\s*from\s*["']ai["']/,
  ],
  ["imports the Claude CLI helper", /from\s+["'][^"']*shared\/claudeHeadless["']/],
  ["names the Anthropic API's address", /api\.anthropic\.com/],
  ["runs a child process that names claude", /child_process[\s\S]*\bclaude\b|\bclaude\b[\s\S]*child_process/i],
]

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && !entry.name.startsWith(".")) out.push(...sourceFiles(full))
    } else if (/\.(ts|tsx|js|mjs|cjs)$/.test(entry.name)) {
      out.push(full)
    }
  }
  return out
}

/** Comments blanked: a sentence about Claude is not a call to it. */
const code = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1")

/** Every way this code reaches Claude. */
function waysToClaude(text: string): string[] {
  const stripped = code(text)
  return WAYS_TO_CLAUDE.filter(([, pattern]) => pattern.test(stripped)).map(([way]) => way)
}

describe("the spend-cap guard is the only way to Claude", () => {
  const files = ["src", "app"].flatMap((d) => sourceFiles(path.join(root, d))).map((file) => ({
    rel: path.relative(root, file).split(path.sep).join("/"),
    text: fs.readFileSync(file, "utf-8"),
  }))

  test("the scan read the site's code", () => {
    expect(files.length).toBeGreaterThan(500)
    expect(files.map((f) => f.rel)).toContain("src/api_ai/aiGuard.ts")
  })

  test("no file outside the guard reaches Claude", () => {
    const offenders = files
      .filter((f) => !ALLOWED.has(f.rel))
      .flatMap((f) => waysToClaude(f.text).map((way) => `${f.rel}: ${way}`))

    expect(offenders, "call Claude through askClaude / askClaudeCli in src/api_ai/aiGuard.ts").toEqual([])
  })

  test("on the site, only the guard imports the Claude CLI helper", () => {
    const importers = files
      .filter((f) => /from\s+["'][^"']*shared\/claudeHeadless["']/.test(code(f.text)))
      .map((f) => f.rel)

    expect(importers).toEqual(["src/api_ai/aiGuard.ts"])
  })

  // The scan proves itself on code it must catch, and on prose it must not.
  test.each([
    ['import { anthropic } from "@ai-sdk/anthropic"', "imports the AI SDK's Anthropic provider"],
    ['import Anthropic from "@anthropic-ai/sdk"', "imports the Anthropic SDK"],
    ['import { zodSchema, generateText } from "ai"', "imports a model call from the AI SDK"],
    ['import { queryClaudeHeadless } from "@/src/shared/claudeHeadless"', "imports the Claude CLI helper"],
    ['await fetch("https://api.anthropic.com/v1/messages")', "names the Anthropic API's address"],
    ['import { execSync } from "child_process"\nexecSync("claude --print hi")', "runs a child process that names claude"],
  ])("catches %s", (snippet, way) => {
    expect(waysToClaude(snippet)).toContain(way)
  })

  test("does not count a comment that mentions Claude", () => {
    expect(waysToClaude('// we used to import { generateText } from "ai" here\n/* @ai-sdk/anthropic */')).toEqual([])
  })
})
