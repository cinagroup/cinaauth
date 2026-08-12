"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ImpersonateBanner } from "@/components/layout/impersonate-banner";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n/i18n-context";

export function AdminShell({ children }: { children: React.ReactNode }) {
	const { t } = useI18n();
	const pathname = usePathname();
	const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

	useEffect(() => {
		setMobileNavigationOpen(false);
	}, [pathname]);

	return (
		<div className="flex h-dvh w-full min-w-0 overflow-hidden bg-canvas-soft">
			<Sidebar collapsed={sidebarCollapsed} className="hidden lg:flex" />

			<Dialog
				open={mobileNavigationOpen}
				onOpenChange={setMobileNavigationOpen}
			>
				<DialogContent className="!left-0 !top-0 h-dvh w-[min(20rem,88vw)] max-w-none !translate-x-0 !translate-y-0 overflow-hidden rounded-none border-r border-hairline p-0">
					<DialogTitle className="sr-only">{t("nav.menu")}</DialogTitle>
					<DialogDescription className="sr-only">
						{t("nav.menuDescription")}
					</DialogDescription>
					<Sidebar
						className="w-full border-r-0"
						onActiveNavigate={() => setMobileNavigationOpen(false)}
					/>
				</DialogContent>
			</Dialog>

			<div className="flex w-0 min-w-0 flex-1 flex-col">
				<Topbar
					sidebarCollapsed={sidebarCollapsed}
					onOpenNavigation={() => setMobileNavigationOpen(true)}
					onToggleSidebar={() => setSidebarCollapsed((current) => !current)}
				/>
				<ImpersonateBanner />
				<main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
					<div className="mx-auto box-border w-full min-w-0 max-w-[1480px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
						{children}
					</div>
				</main>
			</div>
		</div>
	);
}
