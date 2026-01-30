#!/bin/bash
# Run all tests

set -e

echo "Running all tests..."
npx vitest run

echo ""
echo "All tests completed!"
