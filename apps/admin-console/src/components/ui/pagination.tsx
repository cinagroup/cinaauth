"use client";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/i18n-context";

/** Prev/next pager. Caller owns offset state. */
export function Pagination({
	offset,
	pageSize,
	total,
	onPrev,
	onNext,
}: {
	offset: number;
	pageSize: number;
	total: number;
	onPrev: () => void;
	onNext: () => void;
}) {
	const { t, lang } = useI18n();
	const rangeStart = total > 0 ? offset + 1 : 0;
	const rangeEnd = Math.min(offset + pageSize, total);
	const countLabel =
		lang === "zh" ? `共 ${total} 条` : `${rangeStart}–${rangeEnd} of ${total}`;

	return (
		<div className="mt-4 flex items-center justify-between text-[14px] leading-5 text-body">
			<span>{countLabel}</span>
			<div className="flex gap-2">
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={offset === 0}
					onClick={onPrev}
				>
					{t("common.prev")}
				</Button>
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={offset + pageSize >= total}
					onClick={onNext}
				>
					{t("common.next")}
				</Button>
			</div>
		</div>
	);
}
