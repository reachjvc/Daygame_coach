import js from "@eslint/js"
import globals from "globals"
import tseslint from "typescript-eslint"
import nextPlugin from "@next/eslint-plugin-next"

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
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: [
      "app/**/*.{js,jsx,ts,tsx}",
      "src/**/*.{js,jsx,ts,tsx}",
      "components/**/*.{js,jsx,ts,tsx}",
      "scripts/**/*.{js,jsx,ts,tsx}",
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
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
]
