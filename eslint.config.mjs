import nextConfig from "eslint-config-next"
import prettierConfig from "eslint-config-prettier"

const eslintConfig = [
  { ignores: ["src/generated/**"] },

  // Next.js core-web-vitals + typescript-eslint "recommended", as native
  // flat configs. This alone already wires up react, react-hooks
  // (rules-of-hooks/exhaustive-deps + the newer compiler-safety rules),
  // jsx-a11y, @next/next, and the `import` plugin.
  ...nextConfig,

  {
    // Type-aware TS rules: these need real type info, so point the parser
    // at the project's tsconfig via projectService (fast, no separate
    // tsconfig.eslint.json needed).
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Catches un-awaited async calls — easy to miss with Prisma queries,
      // better-auth calls, and server actions, and a real source of bugs
      // (silently swallowed errors, race conditions).
      "@typescript-eslint/no-floating-promises": "error",
      // Catches passing an async function where a sync one is expected
      // (e.g. an onClick handler), which hides its rejection instead of throwing.
      "@typescript-eslint/no-misused-promises": "error",
    },
  },

  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // Zod/Prisma/better-auth give real types everywhere — `any` should
      // never be needed, so make it a hard error instead of the default warn.
      "@typescript-eslint/no-explicit-any": "error",

      // Unused vars are almost always bugs, but allow an intentional
      // `_` prefix for ignored destructured/callback params (e.g. Radix render props).
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],

      // Keep stray debugging logs out of commits; warn/error are fine for real diagnostics.
      "no-console": ["warn", { allow: ["warn", "error"] }],

      // Import order is owned by Prettier (@ianvs/prettier-plugin-sort-imports).
      // Two tools ordering the same lines disagree on edge cases like
      // "next-themes" vs "next/font", so this rule stays off.
      "import/order": "off",
      // Two `import { x } from "y"` statements for the same module should
      // be merged into one.
      "import/no-duplicates": "warn",
    },
  },

  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },

  // Must be last: disables stylistic ESLint rules that would otherwise
  // fight Prettier (formatting is Prettier's job, not ESLint's).
  prettierConfig,
]

export default eslintConfig
