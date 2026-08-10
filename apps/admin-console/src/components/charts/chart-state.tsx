"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n/i18n-context";

export function ChartState({
	status,
	onRetry,
	height = 240,
}: {
	status: "loading" | "error" | "empty";
	onRetry?: () => void;
	height?: number;
}) {
	const { t } = useI18n();
	if (status === "loading") {
		return <Skeleton className="w-full" style={{ height }} />;
	}

	return (
		<div
			className="flex flex-col items-center justify-center gap-3 text-center text-[14px] leading-5 text-mute"
			style={{ height }}
			role={status === "error" ? "alert" : undefined}
		>
			{status === "error" && <AlertCircle size={20} className="text-error" aria-hidden />}
			<span>
				{status === "error" ? t("error.generic.message") : t("common.noData")}
			</span>
			{status === "error" && onRetry && (
				<Button variant="secondary" size="sm" onClick={onRetry}>
					<RefreshCw size={15} />
					{t("error.retry")}
				</Button>
			)}
		</div>
	);
}
