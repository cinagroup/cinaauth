#!/usr/bin/env node
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const appDir = process.cwd();
const standaloneDir = path.join(appDir, ".next", "standalone");
// Monorepo: Next.js outputs to .next/standalone/<repo>/docs/.next
// but OpenNext expects .next/standalone/.next
const nestedNextDir = path.join(
	standaloneDir,
	"cinaauth",
	"docs",
	".next",
);
const expectedNextDir = path.join(standaloneDir, ".next");

// Step 1: Build with Next.js (standalone output)
execSync("next build", { stdio: "inherit", cwd: appDir });

// Step 2: Create symlink for standalone .next directory
if (fs.existsSync(expectedNextDir)) {
	fs.rmSync(expectedNextDir, { recursive: true, force: true });
}

if (fs.existsSync(nestedNextDir)) {
	fs.mkdirSync(path.dirname(expectedNextDir), { recursive: true });
	fs.symlinkSync(nestedNextDir, expectedNextDir, "dir");
	console.log(`Created symlink: ${expectedNextDir} -> ${nestedNextDir}`);
} else {
	// Fallback: search for the nested .next directory
	const found = findDir(standaloneDir, ".next");
	if (found && found !== expectedNextDir) {
		fs.symlinkSync(found, expectedNextDir, "dir");
		console.log(`Created symlink: ${expectedNextDir} -> ${found}`);
	} else {
		console.warn(`Warning: nested .next not found. Expected: ${nestedNextDir}`);
	}
}

// Step 3: Run OpenNext bundling (skip Next.js build, already done)
execSync("npx @opennextjs/cloudflare build --skipNextBuild", {
	stdio: "inherit",
	cwd: appDir,
});

function findDir(root, name) {
	if (!fs.existsSync(root)) return null;
	for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
		if (entry.isDirectory()) {
			if (entry.name === name) return path.join(root, entry.name);
			const found = findDir(path.join(root, entry.name), name);
			if (found) return found;
		}
	}
	return null;
}
