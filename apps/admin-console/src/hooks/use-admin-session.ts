"use client";

import { useQuery } from "@tanstack/react-query";
import type { AdminSession } from "@/lib/cinaauth/types";

/** Client hook for the current admin session (role-based UI gating). */
export function useAdminSession() {
	return useQuery({
		queryKey: ["admin-session"],
		queryFn: async () => {
			const r = await fetch("/api/admin/session");
			const d = (await r.json()) as { ok?: boolean; data?: AdminSession };
			return d.ok ? d.data ?? null : null;
		},
		staleTime: 60_000,
	});
}
