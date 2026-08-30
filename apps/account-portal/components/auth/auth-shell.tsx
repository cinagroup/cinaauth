import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactElement, ReactNode } from "react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function AuthShell({
	title,
	description,
	children,
	backHref,
	backLabel = "Back to sign in",
	footer,
	variant = "default",
	themeLabel,
	protectedLabel = "Protected by CinaSeek authentication",
}: {
	title: string;
	description?: string;
	children: ReactNode;
	backHref?: string;
	backLabel?: string;
	footer?: string | ReactElement;
	variant?: "default" | "transaction";
	themeLabel?: string;
	protectedLabel?: string;
}) {
	const isTransaction = variant === "transaction";

	return (
		<section
			aria-labelledby="auth-title"
			className={cn(
				"cina-auth-backdrop flex min-h-svh items-center justify-center px-4 md:px-6",
				isTransaction ? "py-3 md:py-6" : "py-6 md:py-12",
			)}
		>
			<Card
				className={cn(
					"cina-auth-card w-full max-w-[var(--cina-auth-shell-width)]",
					isTransaction && "max-w-[34rem]",
				)}
			>
				<CardHeader
					className={cn(
						"p-[var(--cina-auth-card-padding)] pb-0",
						isTransaction ? "sm:p-6 sm:pb-0" : "sm:p-8 sm:pb-0",
					)}
				>
					<div
						className={cn(
							"w-full",
							isTransaction
								? "relative"
								: "flex items-center justify-between gap-4",
						)}
					>
						<div
							className={cn(
								"min-w-0",
								isTransaction
									? "flex flex-col items-start gap-3 sm:flex-row sm:items-center"
									: "flex items-center gap-3",
							)}
						>
							<div className="cina-auth-logo-frame shrink-0">
								<Logo
									size={44}
									sizes="44px"
									className="size-full object-cover"
								/>
							</div>
							<h1
								id="auth-title"
								className={cn(
									"min-w-0 text-balance text-left font-semibold text-ink",
									isTransaction
										? "text-2xl leading-8 tracking-[-0.8px] sm:pr-12"
										: "text-[28px] leading-9 tracking-[-0.8px] sm:text-[32px] sm:leading-10 sm:tracking-[-1.1px]",
								)}
							>
								{title}
							</h1>
						</div>
						<div className={cn(isTransaction && "absolute right-0 top-0")}>
							<ThemeToggle label={themeLabel} />
						</div>
					</div>
					{description ? (
						<p
							className={cn(
								"w-full max-w-[48ch] text-pretty text-left text-sm leading-6 text-body",
								isTransaction ? "mt-3" : "mt-6",
							)}
						>
							{description}
						</p>
					) : null}
				</CardHeader>

				<CardContent
					className={cn(
						"p-[var(--cina-auth-card-padding)] pt-6",
						isTransaction ? "sm:p-6 sm:pt-5" : "sm:p-8 sm:pt-7",
					)}
				>
					{backHref ? (
						<Link
							href={backHref}
							className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-medium text-body transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
						>
							<ArrowLeft size={16} aria-hidden />
							{backLabel}
						</Link>
					) : null}
					{children}
				</CardContent>

				<CardFooter
					className={cn(
						"flex flex-col items-stretch p-[var(--cina-auth-card-padding)] pt-0 text-center",
						isTransaction ? "gap-3 sm:px-6 sm:pb-6" : "gap-4 sm:px-8 sm:pb-8",
					)}
				>
					<Separator />
					{footer ? (
						<div className="text-sm leading-6 text-body">{footer}</div>
					) : null}
					<div className="flex items-center justify-center gap-2 text-xs text-body">
						<ShieldCheck size={14} aria-hidden className="shrink-0" />
						<span>{protectedLabel}</span>
					</div>
				</CardFooter>
			</Card>
		</section>
	);
}
