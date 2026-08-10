import { defineConfig } from "tsdown";

export default defineConfig([
	{
		dts: { build: true, incremental: true },
		format: ["esm"],
		entry: [
			"./src/index.ts",
			"./src/client.ts",
			"./src/proxy.ts",
			"./src/storage.ts",
		],
		treeshake: true,
	},
	{
		dts: { build: true, incremental: true },
		format: ["esm"],
		entry: ["./src/preload.ts"],
		deps: {
			// Bundle CinaAuth runtime dependencies into the preload output.
			alwaysBundle: [/^@cinaauth\/core(?:\/|$)/, /^better-call(?:\/|$)/],
			onlyBundle: ["better-call"],
			dts: {
				// Keep peer dependency types external instead of inlining them.
				neverBundle: [/^@cinaauth\/core(?:\/|$)/, /^better-call(?:\/|$)/],
			},
		},
		treeshake: true,
	},
]);
