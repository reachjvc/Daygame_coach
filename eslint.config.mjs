import js from "@eslint/js"
import globals from "globals"
import tseslint from "typescript-eslint"
import nextPlugin from "@next/eslint-plugin-next"
import reactHooks from "eslint-plugin-react-hooks"

export default [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".venv/**",
      "dist/**",
      "build/**",
      "out/**",
      "coverage/**",
      "data/**",
      "training-data/**",
      // Gitignored scratch: throwaway Playwright captures, not repository code.
      // Linting it reported 31 errors in files that are not even committed.
      ".playwright-mcp/**",
      // Any Next build output under a `--distDir` of its own: `.next-audit`,
      // `.next-audit2`, whatever the next verification build is called. They
      // are not matched by `.next/**` above, because that pattern matches the
      // name exactly. Linting one walks a whole compiled bundle and exhausts
      // eslint's heap, so the ratchet could not start at all — and a gate that
      // cannot start is indistinguishable from a gate that passes.
      ".next-*/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    /**
     * `mjs` and `cjs` belong here or the globals below do not reach them.
     *
     * Without them every `.mjs` under scripts/ linted as if `console`,
     * `process` and `URL` did not exist: 91 `no-undef` errors, 23 of them in
     * scripts/typecheck-ratchet.mjs — the repo's own quality gate failing lint
     * because of how lint was configured, not because of anything it did.
     * `tests/**` is here for the same reason: it is code, and it was linted
     * with no environment at all.
     */
    files: [
      "app/**/*.{js,jsx,mjs,cjs,ts,tsx}",
      "src/**/*.{js,jsx,mjs,cjs,ts,tsx}",
      "components/**/*.{js,jsx,mjs,cjs,ts,tsx}",
      "scripts/**/*.{js,jsx,mjs,cjs,ts,tsx}",
      "tests/**/*.{js,jsx,mjs,cjs,ts,tsx}",
      "*.{js,mjs,cjs}",
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      "@next/next": nextPlugin,
      "react-hooks": reactHooks,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      /**
       * THE CRASH THIS REPO HAS SHIPPED TWICE.
       *
       * A hook below an early return changes the hook count between renders,
       * and React answers "Rendered more hooks than during the previous
       * render" — which reaches a person as "This page could not load. The
       * fault has been reported." It happened in `HistoryTab`, and again on
       * 2026-09-27 in `SavedWeeksSection`, in the same session where the
       * first one was being quoted as a warning. Both were caught by opening
       * the page; neither was caught by the lint ratchet, because the plugin
       * was installed and never registered.
       *
       * `rules-of-hooks` is an error: there is no correct conditional hook.
       * `exhaustive-deps` is a warning so it does not become 300 new errors
       * the ratchet cannot absorb — it can be tightened later.
       */
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    /**
     * The service worker runs in neither the browser window nor node. It has
     * its own globals — `self`, `caches`, `clients`, `skipWaiting` — so without
     * this block public/sw.js reported 19 undefined names for the ordinary
     * vocabulary of a service worker.
     */
    files: ["public/sw.js"],
    languageOptions: {
      globals: { ...globals.serviceworker },
    },
  },
]
