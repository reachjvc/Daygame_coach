/**
 * Global setup for integration tests.
 * Starts the PostgreSQL container before any tests run.
 * Returns a teardown function to stop the container.
 */

import { startContainer, stopContainer } from "./setup"

export default async function globalSetup(): Promise<() => Promise<void>> {
  console.log("\n[Integration Tests] Starting PostgreSQL container...")
  await startContainer()
  console.log("[Integration Tests] Container ready.\n")

  // Return teardown function
  return async () => {
    console.log("\n[Integration Tests] Stopping PostgreSQL container...")
    await stopContainer()
    console.log("[Integration Tests] Container stopped.\n")
  }
}
