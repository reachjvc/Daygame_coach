#!/usr/bin/env node
import { pathToFileURL } from "node:url"

/**
 * EVERY ENVIRONMENT VARIABLE THE APP READS, IN ONE LIST, AND THE CHECK THAT A
 * SERVER DOES NOT START WITHOUT THE ONES IT NEEDS.
 *
 * WHY. A server missing a required variable used to start anyway and fail later,
 * on the first request that needed it, with an error far from its cause. The
 * container now runs this before `server.js` (see infra/Dockerfile), so a
 * misconfigured server refuses to start and says which name is missing.
 *
 * THE KINDS.
 *   build-public  NEXT_PUBLIC_*: inlined into the bundles by `next build`. Set at
 *                 build time; the image already holds them.
 *   build         read only while building (next.config.mjs, scripts/build-id.mjs).
 *   platform      set by Next, Node or the container itself.
 *   required      the server cannot do its job without it. Checked here.
 *   optional      one feature needs it. That feature must say "not configured"
 *                 when used without it, never fall back to something else
 *                 silently.
 *
 * TWO PARTS. `READ_IN_CODE` holds every name read as `process.env.X` in app/,
 * src/, proxy.ts and next.config.mjs. `IMPLICIT` holds names that a library or
 * Next reads by itself, with no `process.env` text in our code — the reason
 * this list cannot be built by searching alone. Two tests guard both parts
 * (tests/unit/infra/runtimeEnv.test.ts): a new `process.env.X` that is not
 * listed fails, and so does a new import of a library in
 * `SELF_CONFIGURING_SDKS` whose variables are not listed.
 *
 * Nothing here ever prints a value, only names.
 */

/** @typedef {{ kind: "build-public" | "build" | "platform" | "required" | "optional", why: string }} Variable */

/** @type {Record<string, Variable>} */
export const READ_IN_CODE = {
  NEXT_PUBLIC_SUPABASE_URL: { kind: "build-public", why: "the Supabase project every request talks to" },
  NEXT_PUBLIC_SUPABASE_ANON_KEY: { kind: "build-public", why: "Supabase's public key; row-level security does the guarding" },
  NEXT_PUBLIC_APP_URL: { kind: "build-public", why: "the site's own address, for links back to it (Stripe returns)" },
  NEXT_PUBLIC_BUILD_ID: { kind: "build", why: "set by next.config.mjs from scripts/build-id.mjs, never by hand" },
  NEXT_DIST_DIR: { kind: "build", why: "a second dev server's own .next folder" },
  NEXT_OUTPUT: { kind: "build", why: "\"standalone\" switches on the self-hosted build (infra/Dockerfile)" },
  NODE_ENV: { kind: "platform", why: "set by Next" },
  SUPABASE_SERVICE_ROLE_KEY: { kind: "required", why: "error reports, tracking, embeddings and backups write with it" },
  ADMIN_SECRET_KEY: { kind: "optional", why: "the /api/admin endpoints; unset, every admin request is refused" },
  STRIPE_SECRET_KEY: { kind: "optional", why: "payments; unset, src/settings/stripe.ts says Stripe is not configured" },
  GOOGLE_SERVICE_ACCOUNT_JSON: { kind: "optional", why: "Google Calendar sync and the exercise sheet import" },
  GOOGLE_EXERCISE_SHEET_ID: { kind: "optional", why: "the exercise sheet import" },
  AI_PROVIDER: { kind: "optional", why: "which model provider structured output uses; \"claude\" when unset" },
  AI_MODEL: { kind: "optional", why: "which Claude model; a fixed model name when unset" },
  OLLAMA_API_URL: { kind: "optional", why: "Q&A and value inference through Ollama; unset, they say Ollama is not configured" },
  OLLAMA_MODEL: { kind: "optional", why: "which Ollama model; llama3.1 when unset" },
  USE_CLAUDE_CODE: { kind: "optional", why: "local Claude CLI for scenarios; cannot work in a container" },
  CLAUDE_PATH: { kind: "optional", why: "where the local Claude CLI is; cannot work in a container" },
  ENABLE_TEST_ROUTES: { kind: "optional", why: "test-only routes that write real data; refused on a server, below" },
}

