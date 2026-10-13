# check=skip=SecretsUsedInArgOrEnv
#
# THE APP, AS ONE IMAGE BUILT FROM ONE COMMIT.
#
# Every server runs only images built here, from a commit (infra/build-image.sh
# locally, the image jobs in .github/workflows/ci.yml in CI). Never from the
# shared working folder, which can hold another session's half-finished edit.
#
# The check skipped above warns about ARGs whose names contain "KEY". The only
# one here is NEXT_PUBLIC_SUPABASE_ANON_KEY, which is public by design: it is
# inlined into every browser bundle, and row-level security does the guarding.
# No secret is ever passed to this build; tests/unit/infra/localDeploy.test.ts
# fails if NEXT_SERVER_ACTIONS_ENCRYPTION_KEY appears here.
#
# Debian slim, not Alpine: onnxruntime-node ships glibc builds only.
# Pinned by digest, so a rebuild of the same commit gets the same base.
# Plans/caddy-deploy-and-cicd.md, Phase 3.

ARG NODE_IMAGE=node:24.21.0-trixie-slim@sha256:173f125896c3b47ddf056734c7ea789d04595a6a08769a8f78e0df642781fb66

# --- deps: the lockfile's exact tree, nothing else ---------------------------
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN HUSKY=0 npm ci --no-audit --no-fund

# --- build ---------------------------------------------------------------------
FROM ${NODE_IMAGE} AS build
WORKDIR /app

# Inlined into the bundles by `next build`, so they must be right at build time.
# An empty one stops the build here, by name, rather than producing an app that
# cannot reach Supabase and fails only in the browser.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ARG BUILD_SHA
RUN : "${NEXT_PUBLIC_SUPABASE_URL:?build argument NEXT_PUBLIC_SUPABASE_URL is required}" \
 && : "${NEXT_PUBLIC_SUPABASE_ANON_KEY:?build argument NEXT_PUBLIC_SUPABASE_ANON_KEY is required}" \
 && : "${NEXT_PUBLIC_APP_URL:?build argument NEXT_PUBLIC_APP_URL is required}" \
 && : "${BUILD_SHA:?build argument BUILD_SHA is required}"

# NEXT_OUTPUT switches on the self-hosted config in next.config.mjs.
# NEXT_DEPLOYMENT_ID makes a tab left open across a deploy reload instead of
# asking for files that are gone (Next's deploymentId guide).
ENV NEXT_OUTPUT=standalone \
    NEXT_DEPLOYMENT_ID=${BUILD_SHA} \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN BUILD_CONTEXT=container npm run build

# --- runtime -------------------------------------------------------------------
FROM ${NODE_IMAGE} AS runtime
WORKDIR /app
ARG BUILD_SHA
# The revision is what infra/deploy.sh expects /api/healthz to report; the
# title is how it tells this app's images from every other image when pruning.
LABEL org.opencontainers.image.revision=${BUILD_SHA} \
      org.opencontainers.image.title=daygame-coach

# 0.0.0.0 inside the container, because Caddy reaches the app over the compose
# network. It stays private: infra/compose.yaml publishes no port for the app.
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1

# The standalone server copies neither .next/static nor public/ by itself.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/scripts/check-runtime-env.mjs ./scripts/check-runtime-env.mjs

# The image's `node` user, by number so the host and the scanners can check it
# is not root without resolving a name.
USER 1000:1000
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/healthz').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]

# `exec` hands PID 2 to node itself, so the stop signal reaches Next and it
# drains in-flight requests. Without it the signal stops at sh.
CMD ["sh", "-c", "node scripts/check-runtime-env.mjs && exec node server.js"]
