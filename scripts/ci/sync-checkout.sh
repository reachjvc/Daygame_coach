#!/bin/sh
# SESSION START: KEEP THIS CHECKOUT'S main ON GITHUB'S main.
#
# Sessions ship from their own worktrees (scripts/ship.mjs), so nothing moves
# the shared folder's main. It fell 328 commits behind (2026-11-18 to
# 2026-11-20) and new sessions read two-day-old code. This fast-forwards it.
# A fast-forward keeps unsaved edits and refuses rather than overwrite one;
# then it only says so. Never blocks, always exits 0.
[ "$(git symbolic-ref --short -q HEAD)" = main ] || exit 0
git fetch -q origin main 2>/dev/null || exit 0
git merge -q --ff-only origin/main >/dev/null 2>&1 && exit 0
behind=$(git rev-list --count main..origin/main)
ahead=$(git rev-list --count origin/main..main)
[ "$behind" = 0 ] && [ "$ahead" = 0 ] && exit 0
echo "this folder's main is $behind commit(s) behind GitHub and $ahead ahead; it could not fast-forward (an unsaved edit is in the way, or commits here are not on GitHub)."
exit 0
