"use client";

import type {
	DeliveryChannel,
	DeliveryChannelStatus,
	DeliveryConfigurationStatus,
	DeliveryEmailProvider,
} from "@cinaauth/auth-web-contract";
import { hasAdminControlPermission } from "@cinaauth/auth-web-contract";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AlertCircle,
	CheckCircle2,
	Mail,
	MessageSquareText,
	RefreshCw,
} from "lucide-react";
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
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminSession } from "@/hooks/use-admin-session";
import { fetchAdminJson, getAdminApiErrorMessage } from "@/lib/client-api";
import { useI18n } from "@/lib/i18n/i18n-context";

type StatusResponse = { ok: true; data: DeliveryConfigurationStatus };

const newIdempotencyKey = (operation: string) =>
	`${operation}:${crypto.randomUUID()}`;

export default function DeliveryConfigurationPage() {
	const { t } = useI18n();
	const { data: session } = useAdminSession();
	const queryClient = useQueryClient();
	const canManage = hasAdminControlPermission(
		session?.role,
		"integration.delivery.manage",
	);
	const [email, setEmail] = useState({
		provider: "resend" as DeliveryEmailProvider,
		apiKey: "",
		apiToken: "",
		accountId: "",
		from: "",
	});
	const [sms, setSms] = useState({
		accountSid: "",
		authToken: "",
		fromNumber: "",
	});
	const [emailRecipient, setEmailRecipient] = useState("");
	const [smsRecipient, setSmsRecipient] = useState("");

	const statusQuery = useQuery({
		queryKey: ["configuration", "delivery"],
		queryFn: async () =>
			(
				await fetchAdminJson<StatusResponse>(
					"/api/admin/configuration/delivery/status",
				)
			).data,
		refetchOnWindowFocus: false,
	});
	const status = statusQuery.data;

	const mutation = useMutation({
		mutationFn: async ({
			operation,
			body,
		}: {
			operation: "stage" | "test" | "activate" | "rollback";
			body: Record<string, unknown>;
		}) =>
			fetchAdminJson(`/api/admin/configuration/delivery/${operation}`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(body),
			}),
		onSuccess: async () => {
			toast.success(t("configuration.actionSucceeded"));
			await queryClient.invalidateQueries({
				queryKey: ["configuration", "delivery"],
			});
		},
		onError: (error) =>
			toast.error(
				getAdminApiErrorMessage(error, t("configuration.actionFailed")),
			),
	});

	const run = async (
		operation: "stage" | "test" | "activate" | "rollback",
		body: Record<string, unknown>,
	) => {
		if (!status) return false;
		try {
			await mutation.mutateAsync({
				operation,
				body: {
					expectedVersion: status.revision,
					idempotencyKey: newIdempotencyKey(`${operation}-delivery`),
					...body,
				},
			});
			return true;
		} catch {
			return false;
		}
	};

	if (statusQuery.isLoading) {
		return (
			<div className="max-w-6xl space-y-4">
				<PageHeader title={t("delivery.title")} />
				<Skeleton className="h-28 w-full rounded-[var(--radius-lg)]" />
				<div className="grid gap-4 lg:grid-cols-2">
					<Skeleton className="h-96 rounded-[var(--radius-lg)]" />
					<Skeleton className="h-96 rounded-[var(--radius-lg)]" />
				</div>
			</div>
		);
	}

	if (statusQuery.isError || !status) {
		return (
			<div className="max-w-4xl">
				<PageHeader title={t("delivery.title")} />
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

	return (
		<div className="max-w-6xl space-y-6" aria-busy={mutation.isPending}>
			<PageHeader
				title={t("delivery.title")}
				description={t("delivery.description")}
			/>
			<ReadinessSummary status={status} />
			{mutation.isPending && (
				<p
					role="status"
					className="rounded-[var(--radius-md)] border border-hairline bg-canvas-soft p-3 text-[13px] leading-5 text-body"
				>
					{t("configuration.operationInProgress")}
				</p>
			)}
			{!status.structuralReady && (
				<p className="rounded-[var(--radius-md)] border border-error/20 bg-error-soft p-3 text-[13px] leading-5 text-error">
					{t("configuration.structuralUnavailableHint")}
				</p>
			)}

			{!canManage && (
				<div className="rounded-[var(--radius-md)] border border-hairline bg-canvas-soft p-4 text-[13px] leading-5 text-body">
					{t("configuration.readOnly")}
				</div>
			)}

			<div className="grid items-start gap-4 lg:grid-cols-2">
				<ProviderCard
					channel="email"
					status={status.channels.email}
					canManage={canManage}
					pending={mutation.isPending}
					onActivate={() =>
						run("activate", { channel: "email", confirmation: "ACTIVATE" })
					}
					onRollback={() =>
						run("rollback", { channel: "email", confirmation: "ROLLBACK" })
					}
				>
					<form
						className="space-y-3"
						onSubmit={async (event) => {
							event.preventDefault();
							const staged = await run("stage", {
								channel: "email",
								config:
									email.provider === "cloudflare-email"
										? {
												provider: "cloudflare-email",
												apiToken: email.apiToken,
												accountId: email.accountId.trim(),
												from: email.from.trim(),
											}
										: {
												provider: "resend",
												apiKey: email.apiKey,
												from: email.from.trim(),
											},
							});
							if (staged) {
								setEmail((current) => ({
									...current,
									apiKey: "",
									apiToken: "",
									accountId: "",
									from: "",
								}));
							}
						}}
					>
						<SecretNotice />
						<div className="space-y-1.5">
							<Label htmlFor="email-provider">{t("delivery.provider")}</Label>
							<Select
								value={email.provider}
								onValueChange={(value) =>
									setEmail((current) => ({
										...current,
										provider: value as DeliveryEmailProvider,
									}))
								}
							>
								<SelectTrigger
									id="email-provider"
									disabled={mutation.isPending}
								>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="resend">
										{t("delivery.provider.resend")}
									</SelectItem>
									<SelectItem value="cloudflare-email">
										{t("delivery.provider.cloudflare-email")}
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						{email.provider === "cloudflare-email" ? (
							<>
								<div className="space-y-1.5">
									<Label htmlFor="cloudflare-email-api-token">
										{t("delivery.cloudflareApiToken")}
									</Label>
									<Input
										id="cloudflare-email-api-token"
										type="password"
										autoComplete="new-password"
										required
										minLength={20}
										maxLength={512}
										value={email.apiToken}
										onChange={(event) =>
											setEmail((current) => ({
												...current,
												apiToken: event.target.value,
											}))
										}
									/>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="cloudflare-email-account-id">
										{t("delivery.cloudflareAccountId")}
									</Label>
									<Input
										id="cloudflare-email-account-id"
										autoComplete="off"
										required
										pattern="[a-fA-F0-9]{32}"
										maxLength={32}
										value={email.accountId}
										onChange={(event) =>
											setEmail((current) => ({
												...current,
												accountId: event.target.value,
											}))
										}
									/>
								</div>
							</>
						) : (
							<div className="space-y-1.5">
								<Label htmlFor="resend-api-key">
									{t("delivery.resendApiKey")}
								</Label>
								<Input
									id="resend-api-key"
									type="password"
									autoComplete="new-password"
									required
									minLength={16}
									maxLength={512}
									value={email.apiKey}
									onChange={(event) =>
										setEmail((current) => ({
											...current,
											apiKey: event.target.value,
										}))
									}
								/>
							</div>
						)}
						<div className="space-y-1.5">
							<Label htmlFor="email-from">{t("delivery.fromAddress")}</Label>
							<Input
								id="email-from"
								autoComplete="off"
								required
								maxLength={384}
								value={email.from}
								placeholder="CinaSeek <identity@example.com>"
								onChange={(event) =>
									setEmail((current) => ({
										...current,
										from: event.target.value,
									}))
								}
							/>
						</div>
						<Button
							type="submit"
							size="sm"
							disabled={!status.structuralReady || mutation.isPending}
						>
							{t("configuration.stage")}
						</Button>
					</form>
					<TestForm
						id="email-test-recipient"
						label={t("delivery.testEmail")}
						type="email"
						value={emailRecipient}
						disabled={!status.channels.email.nextVersion || mutation.isPending}
						onChange={setEmailRecipient}
						onSubmit={async (recipient) => {
							if (await run("test", { channel: "email", recipient })) {
								setEmailRecipient("");
							}
						}}
					/>
				</ProviderCard>

				<ProviderCard
					channel="sms"
					status={status.channels.sms}
					canManage={canManage}
					pending={mutation.isPending}
					onActivate={() =>
						run("activate", { channel: "sms", confirmation: "ACTIVATE" })
					}
					onRollback={() =>
						run("rollback", { channel: "sms", confirmation: "ROLLBACK" })
					}
				>
					<form
						className="space-y-3"
						onSubmit={async (event) => {
							event.preventDefault();
							if (
								await run("stage", {
									channel: "sms",
									config: {
										provider: "twilio",
										accountSid: sms.accountSid.trim(),
										authToken: sms.authToken,
										fromNumber: sms.fromNumber.trim(),
									},
								})
							) {
								setSms({ accountSid: "", authToken: "", fromNumber: "" });
							}
						}}
					>
						<SecretNotice />
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="space-y-1.5 sm:col-span-2">
								<Label htmlFor="twilio-account-sid">
									{t("delivery.accountSid")}
								</Label>
								<Input
									id="twilio-account-sid"
									autoComplete="off"
									required
									pattern="AC[a-fA-F0-9]{32}"
									maxLength={34}
									value={sms.accountSid}
									onChange={(event) =>
										setSms((current) => ({
											...current,
											accountSid: event.target.value,
										}))
									}
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="twilio-auth-token">
									{t("delivery.authToken")}
								</Label>
								<Input
									id="twilio-auth-token"
									type="password"
									autoComplete="new-password"
									required
									minLength={16}
									maxLength={128}
									value={sms.authToken}
									onChange={(event) =>
										setSms((current) => ({
											...current,
											authToken: event.target.value,
										}))
									}
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="twilio-from-number">
									{t("delivery.fromNumber")}
								</Label>
								<Input
									id="twilio-from-number"
									type="tel"
									autoComplete="off"
									required
									pattern="\+[1-9][0-9]{7,14}"
									maxLength={16}
									value={sms.fromNumber}
									placeholder="+15551234567"
									onChange={(event) =>
										setSms((current) => ({
											...current,
											fromNumber: event.target.value,
										}))
									}
								/>
							</div>
						</div>
						<Button
							type="submit"
							size="sm"
							disabled={!status.structuralReady || mutation.isPending}
						>
							{t("configuration.stage")}
						</Button>
					</form>
					<TestForm
						id="sms-test-recipient"
						label={t("delivery.testSms")}
						type="tel"
						value={smsRecipient}
						disabled={!status.channels.sms.nextVersion || mutation.isPending}
						onChange={setSmsRecipient}
						onSubmit={async (recipient) => {
							if (await run("test", { channel: "sms", recipient })) {
								setSmsRecipient("");
							}
						}}
					/>
				</ProviderCard>
			</div>
		</div>
	);
}

function ReadinessSummary({ status }: { status: DeliveryConfigurationStatus }) {
	const { t } = useI18n();
	return (
		<Card>
			<CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<div className="flex flex-wrap items-center gap-2" aria-live="polite">
						<Badge variant={status.structuralReady ? "success" : "danger"}>
							{status.structuralReady
								? t("configuration.structuralReady")
								: t("configuration.structuralUnavailable")}
						</Badge>
						<Badge
							variant={
								status.operationalState === "ready"
									? "success"
									: status.operationalState === "degraded"
										? "warning"
										: "muted"
							}
						>
							{t(`configuration.operational.${status.operationalState}`)}
						</Badge>
					</div>
					<p className="mt-2 text-[12px] leading-4 text-mute">
						{t("configuration.readinessHint")}
					</p>
				</div>
				<span className="font-mono text-[12px] text-mute">
					{t("configuration.revision")}: {status.revision}
				</span>
			</CardContent>
		</Card>
	);
}

function ProviderCard({
	channel,
	status,
	canManage,
	pending,
	onActivate,
	onRollback,
	children,
}: {
	channel: DeliveryChannel;
	status: DeliveryChannelStatus;
	canManage: boolean;
	pending: boolean;
	onActivate: () => Promise<boolean>;
	onRollback: () => Promise<boolean>;
	children: React.ReactNode;
}) {
	const { t } = useI18n();
	const Icon = channel === "email" ? Mail : MessageSquareText;
	return (
		<Card>
			<CardHeader>
				<div className="flex items-start justify-between gap-3">
					<div className="flex min-w-0 items-center gap-3">
						<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-canvas-soft-2 text-ink">
							<Icon size={17} aria-hidden />
						</span>
						<div>
							<CardTitle>{t(`delivery.${channel}.title`)}</CardTitle>
							<CardDescription>
								{t(`delivery.provider.${status.provider}`)}
							</CardDescription>
						</div>
					</div>
					<Badge variant={status.configured ? "success" : "muted"}>
						{status.configured
							? t("configuration.configured")
							: t("configuration.notConfigured")}
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="space-y-5 pt-0">
				<div className="grid grid-cols-3 gap-2 rounded-[var(--radius-sm)] border border-hairline bg-canvas-soft p-3 text-center">
					<Version
						label={t("configuration.active")}
						value={status.activeVersion}
					/>
					<Version
						label={t("configuration.nextSlot")}
						value={status.nextVersion}
					/>
					<Version
						label={t("configuration.previous")}
						value={status.previousVersion}
					/>
				</div>
				{canManage && (
					<>
						{children}
						<div className="flex flex-wrap gap-2 border-t border-hairline pt-4">
							<ConfirmDialog
								trigger={
									<Button
										type="button"
										size="sm"
										disabled={
											!status.nextVersion || !status.validated || pending
										}
									>
										<CheckCircle2 size={15} />
										{t("configuration.activate")}
									</Button>
								}
								title={t("configuration.activate")}
								description={t("configuration.activateHint")}
								confirmationText="ACTIVATE"
								confirmationLabel={t("configuration.typeActivate")}
								onConfirm={onActivate}
							/>
							<ConfirmDialog
								trigger={
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={!status.previousVersion || pending}
									>
										{t("configuration.rollback")}
									</Button>
								}
								title={t("configuration.rollback")}
								description={t("configuration.rollbackHint")}
								confirmationText="ROLLBACK"
								confirmationLabel={t("configuration.typeRollback")}
								onConfirm={onRollback}
							/>
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
}

function Version({ label, value }: { label: string; value: number | null }) {
	return (
		<div>
			<div className="text-[11px] text-mute">{label}</div>
			<div className="mt-1 font-mono text-[13px] text-ink">
				{value === null ? "—" : `v${value}`}
			</div>
		</div>
	);
}

function SecretNotice() {
	const { t } = useI18n();
	return (
		<p className="rounded-[var(--radius-sm)] bg-canvas-soft px-3 py-2 text-[12px] leading-4 text-body">
			{t("configuration.writeOnlyHint")}
		</p>
	);
}

function TestForm({
	id,
	label,
	type,
	value,
	disabled,
	onChange,
	onSubmit,
}: {
	id: string;
	label: string;
	type: "email" | "tel";
	value: string;
	disabled: boolean;
	onChange: (value: string) => void;
	onSubmit: (value: string) => Promise<void>;
}) {
	const { t } = useI18n();
	return (
		<form
			className="space-y-2 border-t border-hairline pt-4"
			onSubmit={(event) => {
				event.preventDefault();
				void onSubmit(value.trim());
			}}
		>
			<Label htmlFor={id}>{label}</Label>
			<div className="flex flex-col gap-2 sm:flex-row">
				<Input
					id={id}
					type={type}
					autoComplete="off"
					required
					pattern={type === "tel" ? "\\+[1-9][0-9]{7,14}" : undefined}
					maxLength={type === "email" ? 320 : 16}
					value={value}
					onChange={(event) => onChange(event.target.value)}
				/>
				<Button type="submit" variant="secondary" size="sm" disabled={disabled}>
					{t("configuration.test")}
				</Button>
			</div>
		</form>
	);
}
