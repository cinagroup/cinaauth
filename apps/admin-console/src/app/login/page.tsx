"use client";

import {
	AlertCircle,
	ArrowRight,
	CheckCircle2,
	LockKeyhole,
	ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/i18n-context";
import { getAdminLoginErrorKey } from "@/lib/login-experience";
import { safeCallbackURL } from "@/lib/safe-callback-url";

export default function LoginPage() {
	return (
		<Suspense>
			<LoginCard />
		</Suspense>
	);
}

function LoginCard() {
	const { t } = useI18n();
	const searchParams = useSearchParams();
	const callbackURL = safeCallbackURL(searchParams.get("callbackURL"));
	const loginParams = new URLSearchParams({ callbackURL });
	const errorKey = getAdminLoginErrorKey(searchParams.get("error"));

	return (
		<main
			id="main"
			className="cina-auth-backdrop flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 sm:py-14"
		>
			<a
				href="#admin-login-action"
				className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-[var(--radius-sm)] focus:bg-canvas focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-ink focus:shadow-modal"
			>
				{t("login.skipToAction")}
			</a>

			<div className="w-full max-w-[var(--cina-auth-shell-width)]">
				<div className="mb-6 flex flex-col items-center text-center">
					<div className="cina-auth-logo-frame mb-4">
						<Image
							src="/logo.png"
							alt="CinaSeek"
							width={64}
							height={64}
							priority
							className="h-full w-full"
						/>
					</div>
					<p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-mute">
						{t("login.eyebrow")}
					</p>
					<h1 className="text-balance text-[28px] font-semibold leading-9 tracking-[-0.8px] text-ink sm:text-[32px] sm:leading-10 sm:tracking-[-1.1px]">
						{t("login.title")}
					</h1>
					<p className="mt-2 max-w-[36ch] text-pretty text-[14px] leading-6 text-body">
						{t("login.subtitle")}
					</p>
				</div>

				<div className="cina-auth-card p-[var(--cina-auth-card-padding)] sm:p-7">
					<div className="flex items-start gap-3 rounded-[var(--radius-md)] bg-canvas-soft-2 px-3 py-3">
						<ShieldCheck
							size={20}
							className="mt-0.5 shrink-0 text-link"
							aria-hidden
						/>
						<div>
							<p className="text-[14px] font-medium leading-5 text-ink">
								{t("login.securityTitle")}
							</p>
							<p className="mt-1 text-[13px] leading-5 text-body">
								{t("login.oidcHint")}
							</p>
						</div>
					</div>

					{errorKey ? (
						<div
							role="alert"
							className="mt-4 flex items-start gap-2 rounded-[var(--radius-md)] border border-error/20 bg-error-soft px-3 py-3 text-[14px] leading-5 text-error"
						>
							<AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden />
							<span>{t(errorKey)}</span>
						</div>
					) : null}

					<Button asChild size="lg" className="mt-5 w-full">
						<a
							id="admin-login-action"
							href={`/api/auth/oidc/login?${loginParams.toString()}`}
							aria-describedby="admin-login-note"
						>
							{t("login.continueWithCinaseek")}
							<ArrowRight size={17} aria-hidden />
						</a>
					</Button>
					<p
						id="admin-login-note"
						className="mt-3 text-center text-[12px] leading-5 text-mute"
					>
						{t("login.redirectHint")}
					</p>

					<div className="mt-5 grid gap-3 border-t border-hairline pt-5 sm:grid-cols-2">
						<div className="flex items-start gap-2 text-[12px] leading-5 text-body">
							<LockKeyhole
								size={15}
								className="mt-0.5 shrink-0 text-success"
								aria-hidden
							/>
							<span>{t("login.securityPassword")}</span>
						</div>
						<div className="flex items-start gap-2 text-[12px] leading-5 text-body">
							<CheckCircle2
								size={15}
								className="mt-0.5 shrink-0 text-success"
								aria-hidden
							/>
							<span>{t("login.securityRole")}</span>
						</div>
					</div>
				</div>

				<p className="mt-5 text-center font-mono text-[11px] leading-5 text-mute">
					{t("login.trustFooter")}
				</p>
			</div>
		</main>
	);
}
