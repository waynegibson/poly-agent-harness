import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**", "packages/*/src/**"],
    },
    projects: [
      {
        test: {
          name: "core",
          root: ".",
          environment: "node",
          include: ["tests/**/*.test.mjs"],
        },
      },
      {
        test: {
          name: "pi-control-omlx",
          root: "packages/pi-control-omlx",
          environment: "node",
          include: ["tests/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "pi-dictate-deepgram",
          root: "packages/pi-dictate-deepgram",
          environment: "node",
          include: ["tests/**/*.test.ts"],
        },
      },
    ],
  },
});
