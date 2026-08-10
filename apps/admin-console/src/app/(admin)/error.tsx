"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/i18n-context";

/** Route-level error boundary for the admin shell. Catches render errors in
 *  any admin page so a single page crash doesn't blank the whole console. */
export default function AdminError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	const { t } = useI18n();
	useEffect(() => {
		console.error("Admin page error:", error);
	}, [error]);

	return (
		<div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
			<div className="text-center">
				<h2 className="text-[20px] font-semibold leading-7 text-ink">
					{t("error.generic.title")}
				</h2>
				<p className="mt-2 max-w-md text-[14px] leading-5 text-body">
					{t("error.generic.message")}
				</p>
			</div>
			<Button variant="secondary" size="sm" onClick={reset}>
				{t("error.retry")}
			</Button>
		</div>
	);
}
