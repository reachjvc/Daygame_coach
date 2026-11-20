#!/usr/bin/env bash
# Mutation score of one source file: scripts/mutation/run.sh src/shared/dateUtils.ts [concurrency]
# A big file can be done in line ranges, several at once separated by commas:
#   scripts/mutation/run.sh src/big.ts:1-500 2     scripts/mutation/run.sh src/big.ts:12-12,src/big.ts:40-44 2
# Stryker edits the files in place, so this refuses to run in the main checkout.
# Run it in a scratch worktree: git worktree add -b mut ~/scratch/mut origin/main
set -euo pipefail
target="${1:?usage: run.sh <source file>[:from-to] [concurrency]}"
first="${target%%,*}"
file="${first%%:*}"
conc="${2:-2}"
top="$(git rev-parse --show-toplevel)"
if [ "$(git rev-parse --git-dir)" = "$(git rev-parse --git-common-dir)" ]; then
  echo "refusing: this is the main checkout, Stryker edits files in place. Use a git worktree." >&2
  exit 1
fi
cd "$top"
[ -z "$(git status --porcelain -- "$file")" ] || { echo "refusing: $file has uncommitted changes" >&2; exit 1; }
trap 'git checkout -- "$file"; rm -f stryker-setup-*.js' EXIT
npx -y -p @stryker-mutator/core@9.6.1 -p @stryker-mutator/vitest-runner@9.6.1 stryker run \
  scripts/mutation/stryker.conf.json --mutate "$target" --concurrency "$conc"
