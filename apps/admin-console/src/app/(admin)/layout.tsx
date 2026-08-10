import { AdminShell } from "@/components/layout/admin-shell";

/**
 * Protected console shell. The edge middleware guarantees only
 * super_admin / security_admin reach this layout.
 */
export default function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <AdminShell>{children}</AdminShell>;
}
