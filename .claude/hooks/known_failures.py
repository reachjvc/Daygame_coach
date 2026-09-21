#!/usr/bin/env python3
"""
THE END-OF-TURN CHECK, MADE MECHANICAL.

`docs/known-failures.md` is a checklist of things that actually went wrong here.
A checklist only works if it is read at the moment of the decision, and the
moment for this one is just before the turn ends — not at session start, where
CLAUDE.md already sits and where, fifty tool calls later, it is ancient history.
So this runs on Stop and puts the list in front of the model while it still has
the turn's work in context. Same words, different placement, and placement is
the whole difference.

TWO THINGS IT DELIBERATELY DOES NOT DO.

It does not fire on every turn. A check that always fires gets rubber-stamped:
this repo's own `ci.yml` records `eslint .` failing for days on 492 pre-existing
errors, "which trains everyone to ignore a red tick". So it fires only when the
turn actually changed something on disk, and at most once per turn.

It does not decide whether the work is good. It asks the questions; the model
answers them. A hook that tried to grade the answer would be another stand-in,
which is failure number one on the list it is serving.

SESSION-SCOPED ON PURPOSE. Three Claude sessions share this checkout. The older
hooks here use fixed paths like `/tmp/.claude-test-check-done`, so one session's
marker silences another session's check. Everything below is keyed by the
session id that Claude Code passes in on stdin.

Usage (see .claude/settings.json):
  UserPromptSubmit -> --snapshot   record the working tree as the turn begins
  Stop             -> --check      compare, and inject the list if it moved
"""

import hashlib
import json
import os
import subprocess
import sys
import tempfile
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CHECKLIST = os.path.join(ROOT, "docs", "known-failures.md")


def session_id() -> str:
    """The session id Claude Code sends on stdin. Falls back to a shared key,
    which is worse but never wrong enough to crash a turn."""
    try:
        payload = json.loads(sys.stdin.read() or "{}")
        sid = str(payload.get("session_id") or "shared")
    except Exception:
        sid = "shared"
    return hashlib.sha256(sid.encode()).hexdigest()[:16]


def paths(sid: str):
    base = os.path.join(tempfile.gettempdir(), f".claude-known-failures-{sid}")
    return base + ".snap", base + ".fired"


# One line per fire, shared by all sessions. The markers are transient — `.fired`
# is deleted at the start of every turn — so without this there is no way to ask
# "has this ever fired for me?", only "is it firing right now". An unmeasurable
# mechanism is indistinguishable from one that does nothing.
LOG = os.path.join(tempfile.gettempdir(), "claude-known-failures.log")


def note_fired(sid: str) -> None:
    try:
        with open(LOG, "a") as fh:
            fh.write(f"{datetime.now().isoformat(timespec='seconds')} fired session={sid}\n")
    except OSError:
        pass  # a hook that cannot write its log still has a job to do


def tree_state() -> str:
    """A hash of what is dirty in the working tree, including file sizes so an
    edit in place counts. Cheap: one git call, no file contents read."""
    try:
        out = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=ROOT, capture_output=True, text=True, timeout=15,
        ).stdout
    except Exception:
        return ""
    rows = []
    for line in out.splitlines():
        name = line[3:].strip().strip('"')
        try:
            rows.append(f"{line[:2]}{name}{os.path.getsize(os.path.join(ROOT, name))}")
        except OSError:
            rows.append(line)
    return hashlib.sha256("\n".join(sorted(rows)).encode()).hexdigest()


def main() -> int:
    mode = sys.argv[1] if len(sys.argv) > 1 else "--check"
    sid = session_id()
    snap, fired = paths(sid)

    if mode == "--snapshot":
        # A new user message: this turn has changed nothing yet, and the
        # previous turn's "already fired" flag is spent.
        with open(snap, "w") as fh:
            fh.write(tree_state())
        if os.path.exists(fired):
            os.remove(fired)
        return 0

    if os.path.exists(fired):
        return 0  # already asked this turn; asking twice is nagging, not checking

    before = ""
    if os.path.exists(snap):
        with open(snap) as fh:
            before = fh.read()
    # No snapshot means the session started mid-flight. Staying quiet is the
    # safe read: better a missed check than one that fires on every turn.
    if not before or before == tree_state():
        return 0

    try:
        with open(CHECKLIST) as fh:
            body = fh.read()
    except OSError:
        return 0  # the list is gone; a hook is not the place to complain about it

    open(fired, "w").close()
    note_fired(sid)
    print(json.dumps({
        "decision": "block",
        "reason": "End-of-turn check against docs/known-failures.md",
        "hookSpecificOutput": {
            "additionalContext": (
                "This turn changed files on disk. Before you answer, run the "
                "checklist below against the work you are about to hand over, "
                "and fix or say out loud anything it catches. Do not reply "
                "describing the checklist — reply with the work, corrected.\n\n"
                + body
                + "\n\nThis will not fire again this turn."
            )
        },
    }))
    return 0


if __name__ == "__main__":
    sys.exit(main())
