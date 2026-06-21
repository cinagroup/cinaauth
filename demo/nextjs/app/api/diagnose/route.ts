import { NextResponse } from "next/server";

export async function GET() {
  const results = {
    timestamp: new Date().toISOString(),
    environment: {
      CINAAUTH_URL: process.env.CINAAUTH_URL,
      NODE_ENV: process.env.NODE_ENV,
    },
    tests: {},
  };

  // Test 1: Basic fetch to a known endpoint
  try {
    const startTime = Date.now();
    const response = await fetch("https://httpbin.org/get", {
      method: "GET",
      headers: { "User-Agent": "Cloudflare-Worker-Test" },
    });
    const endTime = Date.now();
    results.tests.httpbin = {
      success: response.ok,
      status: response.status,
      duration: `${endTime - startTime}ms`,
    };
  } catch (error) {
    results.tests.httpbin = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  // Test 2: Fetch to auth API root
  try {
    const authUrl = process.env.CINAAUTH_URL || "https://auth.cinagroup.com";
    const startTime = Date.now();
    const response = await fetch(authUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Cloudflare-Worker-Test",
        "Accept": "application/json",
      },
    });
    const endTime = Date.now();
    const body = await response.text();
    results.tests.authApiRoot = {
      success: response.ok,
      status: response.status,
      duration: `${endTime - startTime}ms`,
      url: authUrl,
      responseBody: body.substring(0, 200),
    };
  } catch (error) {
    results.tests.authApiRoot = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  // Test 3: Fetch to auth API session endpoint
  try {
    const authUrl = process.env.CINAAUTH_URL || "https://auth.cinagroup.com";
    const startTime = Date.now();
    const response = await fetch(`${authUrl}/api/auth/get-session`, {
      method: "GET",
      headers: {
        "User-Agent": "Cloudflare-Worker-Test",
        "Accept": "application/json",
      },
    });
    const endTime = Date.now();
    const body = await response.text();
    results.tests.authApiSession = {
      success: response.ok,
      status: response.status,
      duration: `${endTime - startTime}ms`,
      url: `${authUrl}/api/auth/get-session`,
      responseBody: body.substring(0, 200),
    };
  } catch (error) {
    results.tests.authApiSession = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  return NextResponse.json(results);
}
