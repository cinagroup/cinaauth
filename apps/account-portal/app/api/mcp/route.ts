import { mcpHandler } from "@cinaauth/oauth-provider";
import { createMcpHandler } from "mcp-handler";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import * as z from "zod";
import { DEFAULT_CINAAUTH_API_URL } from "@/lib/auth-api";

const baseUrl = process.env.CINAAUTH_URL || DEFAULT_CINAAUTH_API_URL;

const isTrustedCorsOrigin = (origin: string) => {
	try {
		const url = new URL(origin);
		if (
			process.env.NODE_ENV === "development" &&
			url.protocol === "http:" &&
			(url.hostname === "localhost" || url.hostname === "127.0.0.1")
		) {
			return true;
		}
		return (
			url.protocol === "https:" &&
			(url.hostname === "cinagroup.com" ||
				url.hostname.endsWith(".cinagroup.com"))
		);
	} catch {
		return false;
	}
};

/**
 * Example derived from https://www.npmjs.com/package/mcp-handler
 */
const handler = mcpHandler(
	{
		jwksUrl: baseUrl + "/api/auth/jwks",
		verifyOptions: {
			audience: baseUrl + "/api/mcp",
			issuer: baseUrl,
		},
	},
	(req, jwt) => {
		return createMcpHandler(
			(server) => {
				server.registerTool(
					"echo",
					{
						description: "Echo a message",
						inputSchema: {
							message: z.string(),
						},
					},
					async ({ message }) => {
						const baseUrl =
							process.env.CINAAUTH_URL || DEFAULT_CINAAUTH_API_URL;
						const org = jwt?.[baseUrl + "/org"];
						return {
							content: [
								{
									type: "text",
									text: `Echo: ${message}${
										jwt?.sub ? ` for user ${jwt?.sub}` : ""
									}${org ? ` for organization ${org}` : ""}`,
								},
							],
						};
					},
				);
			},
			{
				serverInfo: {
					name: "demo-cinaauth",
					version: "1.0.0",
				},
			},
			{
				basePath: "/api",
				maxDuration: 60,
				verboseLogs: true,
			},
		)(req);
	},
);

function addCorsHeaders(headers: Headers, request: Request) {
	const origin = request.headers.get("origin");
	if (origin && isTrustedCorsOrigin(origin)) {
		headers.set("Access-Control-Allow-Origin", origin);
		headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
		headers.set(
			"Access-Control-Allow-Headers",
			"authorization, content-type, mcp-protocol-version",
		);
		headers.append("Vary", "Origin");
	}
}

function withCors(handler: (req: Request) => Promise<Response> | Response) {
	return async (req: Request) => {
		const res = await handler(req);
		addCorsHeaders(res.headers, req);
		return res;
	};
}

export const GET = withCors(handler);
export const POST = withCors(handler);
export async function OPTIONS(req: NextRequest): Promise<NextResponse> {
	const headers = new Headers();
	addCorsHeaders(headers, req);
	return new NextResponse(null, {
		headers,
	});
}
