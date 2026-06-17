import { NextResponse } from "next/server";

const AUTH_API_URL = process.env.CINAAUTH_URL || "https://auth.cinagroup.com";

async function proxyRequest(req: Request) {
	const url = new URL(req.url);
	const targetUrl = AUTH_API_URL + url.pathname + url.search;
	const headers = new Headers(req.headers);
	const res = await fetch(targetUrl, { method: req.method, headers, body: req.method !== "GET" ? req.body : undefined, redirect: "manual" });
	const rh = new Headers(res.headers);
	rh.set("Access-Control-Allow-Origin", "*");
	rh.set("Access-Control-Allow-Credentials", "true");
	return new NextResponse(res.body, { status: res.status, statusText: res.statusText, headers: rh });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;

export async function OPTIONS() {
	return new NextResponse(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS", "Access-Control-Allow-Headers": "authorization, content-type" } });
}
