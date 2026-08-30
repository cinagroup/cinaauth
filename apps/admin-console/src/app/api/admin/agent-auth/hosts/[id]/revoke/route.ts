import type { NextRequest } from "next/server";
import { mutateAgentAuthAdminResource } from "@/lib/agent-auth-admin-route";

export const POST = (
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) => mutateAgentAuthAdminResource(request, params, "hosts", "revoke");
