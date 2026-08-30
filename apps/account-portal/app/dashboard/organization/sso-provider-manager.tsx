"use client";

import {
	AlertTriangle,
	CheckCircle2,
	Copy,
	Loader2,
	Network,
	Pencil,
	Plus,
	Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useDashboardI18n } from "@/components/dashboard/use-dashboard-i18n";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
	getSSODomainVerificationRecords,
	useOIDCSSOProviderRegisterMutation,
	useOIDCSSOProviderUpdateMutation,
	useSAMLSSOProviderRegisterMutation,
	useSAMLSSOProviderUpdateMutation,
	useSSODomainVerificationMutation,
	useSSODomainVerificationRequestMutation,
	useSSOProviderDeleteMutation,
} from "@/data/organization/enterprise-connection-mutations";
import type { SCIMProviderConnection, SSOProviderSummary } from "@/lib/auth";
import type { DashboardMessages } from "@/lib/dashboard-i18n";
import { formatDashboardMessage } from "@/lib/dashboard-i18n";
import type {
	ProviderDraft,
	ProviderEditorMode,
	SAMLConfigurationMode,
} from "@/lib/sso-provider-console";
import {
	createEditSSOProviderDraft,
	createEmptySSOProviderDraft,
	getOIDCCallbackURL,
	getSAMLCallbackURL,
	getSAMLMetadataURL,
	getSSOProviderDraftError,
	parseSSOScopes,
} from "@/lib/sso-provider-console";

type DomainProofNotice = {
	providerId: string;
	records: Array<{ name: string; value: string }>;
};

type SSOProviderManagerProps = {
	organizationId: string;
	recentAuthentication: boolean;
	authoritativeOrganizationData: boolean;
	providers: SSOProviderSummary[];
	scimProviders: SCIMProviderConnection[];
	unavailable: boolean;
};

const localizeProviderError = (
	error: string | null,
	messages: DashboardMessages,
) => {
	if (!error) return error;
	const localizedErrors: Record<string, string> = {
		"Enter a stable provider ID.": messages.providerIdRequired,
		"Provider ID must be 64 characters or less.": messages.providerIdTooLong,
		"Provider ID may contain lowercase letters, numbers, hyphens, and underscores.":
			messages.providerIdCharacters,
		"That provider ID is already in use.": messages.providerIdInUse,
		"Issuer must be an HTTPS URL.": messages.issuerHttpsRequired,
		"Enter one or more email domains separated by commas, without paths or schemes.":
			messages.emailDomainsRequired,
		"OIDC client ID is required.": messages.oidcClientIdRequired,
		"OIDC client secret is required.": messages.oidcClientSecretRequired,
		"Enter both replacement client ID and client secret, or leave both blank.":
			messages.oidcReplacementCredentials,
		"OIDC scopes must include openid.": messages.oidcOpenidRequired,
		"All configured OIDC endpoints must use HTTPS.":
			messages.oidcEndpointsHttps,
		"Manual OIDC configuration requires authorization, token, and JWKS endpoints.":
			messages.oidcManualEndpointsRequired,
		"Paste the IdP metadata XML.": messages.idpMetadataRequired,
		"IdP metadata must not exceed 100 KiB.": messages.idpMetadataTooLarge,
		"SAML entry point must be an HTTPS URL.": messages.samlEntryPointHttps,
		"Paste the IdP signing certificate.": messages.idpCertificateRequired,
		"IdP-initiated fallback must be a same-origin path or HTTPS URL.":
			messages.idpFallbackInvalid,
	};
	return localizedErrors[error] ?? error;
};

const copyValue = async (
	value: string,
	label: string,
	messages: DashboardMessages,
) => {
	try {
		await navigator.clipboard.writeText(value);
		toast.success(formatDashboardMessage(messages.valueCopied, { label }));
	} catch {
		toast.error(formatDashboardMessage(messages.unableCopyValue, { label }));
	}
};

