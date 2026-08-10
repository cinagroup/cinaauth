"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n/i18n-context";
import { NAV } from "./sidebar";

export function CommandMenu() {
	const { t } = useI18n();
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const deferredQuery = useDeferredValue(query);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				event.preventDefault();
				setOpen((current) => !current);
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	const items = useMemo(
		() =>
			NAV.flatMap((section) =>
				section.items.map((item) => ({
					...item,
					label: t(item.key),
					group: section.groupKey ? t(section.groupKey) : t("nav.overview"),
				})),
			),
		[t],
	);

	const normalized = deferredQuery.trim().toLocaleLowerCase();
	const filtered = normalized
		? items.filter((item) =>
				`${item.label} ${item.group}`.toLocaleLowerCase().includes(normalized),
			)
		: items;

	const select = (href: string) => {
		setOpen(false);
		setQuery("");
		router.push(href);
	};

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] border border-hairline bg-canvas text-body transition-colors hover:bg-canvas-soft-2 hover:text-ink sm:h-9 sm:w-[min(24rem,32vw)] sm:justify-between sm:px-3"
				aria-label={t("command.open")}
			>
				<span className="flex min-w-0 items-center gap-2">
					<Search size={15} />
					<span className="hidden truncate text-[13px] sm:inline">
						{t("command.open")}
					</span>
				</span>
				<kbd className="hidden rounded-[4px] border border-hairline bg-canvas-soft px-1.5 py-0.5 font-mono text-[10px] text-mute md:inline-flex">
					Ctrl K
				</kbd>
			</button>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-xl">
					<DialogTitle className="sr-only">{t("command.title")}</DialogTitle>
					<DialogDescription className="sr-only">
						{t("command.description")}
					</DialogDescription>
					<div className="flex items-center gap-3 border-b border-hairline px-4">
						<Search size={17} className="shrink-0 text-mute" />
						<input
							autoFocus
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === "Enter" && filtered[0]) {
									event.preventDefault();
									select(filtered[0].href);
								}
							}}
							placeholder={t("command.placeholder")}
							className="h-14 min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-mute"
						/>
					</div>
					<div className="max-h-[min(26rem,65vh)] overflow-y-auto p-2">
						{filtered.length > 0 ? (
							filtered.map((item) => {
								const Icon = item.icon;
								return (
									<button
										key={item.href}
										type="button"
										onClick={() => select(item.href)}
										className="flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-left transition-colors hover:bg-canvas-soft-2 focus:bg-canvas-soft-2"
									>
										<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-hairline bg-canvas-soft text-mute">
											<Icon size={15} />
										</span>
										<span className="min-w-0 flex-1">
											<span className="block text-[14px] font-medium text-ink">
												{item.label}
											</span>
											<span className="block text-[11px] text-mute">
												{item.group}
											</span>
										</span>
										<ArrowRight size={14} className="text-mute" />
									</button>
								);
							})
						) : (
							<div className="px-3 py-10 text-center text-[14px] text-mute">
								{t("command.empty")}
							</div>
						)}
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
