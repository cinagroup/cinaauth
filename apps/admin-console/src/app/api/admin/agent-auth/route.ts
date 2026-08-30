import type { NextRequest } from "next/server";
import { getAgentAuthAdminData } from "@/lib/agent-auth-admin-route";

/** GET /api/admin/agent-auth - redacted Agent Auth inventory and policy. */
export const GET = (request: NextRequest) => getAgentAuthAdminData(request);
