/**
 * Testcontainers setup for integration tests.
 * Provides isolated PostgreSQL database per test run.
 *
 * Architecture:
 * - globalSetup starts container, writes connection info to temp file
 * - Tests read connection info from temp file to connect
 * - globalTeardown stops container and cleans up temp file
 */

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql"
import { Client } from "pg"
import fs from "fs"
import path from "path"

// Temp file to share connection info between globalSetup and tests
const CONNECTION_FILE = path.join(__dirname, ".test-connection.json")

let container: StartedPostgreSqlContainer | null = null

interface ConnectionInfo {
  host: string
  port: number
  database: string
  user: string
  password: string
}

/**
 * Start the PostgreSQL container and initialize schema.
 * Call this in globalSetup.
 */
export async function startContainer(): Promise<void> {
  if (container) {
    return // Already started
  }

  // Start PostgreSQL container
  container = await new PostgreSqlContainer("postgres:15-alpine")
    .withDatabase("test_db")
    .withUsername("test_user")
    .withPassword("test_pass")
    .start()

  // Write connection info to temp file for tests to read
  const connectionInfo: ConnectionInfo = {
    host: container.getHost(),
    port: container.getPort(),
    database: container.getDatabase(),
    user: container.getUsername(),
    password: container.getPassword(),
  }
  fs.writeFileSync(CONNECTION_FILE, JSON.stringify(connectionInfo))

  // Initialize schema
  const client = new Client(connectionInfo)
  await client.connect()

  try {
    const schemaPath = path.join(__dirname, "schema.sql")
    const schema = fs.readFileSync(schemaPath, "utf-8")
    await client.query(schema)
  } finally {
    await client.end()
  }
}

/**
 * Stop the container and clean up.
 * Call this in globalTeardown.
 */
export async function stopContainer(): Promise<void> {
  // Clean up temp file
  if (fs.existsSync(CONNECTION_FILE)) {
    fs.unlinkSync(CONNECTION_FILE)
  }

  if (container) {
    await container.stop()
    container = null
  }
}

/**
 * Get connection info from temp file.
 * Used by tests to connect to the container started by globalSetup.
 */
function getConnectionInfo(): ConnectionInfo {
  if (!fs.existsSync(CONNECTION_FILE)) {
    throw new Error(
      "Connection file not found. Container may not be started. " +
      "Make sure globalSetup ran successfully."
    )
  }

  const content = fs.readFileSync(CONNECTION_FILE, "utf-8")
  return JSON.parse(content) as ConnectionInfo
}

/**
 * Get a database client for running queries.
 * Creates a new client each time (caller must close it).
 */
export async function getClient(): Promise<Client> {
  const connectionInfo = getConnectionInfo()

  const client = new Client(connectionInfo)
  await client.connect()
  return client
}

/**
 * Get the connection string for the test database.
 * Useful for passing to code that needs a connection string.
 */
export function getConnectionString(): string {
  const info = getConnectionInfo()
  return `postgresql://${info.user}:${info.password}@${info.host}:${info.port}/${info.database}`
}

/**
 * Truncate all tables to reset state between tests.
 * Call this in beforeEach to ensure test isolation.
 */
export async function truncateAllTables(): Promise<void> {
  const client = await getClient()

  try {
    // Truncate in correct order to handle foreign key constraints
    // user_values must come before profiles and values due to FKs
    await client.query(`
      TRUNCATE TABLE
        milestones,
        sticking_points,
        approaches,
        field_reports,
        reviews,
        sessions,
        user_tracking_stats,
        inner_game_progress,
        value_comparisons,
        user_values,
        scenarios,
        purchases,
        profiles,
        values,
        embeddings
      RESTART IDENTITY CASCADE
    `)
  } finally {
    await client.end()
  }
}

/**
 * Insert a test user and return the user ID.
 * Helper for tests that need a user context.
 */
export async function createTestUser(email = "test@example.com"): Promise<string> {
  const client = await getClient()

  try {
    const result = await client.query(`
      INSERT INTO profiles (id, email, has_purchased, onboarding_completed)
      VALUES (gen_random_uuid(), $1, false, false)
      RETURNING id
    `, [email])

    return result.rows[0].id
  } finally {
    await client.end()
  }
}

/**
 * Create user tracking stats for a test user.
 * Required before testing tracking operations.
 */
export async function createTestUserStats(userId: string): Promise<void> {
  const client = await getClient()

  try {
    await client.query(`
      INSERT INTO user_tracking_stats (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
    `, [userId])
  } finally {
    await client.end()
  }
}
