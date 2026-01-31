#!/bin/bash
# Run all tests (unit, integration, e2e)
# This script must pass before any Claude prompt returns to the user

set -e  # Fail fast on first error

# Load environment variables from .env if it exists
if [ -f .env ]; then
  echo "Loading environment variables from .env..."
  set -a
  source .env
  set +a
fi

# Validate required test credentials
if [ -z "$TEST_USER_EMAIL" ] || [ -z "$TEST_USER_PASSWORD" ]; then
  echo "ERROR: TEST_USER_EMAIL and TEST_USER_PASSWORD must be set in .env"
  exit 1
fi

echo "=== Running Unit & Integration Tests (Vitest) ==="
npx vitest run

echo ""
echo "=== Running E2E Tests (Playwright) ==="
npx playwright test

echo ""
echo "=== All tests passed! ==="
