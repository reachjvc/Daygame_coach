#!/usr/bin/env python3
"""
THE "NEVER" LIST, MADE MECHANICAL.

Three rules in this repo have an exact moment. Each one was a sentence in
CLAUDE.md, which is read once at session start and is ancient history by the
time the moment arrives. This turns them into a refusal from the tool.

  1. Shared checkout      no `git add -A`, no `git stash`. Three Claude
                          sessions work in this one working tree; a sweep
                          commits somebody else's half-finished file, and a
                          stash hides it. One stash here already holds work
                          that must never be popped.
  2. Screenshots          no `.png` written outside `.playwright-mcp/`.
  3. Live-data probes     no INSERT/UPDATE/DELETE against the real database
                          outside a begin/rollback. On 2026-08-27 an
                          `update life_answers set body = 'rewritten'`, run to
                          check whether a constraint held, destroyed a sentence
                          a real person had written ninety seconds earlier.

WHY A HOOK AND NOT A PERMISSION RULE. Permission globs match a prefix of the
command. `cd src && git add -A` does not start with `git add -A`, so a
`Bash(git add -A:*)` deny rule passes and protects nothing — the failure mode
the ratchets in this repo exist to catch. A hook is handed the whole command
string and can look at all of it.

IT FAILS OPEN. Two other sessions share this settings file. A hook that throws
on an input it did not expect would block their work, so every path out of an
error is "allow". The cost of a miss is one unenforced rule; the cost of a
false block is somebody else's session wedged.

PROVE IT, DO NOT TRUST IT. `tests/unit/hooks/neverHook.test.ts` feeds this the
exact payloads below and asserts deny on each, plus allow on the near misses
that must keep working (`git add <path>`, `git stash list`, a rollback-wrapped
probe). Run `python3 .claude/hooks/never.py --selftest` for the same checks
without vitest.

Wired as PreToolUse in .claude/settings.json.
"""

import json
import os
import re
import sys

# Where screenshots are allowed to land. Relative, because that is how both the
# Write tool and the Playwright MCP server spell it.
SHOTS = ".playwright-mcp"

# Splits a shell line into the separate commands it actually runs, so a rule
# reads `git add -A` in `cd src && git add -A` the same as on its own.
SEPARATORS = re.compile(r"&&|\|\||\||;|\n")

# A heredoc body is data, not commands. The first version of this hook blocked
# the command that WROTE THIS FILE, because the documentation it was writing
# quotes `git add -A` as an example. A hook that blocks writing about a rule is
# a hook somebody switches off by the end of the day.
HEREDOC = re.compile(r"<<-?\s*'?\"?([A-Za-z_][A-Za-z0-9_]*)'?\"?")


def strip_heredocs(command: str) -> str:
    """Remove every heredoc body, keeping the command lines around them."""
    lines = command.split("\n")
    out, i = [], 0
    while i < len(lines):
        line = lines[i]
        out.append(line)
        marker = HEREDOC.search(line)
        i += 1
        if marker:
            end = marker.group(1)
            while i < len(lines) and lines[i].strip() != end:
                i += 1
            i += 1  # skip the terminator itself
    return "\n".join(out)

GIT_ADD_SWEEP = re.compile(r"\bgit\s+add\b(?=[^\n]*?(?:\s-A\b|\s--all\b|\s+\.\s*$|\s+\.\s+|\s+\*))")
# Only `list` and `show` are reads. Everything else — bare, push, save, pop,
# apply, drop, clear — either hides work or destroys it.
GIT_STASH_WRITE = re.compile(r"\bgit\s+stash\b(?!\s+(?:list|show)\b)")

DB_TOOL = re.compile(r"\bsupabase\s+db\s+(?:query|execute)\b|\bpsql\b")
# No trailing \b on the alternation: `update\s+\w\b` cannot match "update
# life_answers", because the boundary would have to fall inside a word. The
# self-test caught that on the first run, with the exact command from 2026-08-27.
DB_WRITE = re.compile(r"\b(?:insert\s+into\b|update\s+\w+|delete\s+from\b|drop\s+table\b|truncate\b|alter\s+table\b)", re.I)
DB_WRAPPED = re.compile(r"\brollback\b", re.I)

