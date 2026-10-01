#!/bin/bash
# THE GATE THAT STOPS A TURN ENDING ON RED TESTS.
#
# `.husky/pre-commit` already runs the suite at commit time, so this hook is not
# the commit gate and does not need to be. It exists for the turn that changes
# code and then ENDS — a report, a hand-off, an answer — where nothing else would
# have run a test before the work was called done. "Do NOT claim tests pass when
# they don't" is the rule; this is the moment it has to arrive.
#
# FOUR THINGS IT USED TO GET WRONG, all found on 2026-10-01, all fixed here.
#
#  1. It read `git diff --name-only HEAD`, which does not list untracked files.
#     A session that added a new `.ts` file and nothing else got 0 and the gate
#     exited without running one test. `git status --porcelain` alone is not the
#     fix either: git collapses an untracked DIRECTORY into a single entry
#     (`?? app/test/zzbuildprobe/`), which does not end in `.ts`, so a whole new
#     directory of code still skipped. Hence `-uall`.
#  2. Its marker lived at the fixed path /tmp/.claude-test-check-done, shared by
#     the three sessions in this checkout, so one session's turn silenced the
#     others'. Now keyed per session — see session-key.sh.
#  3. It put its instructions in `hookSpecificOutput.additionalContext`, which
#     Claude Code does not read on Stop. The text never arrived. Everything now
#     goes in `reason`, which is what becomes the blocking message.
#  4. It ran the suite while another suite was already running in this checkout.
#     That is how a peer session's benchmark was contaminated, and a 20s-budget
#     test failed at 22.8s for contention rather than for a defect. If something
#     else is running, this says so and does NOT claim the tests passed.
#
# `--explain` prints the decision and runs nothing. tests/unit/hooks/testGate.test.ts
# drives it that way, because a test that had to run the real suite to check the
# gate would take a minute and nobody would run it.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT" || exit 0
# shellcheck source=.claude/hooks/session-key.sh
source "$ROOT/.claude/hooks/session-key.sh"

EXPLAIN=""
[ "$1" = "--explain" ] && EXPLAIN="yes"

PAYLOAD=""
[ -t 0 ] || PAYLOAD="$(cat)"
KEY="$(claude_session_key "$PAYLOAD")"
MARKER="${TMPDIR:-/tmp}/.claude-test-check-$KEY"
OUTPUT="${TMPDIR:-/tmp}/.claude-test-output-$KEY.txt"

say() { [ -n "$EXPLAIN" ] && echo "$1"; }

# A blocking Stop message is JSON, and the text is prose with apostrophes and
# newlines in it. Rather than quote it by hand, read it from stdin and let
# python do the escaping - the first version of this function lost its own
# closing quote to the apostrophe in "somebody else's".
block_with_reason() {
  printf '{"decision": "block", "reason": %s}\n' \
    "$(python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')"
}

if [ -f "$MARKER" ]; then
  say "skip: already checked this turn ($MARKER)"
  exit 0
fi

# Every code file the tree holds that HEAD does not, however it got there:
# modified, staged, untracked, or inside an untracked directory.
CODE_MODIFIED=$(git status --porcelain -uall 2>/dev/null | grep -cE "\.(ts|tsx|js|jsx)$")

if [ "$CODE_MODIFIED" -eq 0 ]; then
  say "skip: no code files changed"
  exit 0
fi

# Another vitest or playwright run in THIS checkout means two things: our run
# would contaminate theirs, and theirs would make ours fail on timeouts rather
# than on defects. Reporting that is honest; running anyway is not, and claiming
# a pass we did not get would be worse than either.
BUSY=$(pgrep -fa "vitest|playwright" 2>/dev/null | grep -v "^$$ " | grep -c "$ROOT")
if [ "$BUSY" -gt 0 ]; then
  if [ -n "$EXPLAIN" ]; then
    echo "defer: $CODE_MODIFIED code files changed, but $BUSY test process(es) already running here"
    exit 0
  fi
  block_with_reason <<EOF
The unit suite was NOT run, so nothing here says the tests pass.

$BUSY test process(es) are already running in this checkout, and a second run
would contaminate theirs and fail on contention rather than on defects.

Say in your reply that the tests were not run and why. Do not call the work
verified. Run \`npm test\` yourself once the checkout is quiet.

This will not fire again this turn.
EOF
  touch "$MARKER"
  exit 0
fi

if [ -n "$EXPLAIN" ]; then
  echo "run: $CODE_MODIFIED code files changed"
  exit 0
fi

touch "$MARKER"
npm test --silent > "$OUTPUT" 2>&1
TEST_EXIT_CODE=$?

if [ "$TEST_EXIT_CODE" -ne 0 ]; then
  FAILURE_SUMMARY=$(grep -E "(FAIL|Error|✗|×)" "$OUTPUT" | head -10)
  block_with_reason <<EOF
STOP - TEST FAILURES DETECTED. Unit tests are failing. You MUST:

1. Report ALL failures to the user; do not summarize them away
2. Either fix them, or add each to .test-known-failures.json with the full test
   name, the reason and a ticket

Failures:
$FAILURE_SUMMARY

Full output: $OUTPUT

Do NOT claim tests pass when they do not. Do NOT dismiss a failure as
pre-existing without running it on HEAD to show that it is. Three sessions share
this checkout, so a failure may be in somebody else's uncommitted file - name
the file and say whose it is.

This will not fire again this turn.
EOF
  exit 0
fi

exit 0
