#!/usr/bin/env node
/**
 * Post-build patch script for OpenNext Cloudflare deployment
 *
 * This script fixes issues that occur when deploying Next.js to Cloudflare Workers:
 * 1. Middleware manifest dynamic require issue
 * 2. Auth API proxy service binding interceptor
 */

const fs = require("fs");
const path = require("path");

const OPEN_NEXT_DIR = path.join(
	__dirname,
	".open-next/server-functions/default",
);
const HANDLER_PATH = path.join(OPEN_NEXT_DIR, "handler.mjs");
const MANIFEST_PATH = path.join(
	OPEN_NEXT_DIR,
	".next/server/middleware-manifest.json",
);
const WORKER_PATH = path.join(__dirname, ".open-next/worker.js");

function patchMiddlewareManifest() {
	console.log("🔧 Patching middleware manifest...");

	// Read the manifest
	const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
	console.log(
		`✓ Loaded middleware manifest (${Object.keys(manifest.middleware).length} middleware)`,
	);

	// Read the handler
	let handler = fs.readFileSync(HANDLER_PATH, "utf8");

	// Replace the dynamic require with inline manifest
	const oldPattern =
		"getMiddlewareManifest(){return this.minimalMode?null:require(this.middlewareManifestPath)}";
	const newPattern = `getMiddlewareManifest(){return this.minimalMode?null:${JSON.stringify(manifest)}}`;

	if (handler.includes(oldPattern)) {
		handler = handler.replace(oldPattern, newPattern);
		fs.writeFileSync(HANDLER_PATH, handler);
		console.log("✓ Patched handler to inline middleware manifest");
	} else {
		console.log(
			"⚠ Pattern not found in handler (may already be patched or format changed)",
		);
	}
}

function patchWorkerAuthBinding() {
	console.log("🔧 Patching worker.js for auth service binding...");

	if (!fs.existsSync(WORKER_PATH)) {
		console.error("❌ worker.js not found at", WORKER_PATH);
		process.exit(1);
	}

	const workerCode = fs.readFileSync(WORKER_PATH, "utf8");

	// Check if already patched
	if (workerCode.includes("AUTH_WORKER")) {
		console.log("✓ worker.js already patched with auth binding");
		return;
	}

	// The code to inject after the URL parsing
	const authInterceptCode = `
            // Intercept /api/auth/* requests and forward to AUTH_WORKER service binding
            if (url.pathname.startsWith("/api/auth/") && env.AUTH_WORKER) {
                try {
                    // Create a new request with the original URL
                    const authRequest = new Request(request.url, {
                        method: request.method,
                        headers: request.headers,
                        body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
                    });
                    
                    // Forward to auth worker via service binding
                    const authResponse = await env.AUTH_WORKER.fetch(authRequest);
                    
                    // Add CORS headers to the response
                    const corsHeaders = new Headers(authResponse.headers);
                    corsHeaders.set("Access-Control-Allow-Origin", "*");
                    corsHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
                    corsHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
                    
                    return new Response(authResponse.body, {
                        status: authResponse.status,
                        statusText: authResponse.statusText,
                        headers: corsHeaders,
                    });
                } catch (error) {
                    console.error("Auth worker error:", error);
                    return new Response(JSON.stringify({ 
                        error: "Auth service unavailable",
                        message: error instanceof Error ? error.message : "Unknown error"
                    }), {
                        status: 503,
                        headers: { "Content-Type": "application/json" },
                    });
                }
            }
            
            // Handle CORS preflight for /api/auth/*
            if (request.method === "OPTIONS" && url.pathname.startsWith("/api/auth/")) {
                return new Response(null, {
                    headers: {
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                        "Access-Control-Allow-Headers": "Content-Type, Authorization",
                    },
                });
            }
`;

	// Find the insertion point (after "const url = new URL(request.url);")
	const insertionMarker = "const url = new URL(request.url);";
	const insertionIndex = workerCode.indexOf(insertionMarker);

	if (insertionIndex === -1) {
		console.error("❌ Could not find insertion point in worker.js");
		process.exit(1);
	}

	// Insert the auth intercept code
	const newWorkerCode =
		workerCode.substring(0, insertionIndex + insertionMarker.length) +
		authInterceptCode +
		workerCode.substring(insertionIndex + insertionMarker.length);

	fs.writeFileSync(WORKER_PATH, newWorkerCode);
	console.log("✓ Patched worker.js with auth service binding interceptor");
}

function main() {
	console.log("🚀 Running OpenNext post-build patches...\n");

	try {
		patchMiddlewareManifest();
		patchWorkerAuthBinding();
		console.log("\n✅ All patches applied successfully!");
	} catch (error) {
		console.error("\n❌ Patch failed:", error.message);
		process.exit(1);
	}
}

main();
