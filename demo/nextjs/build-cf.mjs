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
console.log("[build-cf] Building with Next.js...");
execSync("npx next build", { stdio: "inherit", cwd: appDir });

// Step 2: Create symlink from .next/standalone/.next -> nested path
console.log("[build-cf] Creating symlink for standalone .next directory...");
try {
	if (fs.existsSync(expectedNextDir)) {
		const stat = fs.lstatSync(expectedNextDir);
		if (stat.isSymbolicLink()) {
			fs.unlinkSync(expectedNextDir);
		} else if (stat.isDirectory()) {
			fs.rmSync(expectedNextDir, { recursive: true });
		}
	}

	if (fs.existsSync(nestedNextDir)) {
		fs.symlinkSync(nestedNextDir, expectedNextDir, "dir");
		console.log(
			"[build-cf] Symlink created:",
			expectedNextDir,
			"->",
			nestedNextDir,
		);
	} else {
		console.warn(
			"[build-cf] Warning: Nested .next directory not found at",
			nestedNextDir,
		);
	}
} catch (err) {
	console.error("[build-cf] Failed to create symlink:", err.message);
	process.exit(1);
}

// Step 3: Run OpenNext bundling
console.log("[build-cf] Running OpenNext bundling...");
try {
	execSync("npx @opennextjs/cloudflare build --skipNextBuild", {
		stdio: "inherit",
		cwd: appDir,
	});
	console.log("[build-cf] Build completed successfully!");
} catch (err) {
	console.error("[build-cf] OpenNext bundling failed");
	process.exit(1);
}
