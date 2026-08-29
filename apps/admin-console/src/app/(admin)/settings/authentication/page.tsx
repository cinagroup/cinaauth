"use client";

import { hasAdminControlPermission } from "@cinaauth/auth-web-contract";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
	AlertCircle,
	Fingerprint,
	KeyRound,
	Link2,
	Mail,
	MessageSquareText,
	RefreshCw,
	ShieldCheck,
	Smartphone,
	UserRound,
	WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminSession } from "@/hooks/use-admin-session";
import { fetchAdminJson, getAdminApiErrorMessage } from "@/lib/client-api";
import { useI18n } from "@/lib/i18n/i18n-context";

type RuntimeSettingKey =
	| "emailOtpLoginEnabled"
	| "emailPasswordLoginEnabled"
	| "passkeyLoginEnabled"
	| "siweLoginEnabled"
	| "googleOneTapEnabled";

type AuthenticationSettings = Record<RuntimeSettingKey, boolean>;

type MethodStatus = {
	enabled: boolean;
	available: boolean;
	effective: boolean;
	reason: string | null;
	management: "runtime" | "integration" | "deployment";
};

type AuthenticationSettingsData = {
	settings: AuthenticationSettings & { socialProviderLimit: number };
	methods: {
		emailOtp: MethodStatus;
		emailPassword: MethodStatus;
		passkey: MethodStatus;
		siwe: MethodStatus;
		googleOneTap: MethodStatus;
		phoneOtp: MethodStatus;
		magicLink: MethodStatus;
		username: MethodStatus;
		twoFactor: MethodStatus;
		sso: MethodStatus;
		oauth: MethodStatus;
	};
	activeOAuthProviderCount: number;
};

type StatusResponse = { ok: true; data: AuthenticationSettingsData };

type RuntimeMethodDefinition = {
	id: "emailOtp" | "emailPassword" | "passkey" | "siwe" | "googleOneTap";
	setting: RuntimeSettingKey;
	icon: LucideIcon;
	dependencyHref?: string;
};

const RUNTIME_METHODS: readonly RuntimeMethodDefinition[] = [
	{
		id: "emailOtp",
		setting: "emailOtpLoginEnabled",
		icon: MessageSquareText,
		dependencyHref: "/settings/delivery",
	},
	{
		id: "emailPassword",
		setting: "emailPasswordLoginEnabled",
		icon: KeyRound,
	},
	{
		id: "siwe",
		setting: "siweLoginEnabled",
		icon: WalletCards,
	},
	{
		id: "passkey",
		setting: "passkeyLoginEnabled",
		icon: Fingerprint,
	},
	{
		id: "googleOneTap",
		setting: "googleOneTapEnabled",
		icon: UserRound,
		dependencyHref: "/settings/social-providers",
	},
] as const;

type RelatedMethodDefinition = {
	id: "oauth" | "sso" | "phoneOtp" | "magicLink" | "username" | "twoFactor";
	icon: LucideIcon;
	href?: string;
};

const RELATED_METHODS: readonly RelatedMethodDefinition[] = [
	{ id: "oauth", icon: Link2, href: "/settings/social-providers" },
	{ id: "sso", icon: ShieldCheck, href: "/settings/sso" },
	{ id: "phoneOtp", icon: Smartphone, href: "/settings/delivery" },
	{ id: "magicLink", icon: Mail },
	{ id: "username", icon: UserRound },
	{ id: "twoFactor", icon: ShieldCheck, href: "/settings/security" },
] as const;

const editableSettings = (
	settings: AuthenticationSettingsData["settings"],
): AuthenticationSettings => ({
	emailOtpLoginEnabled: settings.emailOtpLoginEnabled,
	emailPasswordLoginEnabled: settings.emailPasswordLoginEnabled,
	passkeyLoginEnabled: settings.passkeyLoginEnabled,
	siweLoginEnabled: settings.siweLoginEnabled,
	googleOneTapEnabled: settings.googleOneTapEnabled,
});

