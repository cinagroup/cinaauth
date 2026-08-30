"use client";

import type { ReactNode } from "react";
import { useDashboardI18n } from "@/components/dashboard/use-dashboard-i18n";
import type { DashboardMessageKey } from "@/lib/dashboard-i18n";
import { formatDashboardMessage } from "@/lib/dashboard-i18n";

export function DashboardPageHeader({
	title,
	titleKey,
	description,
	descriptionKey,
	descriptionValues,
	children,
}: {
	title?: string;
	titleKey?: DashboardMessageKey;
	description?: string;
	descriptionKey?: DashboardMessageKey;
	descriptionValues?: Readonly<Record<string, string>>;
	children?: ReactNode;
}) {
	const { messages } = useDashboardI18n();
	const resolvedTitle = titleKey ? messages[titleKey] : title;
	const resolvedDescription = descriptionKey
		? formatDashboardMessage(messages[descriptionKey], descriptionValues)
		: description;

	return (
		<div className="mb-5 min-w-0 sm:mb-6">
			<div className="flex min-w-0 flex-col items-start justify-between gap-3 sm:flex-row sm:items-end sm:gap-4">
				<div className="min-w-0">
					<h1 className="break-words text-[24px] font-semibold leading-8 text-ink sm:text-[26px]">
						{resolvedTitle}
					</h1>
					{resolvedDescription ? (
						<p className="mt-1 max-w-3xl text-[14px] leading-5 text-body">
							{resolvedDescription}
						</p>
					) : null}
				</div>
				{children === undefined || children === null ? null : (
					<div className="flex w-full max-w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
						{children}
					</div>
				)}
			</div>
		</div>
	);
}
