import baseConfig from "@finance/eslint-config/base";
import { defineConfig } from "eslint/config";

export default defineConfig(baseConfig, {
  languageOptions: {
    parserOptions: { tsconfigRootDir: import.meta.dirname },
  },
});
