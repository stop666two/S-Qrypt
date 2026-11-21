import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    // Shared D1 state across the ordered suite makes some cases slow; the
    // default 5s trips intermittently.
    testTimeout: 20000,
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.jsonc" },
        isolatedStorage: false,
        miniflare: {
          bindings: { SETUP_TOKEN: "test-setup-token" },
        },
      },
    },
  },
});
