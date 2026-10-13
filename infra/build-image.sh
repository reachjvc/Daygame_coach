#!/usr/bin/env bash
#
# Build the app's Docker image on this machine, from a commit.
#
#   infra/build-image.sh <commit>          tracked files at that commit only
#                                          (git archive). Acceptance checks use this.
#   infra/build-image.sh --worktree <dir>  an isolated worktree, for quick iteration
#                                          before a commit. Never the shared folder.
#
# Prints the image ID on the last line of stdout, and nothing else there.
#
# WHY FROM A COMMIT. This checkout is shared by several sessions; a build of the
# working folder can contain another session's half-finished edit, and nobody
# could say afterwards which code a server ran. An image built from `git archive`
# is exactly one commit, named by its full SHA (scripts/build-id.mjs), and that
# SHA is the image's revision label, which infra/deploy.sh checks after a deploy.
#
# WHY A CAPPED BUILDER. A `next build` on this machine once took 29 GB and froze
# it. The build runs in the buildx builder `dg-capped`, a container capped at
# 12 GB, and this script refuses to build if Docker does not report that cap.
#
# The three public build values come from ~/.config/daygame/build-public.env,
# written by infra/write-env-file.sh. They are passed by name, so no value is
# ever on a command line or in this script's output. No build cache is ever
# exported or imported.
#
# Plans/caddy-deploy-and-cicd.md, Phase 3 step 4.

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_DIR="${DAYGAME_CONFIG_DIR:-$HOME/.config/daygame}"
PUBLIC_ENV="$CONFIG_DIR/build-public.env"
BUILDER="dg-capped"
CAP_BYTES=12884901888 # 12 GiB
IMAGE_NAME="${IMAGE_NAME:-daygame-coach}"
PUBLIC_KEYS=(NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY NEXT_PUBLIC_APP_URL)

die() { printf 'build-image: ERROR: %s\n' "$*" >&2; exit 1; }
say() { printf 'build-image: %s\n' "$*" >&2; }

usage() { sed -n '3,8p' "${BASH_SOURCE[0]}" >&2; exit 2; }

[ $# -ge 1 ] || usage
mode=commit
if [ "$1" = "--worktree" ]; then
  [ $# -eq 2 ] || usage
  mode=worktree
  src="$(cd "$2" && pwd)"
  git -C "$src" rev-parse --is-inside-work-tree >/dev/null 2>&1 || die "$src is not a git worktree."
  # The first entry of `git worktree list` is the main checkout: the shared one.
  shared="$(git -C "$src" worktree list --porcelain | sed -n '1s/^worktree //p')"
  [ "$src" != "$shared" ] || die "--worktree must be an isolated worktree, not the shared checkout $shared."
  sha="$(git -C "$src" rev-parse HEAD)"
else
  [ $# -eq 1 ] || usage
  sha="$(git -C "$REPO" rev-parse --verify --quiet "$1^{commit}")" || die "'$1' is not a commit in $REPO."
fi
[[ "$sha" =~ ^[0-9a-f]{40}$ ]] || die "could not resolve a full commit SHA (got '$sha')."

# --- the public build values, read without printing them ----------------------
[ -f "$PUBLIC_ENV" ] || die "$PUBLIC_ENV is missing. Write it with: infra/write-env-file.sh staging"
while IFS= read -r line || [ -n "$line" ]; do
  case "$line" in ''|'#'*) continue ;; esac
  key="${line%%=*}"
  value="${line#*=}"
  value="${value#\'}"
  value="${value%\'}"
  for wanted in "${PUBLIC_KEYS[@]}"; do
    if [ "$key" = "$wanted" ]; then export "$key=$value"; fi
  done
done < "$PUBLIC_ENV"
for key in "${PUBLIC_KEYS[@]}"; do
  [ -n "${!key:-}" ] || die "$key is missing or empty in $PUBLIC_ENV."
done

# --- room on C: ----------------------------------------------------------------
# WSL's virtual disk lives on C:, and a full C: detached WSL and killed every
# session on 2026-10-13, while this builder held 30 GB of cache. A build writes
# several GB, so it does not start below MIN_FREE_GB free there, and the
# builder's cache is trimmed to 4 GB after every build. Deleting inside WSL
# frees room in the virtual disk but never shrinks it on C:.
MIN_FREE_GB="${MIN_FREE_GB:-20}"
if [ -d /mnt/c ]; then
  free_gb="$(df -BG --output=avail /mnt/c | tail -1 | tr -dc '0-9')"
  [ "${free_gb:-0}" -ge "$MIN_FREE_GB" ] ||
    die "C: has ${free_gb:-?} GB free and a build needs ${MIN_FREE_GB}. A full C: detaches WSL (blocker B-DISK). Free space on C: first."
fi

# --- the capped builder -------------------------------------------------------
if ! docker buildx inspect "$BUILDER" >/dev/null 2>&1; then
  say "creating the buildx builder $BUILDER, capped at 12 GB"
  docker buildx create --name "$BUILDER" --driver docker-container \
    --driver-opt memory=12g --driver-opt memory-swap=12g >/dev/null
fi
docker buildx inspect --bootstrap "$BUILDER" >/dev/null
cap="$(docker inspect -f '{{.HostConfig.Memory}}' "buildx_buildkit_${BUILDER}0" 2>/dev/null || echo 0)"
[ "$cap" = "$CAP_BYTES" ] ||
  die "builder $BUILDER reports a memory limit of '$cap', not $CAP_BYTES. An uncapped build has frozen this machine; refusing. Recreate it: docker buildx rm $BUILDER"

# --- the build context ---------------------------------------------------------
if [ "$mode" = commit ]; then
  # The image runs as uid 1000, so every file must be readable by others.
  # tar applies the caller's umask to the archive's modes; a caller with
  # umask 077 would otherwise produce an image that cannot read itself.
  umask 022
  ctx="$(mktemp -d "${TMPDIR:-/tmp}/daygame-build-XXXXXX")"
  trap 'rm -rf "$ctx"' EXIT
  git -C "$REPO" archive --format=tar "$sha" | tar -x -C "$ctx"
  say "building commit $sha from git archive"
else
  ctx="$src"
  say "building the worktree $src (HEAD $sha, uncommitted changes included); not for acceptance checks"
fi
[ -f "$ctx/infra/Dockerfile" ] || die "commit $sha has no infra/Dockerfile."

docker buildx build \
  --builder "$BUILDER" \
  --file "$ctx/infra/Dockerfile" \
  --build-arg NEXT_PUBLIC_SUPABASE_URL \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY \
  --build-arg NEXT_PUBLIC_APP_URL \
  --build-arg "BUILD_SHA=$sha" \
  --provenance=false --sbom=false \
  --load \
  --tag "$IMAGE_NAME:$sha" \
  "$ctx" >&2
# The ID Docker gives the loaded image, which is what infra/deploy.sh accepts
# for a local rehearsal.
image_id="$(docker image inspect -f '{{.Id}}' "$IMAGE_NAME:$sha")"

docker buildx prune --builder "$BUILDER" --keep-storage 4gb -f >/dev/null 2>&1 ||
  say "WARNING: could not trim the builder's cache; check: docker buildx du --builder $BUILDER"

revision="$(docker image inspect -f '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$image_id")"
[ "$revision" = "$sha" ] || die "the image's revision label is '$revision', not $sha."
say "built $IMAGE_NAME:$sha ($image_id), commit $sha"
printf '%s\n' "$image_id"
