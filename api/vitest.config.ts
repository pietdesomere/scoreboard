import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    pool: "forks",
    fileParallelism: false,
    globalSetup: "./test/global-setup.ts",
    reporters: process.env.CI ? ["verbose", "github-actions", "junit"] : ["verbose"],
    outputFile: process.env.CI ? "test-results.xml" : undefined,
  },
});