# A png only matters when something is producing one. Reading one is fine, so
# only destinations are checked — `cp shot.png .playwright-mcp/shot.png` is a
# correct command whose *source* is stray, and must not be blocked.
PNG_PRODUCER = re.compile(r"\b(?:cp|mv|convert|magick|ffmpeg|scrot|import)\b|>")
PNG_PATH = re.compile(r"[\w./~-]+\.png\b")
REDIRECT_TARGET = re.compile(r">>?\s*([\w./~-]+)")


# The "ask first" list from CLAUDE.md, as paths rather than prose. Each entry
# is (path fragment, what the owner is being asked about). A fragment matches
# anywhere in the path, which is deliberately blunt: over-asking on these files
# costs one keystroke, under-asking costs an account or a charge.
ASK_FIRST = [
    ("supabase/migrations/", "a database migration — schema and write-policy changes"),
    ("src/db/profilesRepo.ts", "who is allowed into the paid modules (hasAccess)"),
    ("src/settings/stripe.ts", "payments"),
    ("src/home/products.ts", "what the product costs"),
    ("src/home/components/CheckoutButton.ts", "checkout"),
    ("app/auth/", "sign-up, login and password reset"),
    ("src/shared/iconRoles.ts", "reusing an icon in a new context"),
]


def decision(kind: str, reason: str) -> dict:
    return {
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": kind,
            "permissionDecisionReason": reason,
        }
    }


def deny(reason: str) -> dict:
    return decision("deny", reason)


def ask(reason: str) -> dict:
    return decision("ask", reason)


def png_is_stray(path: str) -> bool:
    """True when this .png would land outside .playwright-mcp/."""
    if not path.lower().endswith(".png"):
        return False
    norm = os.path.normpath(path).lstrip("./")
    return not norm.startswith(SHOTS + os.sep) and SHOTS + "/" not in path


def check_bash(command: str):
    for part in SEPARATORS.split(strip_heredocs(command)):
        part = part.strip()
        if not part:
            continue

        if GIT_ADD_SWEEP.search(part):
            return deny(
                "Three Claude sessions share this working tree, so a sweeping "
                "`git add` stages somebody else's half-finished file. Name the "
                "paths you mean: `git add path/one path/two`."
            )

        if GIT_STASH_WRITE.search(part):
            return deny(
                "`git stash` is off in this checkout — two other sessions are "
                "editing these same files, and one existing stash holds work "
                "that must never be popped. Commit to a branch instead. "
                "(`git stash list` and `git stash show` are allowed.)"
            )

        if DB_TOOL.search(part) and DB_WRITE.search(part) and not DB_WRAPPED.search(part):
            return deny(
                "This writes to the real database to find something out. On "
                "2026-08-27 exactly this destroyed a sentence a real user had "
                "written ninety seconds earlier, unrecoverably. Wrap it: "
                "`begin; ...; rollback;` — or, if the write is meant to last, "
                "put it in supabase/migrations/ instead."
            )

        if PNG_PRODUCER.search(part):
            for path in png_destinations(part):
                if png_is_stray(path):
                    return deny(
                        f"`{path}` is a .png outside {SHOTS}/. Screenshots go "
                        f"in {SHOTS}/ so they can be deleted as a batch."
                    )
    return None


def png_destinations(part: str):
    """The pngs this command would *write*: every redirect target, plus the
    last argument when it is a png (cp/mv/convert all put the destination
    last). Sources are deliberately not checked."""
    targets = [t for t in REDIRECT_TARGET.findall(part) if t.lower().endswith(".png")]
    tokens = part.split()
    if tokens and tokens[-1].strip("'\"").lower().endswith(".png"):
        targets.append(tokens[-1].strip("'\""))
    return targets


def check_write(tool_input: dict):
    path = str(tool_input.get("file_path") or "")
    if png_is_stray(path):
        return deny(f"`{path}` is a .png outside {SHOTS}/. Write it to {SHOTS}/ instead.")
    for fragment, subject in ASK_FIRST:
        if fragment in path:
            return ask(
                f"`{path}` is on the ask-first list: {subject}. "
                "Confirm this is what you want changed."
            )
    return None


def check_screenshot(tool_input: dict):
    name = str(tool_input.get("filename") or "")
    # A bare filename lands in .playwright-mcp/ already; only an explicit path
    # elsewhere is a problem.
    if name and ("/" in name or os.path.isabs(name)) and png_is_stray(name):
        return deny(f"`{name}` would put a screenshot outside {SHOTS}/. Pass a bare filename.")
    return None


