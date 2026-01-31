/**
 * Integration test setup using testcontainers.
 * Provides a real PostgreSQL database for testing repository functions.
 *
 * Requirements:
 * - Docker must be running and accessible
 * - Tests will be skipped if Docker is not available
 */

import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql"
import { Client } from "pg"
import { readFileSync } from "fs"
import { join } from "path"

let container: StartedPostgreSqlContainer | null = null
let client: Client | null = null
let dockerAvailable: boolean | null = null

/**
 * Check if Docker is available. Caches the result.
 */
export function isDockerAvailable(): boolean {
  return dockerAvailable === true
}

/**
 * Start a PostgreSQL container and initialize the schema.
 * Call this in beforeAll() of your integration tests.
 *
 * Throws if Docker is not available - use try/catch and skip tests.
 */
export async function setupTestDatabase(): Promise<{
  connectionString: string
  client: Client
}> {
  try {
    // Start PostgreSQL container
    container = await new PostgreSqlContainer("postgres:15-alpine")
      .withDatabase("test_db")
      .withUsername("test_user")
      .withPassword("test_password")
      .start()

    dockerAvailable = true
    const connectionString = container.getConnectionUri()

    // Create client and connect
    client = new Client({ connectionString })
    await client.connect()

    // Read and execute schema
    const schemaPath = join(__dirname, "schema.sql")
    const schema = readFileSync(schemaPath, "utf-8")
    await client.query(schema)

    // Set environment variable for the repository functions
    process.env.TEST_DATABASE_URL = connectionString

    return { connectionString, client }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes("container runtime") || message.includes("Docker")) {
      dockerAvailable = false
      throw new Error(
        "Docker not available - integration tests require Docker to be running.\n" +
          "Run: docker info\n" +
          "If Docker is not installed, integration tests will be skipped."
      )
    }
    throw error
  }
}

/**
 * Clean up the test database.
 * Call this in afterAll() of your integration tests.
 */
export async function teardownTestDatabase(): Promise<void> {
  if (client) {
    await client.end()
    client = null
  }
  if (container) {
    await container.stop()
    container = null
  }
}

/**
 * Clear all data from tables while keeping schema.
 * Call this in beforeEach() to ensure test isolation.
 */
export async function clearTestData(): Promise<void> {
  if (!client) {
    throw new Error("Test database not initialized. Call setupTestDatabase first.")
  }

  // Truncate all tables in reverse dependency order
  await client.query(`
    TRUNCATE TABLE
      milestones,
      sticking_points,
      reviews,
      field_reports,
      approaches,
      sessions,
      user_tracking_stats,
      review_templates,
      field_report_templates
    CASCADE
  `)
}

/**
 * Get the test client for direct database queries in tests.
 */
export function getTestClient(): Client {
  if (!client) {
    throw new Error("Test database not initialized. Call setupTestDatabase first.")
  }
  return client
}

/**
 * Generate a test UUID (for user_id etc.)
 */
export function generateTestUserId(): string {
  return `test-user-${Date.now()}-${Math.random().toString(36).slice(2)}`
}
