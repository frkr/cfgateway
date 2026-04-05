import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import { reactRouter } from "@react-router/dev/vite";

export default defineConfig({
	plugins: [
		tsconfigPaths(),
		reactRouter(),
		cloudflareTest({
			wrangler: { configPath: "./wrangler.jsonc" },
		}),
	],
import tsconfigPaths from "vite-tsconfig-paths";

export default defineWorkersConfig({
	plugins: [tsconfigPaths()],

	test: {
		testTimeout: 15000,
	},
});
