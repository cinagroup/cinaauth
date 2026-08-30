"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import { useDashboardI18n } from "@/components/dashboard/use-dashboard-i18n";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";

export function DashboardShell({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const { messages } = useDashboardI18n();
	const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

	useEffect(() => {
		setMobileNavigationOpen(false);
	}, [pathname]);

	return (
		<div className="account-dashboard-shell flex h-dvh w-full min-w-0 overflow-hidden bg-canvas-soft">
			<DashboardSidebar
				collapsed={sidebarCollapsed}
				className="hidden lg:flex"
			/>

			<Dialog
				open={mobileNavigationOpen}
				onOpenChange={setMobileNavigationOpen}
			>
				<DialogContent className="account-dashboard-shell !left-0 !top-0 h-dvh w-[min(20rem,88vw)] max-w-none !translate-x-0 !translate-y-0 overflow-hidden rounded-none border-r border-hairline bg-sidebar p-0">
					<DialogTitle className="sr-only">
						{messages.navigationDialogTitle}
					</DialogTitle>
					<DialogDescription className="sr-only">
						{messages.navigationDialogDescription}
					</DialogDescription>
					<DashboardSidebar
						className="w-full border-r-0"
						onActiveNavigate={() => setMobileNavigationOpen(false)}
					/>
				</DialogContent>
			</Dialog>

			<div className="flex w-0 min-w-0 flex-1 flex-col">
				<DashboardTopbar
					sidebarCollapsed={sidebarCollapsed}
					onOpenNavigation={() => setMobileNavigationOpen(true)}
					onToggleSidebar={() => setSidebarCollapsed((current) => !current)}
				/>
				<main
					id="main"
					className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto"
				>
					<div className="mx-auto box-border w-full min-w-0 max-w-[1480px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
						{children}
					</div>
				</main>
			</div>
		</div>
	);
}