export default function AuthenticationSettingsPage() {
	const { t } = useI18n();
	const { data: session } = useAdminSession();
	const queryClient = useQueryClient();
	const canManage = hasAdminControlPermission(
		session?.role,
		"security.policy.publish",
	);
	const [draft, setDraft] = useState<AuthenticationSettings | null>(null);

	const statusQuery = useQuery({
		queryKey: ["authentication-settings"],
		queryFn: async () =>
			(
				await fetchAdminJson<StatusResponse>(
					"/api/admin/authentication-settings",
				)
			).data,
		refetchOnWindowFocus: false,
	});
	const data = statusQuery.data;
	const values = data ? (draft ?? editableSettings(data.settings)) : null;

	const mutation = useMutation({
		mutationFn: async (body: AuthenticationSettings) =>
			fetchAdminJson("/api/admin/authentication-settings", {
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(body),
			}),
		onSuccess: async () => {
			setDraft(null);
			toast.success(t("authentication.updated"));
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: ["authentication-settings"],
				}),
				queryClient.invalidateQueries({ queryKey: ["social-providers"] }),
			]);
		},
		onError: (error) =>
			toast.error(
				getAdminApiErrorMessage(error, t("configuration.actionFailed")),
			),
	});

	if (statusQuery.isLoading) {
		return (
			<div className="max-w-5xl space-y-4">
				<PageHeader title={t("authentication.title")} />
				<Skeleton className="h-24 w-full rounded-[var(--radius-lg)]" />
				<div className="grid gap-4 lg:grid-cols-2">
					<Skeleton className="h-96 rounded-[var(--radius-lg)]" />
					<Skeleton className="h-96 rounded-[var(--radius-lg)]" />
				</div>
			</div>
		);
	}

	if (statusQuery.isError || !data || !values) {
		return (
			<div className="max-w-4xl">
				<PageHeader title={t("authentication.title")} />
				<EmptyState>
					<AlertCircle size={20} className="text-error" aria-hidden />
					<span>{t("configuration.loadFailed")}</span>
					<Button
						variant="secondary"
						size="sm"
						onClick={() => void statusQuery.refetch()}
					>
						<RefreshCw size={15} />
						{t("error.retry")}
					</Button>
				</EmptyState>
			</div>
		);
	}

	const original = editableSettings(data.settings);
	const dirty = (Object.keys(original) as RuntimeSettingKey[]).some(
		(key) => original[key] !== values[key],
	);
	const runtimeAvailable = RUNTIME_METHODS.some(
		(method) => values[method.setting] && data.methods[method.id].available,
	);
	const wouldLockOut = !runtimeAvailable && data.activeOAuthProviderCount === 0;
	const reducingMethods = RUNTIME_METHODS.some(
		(method) => original[method.setting] && !values[method.setting],
	);

	return (
		<div className="max-w-5xl space-y-6" aria-busy={mutation.isPending}>
			<PageHeader
				title={t("authentication.title")}
				description={t("authentication.description")}
			>
				<Badge variant="outline">{t("authentication.runtimeSource")}</Badge>
			</PageHeader>

			{mutation.isPending && (
				<p
					role="status"
					className="rounded-[var(--radius-md)] border border-hairline bg-canvas-soft p-3 text-[13px] leading-5 text-body"
				>
					{t("configuration.operationInProgress")}
				</p>
			)}
			{!canManage && (
				<div className="rounded-[var(--radius-md)] border border-hairline bg-canvas-soft p-4 text-[13px] leading-5 text-body">
					{t("authentication.readOnly")}
				</div>
			)}

			<Card>
				<CardHeader>
					<CardTitle>{t("authentication.runtimeMethods")}</CardTitle>
					<CardDescription>
						{t("authentication.runtimeMethodsHint")}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3 pt-0">
					{RUNTIME_METHODS.map((method) => {
						const status = data.methods[method.id];
						const Icon = method.icon;
						const enabled = values[method.setting];
						return (
							<div
								key={method.id}
								className="flex flex-col gap-3 rounded-[var(--radius-sm)] border border-hairline p-4 sm:flex-row sm:items-start sm:justify-between"
							>
								<div className="flex min-w-0 gap-3">
									<div className="mt-0.5 rounded-[var(--radius-sm)] border border-hairline bg-canvas-soft p-2 text-mute">
										<Icon size={17} aria-hidden />
									</div>
									<div className="min-w-0 space-y-1">
										<div className="flex flex-wrap items-center gap-2">
											<span className="text-[14px] font-medium text-ink">
												{t(`authentication.method.${method.id}`)}
											</span>
											<MethodBadge
												status={{
													...status,
													enabled,
													effective: enabled && status.available,
												}}
											/>
										</div>
										<p className="text-[12px] leading-5 text-mute">
											{t(`authentication.method.${method.id}.hint`)}
										</p>
										{!status.available && (
											<p className="text-[12px] leading-5 text-warning">
												{t(`authentication.reason.${status.reason}`)}
												{method.dependencyHref && (
													<>
														{" "}
														<Link
															href={method.dependencyHref}
															className="text-link underline-offset-4 hover:underline"
														>
															{t("authentication.configureDependency")}
														</Link>
													</>
												)}
											</p>
										)}
									</div>
								</div>
								<Checkbox
									checked={enabled}
									disabled={
										!canManage ||
										mutation.isPending ||
										(!status.available && !enabled)
									}
									onCheckedChange={(checked) =>
										setDraft({
											...values,
											[method.setting]: checked === true,
										})
									}
									aria-label={t(`authentication.method.${method.id}`)}
								/>
							</div>
						);
					})}

					{wouldLockOut && (
						<div
							role="alert"
							className="flex gap-2 rounded-[var(--radius-sm)] border border-error/40 bg-error/5 p-3 text-[13px] leading-5 text-error"
						>
							<AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden />
							{t("authentication.lockoutWarning")}
						</div>
					)}

					<div className="flex flex-wrap justify-end gap-2 pt-2">
						<Button
							type="button"
							variant="secondary"
							size="sm"
							disabled={!dirty || mutation.isPending}
							onClick={() => setDraft(null)}
						>
							{t("common.cancel")}
						</Button>
						<ConfirmDialog
							trigger={
								<Button
									type="button"
									size="sm"
									disabled={
										!canManage || !dirty || mutation.isPending || wouldLockOut
									}
								>
									{t("authentication.save")}
								</Button>
							}
							title={t("authentication.confirmTitle")}
							description={t(
								reducingMethods
									? "authentication.confirmReduction"
									: "authentication.confirmEnable",
							)}
							confirmText={t("authentication.save")}
							danger={reducingMethods}
							onConfirm={async () => {
								try {
									await mutation.mutateAsync(values);
									return true;
								} catch {
									return false;
								}
							}}
						/>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>{t("authentication.relatedMethods")}</CardTitle>
					<CardDescription>
						{t("authentication.relatedMethodsHint")}
					</CardDescription>
				</CardHeader>
				<CardContent className="divide-y divide-hairline pt-0">
					{RELATED_METHODS.map((method) => {
						const status = data.methods[method.id];
						const Icon = method.icon;
						return (
							<div
								key={method.id}
								className="flex flex-col gap-2 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
							>
								<div className="flex items-center gap-2.5">
									<Icon size={16} className="text-mute" aria-hidden />
									<div>
										<div className="text-[14px] text-ink">
											{t(`authentication.method.${method.id}`)}
										</div>
										<div className="text-[12px] leading-5 text-mute">
											{t(`authentication.method.${method.id}.hint`)}
										</div>
									</div>
								</div>
								<div className="flex items-center gap-2 sm:justify-end">
									<MethodBadge status={status} />
									{method.href && (
										<Button asChild variant="secondary" size="sm">
											<Link href={method.href}>
												{t("authentication.manage")}
											</Link>
										</Button>
									)}
								</div>
							</div>
						);
					})}
				</CardContent>
			</Card>
		</div>
	);
}

function MethodBadge({ status }: { status: MethodStatus }) {
	const { t } = useI18n();
	if (!status.available) {
		return <Badge variant="muted">{t("authentication.unavailable")}</Badge>;
	}
	if (status.effective || status.enabled) {
		return <Badge variant="success">{t("common.enabled")}</Badge>;
	}
	return <Badge variant="outline">{t("common.disabled")}</Badge>;
}
