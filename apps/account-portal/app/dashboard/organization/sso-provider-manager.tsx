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

const copyValue = async (value: string, label: string) => {
	try {
		await navigator.clipboard.writeText(value);
		toast.success(`${label} copied`);
	} catch {
		toast.error(`Unable to copy ${label.toLowerCase()}`);
	}
};

function CopyableEndpoint({ label, value }: { label: string; value: string }) {
	return (
		<div className="space-y-2 rounded-lg border p-3">
			<div className="flex items-center justify-between gap-3">
				<Label>{label}</Label>
				<Button
					type="button"
					size="sm"
					variant="ghost"
					onClick={() => copyValue(value, label)}
				>
					<Copy className="h-4 w-4" /> Copy
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
	const providerId = draft.providerId.trim().toLowerCase() || "provider-id";
	return (
		<div className="grid gap-5 py-2">
			{mode === "create" ? (
				<div className="grid gap-2">
					<Label>Protocol</Label>
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
					<Label htmlFor="sso-provider-id">Provider ID</Label>
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
					<Label htmlFor="sso-domains">Email domains</Label>
					<Input
						id="sso-domains"
						value={draft.domain}
						placeholder="acme.example, subsidiary.example"
						onChange={(event) =>
							onChange({ ...draft, domain: event.target.value })
						}
					/>
				</div>
			</div>
			<div className="grid gap-2">
				<Label htmlFor="sso-issuer">
					{draft.type === "oidc" ? "OIDC issuer URL" : "IdP entity ID URL"}
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
								{mode === "create" ? "Client ID" : "Replacement client ID"}
							</Label>
							<Input
								id="oidc-client-id"
								autoComplete="off"
								value={draft.clientId}
								placeholder={
									mode === "edit" ? "Leave blank to keep" : "client-id"
								}
								onChange={(event) =>
									onChange({ ...draft, clientId: event.target.value })
								}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="oidc-client-secret">
								{mode === "create"
									? "Client secret"
									: "Replacement client secret"}
							</Label>
							<Input
								id="oidc-client-secret"
								type="password"
								autoComplete="new-password"
								value={draft.clientSecret}
								placeholder={mode === "edit" ? "Leave blank to keep" : "secret"}
								onChange={(event) =>
									onChange({ ...draft, clientSecret: event.target.value })
								}
							/>
						</div>
					</div>
					{mode === "edit" ? (
						<p className="text-xs text-muted-foreground">
							Stored credentials are never loaded into this form. Enter both
							fields only to rotate them.
						</p>
					) : null}
					<div className="grid gap-2">
						<Label htmlFor="oidc-discovery">Discovery endpoint</Label>
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
							Leave blank to use the issuer&apos;s standard discovery URL.
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
							<span className="font-medium">Configure endpoints manually</span>
							<span className="block text-xs text-muted-foreground">
								Use only when the IdP does not publish OIDC discovery.
							</span>
						</span>
					</label>
					{draft.manualOIDC ? (
						<div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
							{[
								["Authorization endpoint", "authorizationEndpoint"],
								["Token endpoint", "tokenEndpoint"],
								["JWKS endpoint", "jwksEndpoint"],
								["UserInfo endpoint (optional)", "userInfoEndpoint"],
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
							<Label htmlFor="oidc-scopes">Scopes</Label>
							<Input
								id="oidc-scopes"
								value={draft.scopes}
								onChange={(event) =>
									onChange({ ...draft, scopes: event.target.value })
								}
							/>
						</div>
						<div className="grid gap-2">
							<Label>Token endpoint authentication</Label>
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
						Use PKCE for authorization requests
					</label>
					<CopyableEndpoint
						label="OIDC redirect URI"
						value={getOIDCCallbackURL(providerId)}
					/>
				</>
			) : (
				<>
					<div className="grid gap-2">
						<Label>IdP configuration source</Label>
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
									<SelectItem value="keep">Keep stored IdP material</SelectItem>
								) : null}
								<SelectItem value="metadata">IdP metadata XML</SelectItem>
								<SelectItem value="manual">
									Entry point and certificate
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
					{draft.samlMode === "metadata" ? (
						<div className="grid gap-2">
							<Label htmlFor="saml-metadata">IdP metadata XML</Label>
							<Textarea
								id="saml-metadata"
								className="min-h-44 font-mono text-xs"
								value={draft.idpMetadataXml}
								onChange={(event) =>
									onChange({ ...draft, idpMetadataXml: event.target.value })
								}
							/>
							<p className="text-xs text-muted-foreground">Maximum 100 KiB.</p>
						</div>
					) : null}
					{draft.samlMode === "manual" ? (
						<>
							<div className="grid gap-2">
								<Label htmlFor="saml-entry-point">IdP SSO entry point</Label>
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
										? "IdP signing certificate"
										: "Replacement IdP signing certificate"}
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
							Stored metadata and certificate material are not returned to the
							browser and will remain unchanged.
						</p>
					) : null}
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="grid gap-2">
							<Label htmlFor="saml-audience">Audience (optional)</Label>
							<Input
								id="saml-audience"
								value={draft.audience}
								onChange={(event) =>
									onChange({ ...draft, audience: event.target.value })
								}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="saml-idp-fallback">IdP-initiated fallback</Label>
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
						Require signed SAML assertions
					</label>
					<CopyableEndpoint
						label="Assertion Consumer Service (ACS) URL"
						value={getSAMLCallbackURL(providerId)}
					/>
					<CopyableEndpoint
						label="Service Provider metadata URL"
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
		? getSSOProviderDraftError({
				draft,
				mode: editorMode,
				providers,
				scimProviders,
			})
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
					? "SSO provider registered"
					: "SSO provider updated",
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
					toast.error("Provider domains cannot be converted to DNS records");
					return;
				}
				setDomainProof({ providerId: provider.providerId, records });
				toast.success("DNS verification instructions are ready");
			},
		});
	};

	const verifyDomain = (providerId: string) => {
		verifyDomainMutation.mutate(providerId, {
			onSuccess: () => {
				setDomainProof(null);
				toast.success("SSO domain verified");
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
				toast.success("SSO provider deleted");
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
							<Plus className="h-4 w-4" /> New provider
						</Button>
					</div>
				</div>
				{unavailable ? (
					<Alert>
						<AlertTriangle className="h-4 w-4" />
						<AlertTitle>SSO inventory unavailable</AlertTitle>
						<AlertDescription>
							No cached provider data is shown and changes are disabled.
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
												? "Domain verified"
												: "Verification pending"}
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
										Client {provider.oidcConfig.clientIdLastFour ?? "masked"}
									</p>
								) : null}
								{provider.type === "saml" ? (
									<a
										href={provider.spMetadataUrl}
										target="_blank"
										rel="noreferrer"
										className="mt-2 block break-all text-xs text-primary underline-offset-4 hover:underline"
									>
										Service Provider metadata
									</a>
								) : null}
								<div className="mt-4 flex flex-wrap gap-2">
									<Button
										size="sm"
										variant="outline"
										onClick={() => openEdit(provider)}
										disabled={!writeActionsAvailable}
									>
										<Pencil className="h-4 w-4" /> Edit
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
												Configure DNS
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
												Verify now
											</Button>
										</>
									) : null}
									<Button
										size="sm"
										variant="destructive"
										onClick={() => setDeleteProvider(provider)}
										disabled={!writeActionsAvailable}
									>
										<Trash2 className="h-4 w-4" /> Delete
									</Button>
								</div>
							</div>
						))}
					</div>
				) : (
					<p className="text-sm text-muted-foreground">
						No SSO provider is registered for this organization.
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
								? "Register SSO provider"
								: "Edit SSO provider"}
						</DialogTitle>
						<DialogDescription>
							Configuration is organization-scoped. Sensitive values are sent
							once and are never loaded back into this form.
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
							<AlertTitle>Review configuration</AlertTitle>
							<AlertDescription>{providerError}</AlertDescription>
						</Alert>
					) : null}
					{editorMode === "edit" ? (
						<p className="text-xs text-muted-foreground">
							Changing issuer, domain, client identity, endpoints, or SAML
							identity fields may reset domain verification or be rejected while
							linked accounts exist.
						</p>
					) : null}
					<DialogFooter>
						<Button type="button" variant="outline" onClick={closeEditor}>
							Cancel
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
							{editorMode === "create" ? "Register provider" : "Save changes"}
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
						<DialogTitle>Publish the SSO verification record</DialogTitle>
						<DialogDescription>
							Add every TXT record below, wait for DNS propagation, then choose
							Verify now. The proof expires after seven days.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						{domainProof?.records.map((record) => (
							<div
								key={record.name}
								className="space-y-3 rounded-lg border p-4"
							>
								<CopyableEndpoint label="TXT record name" value={record.name} />
								<CopyableEndpoint
									label="TXT record value"
									value={record.value}
								/>
							</div>
						))}
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDomainProof(null)}>
							Close
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
							Verify now
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
						<AlertDialogTitle>Delete SSO provider?</AlertDialogTitle>
						<AlertDialogDescription>
							This removes the provider and its linked SSO account records.
							Existing user profiles remain, but users cannot sign in through
							this provider. Type the provider ID to continue.
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
						<AlertDialogCancel>Keep provider</AlertDialogCancel>
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
							Delete provider
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
