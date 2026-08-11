"use client";

import { LogOut, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOutAndRedirect } from "@/lib/cinaauth/sign-out";
import { useI18n } from "@/lib/i18n/i18n-context";

export default function ForbiddenPage() {
	const { t } = useI18n();
	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-canvas-soft px-4 text-center">
			<ShieldX size={28} className="text-error" aria-hidden />
			<h1 className="text-[24px] font-semibold leading-8 text-ink">
				{t("error.403.title")}
			</h1>
			<p className="text-[16px] leading-6 text-body">
				{t("error.403.message")}
			</p>
			<Button
				variant="secondary"
				size="sm"
				className="mt-2"
				onClick={() => void signOutAndRedirect()}
			>
				<LogOut size={15} />
				{t("common.signOut")}
			</Button>
		</div>
	);
}
