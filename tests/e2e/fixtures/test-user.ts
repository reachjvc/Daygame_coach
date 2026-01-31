/**
 * Test user configuration from environment variables
 */

export const TEST_USER = {
  email: process.env.TEST_USER_EMAIL ?? '',
  password: process.env.TEST_USER_PASSWORD ?? '',
}

/**
 * Second test user for RLS/isolation tests.
 * Used to verify users cannot access each other's data.
 */
export const TEST_USER_B = {
  email: process.env.TEST_USER_B_EMAIL ?? '',
  password: process.env.TEST_USER_B_PASSWORD ?? '',
}

/**
 * Validates that required test environment variables are set.
 * Throws an error if credentials are missing.
 */
export function validateTestConfig(): void {
  if (!TEST_USER.email || !TEST_USER.password) {
    throw new Error(
      'TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables are required. ' +
        'Set them in your .env.local file or export them before running tests.'
    )
  }
}

/**
 * Validates that second user credentials are set.
 * Required for RLS isolation tests.
 */
export function validateSecondUserConfig(): void {
  if (!TEST_USER_B.email || !TEST_USER_B.password) {
    throw new Error(
      'TEST_USER_B_EMAIL and TEST_USER_B_PASSWORD environment variables are required for RLS tests. ' +
        'Set them in your .env.local file or export them before running security tests.'
    )
  }
}
