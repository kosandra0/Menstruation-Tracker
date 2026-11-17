import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./apps/desktop/src/test-setup.ts"],
    include: ["apps/desktop/src/**/*.test.{ts,tsx}", "packages/**/tests/**/*.test.ts"],
  },
});
