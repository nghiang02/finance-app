import { defineConfig } from "vitest/config";

// Vite 8 (Oxc) emits decorator metadata automatically because tsconfig.json enables
// `emitDecoratorMetadata`, so NestJS DI works in tests without SWC.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts", "test/**/*.e2e-spec.ts"],
  },
});
