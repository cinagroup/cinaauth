"use client";

import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountBrand } from "@/components/account-brand";
import { useDashboardI18n } from "@/components/dashboard/use-dashboard-i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { getActiveDashboardNavigationItem } from "@/lib/dashboard-navigation";

export function DashboardTopbar({
	sidebarCollapsed,
	onOpenNavigation,
	onToggleSidebar,
}: {
	sidebarCollapsed: boolean;
	onOpenNavigation: () => void;
	onToggleSidebar: () => void;
}) {
	const pathname = usePathname();
	const activeItem = getActiveDashboardNavigationItem(pathname);
	const { messages, baseMessages } = useDashboardI18n();
	const activeLabel = activeItem
		? messages[activeItem.labelKey]
		: messages.navigationLabel;

	return (
		<header className="flex h-14 min-w-0 shrink-0 items-center justify-between gap-2 overflow-hidden border-b border-hairline bg-canvas px-3 sm:gap-3 sm:px-4">
			<div className="flex min-w-0 flex-1 items-center gap-2">
				<Button
					variant="ghost"
					size="icon"
					onClick={onOpenNavigation}
					aria-label={messages.openNavigation}
					className="lg:hidden"
				>
					<Menu size={17} />
				</Button>
				<Link href="/dashboard" className="mr-1 lg:hidden">
					<AccountBrand
						labelClassName="hidden min-[520px]:flex"
						tagline={baseMessages.accountTagline}
						priority
					/>
				</Link>
				<Button
					variant="ghost"
					size="icon"
					onClick={onToggleSidebar}
					aria-label={
						sidebarCollapsed ? messages.expandSidebar : messages.collapseSidebar
					}
					className="hidden lg:inline-flex"
				>
					{sidebarCollapsed ? (
						<PanelLeftOpen size={17} />
					) : (
						<PanelLeftClose size={17} />
					)}
				</Button>
				<span className="truncate text-[13px] font-medium text-body">
					{activeLabel}
				</span>
			</div>
			<div className="flex shrink-0 items-center gap-1.5">
				<LanguageSwitcher />
				<ThemeToggle label={baseMessages.themeToggle} />
			</div>
		</header>
	);
}
