"use client";

import type { LucideIcon } from "lucide-react";
import {
	Building2,
	Code2,
	FileLock2,
	LayoutDashboard,
	ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountBrand } from "@/components/account-brand";
import { useDashboardI18n } from "@/components/dashboard/use-dashboard-i18n";
import type { DashboardNavigationHref } from "@/lib/dashboard-navigation";
import {
	DASHBOARD_NAVIGATION,
	isDashboardNavigationActive,
} from "@/lib/dashboard-navigation";
import { cn } from "@/lib/utils";

const NAVIGATION_ICONS: Record<DashboardNavigationHref, LucideIcon> = {
	"/dashboard": LayoutDashboard,
	"/dashboard/security": ShieldCheck,
	"/dashboard/privacy": FileLock2,
	"/dashboard/organization": Building2,
	"/dashboard/developer": Code2,
};

const NAVIGATION_GROUPS = [
	null,
	"groupMyAccount",
	"groupWorkspace",
	"groupDeveloper",
] as const;

export function DashboardSidebar({
	collapsed = false,
	className,
	onActiveNavigate,
}: {
	collapsed?: boolean;
	className?: string;
	onActiveNavigate?: () => void;
}) {
	const pathname = usePathname();
	const { messages, baseMessages } = useDashboardI18n();

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
					collapsed ? "justify-center px-2" : "px-4",
				)}
			>
				<AccountBrand
					compact={collapsed}
					tagline={baseMessages.accountTagline}
					priority
				/>
			</div>

			<nav
				aria-label={messages.navigationLabel}
				className="min-h-0 flex-1 space-y-4 overflow-y-auto px-2 py-3"
			>
				{NAVIGATION_GROUPS.map((group) => {
					const items = DASHBOARD_NAVIGATION.filter(
						(item) => item.groupKey === group,
					);
					return (
						<div key={group ?? "overview"}>
							{group && !collapsed ? (
								<div className="mb-1 px-2 text-[11px] font-medium text-mute">
									{messages[group]}
								</div>
							) : null}
							{items.map((item) => {
								const current = pathname === item.href;
								const active = isDashboardNavigationActive(pathname, item.href);
								const Icon = NAVIGATION_ICONS[item.href];
								const label = messages[item.labelKey];
								return (
									<Link
										key={item.href}
										href={item.href}
										onClick={current ? onActiveNavigate : undefined}
										title={collapsed ? label : undefined}
										aria-label={collapsed ? label : undefined}
										aria-current={active ? "page" : undefined}
										className={cn(
											"relative flex h-9 items-center rounded-sm text-[13px] leading-5 transition-colors before:absolute before:left-0 before:top-2 before:h-5 before:w-0.5 before:rounded-full before:bg-transparent",
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
										{collapsed ? null : (
											<span className="truncate">{label}</span>
										)}
									</Link>
								);
							})}
						</div>
					);
				})}
			</nav>

			<div className="border-t border-hairline p-2">
				<div
					className={cn(
						"flex h-9 items-center rounded-sm border border-hairline bg-canvas px-3 text-[12px] text-body",
						collapsed ? "justify-center" : "gap-2",
					)}
					title={collapsed ? messages.identityServiceAvailable : undefined}
				>
					<span className="h-2 w-2 shrink-0 rounded-full bg-success" />
					{collapsed ? null : (
						<span className="truncate">{messages.accountServices}</span>
					)}
				</div>
			</div>
		</aside>
	);
}
