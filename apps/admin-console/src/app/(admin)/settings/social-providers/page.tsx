"use client";

import { hasAdminControlPermission } from "@cinaauth/auth-web-contract";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AlertCircle,
	CheckCircle2,
	Globe,
	LogIn,
	Pencil,
	Plus,
	RefreshCw,
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
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminSession } from "@/hooks/use-admin-session";
import { fetchAdminJson, getAdminApiErrorMessage } from "@/lib/client-api";
import { useI18n } from "@/lib/i18n/i18n-context";

type SocialProviderSummary = {
	id: string;
	kind: "social" | "generic";
	configured: boolean;
	enabled: boolean;
	source: "database" | "environment" | "none";
	clientId: string | null;
	entry?: Record<string, unknown>;
};

type SocialProvidersData = {
	catalog: Array<{ id: string; displayName: string }>;
	providers: SocialProviderSummary[];
	settings: { socialProviderLimit: number; emailOtpLoginEnabled: boolean };
};

type StatusResponse = { ok: true; data: SocialProvidersData };

type SocialFormState = {
	clientId: string;
	clientSecret: string;
	enabled: boolean;
};

type GenericFormState = {
	providerId: string;
	clientId: string;
	clientSecret: string;
	discoveryUrl: string;
	authorizationUrl: string;
	tokenUrl: string;
	userInfoUrl: string;
	pkce: boolean;
};

const emptySocialForm = (provider: SocialProviderSummary): SocialFormState => ({
	clientId: provider.clientId ?? "",
	clientSecret: "",
	enabled: provider.enabled,
});

const emptyGenericForm = (): GenericFormState => ({
	providerId: "",
	clientId: "",
	clientSecret: "",
	discoveryUrl: "",
	authorizationUrl: "",
	tokenUrl: "",
	userInfoUrl: "",
	pkce: false,
});

const genericFormFromProvider = (
	provider: SocialProviderSummary,
): GenericFormState => {
	const entry = provider.entry ?? {};
	return {
		providerId: provider.id,
		clientId: provider.clientId ?? "",
		clientSecret: "",
		discoveryUrl:
			typeof entry.discoveryUrl === "string" ? entry.discoveryUrl : "",
		authorizationUrl:
			typeof entry.authorizationUrl === "string" ? entry.authorizationUrl : "",
		tokenUrl: typeof entry.tokenUrl === "string" ? entry.tokenUrl : "",
		userInfoUrl: typeof entry.userInfoUrl === "string" ? entry.userInfoUrl : "",
		pkce: entry.pkce === true,
	};
};

const genericUpsertBody = (form: GenericFormState) => {
	const body: Record<string, unknown> = {
		kind: "generic",
		providerId: form.providerId.trim(),
		clientId: form.clientId.trim(),
		enabled: true,
	};
	if (form.clientSecret.trim().length > 0) {
		body.clientSecret = form.clientSecret;
	}
	if (form.pkce) body.pkce = true;
	if (form.discoveryUrl.trim().length > 0) {
		body.discoveryUrl = form.discoveryUrl.trim();
	} else {
		body.authorizationUrl = form.authorizationUrl.trim();
		body.tokenUrl = form.tokenUrl.trim();
		body.userInfoUrl = form.userInfoUrl.trim();
	}
	return body;
};

