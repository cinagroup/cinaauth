import Image from "next/image";
import { cn } from "@/lib/cn";

const ADMIN_PRODUCT_NAME = "CinaSeek Admin";
const ADMIN_PRODUCT_TAGLINE = "Identity operations";

export function AdminBrand({
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
			aria-label={`${ADMIN_PRODUCT_NAME} — ${ADMIN_PRODUCT_TAGLINE}`}
			className={cn("flex min-w-0 items-center gap-2", className)}
		>
			<span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-sm)] border border-hairline bg-canvas">
				<Image
					src="/logo.png"
					alt=""
					width={28}
					height={28}
					priority={priority}
					className="h-full w-full object-cover"
				/>
			</span>
			{compact ? null : (
				<span
					className={cn("flex min-w-0 flex-col leading-tight", labelClassName)}
				>
					<span className="truncate text-[14px] font-semibold text-ink">
						{ADMIN_PRODUCT_NAME}
					</span>
					<span className="truncate text-[11px] leading-3 text-mute">
						{ADMIN_PRODUCT_TAGLINE}
					</span>
				</span>
			)}
		</div>
	);
}
