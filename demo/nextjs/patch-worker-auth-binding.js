#!/usr/bin/env node
/**
 * Patch worker.js to intercept /api/auth/* requests
 * and forward them to AUTH_WORKER service binding
 */

const fs = require("fs");
const path = require("path");

const WORKER_PATH = path.join(__dirname, ".open-next", "worker.js");

function patchWorker() {
	console.log("🔧 Patching worker.js for auth service binding...");

	if (!fs.existsSync(WORKER_PATH)) {
		console.error("❌ worker.js not found at", WORKER_PATH);
		process.exit(1);
	}

	const workerCode = fs.readFileSync(WORKER_PATH, "utf8");

	// Check if already patched
	if (workerCode.includes("AUTH_WORKER")) {
		console.log("✓ worker.js already patched");
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

patchWorker();