function CopyableEndpoint({ label, value }: { label: string; value: string }) {
	const { messages } = useDashboardI18n();
	return (
		<div className="space-y-2 rounded-lg border p-3">
			<div className="flex items-center justify-between gap-3">
				<Label>{label}</Label>
				<Button
					type="button"
					size="sm"
					variant="ghost"
					onClick={() => copyValue(value, label, messages)}
				>
					<Copy className="h-4 w-4" /> {messages.copy}
				</Button>
			</div>
			<code className="block break-all rounded bg-muted p-2 text-xs">
				{value}
			</code>
		</div>
	);
}

function ProviderEditorFields({
	draft,
	mode,
	onChange,
}: {
	draft: ProviderDraft;
	mode: ProviderEditorMode;
	onChange: (draft: ProviderDraft) => void;
}) {
	const { messages } = useDashboardI18n();
	const providerId = draft.providerId.trim().toLowerCase() || "provider-id";
	return (
		<div className="grid gap-5 py-2">
			{mode === "create" ? (
				<div className="grid gap-2">
					<Label>{messages.protocol}</Label>
					<Select
						value={draft.type}
						onValueChange={(type: "oidc" | "saml") =>
							onChange({
								...createEmptySSOProviderDraft(),
								type,
								providerId: draft.providerId,
								issuer: draft.issuer,
								domain: draft.domain,
							})
						}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="oidc">OpenID Connect (OIDC)</SelectItem>
							<SelectItem value="saml">SAML 2.0</SelectItem>
						</SelectContent>
					</Select>
				</div>
			) : null}

			<div className="grid gap-4 sm:grid-cols-2">
				<div className="grid gap-2">
					<Label htmlFor="sso-provider-id">{messages.providerId}</Label>
					<Input
						id="sso-provider-id"
						value={draft.providerId}
						disabled={mode === "edit"}
						maxLength={64}
						placeholder="acme-sso"
						onChange={(event) =>
							onChange({ ...draft, providerId: event.target.value })
						}
					/>
				</div>
				<div className="grid gap-2">
					<Label htmlFor="sso-domains">{messages.emailDomains}</Label>
					<Input
						id="sso-domains"
						value={draft.domain}
						placeholder={messages.emailDomainsPlaceholder}
						onChange={(event) =>
							onChange({ ...draft, domain: event.target.value })
						}
					/>
				</div>
			</div>
			<div className="grid gap-2">
				<Label htmlFor="sso-issuer">
					{draft.type === "oidc"
						? messages.oidcIssuerUrl
						: messages.idpEntityIdUrl}
				</Label>
				<Input
					id="sso-issuer"
					type="url"
					value={draft.issuer}
					placeholder="https://idp.acme.example"
					onChange={(event) =>
						onChange({ ...draft, issuer: event.target.value })
					}
				/>
			</div>

			{draft.type === "oidc" ? (
				<>
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="grid gap-2">
							<Label htmlFor="oidc-client-id">
								{mode === "create"
									? messages.clientId
									: messages.replacementClientId}
							</Label>
							<Input
								id="oidc-client-id"
								autoComplete="off"
								value={draft.clientId}
								placeholder={
									mode === "edit" ? messages.leaveBlankToKeep : "client-id"
								}
								onChange={(event) =>
									onChange({ ...draft, clientId: event.target.value })
								}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="oidc-client-secret">
								{mode === "create"
									? messages.clientSecret
									: messages.replacementClientSecret}
							</Label>
							<Input
								id="oidc-client-secret"
								type="password"
								autoComplete="new-password"
								value={draft.clientSecret}
								placeholder={
									mode === "edit" ? messages.leaveBlankToKeep : "secret"
								}
								onChange={(event) =>
									onChange({ ...draft, clientSecret: event.target.value })
								}
							/>
						</div>
					</div>
					{mode === "edit" ? (
						<p className="text-xs text-muted-foreground">
							{messages.storedCredentialsDescription}
						</p>
					) : null}
					<div className="grid gap-2">
						<Label htmlFor="oidc-discovery">{messages.discoveryEndpoint}</Label>
						<Input
							id="oidc-discovery"
							type="url"
							value={draft.discoveryEndpoint}
							placeholder={`${draft.issuer || "https://idp.example"}/.well-known/openid-configuration`}
							onChange={(event) =>
								onChange({ ...draft, discoveryEndpoint: event.target.value })
							}
						/>
						<p className="text-xs text-muted-foreground">
							{messages.discoveryEndpointHint}
						</p>
					</div>
					<label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
						<Checkbox
							checked={draft.manualOIDC}
							onCheckedChange={(checked) =>
								onChange({ ...draft, manualOIDC: checked === true })
							}
						/>
						<span>
							<span className="font-medium">
								{messages.configureEndpointsManually}
							</span>
							<span className="block text-xs text-muted-foreground">
								{messages.configureEndpointsManuallyHint}
							</span>
						</span>
					</label>
					{draft.manualOIDC ? (
						<div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
							{[
								[messages.authorizationEndpoint, "authorizationEndpoint"],
								[messages.tokenEndpoint, "tokenEndpoint"],
								[messages.jwksEndpoint, "jwksEndpoint"],
								[messages.userInfoEndpointOptional, "userInfoEndpoint"],
							].map(([label, field]) => (
								<div key={field} className="grid gap-2">
									<Label htmlFor={`oidc-${field}`}>{label}</Label>
									<Input
										id={`oidc-${field}`}
										type="url"
										value={draft[field as keyof ProviderDraft] as string}
										onChange={(event) =>
											onChange({ ...draft, [field]: event.target.value })
										}
									/>
								</div>
							))}
						</div>
					) : null}
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="grid gap-2">
							<Label htmlFor="oidc-scopes">{messages.scopes}</Label>
							<Input
								id="oidc-scopes"
								value={draft.scopes}
								onChange={(event) =>
									onChange({ ...draft, scopes: event.target.value })
								}
							/>
						</div>
						<div className="grid gap-2">
							<Label>{messages.tokenEndpointAuthentication}</Label>
							<Select
								value={draft.tokenEndpointAuthentication}
								onValueChange={(
									tokenEndpointAuthentication:
										| "client_secret_basic"
										| "client_secret_post",
								) => onChange({ ...draft, tokenEndpointAuthentication })}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="client_secret_basic">
										client_secret_basic
									</SelectItem>
									<SelectItem value="client_secret_post">
										client_secret_post
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
					<label className="flex items-center gap-3 text-sm">
						<Checkbox
							checked={draft.pkce}
							onCheckedChange={(checked) =>
								onChange({ ...draft, pkce: checked === true })
							}
						/>
						{messages.usePkce}
					</label>
					<CopyableEndpoint
						label={messages.oidcRedirectUri}
						value={getOIDCCallbackURL(providerId)}
					/>
				</>
			) : (
				<>
					<div className="grid gap-2">
						<Label>{messages.idpConfigurationSource}</Label>
						<Select
							value={draft.samlMode}
							onValueChange={(samlMode: SAMLConfigurationMode) =>
								onChange({ ...draft, samlMode })
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{mode === "edit" ? (
									<SelectItem value="keep">
										{messages.keepStoredIdpMaterial}
									</SelectItem>
								) : null}
								<SelectItem value="metadata">
									{messages.idpMetadataXml}
								</SelectItem>
								<SelectItem value="manual">
									{messages.entryPointAndCertificate}
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
					{draft.samlMode === "metadata" ? (
						<div className="grid gap-2">
							<Label htmlFor="saml-metadata">{messages.idpMetadataXml}</Label>
							<Textarea
								id="saml-metadata"
								className="min-h-44 font-mono text-xs"
								value={draft.idpMetadataXml}
								onChange={(event) =>
									onChange({ ...draft, idpMetadataXml: event.target.value })
								}
							/>
							<p className="text-xs text-muted-foreground">
								{messages.maximum100Kib}
							</p>
						</div>
					) : null}
					{draft.samlMode === "manual" ? (
						<>
							<div className="grid gap-2">
								<Label htmlFor="saml-entry-point">
									{messages.idpSsoEntryPoint}
								</Label>
								<Input
									id="saml-entry-point"
									type="url"
									value={draft.entryPoint}
									onChange={(event) =>
										onChange({ ...draft, entryPoint: event.target.value })
									}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="saml-certificate">
									{mode === "create"
										? messages.idpSigningCertificate
										: messages.replacementIdpSigningCertificate}
								</Label>
								<Textarea
									id="saml-certificate"
									className="min-h-36 font-mono text-xs"
									value={draft.certificate}
									onChange={(event) =>
										onChange({ ...draft, certificate: event.target.value })
									}
								/>
							</div>
						</>
					) : null}
					{draft.samlMode === "keep" ? (
						<p className="text-xs text-muted-foreground">
							{messages.storedIdpMaterialDescription}
						</p>
					) : null}
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="grid gap-2">
							<Label htmlFor="saml-audience">{messages.audienceOptional}</Label>
							<Input
								id="saml-audience"
								value={draft.audience}
								onChange={(event) =>
									onChange({ ...draft, audience: event.target.value })
								}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="saml-idp-fallback">
								{messages.idpInitiatedFallback}
							</Label>
							<Input
								id="saml-idp-fallback"
								value={draft.idpInitiatedCallbackUrl}
								onChange={(event) =>
									onChange({
										...draft,
										idpInitiatedCallbackUrl: event.target.value,
									})
								}
							/>
						</div>
					</div>
					<label className="flex items-center gap-3 text-sm">
						<Checkbox
							checked={draft.wantAssertionsSigned}
							onCheckedChange={(checked) =>
								onChange({
									...draft,
									wantAssertionsSigned: checked === true,
								})
							}
						/>
						{messages.requireSignedSamlAssertions}
					</label>
					<CopyableEndpoint
						label={messages.acsUrl}
						value={getSAMLCallbackURL(providerId)}
					/>
					<CopyableEndpoint
						label={messages.serviceProviderMetadataUrl}
						value={getSAMLMetadataURL(providerId)}
					/>
				</>
			)}
		</div>
	);
}

export function SSOProviderManager({
	organizationId,
	recentAuthentication,
	authoritativeOrganizationData,
	providers,
	scimProviders,
	unavailable,
}: SSOProviderManagerProps) {
	const { messages } = useDashboardI18n();
	const router = useRouter();
	const [editorMode, setEditorMode] = useState<ProviderEditorMode | null>(null);
	const [draft, setDraft] = useState<ProviderDraft>(
		createEmptySSOProviderDraft,
	);
	const [domainProof, setDomainProof] = useState<DomainProofNotice | null>(
		null,
	);
	const [deleteProvider, setDeleteProvider] =
		useState<SSOProviderSummary | null>(null);
	const [deleteConfirmation, setDeleteConfirmation] = useState("");
	const requestDomainMutation = useSSODomainVerificationRequestMutation();
	const verifyDomainMutation = useSSODomainVerificationMutation();
	const registerOIDCMutation = useOIDCSSOProviderRegisterMutation();
	const updateOIDCMutation = useOIDCSSOProviderUpdateMutation();
	const registerSAMLMutation = useSAMLSSOProviderRegisterMutation();
	const updateSAMLMutation = useSAMLSSOProviderUpdateMutation();
	const deleteMutation = useSSOProviderDeleteMutation();
	const writeActionsAvailable =
		recentAuthentication && authoritativeOrganizationData && !unavailable;
	const providerError = editorMode
		? localizeProviderError(
				getSSOProviderDraftError({
					draft,
					mode: editorMode,
					providers,
					scimProviders,
				}),
				messages,
			)
		: null;
	const editorPending =
		registerOIDCMutation.isPending ||
		updateOIDCMutation.isPending ||
		registerSAMLMutation.isPending ||
		updateSAMLMutation.isPending;

	const closeEditor = () => {
		setEditorMode(null);
		setDraft(createEmptySSOProviderDraft());
	};

	const openCreate = () => {
		setDraft(createEmptySSOProviderDraft());
		setEditorMode("create");
	};

	const openEdit = (provider: SSOProviderSummary) => {
		setDraft(createEditSSOProviderDraft(provider));
		setEditorMode("edit");
	};

	const submitProvider = () => {
		if (!editorMode || providerError) return;
		const providerId = draft.providerId.trim().toLowerCase();
		const common = {
			providerId,
			issuer: draft.issuer.trim(),
			domain: draft.domain
				.split(",")
				.map((domain) => domain.trim().toLowerCase())
				.filter(Boolean)
				.join(","),
		};
		const onSuccess = () => {
			closeEditor();
			toast.success(
				editorMode === "create"
					? messages.ssoProviderRegistered
					: messages.ssoProviderUpdated,
			);
			router.refresh();
		};

		if (draft.type === "oidc") {
			const oidc = {
				...common,
				clientId: draft.clientId.trim(),
				clientSecret: draft.clientSecret,
				discoveryEndpoint: draft.discoveryEndpoint.trim(),
				authorizationEndpoint: draft.manualOIDC
					? draft.authorizationEndpoint.trim()
					: "",
				tokenEndpoint: draft.manualOIDC ? draft.tokenEndpoint.trim() : "",
				jwksEndpoint: draft.manualOIDC ? draft.jwksEndpoint.trim() : "",
				userInfoEndpoint: draft.manualOIDC ? draft.userInfoEndpoint.trim() : "",
				scopes: parseSSOScopes(draft.scopes),
				pkce: draft.pkce,
				tokenEndpointAuthentication: draft.tokenEndpointAuthentication,
			};
			if (editorMode === "create") {
				registerOIDCMutation.mutate(
					{
						...oidc,
						organizationId,
						skipDiscovery: draft.manualOIDC,
					},
					{ onSuccess },
				);
			} else {
				updateOIDCMutation.mutate(oidc, { onSuccess });
			}
			return;
		}

		const saml = {
			...common,
			entryPoint: draft.samlMode === "manual" ? draft.entryPoint.trim() : "",
			certificate: draft.samlMode === "manual" ? draft.certificate.trim() : "",
			idpMetadataXml:
				draft.samlMode === "metadata" ? draft.idpMetadataXml.trim() : "",
			callbackUrl: getSAMLCallbackURL(providerId),
			idpInitiatedCallbackUrl: draft.idpInitiatedCallbackUrl.trim(),
			audience: draft.audience.trim(),
			wantAssertionsSigned: draft.wantAssertionsSigned,
			authnRequestsSigned: draft.authnRequestsSigned,
		};
		if (editorMode === "create") {
			registerSAMLMutation.mutate({ ...saml, organizationId }, { onSuccess });
		} else {
			updateSAMLMutation.mutate(saml, { onSuccess });
		}
	};

	const requestDomainProof = (provider: SSOProviderSummary) => {
		requestDomainMutation.mutate(provider.providerId, {
			onSuccess: (token) => {
				const records = getSSODomainVerificationRecords(
					provider.providerId,
					provider.domain,
					token,
				);
				if (records.length === 0) {
					toast.error(messages.domainDnsRecordFailed);
					return;
				}
				setDomainProof({ providerId: provider.providerId, records });
				toast.success(messages.dnsInstructionsReady);
			},
		});
	};

	const verifyDomain = (providerId: string) => {
		verifyDomainMutation.mutate(providerId, {
			onSuccess: () => {
				setDomainProof(null);
				toast.success(messages.ssoDomainVerified);
				router.refresh();
			},
		});
	};

	const confirmDelete = () => {
		if (!deleteProvider || deleteConfirmation !== deleteProvider.providerId) {
			return;
		}
		deleteMutation.mutate(deleteProvider.providerId, {
			onSuccess: () => {
				setDeleteProvider(null);
				setDeleteConfirmation("");
				toast.success(messages.ssoProviderDeleted);
				router.refresh();
			},
		});
	};

	return (
		<>
			<section className="space-y-3" aria-labelledby="sso-connections-title">
				<div className="flex items-center justify-between gap-3">
					<h3
						id="sso-connections-title"
						className="flex items-center gap-2 text-sm font-semibold"
					>
						<Network className="h-4 w-4 text-muted-foreground" /> SSO
					</h3>
					<div className="flex items-center gap-2">
						<Badge variant="outline">{providers.length}</Badge>
						<Button
							size="sm"
							variant="outline"
							onClick={openCreate}
							disabled={!writeActionsAvailable}
						>
							<Plus className="h-4 w-4" /> {messages.newProvider}
						</Button>
					</div>
				</div>
				{unavailable ? (
					<Alert>
						<AlertTriangle className="h-4 w-4" />
						<AlertTitle>{messages.ssoInventoryUnavailable}</AlertTitle>
						<AlertDescription>
							{messages.ssoInventoryUnavailableDescription}
						</AlertDescription>
					</Alert>
				) : providers.length > 0 ? (
					<div className="space-y-3">
						{providers.map((provider) => (
							<div key={provider.providerId} className="rounded-lg border p-4">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<p className="text-sm font-medium">{provider.providerId}</p>
									<div className="flex gap-2">
										<Badge variant="secondary">
											{provider.type.toUpperCase()}
										</Badge>
										<Badge
											variant={
												provider.domainVerified ? "secondary" : "outline"
											}
										>
											{provider.domainVerified
												? messages.domainVerified
												: messages.verificationPending}
										</Badge>
									</div>
								</div>
								<p className="mt-2 text-xs text-muted-foreground">
									{provider.domain}
								</p>
								<p className="mt-1 break-all text-xs text-muted-foreground">
									{provider.issuer}
								</p>
								{provider.type === "oidc" && provider.oidcConfig ? (
									<p className="mt-2 text-xs text-muted-foreground">
										{formatDashboardMessage(messages.clientIdentifier, {
											id:
												provider.oidcConfig.clientIdLastFour ?? messages.masked,
										})}
									</p>
								) : null}
								{provider.type === "saml" ? (
									<a
										href={provider.spMetadataUrl}
										target="_blank"
										rel="noreferrer"
										className="mt-2 block break-all text-xs text-primary underline-offset-4 hover:underline"
									>
										{messages.serviceProviderMetadata}
									</a>
								) : null}
								<div className="mt-4 flex flex-wrap gap-2">
									<Button
										size="sm"
										variant="outline"
										onClick={() => openEdit(provider)}
										disabled={!writeActionsAvailable}
									>
										<Pencil className="h-4 w-4" /> {messages.edit}
									</Button>
									{!provider.domainVerified ? (
										<>
											<Button
												size="sm"
												variant="outline"
												onClick={() => requestDomainProof(provider)}
												disabled={
													!writeActionsAvailable ||
													requestDomainMutation.isPending
												}
											>
												{requestDomainMutation.isPending ? (
													<Loader2 className="h-4 w-4 animate-spin" />
												) : (
													<Network className="h-4 w-4" />
												)}
												{messages.configureDns}
											</Button>
											<Button
												size="sm"
												onClick={() => verifyDomain(provider.providerId)}
												disabled={
													!writeActionsAvailable ||
													verifyDomainMutation.isPending
												}
											>
												{verifyDomainMutation.isPending ? (
													<Loader2 className="h-4 w-4 animate-spin" />
												) : (
													<CheckCircle2 className="h-4 w-4" />
												)}
												{messages.verifyNow}
											</Button>
										</>
									) : null}
									<Button
										size="sm"
										variant="destructive"
										onClick={() => setDeleteProvider(provider)}
										disabled={!writeActionsAvailable}
									>
										<Trash2 className="h-4 w-4" /> {messages.delete}
									</Button>
								</div>
							</div>
						))}
					</div>
				) : (
					<p className="text-sm text-muted-foreground">
						{messages.noSsoProvider}
					</p>
				)}
			</section>

			<Dialog
				open={editorMode !== null}
				onOpenChange={(open) => {
					if (!open) closeEditor();
				}}
			>
				<DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
					<DialogHeader>
						<DialogTitle>
							{editorMode === "create"
								? messages.registerSsoProvider
								: messages.editSsoProvider}
						</DialogTitle>
						<DialogDescription>
							{messages.ssoConfigurationDescription}
						</DialogDescription>
					</DialogHeader>
					{editorMode ? (
						<ProviderEditorFields
							draft={draft}
							mode={editorMode}
							onChange={setDraft}
						/>
					) : null}
					{providerError ? (
						<Alert variant="destructive">
							<AlertTriangle className="h-4 w-4" />
							<AlertTitle>{messages.reviewConfiguration}</AlertTitle>
							<AlertDescription>{providerError}</AlertDescription>
						</Alert>
					) : null}
					{editorMode === "edit" ? (
						<p className="text-xs text-muted-foreground">
							{messages.ssoEditWarning}
						</p>
					) : null}
					<DialogFooter>
						<Button type="button" variant="outline" onClick={closeEditor}>
							{messages.cancel}
						</Button>
						<Button
							type="button"
							onClick={submitProvider}
							disabled={providerError !== null || editorPending}
						>
							{editorPending ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : editorMode === "create" ? (
								<Plus className="h-4 w-4" />
							) : (
								<Pencil className="h-4 w-4" />
							)}
							{editorMode === "create"
								? messages.registerProvider
								: messages.saveChanges}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={domainProof !== null}
				onOpenChange={(open) => {
					if (!open) setDomainProof(null);
				}}
			>
				<DialogContent className="sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle>{messages.publishSsoVerification}</DialogTitle>
						<DialogDescription>
							{messages.publishSsoVerificationDescription}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						{domainProof?.records.map((record) => (
							<div
								key={record.name}
								className="space-y-3 rounded-lg border p-4"
							>
								<CopyableEndpoint
									label={messages.txtRecordName}
									value={record.name}
								/>
								<CopyableEndpoint
									label={messages.txtRecordValue}
									value={record.value}
								/>
							</div>
						))}
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDomainProof(null)}>
							{messages.close}
						</Button>
						<Button
							onClick={() => {
								if (domainProof) verifyDomain(domainProof.providerId);
							}}
							disabled={verifyDomainMutation.isPending}
						>
							{verifyDomainMutation.isPending ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<CheckCircle2 className="h-4 w-4" />
							)}
							{messages.verifyNow}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<AlertDialog
				open={deleteProvider !== null}
				onOpenChange={(open) => {
					if (!open) {
						setDeleteProvider(null);
						setDeleteConfirmation("");
					}
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{messages.deleteSsoProvider}</AlertDialogTitle>
						<AlertDialogDescription>
							{messages.deleteSsoProviderDescription}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<div className="grid gap-2">
						<Label htmlFor="delete-sso-provider-confirmation">
							{deleteProvider?.providerId}
						</Label>
						<Input
							id="delete-sso-provider-confirmation"
							autoComplete="off"
							value={deleteConfirmation}
							onChange={(event) => setDeleteConfirmation(event.target.value)}
						/>
					</div>
					<AlertDialogFooter>
						<AlertDialogCancel>{messages.keepProvider}</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={confirmDelete}
							disabled={
								deleteConfirmation !== deleteProvider?.providerId ||
								deleteMutation.isPending
							}
						>
							{deleteMutation.isPending ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Trash2 className="h-4 w-4" />
							)}
							{messages.deleteProvider}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
