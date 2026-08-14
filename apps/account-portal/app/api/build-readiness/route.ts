import { createAccountBuildReadinessResponse } from "@/lib/account-build-readiness";

export const dynamic = "force-dynamic";

export function GET() {
	return createAccountBuildReadinessResponse(
		process.env.NEXT_PUBLIC_REOWN_PROJECT_ID,
		process.env.NEXT_PUBLIC_SIWE_WALLET_UI_ENABLED,
	);
}
