"use client";

import { useI18n } from "@/components/i18n-provider";

export function LocalizedSkipLink() {
	const { messages } = useI18n();

	return (
		<a
			href="#main"
			className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-sm focus:bg-canvas focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-ink focus:shadow-l4"
		>
			{messages.skipToContent}
		</a>
	);
}
