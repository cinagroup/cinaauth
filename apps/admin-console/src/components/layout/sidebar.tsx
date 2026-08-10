"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	BookOpen,
	Building2,
	CreditCard,
	Key,
	KeyRound,
	LayoutDashboard,
	MonitorSmartphone,
	ScrollText,
	Shield,
	ShieldCheck,
	Smartphone,
	Users,
	type LucideIcon,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/i18n-context";
import { cn } from "@/lib/cn";

export interface NavItem {
	href: string;
	key: string;
	icon: LucideIcon;
}

export interface NavSection {
	groupKey: string | null;
	items: NavItem[];
}

export const NAV: NavSection[] = [
	{
		groupKey: null,
		items: [{ href: "/dashboard", key: "nav.overview", icon: LayoutDashboard }],
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

export function Sidebar({
	collapsed = false,
	className,
	onNavigate,
}: {
	collapsed?: boolean;
	className?: string;
	onNavigate?: () => void;
}) {
	const { t } = useI18n();
	const pathname = usePathname();

	return (
		<aside
			className={cn(
				"flex shrink-0 flex-col border-r border-hairline bg-sidebar transition-[width] duration-200",
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
				<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-ink text-canvas-soft">
					<Shield size={16} strokeWidth={2.25} />
				</div>
				{!collapsed && (
					<div className="flex min-w-0 flex-col leading-tight">
						<span className="truncate text-[14px] font-semibold text-ink">
							CinaGroup Admin
						</span>
						<span className="text-[11px] leading-3 text-mute">
							Identity operations
						</span>
					</div>
				)}
			</div>

			<nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-2 py-3">
				{NAV.map((section) => (
					<div key={section.groupKey ?? "top"}>
						{section.groupKey && !collapsed && (
							<div className="mb-1 px-2 text-[11px] font-medium text-mute">
								{t(section.groupKey)}
							</div>
						)}
						{section.items.map((item) => {
							const active =
								pathname === item.href ||
								pathname.startsWith(`${item.href}/`);
							const Icon = item.icon;
							return (
								<Link
									key={item.href}
									href={item.href}
									onClick={onNavigate}
									title={collapsed ? t(item.key) : undefined}
									aria-label={collapsed ? t(item.key) : undefined}
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
									{!collapsed && <span className="truncate">{t(item.key)}</span>}
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
