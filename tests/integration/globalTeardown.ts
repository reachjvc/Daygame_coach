/**
 * Global teardown for integration tests.
 * Stops the PostgreSQL container after all tests complete.
 */

import { stopContainer } from "./setup"

export default async function globalTeardown(): Promise<void> {
  console.log("\n[Integration Tests] Stopping PostgreSQL container...")
  await stopContainer()
  console.log("[Integration Tests] Container stopped.\n")
}
