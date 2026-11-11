import baseConfig from "@finance/eslint-config/base";
import { defineConfig } from "eslint/config";

export default defineConfig({ ignores: ["dist/**", "src/generated/**"] }, baseConfig, {
  languageOptions: {
    parserOptions: {
      tsconfigRootDir: import.meta.dirname,
      // Tells consistent-type-imports not to turn injected classes into `import type`,
      // which would erase them from decorator metadata and break NestJS DI.
      emitDecoratorMetadata: true,
      experimentalDecorators: true,
    },
  },
  rules: {
    // NestJS modules are empty classes configured entirely by decorators.
    "@typescript-eslint/no-extraneous-class": ["error", { allowWithDecorator: true }],
  },
});
