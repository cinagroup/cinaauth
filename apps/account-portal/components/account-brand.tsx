import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

const ACCOUNT_PRODUCT_NAME = "CinaSeek Accounts";
const ACCOUNT_PRODUCT_TAGLINE = "Identity self-service";

export function AccountBrand({
	compact = false,
	className,
	labelClassName,
	priority = false,
}: {
	compact?: boolean;
	className?: string;
	labelClassName?: string;
	priority?: boolean;
}) {
	return (
		<div
			aria-label={`${ACCOUNT_PRODUCT_NAME} — ${ACCOUNT_PRODUCT_TAGLINE}`}
			className={cn("flex min-w-0 items-center gap-2", className)}
		>
			<span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-sm)] border border-hairline bg-canvas">
				<Logo
					size={28}
					sizes="28px"
					priority={priority}
					className="h-full w-full object-cover"
				/>
			</span>
			{compact ? null : (
				<span
					className={cn("flex min-w-0 flex-col leading-tight", labelClassName)}
				>
					<span className="truncate text-[14px] font-semibold text-ink">
						{ACCOUNT_PRODUCT_NAME}
					</span>
					<span className="truncate text-[11px] leading-3 text-mute">
						{ACCOUNT_PRODUCT_TAGLINE}
					</span>
				</span>
			)}
		</div>
	);
}