/** @type {Record<string, Variable & { readBy: string }>} */
export const IMPLICIT = {
  ANTHROPIC_API_KEY: {
    kind: "optional",
    readBy: "@ai-sdk/anthropic",
    why: "every Claude feature (Q&A, scenarios, articles); read by the SDK's default `anthropic` provider",
  },
  NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: {
    kind: "required",
    readBy: "next",
    why: "replaces the Server Actions key that `next build` bakes into the image (a leaked image must not leak it)",
  },
  NEXT_DEPLOYMENT_ID: { kind: "build", readBy: "next", why: "version-skew protection; the commit SHA in Docker builds" },
  BUILD_SHA: { kind: "build", readBy: "scripts/build-id.mjs", why: "the commit, in builds that have no .git" },
  VERCEL_GIT_COMMIT_SHA: { kind: "build", readBy: "scripts/build-id.mjs", why: "Vercel's commit, while Vercel builds production" },
  HOSTNAME: { kind: "platform", readBy: "next (server.js)", why: "the address the server binds" },
  PORT: { kind: "platform", readBy: "next (server.js)", why: "the port the server binds" },
}

/**
 * Libraries that configure themselves from the environment when imported and
 * used with defaults. Importing one makes its variables part of what the app
 * needs, whether or not our code ever writes `process.env`.
 */
export const SELF_CONFIGURING_SDKS = {
  "@ai-sdk/anthropic": ["ANTHROPIC_API_KEY"],
  "@anthropic-ai/sdk": ["ANTHROPIC_API_KEY"],
  "@ai-sdk/openai": ["OPENAI_API_KEY"],
  openai: ["OPENAI_API_KEY"],
  "@ai-sdk/google": ["GOOGLE_GENERATIVE_AI_API_KEY"],
  "@ai-sdk/gateway": ["AI_GATEWAY_API_KEY"],
  "@vercel/blob": ["BLOB_READ_WRITE_TOKEN"],
  "@upstash/redis": ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
  "@sentry/nextjs": ["SENTRY_DSN"],
}

export const ALL = { ...READ_IN_CODE, ...IMPLICIT }

/**
 * @param {Record<string, string | undefined>} env
 * @returns {{ missing: string[], refused: string[], unconfigured: string[] }}
 */
export function checkRuntimeEnv(env) {
  const set = (name) => typeof env[name] === "string" && env[name].trim() !== ""
  const names = Object.keys(ALL)
  return {
    missing: names.filter((n) => ALL[n].kind === "required" && !set(n)),
    // The /api/test routes read and write real data with no login. proxy.ts
    // answers them in production only when this is "true", so a server with
    // it set is a server with an open door.
    refused: env.ENABLE_TEST_ROUTES === "true" ? ["ENABLE_TEST_ROUTES"] : [],
    unconfigured: names.filter((n) => ALL[n].kind === "optional" && n !== "ENABLE_TEST_ROUTES" && !set(n)),
  }
}

function main() {
  const { missing, refused, unconfigured } = checkRuntimeEnv(process.env)
  for (const name of missing) {
    console.error(`check-runtime-env: ${name} is required and not set — ${ALL[name].why}.`)
  }
  for (const name of refused) {
    console.error(`check-runtime-env: ${name}=true opens the /api/test routes, which write real data. Never on a server.`)
  }
  if (missing.length > 0 || refused.length > 0) {
    console.error("check-runtime-env: refusing to start. The list and its reasons: scripts/check-runtime-env.mjs.")
    process.exit(1)
  }
  if (unconfigured.length > 0) {
    console.log(`check-runtime-env: optional, not configured: ${unconfigured.join(", ")}.`)
  }
  console.log("check-runtime-env: every required variable is set.")
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
