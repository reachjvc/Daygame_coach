/**
 * Global setup for integration tests.
 * Starts the PostgreSQL container before any tests run.
 */

import { startContainer } from "./setup"

export default async function globalSetup(): Promise<void> {
  console.log("\n[Integration Tests] Starting PostgreSQL container...")
  await startContainer()
  console.log("[Integration Tests] Container ready.\n")
}
