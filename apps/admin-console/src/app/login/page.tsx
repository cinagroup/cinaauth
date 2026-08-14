"use client";

import {
	AlertCircle,
	ArrowRight,
	CheckCircle2,
	LockKeyhole,
	Moon,
	ShieldCheck,
	Sun,
} from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
	const { resolvedTheme, setTheme } = useTheme();
	const searchParams = useSearchParams();
	const callbackURL = safeCallbackURL(searchParams.get("callbackURL"));
	const loginParams = new URLSearchParams({ callbackURL });
	const errorKey = getAdminLoginErrorKey(searchParams.get("error"));

	return (
		<main
			id="main"
			data-auth-layout="card-first"
			className="admin-login-backdrop flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 sm:py-12"
		>
			<a
				href="#admin-login-action"
				className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-[var(--radius-sm)] focus:bg-canvas focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-ink focus:shadow-modal"
			>
				{t("login.skipToAction")}
			</a>

			<Card
				aria-labelledby="admin-login-title"
				className="admin-login-card w-full max-w-[26rem] p-5 sm:p-7"
			>
				<div className="flex items-center justify-between">
					<div className="flex min-w-0 items-center gap-3">
						<div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-md)] border border-hairline bg-canvas-soft-2 shadow-card">
							<Image
								src="/logo.png"
								alt=""
								width={40}
								height={40}
								priority
								className="h-full w-full object-cover"
							/>
						</div>
						<div className="min-w-0">
							<p className="truncate text-[14px] font-semibold leading-5 text-ink">
								CinaSeek
							</p>
							<p className="truncate font-mono text-[10px] uppercase leading-4 tracking-[0.14em] text-body">
								{t("login.eyebrow")}
							</p>
						</div>
					</div>
					<Button
						type="button"
						variant="outline"
						size="icon"
						onClick={() =>
							setTheme(resolvedTheme === "dark" ? "light" : "dark")
						}
						aria-label={t("theme.toggle")}
						aria-pressed={resolvedTheme === "dark"}
						className="relative shrink-0 text-body hover:text-ink"
					>
						{resolvedTheme === "dark" ? (
							<Moon size={16} aria-hidden />
						) : (
							<Sun size={16} aria-hidden />
						)}
					</Button>
				</div>

				<div className="pb-6 pt-8 text-center sm:pb-7 sm:pt-9">
					<div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-[var(--radius-lg)] border border-hairline bg-canvas-soft-2 text-link shadow-card">
						<ShieldCheck size={26} strokeWidth={1.6} aria-hidden />
					</div>
					<h1
						id="admin-login-title"
						className="text-balance text-[26px] font-semibold leading-8 tracking-[-0.75px] text-ink sm:text-[28px] sm:leading-9"
					>
						{t("login.title")}
					</h1>
					<p className="mx-auto mt-2.5 max-w-[34ch] text-pretty text-[14px] leading-6 text-body">
						{t("login.subtitle")}
					</p>
				</div>

				<div className="rounded-[var(--radius-md)] border border-hairline bg-canvas-soft/70 px-4 py-3.5">
					<p className="text-[13px] font-medium leading-5 text-ink">
						{t("login.securityTitle")}
					</p>
					<p className="mt-1 text-[12px] leading-5 text-body">
						{t("login.oidcHint")}
					</p>
				</div>

				{errorKey ? (
					<div
						role="alert"
						className="mt-4 flex items-start gap-2 rounded-[var(--radius-md)] border border-error/20 bg-error-soft px-3 py-3 text-[13px] leading-5 text-error-deep"
					>
						<AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden />
						<span>{t(errorKey)}</span>
					</div>
				) : null}

				<Button
					asChild
					size="lg"
					className="mt-5 h-auto min-h-12 w-full whitespace-normal px-3 py-3 text-center"
				>
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
					className="mt-2.5 text-center text-[11px] leading-5 text-body"
				>
					{t("login.redirectHint")}
				</p>

				<div className="mt-5 space-y-3 border-t border-hairline pt-5">
					<div className="flex items-start gap-2.5 text-[12px] leading-5 text-body">
						<LockKeyhole
							size={15}
							className="mt-0.5 shrink-0 text-success"
							aria-hidden
						/>
						<span>{t("login.securityPassword")}</span>
					</div>
					<div className="flex items-start gap-2.5 text-[12px] leading-5 text-body">
						<CheckCircle2
							size={15}
							className="mt-0.5 shrink-0 text-success"
							aria-hidden
						/>
						<span>{t("login.securityRole")}</span>
					</div>
				</div>

				<p className="mt-6 text-center font-mono text-[10px] leading-4 text-body">
					{t("login.trustFooter")}
				</p>
			</Card>
		</main>
	);
}
