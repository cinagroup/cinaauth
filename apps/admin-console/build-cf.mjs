#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const appDir = process.cwd();
const pnpmCli = process.env.npm_execpath;
if (!pnpmCli) throw new Error("build:cf must be started through pnpm");
const childEnv = { ...process.env };

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
		`${aliasStart}\n            "sharp": path.join(buildOpts.outputDir, "cloudflare-templates/shims/throw.js"),`,
	);
	fs.writeFileSync(bundlerPath, bundler);
	return path.join(stagedAdapterDir, "dist/cli/index.js");
};

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
	[pnpmCli, "--config.verify-deps-before-run=false", "exec", "next", "build"],
	{
		cwd: appDir,
		env: childEnv,
		stdio: "inherit",
	},
);

const cloudflareAdapterCli = stageCloudflareAdapter();
execFileSync(
	process.execPath,
	[cloudflareAdapterCli, "build", "--skipNextBuild"],
	{
		cwd: appDir,
		env: childEnv,
		stdio: "inherit",
	},
);

execFileSync(process.execPath, [path.join(appDir, "post-build-patch.js")], {
	cwd: appDir,
	stdio: "inherit",
});
