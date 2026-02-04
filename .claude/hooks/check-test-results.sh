#!/bin/bash
# Stop hook: Blocks Claude from responding if tests are failing
# without proper acknowledgment in .test-known-failures.json
#
# Behavior:
# 1. Checks if code was modified this session (via git diff)
# 2. If yes, runs `npm test` and checks exit code
# 3. If tests fail, blocks response with instructions
#
# To bypass: User must explicitly say "skip test check" in their message

MARKER_FILE="/tmp/.claude-test-check-done"

# If marker exists, test check was already done this turn
if [ -f "$MARKER_FILE" ]; then
  exit 0
fi

# Check if any code files were modified (not just docs/config)
CODE_MODIFIED=$(git diff --name-only HEAD 2>/dev/null | grep -E "\.(ts|tsx|js|jsx)$" | wc -l)

# If no code modified, skip test check
if [ "$CODE_MODIFIED" -eq 0 ]; then
  exit 0
fi

# Create marker to avoid running tests twice in one turn
touch "$MARKER_FILE"

# Run unit tests and capture exit code
npm test --silent > /tmp/.claude-test-output.txt 2>&1
TEST_EXIT_CODE=$?

if [ "$TEST_EXIT_CODE" -ne 0 ]; then
  # Tests failed - get failure summary
  FAILURE_SUMMARY=$(cat /tmp/.claude-test-output.txt | grep -E "(FAIL|Error|✗|×)" | head -10)

  cat << EOF
{
  "decision": "block",
  "reason": "Tests are failing - cannot proceed without acknowledgment",
  "hookSpecificOutput": {
    "additionalContext": "⛔ STOP - TEST FAILURES DETECTED\n\nUnit tests are failing. You MUST:\n\n1. Report ALL failures to the user (don't summarize or dismiss)\n2. Either FIX the failures, or\n3. Add to .test-known-failures.json with:\n   - Full test name\n   - Reason for failure\n   - GitHub issue ticket (create one if needed)\n\nFailure preview:\n${FAILURE_SUMMARY}\n\nDo NOT claim tests pass when they don't.\nDo NOT dismiss failures as 'pre-existing' without verification.\n\nThis hook will not block again this turn."
  }
}
EOF
  exit 0
fi

# Tests passed - no blocking needed
exit 0