export default function SocialProvidersPage() {
	const { t } = useI18n();
	const { data: session } = useAdminSession();
	const queryClient = useQueryClient();
	const canManage = hasAdminControlPermission(
		session?.role,
		"integration.social-provider.manage",
	);

	const statusQuery = useQuery({
		queryKey: ["social-providers"],
		queryFn: async () =>
			(await fetchAdminJson<StatusResponse>("/api/admin/social-providers"))
				.data,
		refetchOnWindowFocus: false,
	});
	const data = statusQuery.data;

	const mutation = useMutation({
		mutationFn: async ({
			path,
			method,
			body,
		}: {
			path: string;
			method: "PUT" | "DELETE";
			body: Record<string, unknown>;
		}) =>
			fetchAdminJson(path, {
				method,
				headers: { "content-type": "application/json" },
				body: JSON.stringify(body),
			}),
		onSuccess: async () => {
			toast.success(t("social.updated"));
			await queryClient.invalidateQueries({ queryKey: ["social-providers"] });
		},
		onError: (error) =>
			toast.error(
				getAdminApiErrorMessage(error, t("configuration.actionFailed")),
			),
	});

	const run = async (
		path: string,
		method: "PUT" | "DELETE",
		body: Record<string, unknown>,
	) => {
		try {
			await mutation.mutateAsync({ path, method, body });
			return true;
		} catch {
			return false;
		}
	};

	const [socialForms, setSocialForms] = useState<
		Record<string, SocialFormState>
	>({});
	const [editingProviderId, setEditingProviderId] = useState<string | null>(
		null,
	);
	const [genericDialogOpen, setGenericDialogOpen] = useState(false);
	const [genericForm, setGenericForm] = useState<GenericFormState>(
		emptyGenericForm(),
	);
	const [limit, setLimit] = useState<string | null>(null);

	if (statusQuery.isLoading) {
		return (
			<div className="max-w-6xl space-y-4">
				<PageHeader title={t("social.title")} />
				<Skeleton className="h-28 w-full rounded-[var(--radius-lg)]" />
				<div className="grid gap-4 lg:grid-cols-2">
					<Skeleton className="h-96 rounded-[var(--radius-lg)]" />
					<Skeleton className="h-96 rounded-[var(--radius-lg)]" />
				</div>
			</div>
		);
	}

	if (statusQuery.isError || !data) {
		return (
			<div className="max-w-4xl">
				<PageHeader title={t("social.title")} />
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

	const displayNames = new Map(
		data.catalog.map((entry) => [entry.id, entry.displayName]),
	);
	const socialProviders = data.providers.filter((p) => p.kind === "social");
	const genericProviders = data.providers.filter((p) => p.kind === "generic");
	const editingGeneric = genericProviders.find(
		(p) => p.id === editingProviderId,
	);
	const socialForm = (provider: SocialProviderSummary) =>
		socialForms[provider.id] ?? emptySocialForm(provider);
	const setSocialForm = (id: string, next: SocialFormState) =>
		setSocialForms((current) => ({ ...current, [id]: next }));
	const clearSocialClientSecret = (id: string, form: SocialFormState) =>
		setSocialForm(id, { ...form, clientSecret: "" });
	const limitValue = limit ?? String(data.settings.socialProviderLimit);
	const settingsDirty =
		Number.parseInt(limitValue, 10) !== data.settings.socialProviderLimit;
	const socialDirty = (provider: SocialProviderSummary) => {
		const form = socialForm(provider);
		return (
			form.clientId.trim() !== (provider.clientId ?? "") ||
			form.clientSecret.length > 0 ||
			form.enabled !== provider.enabled
		);
	};
	const closeGenericDialog = () => {
		setGenericDialogOpen(false);
		setEditingProviderId(null);
		setGenericForm(emptyGenericForm());
	};

	return (
		<div className="max-w-6xl space-y-6" aria-busy={mutation.isPending}>
			<PageHeader
				title={t("social.title")}
				description={t("social.description")}
			/>
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
					{t("configuration.readOnly")}
				</div>
			)}

			<Card>
				<CardHeader>
					<CardTitle>{t("social.settings")}</CardTitle>
					<CardDescription>{t("social.limitHint")}</CardDescription>
				</CardHeader>
				<CardContent>
					<form
						className="space-y-4"
						onSubmit={async (event) => {
							event.preventDefault();
							const parsed = Number.parseInt(limitValue, 10);
							if (!Number.isSafeInteger(parsed)) return;
							await run("/api/admin/sign-in-settings", "PUT", {
								socialProviderLimit: parsed,
								emailOtpLoginEnabled: data.settings.emailOtpLoginEnabled,
							});
						}}
					>
						<div className="flex flex-col gap-3 sm:flex-row sm:items-end">
							<div className="space-y-1.5">
								<Label htmlFor="social-limit">{t("social.limit")}</Label>
								<Input
									id="social-limit"
									type="number"
									autoComplete="off"
									required
									min={0}
									max={20}
									value={limitValue}
									disabled={!canManage || mutation.isPending}
									onChange={(event) => setLimit(event.target.value)}
									className="sm:w-40"
								/>
							</div>
							<Button
								type="submit"
								size="sm"
								disabled={!canManage || mutation.isPending || !settingsDirty}
							>
								{t("social.save")}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>{t("social.catalog")}</CardTitle>
					<CardDescription>{t("social.oneTapHint")}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3 pt-0">
					{socialProviders.map((provider) => {
						const form = socialForm(provider);
						const editing = editingProviderId === provider.id;
						const dirty = socialDirty(provider);
						return (
							<div
								key={provider.id}
								className="space-y-3 rounded-[var(--radius-sm)] border border-hairline p-3"
							>
								<div className="flex flex-wrap items-center justify-between gap-2">
									<div className="flex min-w-0 items-center gap-2">
										<LogIn size={16} aria-hidden className="shrink-0" />
										<span className="truncate text-[14px] text-ink">
											{displayNames.get(provider.id) ?? provider.id}
										</span>
										<Badge variant="muted">
											{t(`social.source.${provider.source}`)}
										</Badge>
									</div>
									<Badge
										variant={
											provider.configured && provider.enabled
												? "success"
												: provider.configured
													? "warning"
													: "muted"
										}
									>
										{provider.configured && provider.enabled ? (
											<>
												<CheckCircle2 size={13} />
												{t("social.enabled")}
											</>
										) : provider.configured ? (
											t("social.disabled")
										) : (
											t("social.source.none")
										)}
									</Badge>
								</div>
								{provider.clientId && (
									<p className="truncate font-mono text-[12px] text-mute">
										{provider.clientId}
									</p>
								)}
								{canManage && (
									<>
										{!editing && provider.configured && (
											<Button
												type="button"
												variant="outline"
												size="sm"
												disabled={mutation.isPending}
												onClick={() => setEditingProviderId(provider.id)}
											>
												<Pencil size={15} />
												{t("social.edit")}
											</Button>
										)}
										{editing && (
											<form
												className="grid gap-3 sm:grid-cols-2"
												onSubmit={async (event) => {
													event.preventDefault();
													const saved = await run(
														"/api/admin/social-providers",
														"PUT",
														{
															kind: "social",
															providerId: provider.id,
															clientId: form.clientId.trim(),
															clientSecret: form.clientSecret,
															enabled: form.enabled,
														},
													);
													if (saved) {
														clearSocialClientSecret(provider.id, form);
														setEditingProviderId(null);
													}
												}}
											>
												<div className="space-y-1.5">
													<Label htmlFor={`social-${provider.id}-client-id`}>
														{t("social.clientId")}
													</Label>
													<Input
														id={`social-${provider.id}-client-id`}
														autoComplete="off"
														required
														maxLength={512}
														value={form.clientId}
														onChange={(event) =>
															setSocialForm(provider.id, {
																...form,
																clientId: event.target.value,
															})
														}
													/>
												</div>
												<div className="space-y-1.5">
													<Label
														htmlFor={`social-${provider.id}-client-secret`}
													>
														{t("social.clientSecret")}
													</Label>
													<Input
														id={`social-${provider.id}-client-secret`}
														type="password"
														autoComplete="new-password"
														required
														minLength={1}
														maxLength={512}
														value={form.clientSecret}
														onChange={(event) =>
															setSocialForm(provider.id, {
																...form,
																clientSecret: event.target.value,
															})
														}
													/>
												</div>
												<label className="flex items-center gap-2 text-[13px] text-body sm:col-span-2">
													<Checkbox
														checked={form.enabled}
														onCheckedChange={(checked) =>
															setSocialForm(provider.id, {
																...form,
																enabled: checked === true,
															})
														}
														aria-label={t("social.enabled")}
													/>
													{t("social.enabled")}
												</label>
												<div className="flex flex-wrap items-center gap-2 sm:col-span-2">
													<Button
														type="submit"
														size="sm"
														disabled={mutation.isPending || !dirty}
													>
														{t("social.save")}
													</Button>
													<Button
														type="button"
														variant="outline"
														size="sm"
														disabled={mutation.isPending}
														onClick={() => {
															setSocialForms((current) => {
																const next = { ...current };
																delete next[provider.id];
																return next;
															});
															setEditingProviderId(null);
														}}
													>
														{t("social.cancel")}
													</Button>
												</div>
											</form>
										)}
										{!provider.configured && !editing && (
											<form
												className="grid gap-3 sm:grid-cols-2"
												onSubmit={async (event) => {
													event.preventDefault();
													const saved = await run(
														"/api/admin/social-providers",
														"PUT",
														{
															kind: "social",
															providerId: provider.id,
															clientId: form.clientId.trim(),
															clientSecret: form.clientSecret,
															enabled: form.enabled,
														},
													);
													if (saved) clearSocialClientSecret(provider.id, form);
												}}
											>
												<div className="space-y-1.5">
													<Label
														htmlFor={`social-${provider.id}-new-client-id`}
													>
														{t("social.clientId")}
													</Label>
													<Input
														id={`social-${provider.id}-new-client-id`}
														autoComplete="off"
														required
														maxLength={512}
														value={form.clientId}
														onChange={(event) =>
															setSocialForm(provider.id, {
																...form,
																clientId: event.target.value,
															})
														}
													/>
												</div>
												<div className="space-y-1.5">
													<Label
														htmlFor={`social-${provider.id}-new-client-secret`}
													>
														{t("social.clientSecret")}
													</Label>
													<Input
														id={`social-${provider.id}-new-client-secret`}
														type="password"
														autoComplete="new-password"
														required
														minLength={1}
														maxLength={512}
														value={form.clientSecret}
														onChange={(event) =>
															setSocialForm(provider.id, {
																...form,
																clientSecret: event.target.value,
															})
														}
													/>
												</div>
												<label className="flex items-center gap-2 text-[13px] text-body sm:col-span-2">
													<Checkbox
														checked={form.enabled}
														onCheckedChange={(checked) =>
															setSocialForm(provider.id, {
																...form,
																enabled: checked === true,
															})
														}
														aria-label={t("social.enabled")}
													/>
													{t("social.enabled")}
												</label>
												<div className="sm:col-span-2">
													<Button
														type="submit"
														size="sm"
														disabled={mutation.isPending}
													>
														{t("social.save")}
													</Button>
												</div>
											</form>
										)}
										{provider.source === "database" && !editing && (
											<div className="flex flex-wrap gap-2 border-t border-hairline pt-3">
												<ConfirmDialog
													trigger={
														<Button
															type="button"
															variant="outline"
															size="sm"
															disabled={mutation.isPending}
														>
															<Trash2 size={15} />
															{t("social.delete")}
														</Button>
													}
													title={t("social.delete")}
													description={
														provider.configured
															? t("social.deleteHint", {
																	provider: provider.id,
																})
															: provider.id
													}
													confirmationText={provider.id.toUpperCase()}
													confirmationLabel={provider.id.toUpperCase()}
													onConfirm={() =>
														run("/api/admin/social-providers", "DELETE", {
															providerId: provider.id,
														})
													}
												/>
											</div>
										)}
									</>
								)}
							</div>
						);
					})}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>{t("social.generic")}</CardTitle>
					<CardDescription>{t("social.genericHint")}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4 pt-0">
					{genericProviders.length === 0 && (
						<p className="text-[13px] text-mute">{t("social.source.none")}</p>
					)}
					{genericProviders.map((provider) => (
						<div
							key={provider.id}
							className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-hairline p-3"
						>
							<div className="min-w-0">
								<div className="flex items-center gap-2">
									<Globe size={15} aria-hidden className="shrink-0 text-mute" />
									<p className="truncate font-mono text-[13px] text-ink">
										{provider.id}
									</p>
									<Badge variant="muted">
										{t(`social.source.${provider.source}`)}
									</Badge>
								</div>
								{typeof provider.entry?.discoveryUrl === "string" && (
									<p className="mt-1 truncate text-[12px] text-mute">
										{provider.entry.discoveryUrl}
									</p>
								)}
							</div>
							{canManage && provider.source === "database" && (
								<div className="flex items-center gap-2">
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={mutation.isPending}
										onClick={() => {
											setGenericForm(genericFormFromProvider(provider));
											setEditingProviderId(provider.id);
											setGenericDialogOpen(true);
										}}
									>
										<Pencil size={15} />
										{t("social.edit")}
									</Button>
									<ConfirmDialog
										trigger={
											<Button
												type="button"
												variant="outline"
												size="sm"
												disabled={mutation.isPending}
											>
												<Trash2 size={15} />
												{t("social.delete")}
											</Button>
										}
										title={t("social.delete")}
										description={t("social.deleteHint", {
											provider: provider.id,
										})}
										confirmationText={provider.id.toUpperCase()}
										confirmationLabel={provider.id.toUpperCase()}
										onConfirm={() =>
											run("/api/admin/social-providers", "DELETE", {
												providerId: provider.id,
											})
										}
									/>
								</div>
							)}
						</div>
					))}

					{canManage && (
						<div>
							<Button
								type="button"
								variant="secondary"
								size="sm"
								disabled={mutation.isPending}
								onClick={() => {
									setGenericForm(emptyGenericForm());
									setEditingProviderId(null);
									setGenericDialogOpen(true);
								}}
							>
								<Plus size={15} />
								{t("social.addGeneric")}
							</Button>
						</div>
					)}
				</CardContent>
			</Card>

			<Dialog
				open={genericDialogOpen}
				onOpenChange={(open) => {
					if (!open) closeGenericDialog();
				}}
			>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>
							{editingGeneric
								? t("social.editGenericTitle", { provider: editingGeneric.id })
								: t("social.addGeneric")}
						</DialogTitle>
						<DialogDescription>{t("social.genericHint")}</DialogDescription>
					</DialogHeader>
					<form
						id="generic-provider-form"
						className="grid gap-3 sm:grid-cols-2"
						onSubmit={async (event) => {
							event.preventDefault();
							const saved = await run(
								"/api/admin/social-providers",
								"PUT",
								genericUpsertBody(genericForm),
							);
							if (saved) closeGenericDialog();
						}}
					>
						<div className="space-y-1.5">
							<Label htmlFor="generic-provider-id">
								{t("social.providerId")}
							</Label>
							<Input
								id="generic-provider-id"
								autoComplete="off"
								required
								pattern="[a-z0-9][a-z0-9._-]{0,62}"
								disabled={editingGeneric !== undefined}
								value={genericForm.providerId}
								onChange={(event) =>
									setGenericForm((current) => ({
										...current,
										providerId: event.target.value,
									}))
								}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="generic-client-id">{t("social.clientId")}</Label>
							<Input
								id="generic-client-id"
								autoComplete="off"
								required
								maxLength={512}
								value={genericForm.clientId}
								onChange={(event) =>
									setGenericForm((current) => ({
										...current,
										clientId: event.target.value,
									}))
								}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="generic-client-secret">
								{t("social.clientSecret")}
							</Label>
							<Input
								id="generic-client-secret"
								type="password"
								autoComplete="new-password"
								required={!genericForm.pkce}
								maxLength={512}
								value={genericForm.clientSecret}
								onChange={(event) =>
									setGenericForm((current) => ({
										...current,
										clientSecret: event.target.value,
									}))
								}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="generic-discovery-url">
								{t("social.discoveryUrl")}
							</Label>
							<Input
								id="generic-discovery-url"
								autoComplete="off"
								type="url"
								value={genericForm.discoveryUrl}
								onChange={(event) =>
									setGenericForm((current) => ({
										...current,
										discoveryUrl: event.target.value,
									}))
								}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="generic-authorization-url">
								authorizationUrl
							</Label>
							<Input
								id="generic-authorization-url"
								autoComplete="off"
								type="url"
								value={genericForm.authorizationUrl}
								onChange={(event) =>
									setGenericForm((current) => ({
										...current,
										authorizationUrl: event.target.value,
									}))
								}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="generic-token-url">tokenUrl</Label>
							<Input
								id="generic-token-url"
								autoComplete="off"
								type="url"
								value={genericForm.tokenUrl}
								onChange={(event) =>
									setGenericForm((current) => ({
										...current,
										tokenUrl: event.target.value,
									}))
								}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="generic-user-info-url">userInfoUrl</Label>
							<Input
								id="generic-user-info-url"
								autoComplete="off"
								type="url"
								value={genericForm.userInfoUrl}
								onChange={(event) =>
									setGenericForm((current) => ({
										...current,
										userInfoUrl: event.target.value,
									}))
								}
							/>
						</div>
						<label className="flex items-center gap-2 self-end text-[13px] text-body">
							<Checkbox
								checked={genericForm.pkce}
								onCheckedChange={(checked) =>
									setGenericForm((current) => ({
										...current,
										pkce: checked === true,
									}))
								}
								aria-label={t("social.pkce")}
							/>
							{t("social.pkce")}
						</label>
					</form>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={closeGenericDialog}
							disabled={mutation.isPending}
						>
							{t("social.cancel")}
						</Button>
						<Button
							type="submit"
							form="generic-provider-form"
							size="sm"
							disabled={mutation.isPending}
						>
							{editingGeneric ? t("social.save") : t("social.addGeneric")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
