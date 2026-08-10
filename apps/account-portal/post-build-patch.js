#!/usr/bin/env node
/**
 * Post-build compatibility patch for OpenNext's middleware manifest.
 *
 * Auth proxying intentionally lives in the Next.js route handler and accesses
 * AUTH_WORKER through getCloudflareContext. Keeping it in application source
 * makes the Service Binding contract type-checkable and testable.
 */

const fs = require("node:fs");
const path = require("node:path");

const openNextDir = path.join(__dirname, ".open-next/server-functions/default");

const findGeneratedFile = (directory, name) => {
	for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
		const entryPath = path.join(directory, entry.name);
		if (entry.isFile() && entry.name === name) return entryPath;
		if (entry.isDirectory()) {
			const nested = findGeneratedFile(entryPath, name);
			if (nested) return nested;
		}
	}
	return undefined;
};

const patchMiddlewareManifest = () => {
	const manifestPath = findGeneratedFile(
		openNextDir,
		"middleware-manifest.json",
	);
	if (!manifestPath) {
		throw new Error("Unable to locate the generated middleware manifest");
	}
	const applicationDir = path.dirname(path.dirname(path.dirname(manifestPath)));
	const handlerPath = path.join(applicationDir, "handler.mjs");
	const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
	let handler = fs.readFileSync(handlerPath, "utf8");
	const dynamicRequire =
		"getMiddlewareManifest(){return this.minimalMode?null:require(this.middlewareManifestPath)}";
	if (!handler.includes(dynamicRequire)) {
		console.log("[post-build] Middleware manifest patch is not required");
		return;
	}
	const inlineManifest = `getMiddlewareManifest(){return this.minimalMode?null:${JSON.stringify(manifest)}}`;
	handler = handler.replace(dynamicRequire, inlineManifest);
	fs.writeFileSync(handlerPath, handler);
	console.log("[post-build] Inlined middleware manifest");
};

try {
	patchMiddlewareManifest();
} catch (error) {
	console.error(
		"[post-build] Middleware manifest patch failed:",
		error instanceof Error ? error.message : String(error),
	);
	process.exit(1);
}
