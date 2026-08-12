"use client";

import {
	AlertTriangle,
	Boxes,
	CalendarDays,
	Check,
	Copy,
	KeyRound,
	Loader2,
	Pencil,
	Plus,
	RefreshCw,
	ShieldCheck,
	Smartphone,
	Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
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
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
	DialogTrigger,
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
import type { OAuthClientRecord } from "@/lib/auth";
import { authClient } from "@/lib/auth-client";
import type {
	DeveloperOAuthClient,
	DeveloperOAuthClientType,
	DeveloperOAuthConsent,
	DeveloperOAuthScope,
} from "@/lib/developer-console";
import {
	canRotateDeveloperSecret,
	DEVELOPER_OAUTH_SCOPES,
	formatDeveloperDate,
	parseDeveloperRedirectUris,
	toDeveloperOAuthClient,
	validateDeveloperClientName,
} from "@/lib/developer-console";
import { isSessionRecent } from "@/lib/security-center";

type DeveloperConsoleProps = {
	currentSessionCreatedAt: string;
	emailVerified: boolean;
	initialClients: DeveloperOAuthClient[];
	initialConsents: DeveloperOAuthConsent[];
	dataUnavailable: {
		clients: boolean;
		consents: boolean;
	};
};

type ClientDraft = {
	name: string;
	type: DeveloperOAuthClientType;
	redirectUris: string;
	scopes: DeveloperOAuthScope[];
};

type SecretNotice = {
	clientId: string;
	secret: string;
	operation: "created" | "rotated";
};

const EMPTY_DRAFT: ClientDraft = {
	name: "",
	type: "web",
	redirectUris: "",
	scopes: ["openid", "profile", "email"],
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const getApiError = (value: unknown, fallback: string) => {
	if (!isRecord(value)) return fallback;
	for (const field of ["message", "error_description", "error"] as const) {
		if (typeof value[field] === "string" && value[field]) return value[field];
	}
	return fallback;
};

const mutateAuth = async <T,>(path: string, body: unknown): Promise<T> => {
	const response = await fetch(path, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
		credentials: "include",
		cache: "no-store",
	});
	const text = await response.text();
	let payload: unknown = null;
	if (text) {
		try {
			payload = JSON.parse(text) as unknown;
		} catch {
			payload = text;
		}
	}
	if (!response.ok) {
		throw new Error(
			getApiError(payload, `CinaSeek returned HTTP ${response.status}`),
		);
	}
	return payload as T;
};

const copyValue = async (value: string, label: string) => {
	try {
		await navigator.clipboard.writeText(value);
		toast.success(`${label} copied`);
	} catch {
		toast.error(`Unable to copy ${label.toLowerCase()}`);
	}
};

function ClientEditorFields({
	draft,
	onChange,
	editing,
}: {
	draft: ClientDraft;
	onChange: (draft: ClientDraft) => void;
	editing: boolean;
}) {
	const toggleScope = (scope: DeveloperOAuthScope, checked: boolean) => {
		onChange({
			...draft,
			scopes: checked
				? [...new Set([...draft.scopes, scope])]
				: draft.scopes.filter((item) => item !== scope),
		});
	};

	return (
		<div className="grid gap-5 py-2">
			<div className="grid gap-2">
				<Label htmlFor={editing ? "edit-client-name" : "create-client-name"}>
					Application name
				</Label>
				<Input
					id={editing ? "edit-client-name" : "create-client-name"}
					maxLength={100}
					placeholder="Cina App"
					value={draft.name}
					onChange={(event) => onChange({ ...draft, name: event.target.value })}
				/>
			</div>
			<div className="grid gap-2">
				<Label>Application type</Label>
				<Select
					disabled={editing}
					value={draft.type}
					onValueChange={(value: DeveloperOAuthClientType) =>
						onChange({ ...draft, type: value })
					}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="web">Web server application</SelectItem>
						<SelectItem value="native">Native or device application</SelectItem>
					</SelectContent>
				</Select>
				<p className="text-xs text-muted-foreground">
					{draft.type === "web"
						? "Confidential client. Its secret is shown once and must remain server-side."
						: "Public PKCE client. No client secret is issued; it can also use Device Flow."}
				</p>
			</div>
			<div className="grid gap-2">
				<Label
					htmlFor={editing ? "edit-redirect-uris" : "create-redirect-uris"}
				>
					Redirect URIs
				</Label>
				<Textarea
					id={editing ? "edit-redirect-uris" : "create-redirect-uris"}
					className="min-h-28 font-mono text-xs"
					placeholder={
						draft.type === "web"
							? "https://app.example.com/oauth/callback"
							: "cinaapp://oauth/callback"
					}
					value={draft.redirectUris}
					onChange={(event) =>
						onChange({ ...draft, redirectUris: event.target.value })
					}
				/>
				<p className="text-xs text-muted-foreground">
					One exact callback per line. URL fragments and embedded credentials
					are rejected.
				</p>
			</div>
			<div className="grid gap-3">
				<Label>Allowed scopes</Label>
				<div className="grid gap-3 sm:grid-cols-2">
					{DEVELOPER_OAUTH_SCOPES.map((scope) => (
						<label key={scope} className="flex items-start gap-3 text-sm">
							<Checkbox
								checked={draft.scopes.includes(scope)}
								onCheckedChange={(checked) =>
									toggleScope(scope, checked === true)
								}
							/>
							<span>
								<span className="font-mono">{scope}</span>
								{scope === "offline_access" ? (
									<span className="block text-xs text-muted-foreground">
										Enables refresh tokens.
									</span>
								) : null}
							</span>
						</label>
					))}
				</div>
			</div>
		</div>
	);
}

export function DeveloperConsole({
	currentSessionCreatedAt,
	emailVerified,
	initialClients,
	initialConsents,
	dataUnavailable,
}: DeveloperConsoleProps) {
	const router = useRouter();
	const [clients, setClients] = useState(initialClients);
	const [consents, setConsents] = useState(initialConsents);
	const [createOpen, setCreateOpen] = useState(false);
	const [draft, setDraft] = useState<ClientDraft>(EMPTY_DRAFT);
	const [editingClient, setEditingClient] =
		useState<DeveloperOAuthClient | null>(null);
	const [busyAction, setBusyAction] = useState<string | null>(null);
	const [secretNotice, setSecretNotice] = useState<SecretNotice | null>(null);
	const [secretAcknowledged, setSecretAcknowledged] = useState(false);
	const recentAuthentication = isSessionRecent(currentSessionCreatedAt);
	const writesAllowed =
		emailVerified && recentAuthentication && !dataUnavailable.clients;

	const runAction = async (
		name: string,
		action: () => Promise<void>,
		fallback: string,
	) => {
		setBusyAction(name);
		try {
			await action();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : fallback);
		} finally {
			setBusyAction(null);
		}
	};

	const reauthenticate = () =>
		runAction(
			"reauthenticate",
			async () => {
				await authClient.signOut();
				router.push("/sign-in?callbackURL=/dashboard/developer");
			},
			"Unable to start a fresh sign-in",
		);

	const validateDraft = () => {
		const nameResult = validateDeveloperClientName(draft.name);
		if (nameResult.error) throw new Error(nameResult.error);
		const redirectResult = parseDeveloperRedirectUris(
			draft.redirectUris,
			draft.type,
		);
		if (redirectResult.error) throw new Error(redirectResult.error);
		if (!draft.scopes.includes("openid")) {
			throw new Error("OpenID Connect clients must include the openid scope.");
		}
		return { name: nameResult.name, redirectUris: redirectResult.uris };
	};

	const showSecret = (
		clientId: string,
		secret: string,
		operation: SecretNotice["operation"],
	) => {
		setSecretAcknowledged(false);
		setSecretNotice({ clientId, secret, operation });
	};

	const createClient = () =>
		runAction(
			"client:create",
			async () => {
				const validated = validateDraft();
				const response = await mutateAuth<OAuthClientRecord>(
					"/api/auth/oauth2/create-client",
					{
						client_name: validated.name,
						redirect_uris: validated.redirectUris,
						scope: draft.scopes.join(" "),
						token_endpoint_auth_method:
							draft.type === "native" ? "none" : "client_secret_basic",
						grant_types: draft.scopes.includes("offline_access")
							? ["authorization_code", "refresh_token"]
							: ["authorization_code"],
						response_types: ["code"],
						type: draft.type,
					},
				);
				const client = toDeveloperOAuthClient(response);
				setClients((current) => [client, ...current]);
				setCreateOpen(false);
				setDraft(EMPTY_DRAFT);
				toast.success("OAuth client created");
				if (response.client_secret) {
					showSecret(response.client_id, response.client_secret, "created");
				}
			},
			"Unable to create the OAuth client",
		);

	const openEditor = (client: DeveloperOAuthClient) => {
		setEditingClient(client);
		setDraft({
			name: client.name,
			type: client.type === "native" ? "native" : "web",
			redirectUris: client.redirectUris.join("\n"),
			scopes: DEVELOPER_OAUTH_SCOPES.filter((scope) =>
				client.scopes.includes(scope),
			),
		});
	};

	const updateClient = () => {
		if (!editingClient) return;
		void runAction(
			`client:update:${editingClient.clientId}`,
			async () => {
				const validated = validateDraft();
				const response = await mutateAuth<OAuthClientRecord>(
					"/api/auth/oauth2/update-client",
					{
						client_id: editingClient.clientId,
						update: {
							client_name: validated.name,
							redirect_uris: validated.redirectUris,
							scope: draft.scopes.join(" "),
							grant_types: draft.scopes.includes("offline_access")
								? ["authorization_code", "refresh_token"]
								: ["authorization_code"],
							response_types: ["code"],
						},
					},
				);
				const updated = toDeveloperOAuthClient(response);
				setClients((current) =>
					current.map((item) =>
						item.clientId === updated.clientId ? updated : item,
					),
				);
				setEditingClient(null);
				toast.success("OAuth client updated");
			},
			"Unable to update the OAuth client",
		);
	};

	const rotateSecret = (client: DeveloperOAuthClient) =>
		runAction(
			`client:rotate:${client.clientId}`,
			async () => {
				const response = await mutateAuth<OAuthClientRecord>(
					"/api/auth/oauth2/client/rotate-secret",
					{ client_id: client.clientId },
				);
				if (!response.client_secret) {
					throw new Error("CinaSeek did not return the newly rotated secret.");
				}
				showSecret(client.clientId, response.client_secret, "rotated");
				toast.success("Client secret rotated");
			},
			"Unable to rotate the client secret",
		);

	const deleteClient = (client: DeveloperOAuthClient) =>
		runAction(
			`client:delete:${client.clientId}`,
			async () => {
				await mutateAuth<null>("/api/auth/oauth2/delete-client", {
					client_id: client.clientId,
				});
				setClients((current) =>
					current.filter((item) => item.clientId !== client.clientId),
				);
				setConsents((current) =>
					current.filter((item) => item.clientId !== client.clientId),
				);
				toast.success("OAuth client deleted");
			},
			"Unable to delete the OAuth client",
		);

	const revokeConsent = (consent: DeveloperOAuthConsent) =>
		runAction(
			`consent:delete:${consent.id}`,
			async () => {
				await mutateAuth<null>("/api/auth/oauth2/delete-consent", {
					id: consent.id,
				});
				setConsents((current) =>
					current.filter((item) => item.id !== consent.id),
				);
				toast.success("Consent revoked");
			},
			"Unable to revoke the consent",
		);

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
			<DashboardPageHeader
				title="Developer Console"
				description="Register OAuth applications against the authoritative CinaSeek Identity service."
			>
				<Dialog open={createOpen} onOpenChange={setCreateOpen}>
					<DialogTrigger asChild>
						<Button disabled={!writesAllowed}>
							<Plus className="mr-2 h-4 w-4" /> Create client
						</Button>
					</DialogTrigger>
					<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
						<DialogHeader>
							<DialogTitle>Create OAuth client</DialogTitle>
							<DialogDescription>
								Choose the smallest client type and scopes your application
								needs.
							</DialogDescription>
						</DialogHeader>
						<ClientEditorFields
							draft={draft}
							onChange={setDraft}
							editing={false}
						/>
						<DialogFooter>
							<Button
								disabled={busyAction === "client:create"}
								onClick={() => void createClient()}
							>
								{busyAction === "client:create" ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : null}
								Create client
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</DashboardPageHeader>

			{!emailVerified || !recentAuthentication || dataUnavailable.clients ? (
				<Alert variant="destructive">
					<AlertTriangle className="h-4 w-4" />
					<AlertTitle>OAuth client changes are locked</AlertTitle>
					<AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<span>
							{!emailVerified
								? "Verify your email before registering developer applications."
								: !recentAuthentication
									? "Sign in again to establish a fresh session before changing OAuth credentials."
									: "The authoritative OAuth client list is unavailable, so writes are disabled."}
						</span>
						{emailVerified && !recentAuthentication ? (
							<Button
								className="shrink-0"
								disabled={busyAction === "reauthenticate"}
								onClick={() => void reauthenticate()}
								size="sm"
								variant="outline"
							>
								<RefreshCw className="mr-2 h-4 w-4" /> Sign in again
							</Button>
						) : null}
					</AlertDescription>
				</Alert>
			) : (
				<Alert>
					<ShieldCheck className="h-4 w-4" />
					<AlertTitle>Protected developer access</AlertTitle>
					<AlertDescription>
						Ownership is enforced by CinaSeek. Every write also requires a
						verified account and a fresh session.
					</AlertDescription>
				</Alert>
			)}

			<Card>
				<CardHeader className="flex flex-row items-start justify-between gap-4">
					<div>
						<CardTitle className="flex items-center gap-2">
							<Boxes className="h-5 w-5" /> OAuth applications
						</CardTitle>
						<CardDescription>
							Client secrets are never returned by list or read operations.
						</CardDescription>
					</div>
					<Badge variant="secondary">{clients.length}</Badge>
				</CardHeader>
				<CardContent className="grid gap-4">
					{clients.length === 0 ? (
						<div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
							{dataUnavailable.clients
								? "OAuth application data is temporarily unavailable."
								: "No OAuth applications registered yet."}
						</div>
					) : (
						clients.map((client) => (
							<div
								key={client.clientId}
								className="grid gap-4 rounded-lg border p-4"
							>
								<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
									<div className="min-w-0">
										<div className="flex flex-wrap items-center gap-2">
											<h3 className="font-medium">{client.name}</h3>
											<Badge variant={client.public ? "secondary" : "default"}>
												{client.public ? "Public + PKCE" : "Confidential"}
											</Badge>
											<Badge variant="outline">{client.type}</Badge>
											{client.disabled ? (
												<Badge variant="destructive">Disabled</Badge>
											) : null}
										</div>
										<div className="mt-2 flex min-w-0 items-center gap-2">
											<code className="truncate rounded bg-muted px-2 py-1 text-xs">
												{client.clientId}
											</code>
											<Button
												aria-label="Copy client ID"
												onClick={() =>
													void copyValue(client.clientId, "Client ID")
												}
												size="icon"
												variant="ghost"
											>
												<Copy className="h-4 w-4" />
											</Button>
										</div>
									</div>
									<div className="flex flex-wrap gap-2">
										<Button
											disabled={!writesAllowed}
											onClick={() => openEditor(client)}
											size="sm"
											variant="outline"
										>
											<Pencil className="mr-2 h-4 w-4" /> Edit
										</Button>
										{canRotateDeveloperSecret(client) ? (
											<AlertDialog>
												<AlertDialogTrigger asChild>
													<Button
														disabled={!writesAllowed}
														size="sm"
														variant="outline"
													>
														<KeyRound className="mr-2 h-4 w-4" /> Rotate secret
													</Button>
												</AlertDialogTrigger>
												<AlertDialogContent>
													<AlertDialogHeader>
														<AlertDialogTitle>
															Rotate this client secret?
														</AlertDialogTitle>
														<AlertDialogDescription>
															The current secret stops working immediately.
															Deploy the new value to your server before ending
															this session.
														</AlertDialogDescription>
													</AlertDialogHeader>
													<AlertDialogFooter>
														<AlertDialogCancel>Cancel</AlertDialogCancel>
														<AlertDialogAction
															onClick={() => void rotateSecret(client)}
														>
															Rotate secret
														</AlertDialogAction>
													</AlertDialogFooter>
												</AlertDialogContent>
											</AlertDialog>
										) : null}
										<AlertDialog>
											<AlertDialogTrigger asChild>
												<Button
													disabled={!writesAllowed}
													size="sm"
													variant="destructive"
												>
													<Trash2 className="mr-2 h-4 w-4" /> Delete
												</Button>
											</AlertDialogTrigger>
											<AlertDialogContent>
												<AlertDialogHeader>
													<AlertDialogTitle>
														Delete {client.name}?
													</AlertDialogTitle>
													<AlertDialogDescription>
														Authorization and token requests for this client
														will stop. This cannot be undone.
													</AlertDialogDescription>
												</AlertDialogHeader>
												<AlertDialogFooter>
													<AlertDialogCancel>Cancel</AlertDialogCancel>
													<AlertDialogAction
														className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
														onClick={() => void deleteClient(client)}
													>
														Delete client
													</AlertDialogAction>
												</AlertDialogFooter>
											</AlertDialogContent>
										</AlertDialog>
									</div>
								</div>
								<div className="grid gap-3 text-sm lg:grid-cols-2">
									<div>
										<p className="font-medium">Redirect URIs</p>
										<div className="mt-1 grid gap-1">
											{client.redirectUris.map((uri) => (
												<code
													key={uri}
													className="break-all text-xs text-muted-foreground"
												>
													{uri}
												</code>
											))}
										</div>
									</div>
									<div>
										<p className="font-medium">Scopes</p>
										<div className="mt-1 flex flex-wrap gap-1">
											{client.scopes.map((scope) => (
												<Badge key={scope} variant="outline">
													{scope}
												</Badge>
											))}
										</div>
									</div>
								</div>
								{client.createdAt ? (
									<p className="flex items-center gap-2 text-xs text-muted-foreground">
										<CalendarDays className="h-3.5 w-3.5" /> Created{" "}
										{formatDeveloperDate(client.createdAt)}
									</p>
								) : null}
							</div>
						))
					)}
				</CardContent>
			</Card>

			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Smartphone className="h-5 w-5" /> Device Flow
						</CardTitle>
						<CardDescription>
							For TVs, command-line tools, and input-constrained devices.
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-4 text-sm">
						<p>
							Only registered, enabled native public clients can request device
							codes.
						</p>
						<div className="grid gap-2">
							<div>
								<span className="text-muted-foreground">Device code</span>
								<code className="mt-1 block break-all rounded bg-muted p-2 text-xs">
									https://auth.cinaseek.ai/api/auth/device/code
								</code>
							</div>
							<div>
								<span className="text-muted-foreground">Token exchange</span>
								<code className="mt-1 block break-all rounded bg-muted p-2 text-xs">
									https://auth.cinaseek.ai/api/auth/device/token
								</code>
							</div>
							<div>
								<span className="text-muted-foreground">User verification</span>
								<code className="mt-1 block break-all rounded bg-muted p-2 text-xs">
									https://accounts.cinaseek.ai/device
								</code>
							</div>
						</div>
						<Alert>
							<ShieldCheck className="h-4 w-4" />
							<AlertDescription>
								Device Flow issues a user session bearer after approval. Store
								it like a password and never log it.
							</AlertDescription>
						</Alert>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-start justify-between gap-4">
						<div>
							<CardTitle className="flex items-center gap-2">
								<Check className="h-5 w-5" /> Your consent grants
							</CardTitle>
							<CardDescription>
								Applications currently authorized by your account.
							</CardDescription>
						</div>
						<Badge variant="secondary">{consents.length}</Badge>
					</CardHeader>
					<CardContent className="grid gap-3">
						{consents.length === 0 ? (
							<p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
								{dataUnavailable.consents
									? "Consent data is temporarily unavailable."
									: "No active consent grants."}
							</p>
						) : (
							consents.map((consent) => {
								const client = clients.find(
									(item) => item.clientId === consent.clientId,
								);
								return (
									<div
										key={consent.id}
										className="grid gap-3 rounded-lg border p-4"
									>
										<div className="flex items-start justify-between gap-3">
											<div className="min-w-0">
												<p className="font-medium">
													{client?.name ?? "OAuth application"}
												</p>
												<code className="block truncate text-xs text-muted-foreground">
													{consent.clientId}
												</code>
											</div>
											<AlertDialog>
												<AlertDialogTrigger asChild>
													<Button
														disabled={
															!recentAuthentication || dataUnavailable.consents
														}
														size="sm"
														variant="outline"
													>
														Revoke
													</Button>
												</AlertDialogTrigger>
												<AlertDialogContent>
													<AlertDialogHeader>
														<AlertDialogTitle>
															Revoke this consent?
														</AlertDialogTitle>
														<AlertDialogDescription>
															The application will need to request authorization
															again. Existing tokens may remain valid until
															expiry or revocation.
														</AlertDialogDescription>
													</AlertDialogHeader>
													<AlertDialogFooter>
														<AlertDialogCancel>Cancel</AlertDialogCancel>
														<AlertDialogAction
															onClick={() => void revokeConsent(consent)}
														>
															Revoke consent
														</AlertDialogAction>
													</AlertDialogFooter>
												</AlertDialogContent>
											</AlertDialog>
										</div>
										<div className="flex flex-wrap gap-1">
											{consent.scopes.map((scope) => (
												<Badge key={scope} variant="outline">
													{scope}
												</Badge>
											))}
										</div>
										<p className="text-xs text-muted-foreground">
											Granted {formatDeveloperDate(consent.createdAt)}
										</p>
									</div>
								);
							})
						)}
					</CardContent>
				</Card>
			</div>

			<Dialog
				open={editingClient !== null}
				onOpenChange={(open) => !open && setEditingClient(null)}
			>
				<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
					<DialogHeader>
						<DialogTitle>Edit OAuth client</DialogTitle>
						<DialogDescription>
							Client type and token authentication method are immutable after
							registration.
						</DialogDescription>
					</DialogHeader>
					<ClientEditorFields draft={draft} onChange={setDraft} editing />
					<DialogFooter>
						<Button
							disabled={
								!editingClient || busyAction?.startsWith("client:update:")
							}
							onClick={updateClient}
						>
							{busyAction?.startsWith("client:update:") ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : null}
							Save changes
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={secretNotice !== null}
				onOpenChange={(open) => {
					if (!open && secretAcknowledged) {
						setSecretNotice(null);
						setSecretAcknowledged(false);
					}
				}}
			>
				<DialogContent
					className="sm:max-w-xl"
					onEscapeKeyDown={(event) =>
						!secretAcknowledged && event.preventDefault()
					}
					onPointerDownOutside={(event) =>
						!secretAcknowledged && event.preventDefault()
					}
				>
					<DialogHeader>
						<DialogTitle>Copy this client secret now</DialogTitle>
						<DialogDescription>
							This value is shown only once. CinaSeek stores a one-way hash and
							cannot reveal it later.
						</DialogDescription>
					</DialogHeader>
					{secretNotice ? (
						<div className="grid gap-4">
							<Alert variant="destructive">
								<AlertTriangle className="h-4 w-4" />
								<AlertDescription>
									{secretNotice.operation === "rotated"
										? "The previous secret is no longer valid. "
										: ""}
									Do not place this secret in browser code, source control,
									logs, or chat.
								</AlertDescription>
							</Alert>
							<div className="grid gap-2">
								<Label>Client ID</Label>
								<div className="flex gap-2">
									<Input readOnly value={secretNotice.clientId} />
									<Button
										aria-label="Copy client ID"
										onClick={() =>
											void copyValue(secretNotice.clientId, "Client ID")
										}
										size="icon"
										variant="outline"
									>
										<Copy className="h-4 w-4" />
									</Button>
								</div>
							</div>
							<div className="grid gap-2">
								<Label>Client secret</Label>
								<div className="flex gap-2">
									<Input
										className="font-mono"
										readOnly
										value={secretNotice.secret}
									/>
									<Button
										aria-label="Copy client secret"
										onClick={() =>
											void copyValue(secretNotice.secret, "Client secret")
										}
										size="icon"
										variant="outline"
									>
										<Copy className="h-4 w-4" />
									</Button>
								</div>
							</div>
							<label className="flex items-start gap-3 text-sm">
								<Checkbox
									checked={secretAcknowledged}
									onCheckedChange={(checked) =>
										setSecretAcknowledged(checked === true)
									}
								/>
								<span>
									I stored this secret in a secure server-side secret manager.
								</span>
							</label>
						</div>
					) : null}
					<DialogFooter>
						<Button
							disabled={!secretAcknowledged}
							onClick={() => {
								setSecretNotice(null);
								setSecretAcknowledged(false);
							}}
						>
							Done
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
