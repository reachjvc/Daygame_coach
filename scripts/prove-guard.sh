#!/usr/bin/env bash
#
# PROVE A GUARD BY BREAKING WHAT IT GUARDS — with a WHOLE-FILE revert.
#
# A test that has never been observed failing is a test whose subject is
# unproven. The habit is to check by hand: put the old line back, run the test,
# watch it go red, put the fix back. That habit has a hole in it, and the hole
# cost a round on 2026-09-26.
#
#   A delete button was `absolute right-1 top-1 … sm:flex`, sitting on top of
#   the ✓ on any screen 640px or wider, so the tick took no clicks there. The
#   fix was two edits to one file: the button lost `absolute`, and the row grew
#   a sixth grid column to hold it.
#
#   To prove the new spec caught it I put the old CLASS back — the edit I
#   remembered — and left the new grid column in place. The suite stayed GREEN,
#   because the absolutely-positioned button was now over an empty sixth column
#   rather than over the ✓. Had I stopped there I would have reported a guard
#   that had never been shown to fail. Only `git show HEAD:<file>` turned it
#   red: fifteen covered ticks, one per set per lift.
#
#   The revert was itself a stand-in for the bug. A fix is a diff, not a line,
#   and memory of it is the least reliable part of the loop.
#
# So this does the revert from git, runs whatever you ask, and puts the file
# back whatever happens — including on Ctrl-C.
#
# Usage:
#   scripts/prove-guard.sh <before-ref> <file> -- <command...>
#
#   <before-ref>  a commit where the file still has the bug, e.g. HEAD~1,
#                 or <fix-commit>^
#   <file>        the source file the fix changed, restored WHOLE
#   <command>     the check that must fail, e.g.
#                 npx vitest run tests/unit/db/workoutGone.test.ts
#
# Exit 0 when the command FAILED with the bug restored — that is the good news,
# and it is the only result that proves anything. Exit 1 when it passed, which
# means the guard does not cover what you think it covers.

set -uo pipefail

if [ "$#" -lt 4 ]; then
  echo "usage: $0 <before-ref> <file> -- <command...>" >&2
  exit 2
fi

BEFORE="$1"; shift
FILE="$1"; shift
if [ "$1" != "--" ]; then
  echo "expected -- before the command, got: $1" >&2
  exit 2
fi
shift

if [ ! -f "$FILE" ]; then
  echo "no such file: $FILE" >&2
  exit 2
fi

# UNCOMMITTED WORK IS NOT SOMETHING TO GAMBLE WITH. This overwrites the file
# from git and restores it from git, so anything not committed would be gone —
# and in a tree three sessions share, it might not even be yours.
if ! git diff --quiet -- "$FILE" || ! git diff --cached --quiet -- "$FILE"; then
  echo "refusing: $FILE has uncommitted changes, and this replaces it from git." >&2
  echo "Commit the fix first — the whole point is to revert a committed fix." >&2
  exit 2
fi

if ! git cat-file -e "$BEFORE:$FILE" 2>/dev/null; then
  echo "refusing: $FILE does not exist at $BEFORE, so there is nothing to revert to." >&2
  exit 2
fi

# NOT WHILE A SUITE IS RUNNING. This overwrites a file under `src/`, which
# restarts `next dev` — and a restart mid-run fails Playwright specs inside
# `page.evaluate` with messages that look exactly like real defects in the route
# under test. This repo has lost rounds to that, and the tree is shared with
# other sessions and with the owner's own browser on :3000.
if pgrep -f "playwright test" >/dev/null 2>&1; then
  echo "refusing: a Playwright run is in progress, and reverting a file under src/" >&2
  echo "restarts the dev server underneath it. Wait for it, or use a git worktree." >&2
  exit 2
fi

SAVED="$(mktemp)"
git show "HEAD:$FILE" > "$SAVED"

restore() {
  cp "$SAVED" "$FILE"
  rm -f "$SAVED"
  echo "→ $FILE restored from HEAD"
}
# Every exit path, including the signal ones. A run left half-reverted is worse
# than no run: the next thing anybody does is measured against a broken tree.
trap restore EXIT INT TERM

echo "→ reverting $FILE to $BEFORE (whole file, not a remembered line)"
git show "$BEFORE:$FILE" > "$FILE"

if git diff --quiet -- "$FILE"; then
  echo
  echo "NOTHING CHANGED. $FILE is identical at $BEFORE and HEAD, so this run"
  echo "proves nothing — the fix is in another file, or the ref is wrong." >&2
  exit 2
fi

echo "→ running: $*"
echo
set +e
"$@"
STATUS=$?
set -e

echo
if [ "$STATUS" -ne 0 ]; then
  echo "PROVED. The check failed (exit $STATUS) with the bug back in place."
  exit 0
fi

echo "NOT PROVED. The check PASSED with the bug back in place, so it does not" >&2
echo "cover this. Either the revert did not reach the defect — look at" >&2
echo "  git diff $BEFORE -- $FILE" >&2
echo "and check the whole diff is the fix — or the assertion is about" >&2
echo "something adjacent to its own name." >&2
exit 1
