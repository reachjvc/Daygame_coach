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

    // === Unauthenticated tests (run last - logout tests can invalidate sessions) ===
    {
      name: 'no-auth',
      testMatch: [
        /smoke\.spec\.ts/,
        /signup-flow\.spec\.ts/,
        /security-auth\.spec\.ts/,
        /auth\.spec\.ts/,
        /protected-routes\.spec\.ts/,
      ],
      dependencies: ['chromium'],
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
