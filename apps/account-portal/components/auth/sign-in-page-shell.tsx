"use client";

import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { useI18n } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";

export function SignInPageShell({ children }: { children: React.ReactNode }) {
	const { messages } = useI18n();

	return (
		<AuthShell
			title={messages.signInPageTitle}
			description={messages.signInPageDescription}
			themeLabel={messages.themeToggle}
			protectedLabel={messages.protectedBy}
			footer={
				<p>
					{messages.continueAgreement}{" "}
					<Link
						href="https://www.cinagroup.com/terms"
						className="text-link underline underline-offset-4 hover:text-link-deep"
						target="_blank"
						rel="noopener noreferrer"
					>
						{messages.termsOfService}
					</Link>{" "}
					{messages.and}{" "}
					<Link
						href="https://www.cinagroup.com/privacy"
						className="text-link underline underline-offset-4 hover:text-link-deep"
						target="_blank"
						rel="noopener noreferrer"
					>
						{messages.privacyPolicy}
					</Link>
				</p>
			}
		>
			<div className="mb-5 flex justify-end">
				<LanguageSwitcher />
			</div>
			<Suspense
				fallback={
					<p className="py-8 text-center text-sm text-body" role="status">
						{messages.loadingSignIn}
					</p>
				}
			>
				{children}
			</Suspense>
		</AuthShell>
	);
}
