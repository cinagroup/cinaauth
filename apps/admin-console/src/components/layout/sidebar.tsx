"use client";

import type { LucideIcon } from "lucide-react";
import {
	BookOpen,
	Building2,
	CreditCard,
	Fingerprint,
	Key,
	KeyRound,
	LayoutDashboard,
	LogIn,
	MonitorSmartphone,
	ScrollText,
	Send,
	Shield,
	ShieldCheck,
	Smartphone,
	User,
	UserRoundX,
	Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminBrand } from "@/components/layout/admin-brand";
import { useAdminSession } from "@/hooks/use-admin-session";
import type { AdminSession } from "@/lib/cinaauth/types";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n/i18n-context";

export interface NavItem {
	href: string;
	key: string;
	icon: LucideIcon;
}

export interface NavSection {
	groupKey: string | null;
	items: NavItem[];
}

const NAV: NavSection[] = [
	{
		groupKey: null,
		items: [
			{ href: "/dashboard", key: "nav.overview", icon: LayoutDashboard },
			{ href: "/me", key: "nav.me", icon: User },
		],
	},
	{
		groupKey: "nav.accounts",
		items: [
			{ href: "/users", key: "nav.users", icon: Users },
			{ href: "/sessions", key: "nav.sessions", icon: MonitorSmartphone },
			{ href: "/organizations", key: "nav.organizations", icon: Building2 },
			{ href: "/api-keys", key: "nav.apiKeys", icon: KeyRound },
		],
	},
	{
		groupKey: "nav.compliance",
		items: [
			{
				href: "/settings/authentication",
				key: "nav.authentication",
				icon: Fingerprint,
			},
			{
				href: "/settings/privacy-erasure",
				key: "nav.privacyErasure",
				icon: UserRoundX,
			},
			{ href: "/audit", key: "nav.auditLog", icon: ScrollText },
			{
				href: "/settings/security",
				key: "nav.securityPolicy",
				icon: ShieldCheck,
			},
		],
	},
	{
		groupKey: "nav.integrations",
		items: [
			{
				href: "/settings/delivery",
				key: "nav.delivery",
				icon: Send,
			},
			{
				href: "/settings/social-providers",
				key: "nav.socialProviders",
				icon: LogIn,
			},
			{ href: "/settings/sso", key: "nav.sso", icon: Shield },
			{ href: "/settings/scim", key: "nav.scim", icon: Key },
			{ href: "/devices", key: "nav.devices", icon: Smartphone },
			{ href: "/billing", key: "nav.billing", icon: CreditCard },
		],
	},
	{
		groupKey: "nav.developer",
		items: [{ href: "/api-docs", key: "nav.apiDocs", icon: BookOpen }],
	},
];

/** Hide administrator destinations while the session represents another user. */
export function getAdminNavigationForSession(
	session: Pick<AdminSession, "impersonatedBy"> | null | undefined,
): NavSection[] {
	if (!session?.impersonatedBy) return NAV;
	return NAV.map((section) => ({
		...section,
		items: section.items.filter((item) => item.href === "/me"),
	})).filter((section) => section.items.length > 0);
}

export function Sidebar({
	collapsed = false,
	className,
	onActiveNavigate,
}: {
	collapsed?: boolean;
	className?: string;
	onActiveNavigate?: () => void;
}) {
	const { t } = useI18n();
	const pathname = usePathname();
	const { data: session } = useAdminSession();
	const navigation = getAdminNavigationForSession(session);

	return (
		<aside
			className={cn(
				"flex h-full min-w-0 shrink-0 flex-col border-r border-hairline bg-sidebar transition-[width] duration-200",
				collapsed ? "w-[72px]" : "w-60",
				className,
			)}
		>
			<div
				className={cn(
					"flex h-14 items-center border-b border-hairline",
					collapsed ? "justify-center px-2" : "gap-2 px-4",
				)}
			>
				<AdminBrand compact={collapsed} priority />
			</div>

			<nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-2 py-3">
				{navigation.map((section) => (
					<div key={section.groupKey ?? "top"}>
						{section.groupKey && !collapsed && (
							<div className="mb-1 px-2 text-[11px] font-medium text-mute">
								{t(section.groupKey)}
							</div>
						)}
						{section.items.map((item) => {
							const current = pathname === item.href;
							const active =
								pathname === item.href || pathname.startsWith(`${item.href}/`);
							const Icon = item.icon;
							return (
								<Link
									key={item.href}
									href={item.href}
									onClick={current ? onActiveNavigate : undefined}
									title={collapsed ? t(item.key) : undefined}
									aria-label={collapsed ? t(item.key) : undefined}
									aria-current={active ? "page" : undefined}
									className={cn(
										"relative flex h-9 items-center rounded-[var(--radius-sm)] text-[13px] leading-5 transition-colors before:absolute before:left-0 before:top-2 before:h-5 before:w-0.5 before:rounded-full before:bg-transparent",
										collapsed ? "justify-center px-2" : "gap-2.5 px-3",
										active
											? "bg-canvas-soft-2 font-medium text-ink before:bg-link"
											: "text-body hover:bg-canvas-soft-2 hover:text-ink",
									)}
								>
									<Icon
										size={16}
										strokeWidth={active ? 2.25 : 2}
										className={active ? "text-ink" : "text-mute"}
									/>
									{!collapsed && (
										<span className="truncate">{t(item.key)}</span>
									)}
								</Link>
							);
						})}
					</div>
				))}
			</nav>

			<div className="border-t border-hairline p-2">
				<div
					className={cn(
						"flex h-9 items-center rounded-[var(--radius-sm)] border border-hairline bg-canvas px-3 text-[12px] text-body",
						collapsed ? "justify-center" : "gap-2",
					)}
					title={collapsed ? t("instance.production") : undefined}
				>
					<span className="h-2 w-2 shrink-0 rounded-full bg-success" />
					{!collapsed && (
						<span className="truncate">{t("instance.production")}</span>
					)}
				</div>
			</div>
		</aside>
	);
}
