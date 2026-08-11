"use client";

import type { ErasureConfigurationStatus } from "@cinaauth/auth-web-contract";
import { hasAdminControlPermission } from "@cinaauth/auth-web-contract";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AlertCircle,
	Plus,
	RefreshCw,
	ShieldCheck,
	Trash2,
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
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminSession } from "@/hooks/use-admin-session";
import { fetchAdminJson, getAdminApiErrorMessage } from "@/lib/client-api";
import { useI18n } from "@/lib/i18n/i18n-context";

type StatusResponse = { ok: true; data: ErasureConfigurationStatus };
type TargetDraft = {
	localId: string;
	id: string;
	url: string;
	signingSecret: string;
};

const blankTarget = (localId: string): TargetDraft => ({
	localId,
	id: "",
	url: "",
	signingSecret: "",
});

const newTarget = () => blankTarget(crypto.randomUUID());

const newIdempotencyKey = (operation: string) =>
	`${operation}:${crypto.randomUUID()}`;

export default function PrivacyErasureConfigurationPage() {
	const { t } = useI18n();
	const { data: session } = useAdminSession();
	const queryClient = useQueryClient();
	const canManage = hasAdminControlPermission(
		session?.role,
		"privacy.erasure.manage",
	);
	const [targets, setTargets] = useState<TargetDraft[]>([
		blankTarget("initial-target"),
	]);

	const statusQuery = useQuery({
		queryKey: ["configuration", "privacy-erasure"],
		queryFn: async () =>
			(
				await fetchAdminJson<StatusResponse>(
					"/api/admin/configuration/erasure/status",
				)
			).data,
		refetchOnWindowFocus: false,
	});
	const status = statusQuery.data;
	const activeTargetIds = status?.slots.active?.targetIds ?? [];
	const nextTargetIds = status?.slots.next?.targetIds ?? [];
	const readSafeTargetIds = [
		...new Set([
			...activeTargetIds,
			...nextTargetIds,
			...(status?.slots.previous?.targetIds ?? []),
		]),
	].sort();

	const mutation = useMutation({
		mutationFn: async ({
			operation,
			body,
		}: {
			operation: "stage" | "test" | "activate" | "rollback";
			body: Record<string, unknown>;
		}) =>
			fetchAdminJson(`/api/admin/configuration/erasure/${operation}`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(body),
			}),
		onSuccess: async () => {
			toast.success(t("configuration.actionSucceeded"));
			await queryClient.invalidateQueries({
				queryKey: ["configuration", "privacy-erasure"],
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
					idempotencyKey: newIdempotencyKey(`${operation}-erasure`),
					...body,
				},
			});
			return true;
		} catch {
			return false;
		}
	};

	const updateTarget = (
		localId: string,
		field: "id" | "url" | "signingSecret",
		value: string,
	) => {
		setTargets((current) =>
			current.map((target) =>
				target.localId === localId ? { ...target, [field]: value } : target,
			),
		);
	};

	if (statusQuery.isLoading) {
		return (
			<div className="max-w-5xl space-y-4">
				<PageHeader title={t("erasure.title")} />
				<Skeleton className="h-28 w-full rounded-[var(--radius-lg)]" />
				<Skeleton className="h-[32rem] w-full rounded-[var(--radius-lg)]" />
			</div>
		);
	}

	if (statusQuery.isError || !status) {
		return (
			<div className="max-w-4xl">
				<PageHeader title={t("erasure.title")} />
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
		<div className="max-w-5xl space-y-6" aria-busy={mutation.isPending}>
			<PageHeader
				title={t("erasure.title")}
				description={t("erasure.description")}
			/>

			<Card>
				<CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<div
							className="flex flex-wrap items-center gap-2"
							aria-live="polite"
						>
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
							{t("erasure.failClosedHint")}
						</p>
					</div>
					<div className="grid grid-cols-2 gap-x-5 gap-y-1 text-right text-[12px]">
						<span className="text-mute">{t("configuration.revision")}</span>
						<span className="font-mono text-ink">{status.revision}</span>
						<span className="text-mute">{t("erasure.targetCount")}</span>
						<span className="font-mono text-ink">
							{status.slots.active?.targetCount ?? 0}
						</span>
					</div>
				</CardContent>
			</Card>

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

			<Card>
				<CardHeader>
					<CardTitle>{t("configuration.versions")}</CardTitle>
					<CardDescription>{t("configuration.versionHint")}</CardDescription>
				</CardHeader>
				<CardContent className="grid grid-cols-3 gap-2 pt-0 text-center">
					<Version
						label={t("configuration.active")}
						value={status.slots.active?.version ?? null}
					/>
					<Version
						label={t("configuration.nextSlot")}
						value={status.slots.next?.version ?? null}
					/>
					<Version
						label={t("configuration.previous")}
						value={status.slots.previous?.version ?? null}
					/>
				</CardContent>
			</Card>

			{readSafeTargetIds.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>{t("erasure.registeredTargets")}</CardTitle>
						<CardDescription>{t("erasure.targetIdsOnly")}</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-wrap gap-2 pt-0">
						{readSafeTargetIds.map((id) => (
							<Badge key={id} variant="outline">
								{id}
							</Badge>
						))}
					</CardContent>
				</Card>
			)}

			{!canManage ? (
				<div className="rounded-[var(--radius-md)] border border-hairline bg-canvas-soft p-4 text-[13px] leading-5 text-body">
					{t("configuration.readOnly")}
				</div>
			) : (
				<Card>
					<CardHeader>
						<CardTitle>{t("erasure.stageTitle")}</CardTitle>
						<CardDescription>{t("erasure.stageDescription")}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-5 pt-0">
						<p className="rounded-[var(--radius-sm)] bg-canvas-soft px-3 py-2 text-[12px] leading-4 text-body">
							{t("configuration.writeOnlyHint")}
						</p>
						<form
							className="space-y-4"
							onSubmit={async (event) => {
								event.preventDefault();
								if (
									await run("stage", {
										targets: targets.map(({ id, url, signingSecret }) => ({
											id: id.trim(),
											url: url.trim(),
											signingSecret,
										})),
									})
								) {
									setTargets([newTarget()]);
								}
							}}
						>
							<div className="space-y-3">
								{targets.map((target, index) => (
									<fieldset
										key={target.localId}
										className="rounded-[var(--radius-md)] border border-hairline p-4"
									>
										<legend className="px-1 text-[13px] font-medium text-ink">
											{t("erasure.targetNumber", { number: index + 1 })}
										</legend>
										<div className="grid gap-3 md:grid-cols-2">
											<div className="space-y-1.5">
												<Label htmlFor={`erasure-id-${target.localId}`}>
													{t("erasure.targetId")}
												</Label>
												<Input
													id={`erasure-id-${target.localId}`}
													required
													minLength={2}
													maxLength={64}
													pattern="[-a-z0-9_]{2,64}"
													value={target.id}
													onChange={(event) =>
														updateTarget(
															target.localId,
															"id",
															event.target.value,
														)
													}
												/>
											</div>
											<div className="space-y-1.5">
												<Label htmlFor={`erasure-url-${target.localId}`}>
													{t("erasure.targetUrl")}
												</Label>
												<Input
													id={`erasure-url-${target.localId}`}
													type="url"
													autoComplete="off"
													required
													maxLength={2048}
													value={target.url}
													placeholder="https://service.example/privacy/erase"
													onChange={(event) =>
														updateTarget(
															target.localId,
															"url",
															event.target.value,
														)
													}
												/>
											</div>
											<div className="space-y-1.5 md:col-span-2">
												<Label htmlFor={`erasure-secret-${target.localId}`}>
													{t("erasure.signingSecret")}
												</Label>
												<Input
													id={`erasure-secret-${target.localId}`}
													type="password"
													autoComplete="new-password"
													required
													minLength={32}
													maxLength={1024}
													value={target.signingSecret}
													onChange={(event) =>
														updateTarget(
															target.localId,
															"signingSecret",
															event.target.value,
														)
													}
												/>
											</div>
										</div>
										{targets.length > 1 && (
											<Button
												type="button"
												variant="ghost"
												size="sm"
												className="mt-3 text-error"
												onClick={() =>
													setTargets((current) =>
														current.filter(
															(candidate) =>
																candidate.localId !== target.localId,
														),
													)
												}
											>
												<Trash2 size={15} />
												{t("erasure.removeTarget")}
											</Button>
										)}
									</fieldset>
								))}
							</div>
							<div className="flex flex-wrap gap-2">
								<Button
									type="button"
									variant="secondary"
									size="sm"
									disabled={targets.length >= 32 || mutation.isPending}
									onClick={() =>
										setTargets((current) => [...current, newTarget()])
									}
								>
									<Plus size={15} />
									{t("erasure.addTarget")}
								</Button>
								<Button
									type="submit"
									size="sm"
									disabled={!status.structuralReady || mutation.isPending}
								>
									{t("configuration.stage")}
								</Button>
							</div>
						</form>

						<div className="flex flex-col gap-3 border-t border-hairline pt-4 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<div className="text-[13px] font-medium text-ink">
									{t("erasure.testTarget")}
								</div>
								<p className="mt-1 text-[12px] leading-4 text-mute">
									{t("erasure.testAllHint")}
								</p>
							</div>
							<Button
								type="button"
								variant="secondary"
								size="sm"
								disabled={!status.slots.next || mutation.isPending}
								onClick={() => void run("test", {})}
							>
								<ShieldCheck size={15} />
								{t("configuration.test")}
							</Button>
						</div>

						<div className="flex flex-wrap gap-2 border-t border-hairline pt-4">
							<ConfirmDialog
								trigger={
									<Button
										type="button"
										size="sm"
										disabled={
											!status.slots.next?.validated || mutation.isPending
										}
									>
										{t("configuration.activate")}
									</Button>
								}
								title={t("configuration.activate")}
								description={t("configuration.activateHint")}
								confirmationText="ACTIVATE"
								confirmationLabel={t("configuration.typeActivate")}
								onConfirm={() => run("activate", { confirmation: "ACTIVATE" })}
							/>
							<ConfirmDialog
								trigger={
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={!status.slots.previous || mutation.isPending}
									>
										{t("configuration.rollback")}
									</Button>
								}
								title={t("configuration.rollback")}
								description={t("configuration.rollbackHint")}
								confirmationText="ROLLBACK"
								confirmationLabel={t("configuration.typeRollback")}
								onConfirm={() => run("rollback", { confirmation: "ROLLBACK" })}
							/>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

function Version({ label, value }: { label: string; value: number | null }) {
	return (
		<div className="rounded-[var(--radius-sm)] border border-hairline bg-canvas-soft p-3">
			<div className="text-[11px] text-mute">{label}</div>
			<div className="mt-1 font-mono text-[13px] text-ink">
				{value === null ? "—" : `v${value}`}
			</div>
		</div>
	);
}
