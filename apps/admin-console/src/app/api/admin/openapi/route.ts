import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";
import type { OpenApiDocument } from "@/lib/openapi-docs";

/** Serve the generated schema through the authenticated, same-origin Admin BFF. */
export async function GET(request: NextRequest) {
	const session = await requireAdmin(request).catch((error: Response) => error);
	if (session instanceof Response) return session;

	const cookie = request.headers.get("cookie") ?? "";
	const response = await cinaauthFetch<OpenApiDocument>(
		"/open-api/generate-schema",
		{ cookie },
	);
	return NextResponse.json(response, {
		status: adminUpstreamResponseStatus(response),
		headers: {
			"Cache-Control": response.ok
				? "private, max-age=300, stale-while-revalidate=60"
				: "no-store",
		},
	});
}