def decide(payload: dict):
    tool = payload.get("tool_name") or ""
    tool_input = payload.get("tool_input") or {}
    if not isinstance(tool_input, dict):
        return None

    if tool == "Bash":
        return check_bash(str(tool_input.get("command") or ""))
    if tool in ("Write", "Edit", "NotebookEdit"):
        return check_write(tool_input)
    if tool.endswith("browser_take_screenshot"):
        return check_screenshot(tool_input)
    return None


def main() -> int:
    if len(sys.argv) > 1 and sys.argv[1] == "--selftest":
        return selftest()
    try:
        payload = json.loads(sys.stdin.read() or "{}")
        verdict = decide(payload)
    except Exception:
        return 0  # fail open: never wedge another session on an input we misread
    if verdict:
        print(json.dumps(verdict))
    return 0


CASES = [
    # (tool, tool_input, expected decision or None for "stay silent", what it is)
    ("Bash", {"command": "git add -A"}, "deny", "bare sweep"),
    ("Bash", {"command": "cd src && git add -A"}, "deny", "sweep behind a cd — the glob-evading case"),
    ("Bash", {"command": "git add --all"}, "deny", "long form"),
    ("Bash", {"command": "git add ."}, "deny", "dot form"),
    ("Bash", {"command": "git add CLAUDE.md docs/map.md"}, None, "named paths still work"),
    ("Bash", {"command": "git stash"}, "deny", "bare stash"),
    ("Bash", {"command": "git stash pop"}, "deny", "pop — the one that must never run here"),
    ("Bash", {"command": "git stash list"}, None, "reading the stash is fine"),
    ("Bash", {"command": "supabase db query --linked \"update life_answers set body = 'x'\""}, "deny", "the 2026-08-27 command"),
    ("Bash", {"command": "supabase db query --linked \"begin; update t set a=1; rollback;\""}, None, "wrapped probe is fine"),
    ("Bash", {"command": "supabase db query --linked 'select count(*) from life_answers'"}, None, "a read is fine"),
    ("Bash", {"command": "grep -rn 'delete from' src/"}, None, "grepping for SQL is not running it"),
    ("Bash", {"command": "cp shot.png docs/shot.png"}, "deny", "png outside the folder"),
    ("Bash", {"command": "cp shot.png .playwright-mcp/shot.png"}, None, "png inside the folder"),
    ("Write", {"file_path": "docs/diagram.png"}, "deny", "Write tool, stray png"),
    ("Write", {"file_path": ".playwright-mcp/after.png"}, None, "Write tool, correct folder"),
    ("Write", {"file_path": "src/vice/data/blackbox.ts"}, None, "ordinary file"),
    ("mcp__playwright__browser_take_screenshot", {"filename": "/tmp/x.png"}, "deny", "screenshot escaping the folder"),
    ("mcp__playwright__browser_take_screenshot", {"filename": "hub.png"}, None, "bare filename lands correctly"),
    # Heredoc bodies are data. This exact case blocked the command that wrote
    # the new CLAUDE.md, because the file documents the rule it was tripping.
    ("Bash", {"command": "cat > doc.md <<'EOF'\nNever run git add -A here.\nEOF"}, None,
     "writing documentation that quotes the rule"),
    ("Bash", {"command": "cat > doc.md <<'EOF'\nwhatever\nEOF\ngit add -A"}, "deny",
     "a real sweep AFTER a heredoc is still caught"),
    # The ask-first list.
    ("Write", {"file_path": "supabase/migrations/20260921_x.sql"}, "ask", "a migration"),
    ("Edit", {"file_path": "src/db/profilesRepo.ts"}, "ask", "who gets into the paid modules"),
    ("Edit", {"file_path": "src/settings/stripe.ts"}, "ask", "payments"),
    ("Edit", {"file_path": "app/auth/login/page.tsx"}, "ask", "auth"),
    ("Edit", {"file_path": "src/shared/iconRoles.ts"}, "ask", "icon reuse"),
    ("Edit", {"file_path": "src/settings/settingsService.ts"}, None, "an ordinary neighbour of a listed file"),
]


def selftest() -> int:
    bad = 0
    for tool, tool_input, want, label in CASES:
        verdict = decide({"tool_name": tool, "tool_input": tool_input})
        got = verdict["hookSpecificOutput"]["permissionDecision"] if verdict else None
        if got != want:
            bad += 1
            print(f"FAIL  expected {want or 'silence'}, got {got or 'silence'}: {label}")
    print(f"{len(CASES) - bad}/{len(CASES)} cases correct")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
