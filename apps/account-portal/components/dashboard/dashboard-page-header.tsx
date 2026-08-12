import type { ReactNode } from "react";

export function DashboardPageHeader({
	title,
	description,
	children,
}: {
	title: string;
	description?: string;
	children?: ReactNode;
}) {
	return (
		<div className="mb-5 min-w-0 sm:mb-6">
			<div className="flex min-w-0 flex-col items-start justify-between gap-3 sm:flex-row sm:items-end sm:gap-4">
				<div className="min-w-0">
					<h1 className="break-words text-[24px] font-semibold leading-8 text-ink sm:text-[26px]">
						{title}
					</h1>
					{description ? (
						<p className="mt-1 max-w-3xl text-[14px] leading-5 text-body">
							{description}
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
