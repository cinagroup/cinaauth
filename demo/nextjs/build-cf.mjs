#!/usr/bin/env node
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const appDir = process.cwd();
const standaloneDir = path.join(appDir, ".next", "standalone");
const nestedNextDir = path.join(
	standaloneDir,
	"cinaauth",
	"demo",
	"nextjs",
	".next",
);
const expectedNextDir = path.join(standaloneDir, ".next");

// Step 1: Build with Next.js
execSync("npx next build", { stdio: "inherit", cwd: appDir });

// Step 2: Create symlink for standalone .next directory
// Monorepo causes Next.js to output to .next/standalone/cinaauth/demo/nextjs/.next
// instead of .next/standalone/.next
if (fs.existsSync(expectedNextDir)) {
	fs.rmSync(expectedNextDir, { recursive: true, force: true });
}

if (fs.existsSync(nestedNextDir)) {
	// Create the expected directory structure
	fs.mkdirSync(path.dirname(expectedNextDir), { recursive: true });

	// Create symlink to the nested .next directory
	fs.symlinkSync(nestedNextDir, expectedNextDir, "dir");

	console.log(`Created symlink: ${expectedNextDir} -> ${nestedNextDir}`);
} else {
	console.warn(
		`Warning: Expected nested directory not found at ${nestedNextDir}`,
	);
}

// Step 3: Run OpenNext bundling
execSync("npx @opennextjs/cloudflare build --skipNextBuild", {
	stdio: "inherit",
	cwd: appDir,
});

// Step 4: Apply post-build patches for Cloudflare Workers compatibility
console.log("\n[build-cf] Applying post-build patches...");
execSync("node post-build-patch.js", {
	stdio: "inherit",
	cwd: appDir,
});
