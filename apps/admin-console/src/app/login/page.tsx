"use client";

import { AlertCircle, Shield } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n/i18n-context";
import { safeCallbackURL } from "@/lib/safe-callback-url";

interface LoginResponse {
	message?: string;
	error?: {
		message?: string;
	};
}

export default function LoginPage() {
	return (
		<Suspense>
			<LoginForm />
		</Suspense>
	);
}

function LoginForm() {
	const { t } = useI18n();
	const searchParams = useSearchParams();
	const rawCallback = searchParams.get("callbackURL");

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		setError(null);
		setLoading(true);
		const callbackURL = safeCallbackURL(rawCallback);

		try {
			const response = await fetch("/api/auth/sign-in", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ email, password, callbackURL }),
			});
			const data = (await response.json().catch(() => null)) as LoginResponse | null;

			if (response.ok) {
				// Hard navigation ensures the response cookie is persisted first.
				window.location.href = callbackURL;
			} else {
				setError(data?.message ?? data?.error?.message ?? t("login.failed"));
			}
		} catch {
			setError(t("login.networkError"));
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-canvas-soft px-4">
			<div className="w-full max-w-[400px]">
				<div className="mb-8 flex flex-col items-center gap-3">
					<div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-ink text-canvas-soft">
						<Shield size={24} strokeWidth={2.25} />
					</div>
					<h1 className="text-[24px] font-semibold leading-8 text-ink">
						{t("login.title")}
					</h1>
					<p className="text-[14px] leading-5 text-body">{t("login.subtitle")}</p>
				</div>

				<div className="rounded-[var(--radius-lg)] border border-hairline bg-canvas p-6 shadow-card">
					<form onSubmit={submit} className="space-y-4">
						<div className="space-y-1.5">
							<Label htmlFor="email">{t("login.email")}</Label>
							<Input
								id="email"
								type="email"
								required
								value={email}
								onChange={(event) => setEmail(event.target.value)}
								placeholder="admin@cinagroup.com"
								autoComplete="email"
							/>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor="password">{t("login.password")}</Label>
							<Input
								id="password"
								type="password"
								required
								value={password}
								onChange={(event) => setPassword(event.target.value)}
								autoComplete="current-password"
							/>
						</div>

						{error && (
							<div
								role="alert"
								className="flex items-start gap-2 rounded-[var(--radius-sm)] bg-error-soft px-3 py-2 text-[14px] leading-5 text-error"
							>
								<AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
								<span>{error}</span>
							</div>
						)}

						<Button type="submit" className="w-full" disabled={loading}>
							{loading ? t("login.signingIn") : t("login.signIn")}
						</Button>
					</form>
				</div>
			</div>
		</div>
	);
}
