"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAdminJson } from "@/lib/client-api";
import { buildLoginActivityPath } from "@/lib/dashboard-metrics";

export interface LoginActivityRow {
	timestamp: string;
	actorId?: string | null;
	result?: string | null;
}

/** Share one bounded login-audit request across all dashboard activity charts. */
export function useLoginActivity(days: number) {
	return useQuery({
		queryKey: ["audit-user-logins", days],
		queryFn: async () => {
			const response = await fetchAdminJson<{
				ok?: boolean;
				data?: { rows?: LoginActivityRow[]; total?: number };
			}>(buildLoginActivityPath(days));
			return {
				rows: response.data?.rows ?? [],
				total: response.data?.total ?? 0,
			};
		},
		staleTime: 60_000,
	});
}
