import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'

// Load environment variables from .env and .env.local (local takes precedence)
dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local', override: true })

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    headless: true,
  },
  projects: [
    // === Setup projects (run first, log in once, save auth state) ===
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'setup-user-b',
      testMatch: /auth-user-b\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // === Authenticated tests (depend on setup, get storageState) ===
    {
      name: 'chromium',
      testMatch: /\.spec\.ts$/,
      testIgnore: [
        /smoke\.spec\.ts/,
        /signup-flow\.spec\.ts/,
        /security-auth\.spec\.ts/,
        /auth\.spec\.ts/,
        /protected-routes\.spec\.ts/,
        /security-rls\.spec\.ts/,
        /security-idor\.spec\.ts/,
        // Session-creating tests run in isolated project to avoid parallel conflicts
        /session-tracking\.spec\.ts/,
        /approach-logging\.spec\.ts/,
        /data-persistence\.spec\.ts/,
        /start-session\.spec\.ts/,
      ],
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/user.json',
      },
    },

    // === Multi-user security tests (depend on both setups) ===
    {
      name: 'security-multi-user',
      testMatch: [
        /security-rls\.spec\.ts/,
        /security-idor\.spec\.ts/,
      ],
      dependencies: ['setup', 'setup-user-b'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/user.json',
      },
    },

    // === Safe unauthenticated tests (no deps - don't touch auth state) ===
    {
      name: 'no-auth',
      testMatch: [
        /smoke\.spec\.ts/,
        /signup-flow\.spec\.ts/,
        /security-auth\.spec\.ts/,
      ],
      use: { ...devices['Desktop Chrome'] },
    },

    // === Session-creating tests (chained to run ONE file at a time) ===
    // These files create/end sessions via UI for the same user. Since only one session
    // can be active at a time, they MUST NOT run in parallel. Each project contains
    // one file and depends on the previous, ensuring strict sequential execution.
    {
      name: 'session-1',
      testMatch: /session-tracking\.spec\.ts/,
      dependencies: ['chromium', 'security-multi-user'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/user.json',
      },
    },
    {
      name: 'session-2',
      testMatch: /approach-logging\.spec\.ts/,
      dependencies: ['session-1'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/user.json',
      },
    },
    {
      name: 'session-3',
      testMatch: /data-persistence\.spec\.ts/,
      dependencies: ['session-2'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/user.json',
      },
    },
    {
      name: 'session-4',
      testMatch: /start-session\.spec\.ts/,
      dependencies: ['session-3'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/user.json',
      },
    },

    // === Auth-destructive tests (run LAST - login/logout invalidates shared session) ===
    {
      name: 'auth-destructive',
      testMatch: [
        /(?:^|\/)auth\.spec\.ts$/,
        /protected-routes\.spec\.ts/,
      ],
      dependencies: ['chromium', 'security-multi-user', 'session-4'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: process.env.CI ? 'npm run build && npm start' : 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // Allow more time for build in CI
  },
})
