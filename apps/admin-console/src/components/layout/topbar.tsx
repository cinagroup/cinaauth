"use client";

import { useTheme } from "next-themes";
import {
	Check,
	LogOut,
	Menu,
	Monitor,
	Moon,
	PanelLeftClose,
	PanelLeftOpen,
	Shield,
	Sun,
	User,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/i18n-context";
import { signOutAndRedirect } from "@/lib/cinaauth/sign-out";
import { useAdminSession } from "@/hooks/use-admin-session";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { CommandMenu } from "@/components/layout/command-menu";

export function Topbar({
	sidebarCollapsed,
	onOpenNavigation,
	onToggleSidebar,
}: {
	sidebarCollapsed: boolean;
	onOpenNavigation: () => void;
	onToggleSidebar: () => void;
}) {
	const { t, lang, setLang } = useI18n();
	const { theme, setTheme } = useTheme();
	const { data: session } = useAdminSession();

	const initials = (session?.email ?? "?")
		.split("@")[0]
		.slice(0, 2)
		.toUpperCase();

	return (
		<header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-hairline bg-canvas px-3 sm:px-4">
			<div className="flex min-w-0 items-center gap-2">
				<Button
					variant="ghost"
					size="icon"
					onClick={onOpenNavigation}
					aria-label={t("nav.menu")}
					className="lg:hidden"
				>
					<Menu size={17} />
				</Button>
				<div className="mr-1 flex min-w-0 items-center gap-2 lg:hidden">
					<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-ink text-canvas-soft">
						<Shield size={15} />
					</span>
					<span className="hidden truncate text-[13px] font-semibold text-ink min-[360px]:inline">
						CinaAdmin
					</span>
				</div>
				<Button
					variant="ghost"
					size="icon"
					onClick={onToggleSidebar}
					aria-label={t("nav.collapse")}
					className="hidden lg:inline-flex"
				>
					{sidebarCollapsed ? (
						<PanelLeftOpen size={17} />
					) : (
						<PanelLeftClose size={17} />
					)}
				</Button>
				<CommandMenu />
			</div>

			<div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							aria-label={t("theme.toggle")}
							className="relative hidden sm:inline-flex"
						>
							<Sun
								size={16}
								className="scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
							/>
							<Moon
								size={16}
								className="absolute scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
							/>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={() => setTheme("light")}>
							<Sun size={14} /> {t("theme.light")}
							{theme === "light" && (
								<Check size={14} className="ml-auto text-link" />
							)}
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setTheme("dark")}>
							<Moon size={14} /> {t("theme.dark")}
							{theme === "dark" && (
								<Check size={14} className="ml-auto text-link" />
							)}
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setTheme("system")}>
							<Monitor size={14} /> {t("theme.system")}
							{theme === "system" && (
								<Check size={14} className="ml-auto text-link" />
							)}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>

				<Select
					value={lang}
					onValueChange={(value) => setLang(value as "zh" | "en")}
				>
					<SelectTrigger className="h-8 w-[76px] text-[13px] sm:w-[88px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="en">EN</SelectItem>
						<SelectItem value="zh">中文</SelectItem>
					</SelectContent>
				</Select>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							className="flex h-11 w-11 items-center justify-center gap-2 rounded-[var(--radius-pill)] p-1 transition-colors hover:bg-canvas-soft sm:h-9 sm:w-auto sm:justify-start sm:pr-2"
						>
							<span className="flex h-7 w-7 items-center justify-center rounded-full bg-canvas-soft-2 text-[12px] font-semibold text-ink">
								{initials}
							</span>
							<span className="hidden max-w-[180px] truncate text-[13px] leading-4 text-body xl:inline">
								{session?.email ?? ""}
							</span>
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="min-w-[200px]">
						<DropdownMenuLabel className="flex items-center gap-2 text-[13px] text-mute">
							<User size={14} />
							{session?.email ?? ""}
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={() => void signOutAndRedirect()}
							className="text-error"
						>
							<LogOut size={14} />
							{t("common.signOut")}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</header>
	);
}
