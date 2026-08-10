#!/usr/bin/env node
import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const appDir = process.cwd();
const standaloneDir = path.join(appDir, ".next", "standalone");
const nestedNextDir = path.join(
	standaloneDir,
	"apps",
	"account-portal",
	".next",
);
const expectedNextDir = path.join(standaloneDir, ".next");

const stageCloudflareAdapter = () => {
	const adapterEntry = fileURLToPath(
		import.meta.resolve("@opennextjs/cloudflare"),
	);
	const adapterDir = path.resolve(path.dirname(adapterEntry), "../..");
	const stagedAdapterDir = path.join(
		appDir,
		".next",
		"cinaauth-opennext-cloudflare",
	);
	fs.rmSync(stagedAdapterDir, { recursive: true, force: true });
	fs.mkdirSync(stagedAdapterDir, { recursive: true });
	for (const name of ["dist", "templates", "package.json"]) {
		fs.cpSync(path.join(adapterDir, name), path.join(stagedAdapterDir, name), {
			recursive: true,
		});
	}
	const stagedModulesDir = path.join(stagedAdapterDir, "node_modules");
	const adapterModulesDir = path.resolve(adapterDir, "../..");
	fs.mkdirSync(stagedModulesDir);
	for (const name of fs.readdirSync(adapterModulesDir)) {
		fs.symlinkSync(
			path.join(adapterModulesDir, name),
			path.join(stagedModulesDir, name),
			process.platform === "win32" ? "junction" : "dir",
		);
	}
	const adapterRequire = createRequire(adapterEntry);
	const esbuildDir = path.dirname(
		adapterRequire.resolve("esbuild/package.json"),
	);
	const stagedEsbuildDir = path.join(stagedModulesDir, "esbuild");
	if (!fs.existsSync(stagedEsbuildDir)) {
		fs.symlinkSync(
			esbuildDir,
			stagedEsbuildDir,
			process.platform === "win32" ? "junction" : "dir",
		);
	}

	const bundlerPath = path.join(
		stagedAdapterDir,
		"dist/cli/build/bundle-server.js",
	);
	let bundler = fs.readFileSync(bundlerPath, "utf8");
	const aliasStart = "        alias: {";
	if (!bundler.includes(aliasStart)) {
		throw new Error("Unable to locate the OpenNext server alias table");
	}
	bundler = bundler.replace(
		aliasStart,
		`${aliasStart}\n            // CinaAuth: Cloudflare handles /_next/image before NextServer.\n            // Do not bundle a host-native sharp binary into workerd.\n            "sharp": path.join(buildOpts.outputDir, "cloudflare-templates/shims/throw.js"),`,
	);
	fs.writeFileSync(bundlerPath, bundler);
	return path.join(stagedAdapterDir, "dist/cli/index.js");
};

// Step 1: Build with Next.js
// OpenNext's Windows bundler can follow Turbopack's traced native `sharp`
// package into the Worker bundle. The production Cloudflare build uses
// Webpack explicitly; OpenNext replaces Next's image optimizer at the edge.
execSync(
	"pnpm --config.verify-deps-before-run=false exec next build --webpack",
	{
		stdio: "inherit",
		cwd: appDir,
	},
);

// Step 2: Create symlink for standalone .next directory
// Monorepo causes Next.js to nest the application path under .next/standalone.
// instead of .next/standalone/.next
if (fs.existsSync(expectedNextDir)) {
	fs.rmSync(expectedNextDir, { recursive: true, force: true });
}

if (fs.existsSync(nestedNextDir)) {
	// Create the expected directory structure
	fs.mkdirSync(path.dirname(expectedNextDir), { recursive: true });

	// Create symlink to the nested .next directory
	fs.symlinkSync(
		nestedNextDir,
		expectedNextDir,
		process.platform === "win32" ? "junction" : "dir",
	);

	console.log(`Created symlink: ${expectedNextDir} -> ${nestedNextDir}`);
} else {
	console.warn(
		`Warning: Expected nested directory not found at ${nestedNextDir}`,
	);
}

// Step 3: Run OpenNext bundling from a generated adapter copy. OpenNext's
// Worker entry handles image optimization, but its server bundler otherwise
// follows Next's optional host-native `sharp` package on Windows.
const cloudflareAdapterCli = stageCloudflareAdapter();
const childEnv = { ...process.env };
if (process.platform === "win32") {
	const shim = pathToFileURL(
		path.join(appDir, "windows-opennext-symlink-shim.mjs"),
	).href;
	childEnv.NODE_OPTIONS = [childEnv.NODE_OPTIONS, `--import=${shim}`]
		.filter(Boolean)
		.join(" ");
}
execFileSync(
	process.execPath,
	[cloudflareAdapterCli, "build", "--skipNextBuild"],
	{
		stdio: "inherit",
		cwd: appDir,
		env: childEnv,
	},
);

// Step 4: Apply post-build patches for Cloudflare Workers compatibility
console.log("\n[build-cf] Applying post-build patches...");
execSync("node post-build-patch.js", {
	stdio: "inherit",
	cwd: appDir,
});
