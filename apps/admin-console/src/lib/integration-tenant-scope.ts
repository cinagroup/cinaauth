import { NextResponse } from "next/server";
import { cinaauthFetch } from "@/lib/cinaauth/client";
import { adminUpstreamResponseStatus } from "@/lib/cinaauth/upstream-response";
import { parseOrganizationId } from "@/lib/integration-contract";

const noStoreHeaders = { "Cache-Control": "no-store" };

type TenantProvider = {
	organizationId: string | null;
};

type TenantProviderResolution<T extends TenantProvider> =
	| { success: true; provider: T }
	| { success: false; response: NextResponse };

/** Parse an explicit organization selector without treating it as authorization. */
export const readSelectedOrganizationId = (
	value: unknown,
): string | NextResponse =>
	parseOrganizationId(value) ??
	NextResponse.json(
		{
			ok: false,
			error: {
				code: "ORGANIZATION_REQUIRED",
				message: "A selected organizationId is required",
			},
		},
		{ status: 400, headers: noStoreHeaders },
	);

/** Hide a provider that does not belong to the explicitly selected tenant. */
export const tenantProviderNotFound = () =>
	NextResponse.json(
		{
			ok: false,
			error: { code: "PROVIDER_NOT_FOUND", message: "Provider not found" },
		},
		{ status: 404, headers: noStoreHeaders },
	);

/**
 * Resolve a provider through its authoritative endpoint and then bind it to the
 * selected tenant. The selected organization id scopes the request; the
 * upstream session/membership check remains the authorization decision.
 */
export async function resolveTenantProvider<T extends TenantProvider>(
	path: string,
	organizationId: string,
	cookie: string,
): Promise<TenantProviderResolution<T>> {
	const upstream = await cinaauthFetch<T>(path, { cookie });
	if (!upstream.ok) {
		return {
			success: false,
			response: NextResponse.json(upstream, {
				status: adminUpstreamResponseStatus(upstream, { allowNotFound: true }),
				headers: noStoreHeaders,
			}),
		};
	}
	if (!upstream.data || upstream.data.organizationId !== organizationId) {
		return { success: false, response: tenantProviderNotFound() };
	}
	return { success: true, provider: upstream.data };
}
