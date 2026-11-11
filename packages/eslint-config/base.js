// @ts-check
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import prettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Base flat config shared by every package/app.
 * Type-aware rules (strictTypeChecked) need each consumer to set
 * `parserOptions.tsconfigRootDir` to its own directory.
 */
export const baseConfig = defineConfig(
  {
    ignores: ["**/dist/**", "**/coverage/**", "**/.turbo/**", "**/node_modules/**"],
  },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: { projectService: true },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Plain JS config files are not part of any tsconfig -> no type-aware linting.
    files: ["**/*.{js,mjs,cjs}"],
    extends: [tseslint.configs.disableTypeChecked],
  },
  // Must stay last: turns off rules that conflict with Prettier formatting.
  prettier,
);

export default baseConfig;
