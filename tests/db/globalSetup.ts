/**
 * Starts the test backend once per run (or reuses the one already running) and
 * hands its address and keys to every test process through one environment
 * variable. Test processes are forked after this runs, so they inherit it.
 */
import { execFileSync } from "node:child_process"
import path from "node:path"
import { STACK_ENV } from "./harness"

export default function globalSetup(): void {
  const script = path.resolve(__dirname, "../../scripts/db/test-stack.mjs")
  const out = execFileSync("node", [script, "up"], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] })
  process.env[STACK_ENV] = out.trim()
}
