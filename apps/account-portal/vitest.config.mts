import { defineConfig } from "vitest/config";

export default defineConfig({
	root: import.meta.dirname,
	resolve: {
		alias: {
			"@": import.meta.dirname,
		},
	},
	test: {
		environment: "node",
		include: ["lib/**/*.test.ts", "data/**/*.test.ts", "middleware.test.ts"],
	},
});
