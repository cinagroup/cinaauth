import { type NextRequest } from "next/server";
import { hasAdminRole, resolveAdminSession } from "@/lib/cinaauth/session";
import { cinaauthConfig } from "@/lib/cinaauth/config";

/** GET /api/admin/sso/metadata — redirect to cinaauth's SP metadata XML. */
export async function GET(request: NextRequest) {
	const session = await resolveAdminSession(request);
	if (!session || !hasAdminRole(session.role)) {
		return new Response("forbidden", { status: 403 });
	}
	// Return the cinaauth SP metadata URL so the frontend can open/download it.
	return Response.json({
		ok: true,
		data: { url: `${cinaauthConfig.baseUrl}/api/auth/sso/saml2/sp/metadata` },
	});
}
