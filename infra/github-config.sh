#!/usr/bin/env bash
#
# Configure GitHub for staging publishing, through the GitHub CLI.
#
#   infra/github-config.sh --dry-run   print the plan; change nothing
#   infra/github-config.sh             do it (needs `gh auth login`, blocker B-GH)
#
# It sets, on reachjvc/Daygame_coach:
#   - the environment `staging`, deployable from main only;
#   - its variables NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and
#     NEXT_PUBLIC_APP_URL=https://localhost, read from
#     ~/.config/daygame/build-public.env (infra/write-env-file.sh). Values go
#     to gh on stdin, never on a command line and never on screen;
#   - the repository variable STAGING_PUBLISH=on, which switches on ci.yml's
#     image-staging job;
#   - approval required for workflow runs from ALL outside contributors, so
#     a fork's pull request runs nothing until the owner looks at it.
#
# Production's environment and variables are set in Phase 6, after the STOP
# line, with the owner as required reviewer.
# Plans/caddy-deploy-and-cicd.md, Phase 4 step 4.

set -euo pipefail

REPO_SLUG="${REPO_SLUG:-reachjvc/Daygame_coach}"
CONFIG_DIR="${DAYGAME_CONFIG_DIR:-$HOME/.config/daygame}"
PUBLIC_ENV="$CONFIG_DIR/build-public.env"
ENV_NAME=staging
BRANCH=main
KEYS=(NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY NEXT_PUBLIC_APP_URL)

die() { printf 'github-config: ERROR: %s\n' "$*" >&2; exit 1; }
plan() { printf 'github-config: %s\n' "$*"; }

dry_run=no
case "${1:-}" in
  --dry-run) dry_run=yes ;;
  "") ;;
  *) die "usage: infra/github-config.sh [--dry-run]" ;;
esac

[ -f "$PUBLIC_ENV" ] || die "$PUBLIC_ENV is missing. Write it with: infra/write-env-file.sh staging"
value_of() { # KEY -> value from build-public.env, without printing it
  sed -n "s/^$1='\\(.*\\)'\$/\\1/p" "$PUBLIC_ENV" | tail -1
}
for key in "${KEYS[@]}"; do [ -n "$(value_of "$key")" ] || die "$key is empty in $PUBLIC_ENV."; done
[ "$(value_of NEXT_PUBLIC_APP_URL)" = "https://localhost" ] || die "staging's NEXT_PUBLIC_APP_URL must be https://localhost."

if [ "$dry_run" = yes ]; then
  plan "dry run: GitHub is not contacted."
  plan "would create or update the environment $ENV_NAME on $REPO_SLUG, deployable from $BRANCH only"
  for key in "${KEYS[@]}"; do plan "would set $ENV_NAME variable $key (from $PUBLIC_ENV, on stdin)"; done
  plan "would set the repository variable STAGING_PUBLISH=on"
  plan "would require approval for workflow runs from all outside contributors"
  exit 0
fi

gh auth status >/dev/null 2>&1 || die "the GitHub CLI is not logged in (blocker B-GH): gh auth login -s read:packages"

gh api -X PUT "repos/$REPO_SLUG/environments/$ENV_NAME" --input - >/dev/null <<'JSON'
{"deployment_branch_policy": {"protected_branches": false, "custom_branch_policies": true}}
JSON
policies="$(gh api "repos/$REPO_SLUG/environments/$ENV_NAME/deployment-branch-policies" --jq '[.branch_policies[].name] | join(" ")')"
if ! grep -qw "$BRANCH" <<<"$policies"; then
  gh api -X POST "repos/$REPO_SLUG/environments/$ENV_NAME/deployment-branch-policies" -f name="$BRANCH" -f type=branch >/dev/null
fi
plan "environment $ENV_NAME: deployable from $BRANCH only"

for key in "${KEYS[@]}"; do
  value_of "$key" | gh variable set "$key" --env "$ENV_NAME" --repo "$REPO_SLUG" >/dev/null
  plan "environment variable $key set"
done

gh variable set STAGING_PUBLISH --body on --repo "$REPO_SLUG" >/dev/null
plan "repository variable STAGING_PUBLISH=on"

gh api -X PUT "repos/$REPO_SLUG/actions/permissions/fork-pr-contributor-approval" -f approval_policy=all_external_contributors >/dev/null
plan "workflow runs from all outside contributors need approval"
