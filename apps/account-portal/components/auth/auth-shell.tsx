import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactElement, ReactNode } from "react";
import { Logo } from "@/components/logo";

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
			className="cina-auth-backdrop -mx-4 flex min-h-[calc(100svh-4rem)] items-center justify-center px-4 py-10 md:-mx-6 md:px-6 md:py-14"
		>
			<div className="w-full max-w-[var(--cina-auth-shell-width)]">
				<div className="mb-6 flex flex-col items-center text-center">
					<div className="cina-auth-logo-frame mb-4">
						<Logo size={64} className="h-full w-full" />
					</div>
					<p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-mute">
						CinaSeek account
					</p>
					<h1
						id="auth-title"
						className="text-balance text-[28px] font-semibold leading-9 tracking-[-0.8px] text-ink sm:text-[32px] sm:leading-10 sm:tracking-[-1.1px]"
					>
						{title}
					</h1>
					<p className="mt-2 max-w-[36ch] text-pretty text-sm leading-6 text-body">
						{description}
					</p>
				</div>

				<div className="cina-auth-card p-[var(--cina-auth-card-padding)] sm:p-7">
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
				</div>

				{footer ? (
					<div className="mt-5 text-center text-sm leading-6 text-body">
						{footer}
					</div>
				) : null}
				<div className="mt-4 flex items-center justify-center gap-2 text-xs text-mute">
					<ShieldCheck size={14} aria-hidden />
					<span>Protected by CinaSeek authentication</span>
				</div>
			</div>
		</section>
	);
}
