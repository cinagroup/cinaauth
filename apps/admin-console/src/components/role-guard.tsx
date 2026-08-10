"use client";

import { useEffect, useState } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";

/** Render children only when the session role is on `allow`. */
export function RoleGuard({
	allow,
	children,
	fallback = null,
}: {
	allow: string[];
	children: React.ReactNode;
	fallback?: React.ReactNode;
}) {
	const [mounted, setMounted] = useState(false);
	const { data: session } = useAdminSession();

	useEffect(() => setMounted(true), []);

	if (!mounted || !session || !allow.includes(session.role)) return <>{fallback}</>;
	return <>{children}</>;
}
