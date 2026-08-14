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

export function AuthShell({
	title,
	description,
	children,
	backHref,
	backLabel = "Back to sign in",
	footer,
}: {
	title: string;
	description: string;
	children: ReactNode;
	backHref?: string;
	backLabel?: string;
	footer?: string | ReactElement;
}) {
	return (
		<section
			aria-labelledby="auth-title"
			className="cina-auth-backdrop flex min-h-svh items-center justify-center px-4 py-6 md:px-6 md:py-12"
		>
			<Card className="cina-auth-card w-full max-w-[var(--cina-auth-shell-width)]">
				<CardHeader className="p-[var(--cina-auth-card-padding)] pb-0 sm:p-8 sm:pb-0">
					<div className="flex w-full items-center justify-between gap-4">
						<div className="flex min-w-0 items-center gap-3">
							<div className="cina-auth-logo-frame shrink-0">
								<Logo
									size={44}
									sizes="44px"
									className="size-full object-cover"
								/>
							</div>
							<p className="truncate font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-body">
								CinaSeek account
							</p>
						</div>
						<ThemeToggle />
					</div>
					<h1
						id="auth-title"
						className="mt-7 w-full text-balance text-left text-[28px] font-semibold leading-9 tracking-[-0.8px] text-ink sm:text-[32px] sm:leading-10 sm:tracking-[-1.1px]"
					>
						{title}
					</h1>
					<p className="mt-2 w-full max-w-[42ch] text-pretty text-left text-sm leading-6 text-body">
						{description}
					</p>
				</CardHeader>

				<CardContent className="p-[var(--cina-auth-card-padding)] pt-6 sm:p-8 sm:pt-7">
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

				<CardFooter className="flex flex-col items-stretch gap-4 p-[var(--cina-auth-card-padding)] pt-0 text-center sm:px-8 sm:pb-8">
					<Separator />
					{footer ? (
						<div className="text-sm leading-6 text-body">{footer}</div>
					) : null}
					<div className="flex items-center justify-center gap-2 text-xs text-body">
						<ShieldCheck size={14} aria-hidden className="shrink-0" />
						<span>Protected by CinaSeek authentication</span>
					</div>
				</CardFooter>
			</Card>
		</section>
	);
}
