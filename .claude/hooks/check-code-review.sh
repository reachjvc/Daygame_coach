#!/bin/bash
# Check if code review subagent should be invoked
# Called by Stop hook - blocks response if 3+ files were modified
# Uses marker file to avoid infinite blocking

MARKER_FILE="/tmp/.claude-code-review-pending"

# If marker exists, code review was already requested this turn - don't block again
if [ -f "$MARKER_FILE" ]; then
  exit 0
fi

# Count modified files (staged + unstaged, excluding docs)
MODIFIED_COUNT=$(git diff --name-only HEAD 2>/dev/null | grep -v "\.md$" | grep -v "^docs/" | wc -l)
STAGED_COUNT=$(git diff --cached --name-only 2>/dev/null | grep -v "\.md$" | grep -v "^docs/" | wc -l)
TOTAL=$((MODIFIED_COUNT + STAGED_COUNT))

# Check if any code files were touched (not just docs/config)
CODE_FILES=$(git diff --name-only HEAD 2>/dev/null | grep -E "\.(ts|tsx|js|jsx)$" | wc -l)

# If 3+ files modified AND at least one is code, suggest code review
if [ "$TOTAL" -ge 3 ] && [ "$CODE_FILES" -ge 1 ]; then
  # Create marker so we don't block again this turn
  touch "$MARKER_FILE"

  # Output JSON to block and inject context
  cat << 'EOF'
{
  "decision": "block",
  "reason": "Code review required before completing response",
  "hookSpecificOutput": {
    "additionalContext": "⛔ STOP - CODE REVIEW REQUIRED\n\nYou modified 3+ files including code. Before responding to the user:\n\n1. Run the code-review subagent NOW using Task tool:\n   - subagent_type: \"general-purpose\"\n   - prompt: \"Code review for recent changes. 1) Read docs/testing_behavior.md. 2) Run git diff to find changed files. 3) For each changed file: identify new exports, functions, components, types, and config. 4) Check tests/unit/ and tests/e2e/ for corresponding test coverage. 5) Run npm test to verify existing tests pass. 6) Report: what's tested, what's NOT tested (be specific: function names, edge cases, integration points), code quality notes. Do NOT implement tests - only identify gaps.\"\n\n2. Include the review summary in your response to the user.\n\nThis hook will not block again this turn."
  }
}
EOF
  exit 0
fi

# No blocking needed
exit 0
