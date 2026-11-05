"""Rule 30: no forum text in the public repo.

Usage: python3 board/check_privacy.py <file> [<file> ...]
Builds every 8-word run from all harvested quit-forum posts (they live only on the owner's machine, in
~/.cache/daygame-research: forums/<sub>/parsed.jsonl, leaves/posts.jsonl and the scored batches) and fails if
any of the given files contains one. On a machine without that folder it says so and passes.
"""
import glob
import json
import os
import re
import sys

HOME = os.path.expanduser("~/.cache/daygame-research")
N = 8
# names and set phrases that are not anyone's words (a run inside one of these is not a quote)
NAMES = ["members of the church of jesus christ of latter day saints"]


def words(t):
    return re.findall(r"[a-z0-9']+", t.lower().replace("’", "'"))


def runs(ws):
    return {hash(" ".join(ws[i:i + N])) for i in range(len(ws) - N + 1)}


def forum_runs():
    out, n = set(), 0
    for fn in glob.glob(os.path.join(HOME, "forums", "*", "parsed.jsonl")) + [os.path.join(HOME, "leaves", "posts.jsonl")]:
        if not os.path.exists(fn):
            continue
        with open(fn, encoding="utf-8") as f:
            for line in f:
                p = json.loads(line)
                out |= runs(words((p.get("title") or "") + " " + (p.get("body") or p.get("selftext") or "")))
                n += 1
    for fn in glob.glob(os.path.join(HOME, "one-pagers-v2", "felt", "batches", "*.txt")):
        for block in open(fn, encoding="utf-8").read().split("=== ")[1:]:
            out |= runs(words(block.split("===", 1)[-1]))
    return out, n


def main(paths):
    forum, n = forum_runs()
    if not forum:
        print("privacy check: no forum posts on this machine, skipped")
        return 0
    bad = 0
    for p in paths:
        ws = words(open(p, encoding="utf-8").read())
        hits = [" ".join(ws[i:i + N]) for i in range(len(ws) - N + 1) if hash(" ".join(ws[i:i + N])) in forum]
        hits = [h for h in hits if not any(h in nm for nm in NAMES)]
        for h in sorted(set(hits))[:5]:
            print(f"PROBLEM: {p}: forum text in a public file: “{h}”")
        bad += len(set(hits))
    print(f"privacy check: {len(paths)} files against {len(forum)} 8-word runs from {n} forum posts, {bad} hits")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
