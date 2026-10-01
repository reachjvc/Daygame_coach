#!/bin/bash
# ONE SESSION'S TEMPORARY FILES, KEYED SO THEY ARE NOT EVERYONE'S.
#
# Three Claude sessions work in this one checkout. The test gate used to mark
# "already checked this turn" at the fixed path /tmp/.claude-test-check-done, so
# whichever session got there first silenced the other two for the rest of their
# turns — `known_failures.py` was written with per-session keys precisely to
# avoid that, and its docstring named this file as the one still doing it.
#
# Sourced by check-test-results.sh and clear-test-marker.sh, which must agree on
# the path or the marker is set in one place and cleared in another. One owner
# for the rule, which is why this is a file and not a line copied twice.
#
# Usage:  payload="$(cat)";  claude_session_key "$payload"  -> echoes 16 hex chars
claude_session_key() {
  local payload="$1" sid
  sid=$(printf '%s' "$payload" | python3 -c \
    'import json,sys
try:
    print(json.load(sys.stdin).get("session_id") or "shared")
except Exception:
    print("shared")' 2>/dev/null)
  # "shared" is the deliberate answer when Claude Code sent no session id: it
  # collides the way the old fixed path did, which is worse than per-session and
  # better than crashing somebody else's turn. It is not a silent fallback — it
  # is announced here and the collision is the documented cost.
  [ -n "$sid" ] || sid="shared"
  printf '%s' "$sid" | sha256sum | cut -c1-16
}
