/**
 * Test user configuration from environment variables
 */

export const TEST_USER = {
  email: process.env.TEST_USER_EMAIL ?? '',
  password: process.env.TEST_USER_PASSWORD ?? '',
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
