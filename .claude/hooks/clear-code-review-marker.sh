#!/bin/bash
# Clear the code review marker on new user message
# This resets the "already blocked" state for the next task

MARKER_FILE="/tmp/.claude-code-review-pending"

if [ -f "$MARKER_FILE" ]; then
  rm -f "$MARKER_FILE"
fi

exit 0
