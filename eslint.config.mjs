import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/** One flat config for the monorepo: Next + React Hooks + a11y + TypeScript rules. Astro files are checked by `astro check`. */
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: { next: { rootDir: "apps/app/" }, react: { version: "19" } },
    rules: {
      // Underscore marks intentionally unused bindings (omitted destructured keys, required params).
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_", caughtErrors: "none" }],
    },
  },
  {
    // Vendored shadcn primitives stay byte-identical to the registry; lint their consumers instead.
    files: ["packages/ui/src/components/*.tsx", "packages/ui/src/hooks/**"],
    rules: { "react-hooks/purity": "off", "react-hooks/set-state-in-effect": "off", "@next/next/no-img-element": "off" },
  },
  {
    // CommonJS preload for the email preview CLI (see packages/email/package.json).
    files: ["**/*.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    files: ["packages/**", "apps/worker/**", "apps/web/**", "tests/**", "e2e/**"],
    rules: { "@next/next/no-html-link-for-pages": "off" },
  },
  globalIgnores(["**/.next/**", "**/dist/**", "**/out/**", "**/build/**", "**/node_modules/**", "**/next-env.d.ts", "apps/web/.astro/**", "**/playwright-report/**", "**/test-results/**", ".agents/**", ".planning/**", "packages/db/migrations/**"]),
]);
