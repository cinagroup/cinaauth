"use client";

import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
	const { locale, messages, setLocale } = useI18n();

	return (
		<div
			role="group"
			aria-label={messages.languageControl}
			className={cn(
				"flex h-11 items-center rounded-full border border-hairline bg-canvas p-1 shadow-l1",
				className,
			)}
		>
			<button
				type="button"
				aria-label={messages.switchToChinese}
				aria-pressed={locale === "zh-CN"}
				onClick={() => setLocale("zh-CN")}
				className={cn(
					"flex h-9 min-w-10 items-center justify-center rounded-full px-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
					locale === "zh-CN"
						? "bg-ink text-canvas"
						: "text-body hover:bg-canvas-soft-2 hover:text-ink",
				)}
			>
				中
			</button>
			<button
				type="button"
				aria-label={messages.switchToEnglish}
				aria-pressed={locale === "en"}
				onClick={() => setLocale("en")}
				className={cn(
					"flex h-9 min-w-10 items-center justify-center rounded-full px-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
					locale === "en"
						? "bg-ink text-canvas"
						: "text-body hover:bg-canvas-soft-2 hover:text-ink",
				)}
			>
				EN
			</button>
		</div>
	);
}
