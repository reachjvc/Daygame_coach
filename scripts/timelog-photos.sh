#!/bin/bash
# Run the Time Log's screen photos (tests/e2e/timelog-guard/photos) inside the ONE
# machine they are made and compared on: the pinned Playwright Docker image.
#
# Why: a photo test compares pixels, and the same page draws slightly differently
# on every operating system (fonts, edge smoothing). One fixed image means the
# photos made on this computer and the ones CI checks are the same picture.
# The spec refuses to run without PW_IN_PHOTO_IMAGE, which only this script sets.
#
# Usage (the app and the test backend run on the host, not in the container):
#   export E2E_STACK_ENV="$(node scripts/db/test-stack.mjs env)"   # the test backend's address and keys
#   export PW_BASE_URL=http://localhost:3330                        # an app started against that backend
#   bash scripts/timelog-photos.sh                                  # compare
#   bash scripts/timelog-photos.sh --update-snapshots               # make new photos (only after the owner's yes)
# Any further argument goes to `playwright test` (--repeat-each=20, --grep, --project=timelog-photos-phone ...).
#
# The image tag matches @playwright/test in package.json (tests/unit/ciWorkflows.test.ts
# checks it), and the digest makes the tag exact: a re-pushed tag cannot change a photo.

set -euo pipefail

IMAGE="mcr.microsoft.com/playwright:v1.58.1-noble@sha256:feae0b1581609d3dc2ba22567b4703dd6a3e7a219984bb86a19ed35007148a91"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

command -v docker >/dev/null 2>&1 || { echo "ERROR: docker is not installed or not running." >&2; exit 1; }
[ -n "${E2E_STACK_ENV:-}" ] || { echo "ERROR: E2E_STACK_ENV is not set. Start the test backend and export its env: node scripts/db/test-stack.mjs env" >&2; exit 1; }
[ -n "${PW_BASE_URL:-}" ] || { echo "ERROR: PW_BASE_URL is not set. Start the app against the test backend and name its address." >&2; exit 1; }

# A worktree's node_modules is usually a link to a folder outside the repo: mount that folder too, at the same path.
mounts=(-v "$ROOT:$ROOT")
if [ -L node_modules ]; then
  target="$(readlink -f node_modules)"
  mounts+=(-v "$target:$target:ro")
fi

# Both projects unless the caller names one (CI runs one per runner).
projects=(--project=timelog-photos-phone --project=timelog-photos-desktop)
for arg in "$@"; do
  case "$arg" in --project|--project=*) projects=() ;; esac
done

# The user's own id, so --update-snapshots writes files this user owns; HOME must be writable for that id.
exec docker run --rm \
  --network host \
  --ipc=host \
  --user "$(id -u):$(id -g)" \
  -e HOME=/tmp/photos-home \
  -e PW_IN_PHOTO_IMAGE=1 \
  -e PW_BASE_URL \
  -e E2E_STACK_ENV \
  -e CI \
  "${mounts[@]}" \
  -w "$ROOT" \
  "$IMAGE" \
  npx playwright test "${projects[@]}" --reporter=list "$@"
