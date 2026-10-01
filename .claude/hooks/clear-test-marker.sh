#!/bin/bash
# A NEW USER MESSAGE STARTS A NEW TURN, SO THE "ALREADY CHECKED" MARK IS SPENT.
#
# Pairs with check-test-results.sh, which writes the mark so the suite runs at
# most once per turn. Both ask session-key.sh for the path, because the version
# that cleared /tmp/.claude-test-check-done cleared it for all three sessions in
# this checkout at once: one session's new prompt re-armed another session's
# gate mid-turn, and the gate it re-armed then ran the suite a second time.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=.claude/hooks/session-key.sh
source "$ROOT/.claude/hooks/session-key.sh"

PAYLOAD=""
[ -t 0 ] || PAYLOAD="$(cat)"
KEY="$(claude_session_key "$PAYLOAD")"
rm -f "${TMPDIR:-/tmp}/.claude-test-check-$KEY" "${TMPDIR:-/tmp}/.claude-test-output-$KEY.txt"

# The pre-fix path, removed on sight so the three sessions stop inheriting each
# other's marks while they are all still on the old settings.json in memory.
rm -f /tmp/.claude-test-check-done
exit 0
