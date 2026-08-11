"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Section } from "@/components/layout/section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAdminJson } from "@/lib/client-api";
import { useI18n } from "@/lib/i18n/i18n-context";

interface SecurityPolicy {
	readOnly: true;
	source: "auth-worker";
	rateLimit: {
		enabled: boolean;
		window: number;
		max: number;
		storage: string;
		customRules: Array<{ path: string; window: number; max: number }>;
	};
	otpTtl: string | null;
	otpDailyMax: number | null;
	lockoutThreshold: number | null;
	banDuration: string | null;
	force2fa: { cinacoin: boolean; cinatoken: boolean } | null;
	trustedOrigins: string[] | null;
}

export default function SecurityPolicyPage() {
	const { t } = useI18n();
	const { data: policy, isLoading, isError, refetch } = useQuery({
		queryKey: ["settings", "security"],
		queryFn: async () => {
			const payload = await fetchAdminJson<{ ok?: boolean; data?: SecurityPolicy }>(
				"/api/admin/settings/security",
			);
			return payload.data ?? null;
		},
	});

	if (isLoading) {
		return (
			<div className="max-w-2xl space-y-4">
				<PageHeader title={t("security.title")}>
					<Badge variant="muted">{t("security.readOnly")}</Badge>
				</PageHeader>
				<Skeleton className="h-64 w-full rounded-[var(--radius-md)]" />
			</div>
		);
	}

	if (isError || !policy) {
		return (
			<div className="max-w-2xl">
				<PageHeader title={t("security.title")}>
					<Badge variant="muted">{t("security.readOnly")}</Badge>
				</PageHeader>
				<EmptyState>
					<AlertCircle size={20} className="text-error" aria-hidden />
					<span>{t("error.generic.message")}</span>
					<Button variant="secondary" size="sm" onClick={() => void refetch()}>
						<RefreshCw size={15} />
						{t("error.retry")}
					</Button>
				</EmptyState>
			</div>
		);
	}

	return (
		<div className="max-w-2xl space-y-6">
			<PageHeader title={t("security.title")}>
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant="muted">{t("security.readOnly")}</Badge>
					<Badge variant="outline">{t("security.authWorkerSource")}</Badge>
				</div>
			</PageHeader>

			<Section label={t("security.rateLimit")}>
				<Card>
					<CardContent className="space-y-4">
						<Row label={t("common.enabled")}>
							<Badge variant={policy.rateLimit.enabled ? "success" : "muted"}>
								{policy.rateLimit.enabled ? t("common.enabled") : t("common.disabled")}
							</Badge>
						</Row>
						<Row label={t("security.rateLimitWindow")}>
							<TechnicalValue>{policy.rateLimit.window}s</TechnicalValue>
						</Row>
						<Row label={t("security.rateLimitMax")}>
							<TechnicalValue>{policy.rateLimit.max}</TechnicalValue>
						</Row>
						<Row label={t("security.rateLimitStorage")}>
							<TechnicalValue>{policy.rateLimit.storage}</TechnicalValue>
						</Row>
						<div className="border-t border-hairline pt-4">
							<div className="mb-2 text-[14px] leading-5 text-body">
								{t("security.rateLimitCustomRules")}
							</div>
							{policy.rateLimit.customRules.length > 0 ? (
								<ul className="space-y-2">
									{policy.rateLimit.customRules.map((rule) => (
										<li
											key={rule.path}
											className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
										>
											<TechnicalValue>{rule.path}</TechnicalValue>
											<span className="text-[12px] leading-4 text-mute">
												{rule.max} / {rule.window}s
											</span>
										</li>
									))}
								</ul>
							) : (
								<p className="text-[12px] leading-4 text-mute">
									{t("common.noData")}
								</p>
							)}
						</div>
					</CardContent>
				</Card>
			</Section>

			<Section label={t("security.authentication")}>
				<Card>
					<CardContent className="space-y-4">
						<Row label={t("security.otpExpiry")}>
							{policy.otpTtl === null ? (
								<UnavailableValue />
							) : (
								<Input value={policy.otpTtl} readOnly disabled className="w-40" />
							)}
						</Row>
						<Row label={t("security.otpDailyLimit")}>
							{policy.otpDailyMax === null ? (
								<UnavailableValue />
							) : (
								<Input
									type="number"
									value={policy.otpDailyMax}
									readOnly
									disabled
									className="w-40"
								/>
							)}
						</Row>
						<Row label={t("security.passwordLockout")}>
							{policy.lockoutThreshold === null ? (
								<UnavailableValue />
							) : (
								<Input
									type="number"
									value={policy.lockoutThreshold}
									readOnly
									disabled
									className="w-40"
								/>
							)}
						</Row>
						<Row label={t("security.banDuration")}>
							{policy.banDuration === null ? (
								<UnavailableValue />
							) : (
								<TechnicalValue>{policy.banDuration}</TechnicalValue>
							)}
						</Row>
						<Row label={t("security.force2fa")}>
							{policy.force2fa === null ? (
								<UnavailableValue />
							) : (
								<ForceTwoFactorValue value={policy.force2fa} />
							)}
						</Row>
						<div className="border-t border-hairline pt-4">
							<div className="mb-2 text-[14px] leading-5 text-body">
								{t("security.trustedDomains")}
							</div>
							{policy.trustedOrigins === null ? (
								<UnavailableValue />
							) : policy.trustedOrigins.length > 0 ? (
								<ul className="space-y-1.5">
									{policy.trustedOrigins.map((origin) => (
										<li key={origin} className="break-all font-mono text-[12px] leading-4 text-mute">
											{origin}
										</li>
									))}
								</ul>
							) : (
								<p className="text-[12px] leading-4 text-mute">{t("common.noData")}</p>
							)}
						</div>
					</CardContent>
				</Card>
			</Section>
		</div>
	);
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
			<span className="text-[14px] leading-5 text-body">{label}</span>
			{children}
		</div>
	);
}

function TechnicalValue({ children }: { children: React.ReactNode }) {
	return <span className="break-all font-mono text-[12px] leading-4 text-ink">{children}</span>;
}

function UnavailableValue() {
	const { t } = useI18n();
	return <Badge variant="muted">{t("security.unavailable")}</Badge>;
}

function ForceTwoFactorValue({
	value,
}: {
	value: NonNullable<SecurityPolicy["force2fa"]>;
}) {
	return (
		<div className="flex flex-wrap gap-4">
			{(["cinacoin", "cinatoken"] as const).map((site) => (
				<label
					key={site}
					className="flex items-center gap-2 text-[14px] leading-5 text-body"
				>
					<Checkbox checked={value[site]} disabled />
					{site}
				</label>
			))}
		</div>
	);
}
