"use client";

import type { AuthCapabilities } from "@cinaauth/auth-web-contract";
import {
	AlertTriangle,
	Check,
	Copy,
	Fingerprint,
	KeyRound,
	Laptop,
	Link2,
	Loader2,
	LockKeyhole,
	LogOut,
	Pencil,
	Plus,
	Power,
	PowerOff,
	RefreshCw,
	ShieldCheck,
	ShieldOff,
	Trash2,
	Unlink,
	WalletCards,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { TwoFactorDisableForm } from "@/components/forms/two-factor-disable-form";
import { TwoFactorEnableForm } from "@/components/forms/two-factor-enable-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import { ReownWalletEntry } from "@/components/wallet/reown-wallet-entry";
import { formatOAuthProviderName } from "@/lib/auth-capabilities";
import { authClient } from "@/lib/auth-client";
import { cinaAuthSiweProtocolClient } from "@/lib/cinaauth-siwe-client";
import { deleteAccountPasskey } from "@/lib/client-api";
import {
	getInjectedEthereumProvider,
	requestEthereumWalletIdentity,
	signSiweMessage,
} from "@/lib/ethereum-wallet";
import type {
	PrivacyDeletionReadiness,
	PrivacyDeletionReceipt,
} from "@/lib/privacy-center";
import {
	getPrivacyDeletionReceipt,
	getPrivacyDeletionReceiptFilename,
	PRIVACY_DELETE_ACCOUNT_PATH,
	PRIVACY_DELETION_READINESS_PATH,
	parsePrivacyDeletionReadiness,
} from "@/lib/privacy-center";
import { isSiweWalletUiEnabled } from "@/lib/reown-wallet-gate";
import type {
	SecurityAccount,
	SecurityApiKey,
	SecurityOAuthProvider,
	SecurityPasskey,
	SecuritySession,
	SecurityWallet,
} from "@/lib/security-center";
import {
	canUnlinkAccount,
	formatApiKeyIdentifier,
	formatSecurityDate,
	formatWalletAddress,
	formatWalletChain,
	getAvailableSecurityProviders,
	requiresPasswordForTwoFactor as getRequiresPasswordForTwoFactor,
	getSecurityPosture,
	isApiKeyExpired,
	isSessionRecent,
	summarizeUserAgent,
} from "@/lib/security-center";
import { getSecurityProviderLinkURL } from "@/lib/security-provider-actions";
import { completeWalletProof } from "@/lib/siwe-wallet-protocol";

type SecurityCenterProps = {
	user: {
		name: string;
		email: string;
		emailVerified: boolean;
		twoFactorEnabled: boolean;
	};
	currentSessionCreatedAt: string;
	initialSessions: SecuritySession[];
	initialAccounts: SecurityAccount[];
	initialPasskeys: SecurityPasskey[];
	initialApiKeys: SecurityApiKey[];
	initialWallets: SecurityWallet[];
	configuredProviders: SecurityOAuthProvider[];
	walletCapabilities: AuthCapabilities;
	walletCookie: string | null;
	providerLinkFailed: boolean;
	dataUnavailable: {
		sessions: boolean;
		accounts: boolean;
		passkeys: boolean;
		apiKeys: boolean;
		wallets: boolean;
	};
};

const getErrorMessage = (error: unknown, fallback: string) => {
	if (error instanceof Error && error.message) return error.message;
	if (error && typeof error === "object" && "message" in error) {
		const message = error.message;
		if (typeof message === "string" && message) return message;
	}
	return fallback;
};

const getResponseErrorCode = (value: unknown) => {
	if (!value || typeof value !== "object" || !("code" in value)) return null;
	return typeof value.code === "string" ? value.code : null;
};

const getRetryAfterSeconds = (value: unknown) => {
	if (!value || typeof value !== "object" || !("retryAfterSeconds" in value)) {
		return null;
	}
	return typeof value.retryAfterSeconds === "number"
		? value.retryAfterSeconds
		: null;
};

const formatProcessorId = (id: string) =>
	id
		.split(/[-_.]+/)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");

export function SecurityCenter({
	user,
	currentSessionCreatedAt,
	initialSessions,
	initialAccounts,
	initialPasskeys,
	initialApiKeys,
	initialWallets,
	configuredProviders,
	walletCapabilities,
	walletCookie,
	providerLinkFailed,
	dataUnavailable,
}: SecurityCenterProps) {
	const router = useRouter();
	const [sessions, setSessions] = useState(initialSessions);
	const [accounts, setAccounts] = useState(initialAccounts);
	const [passkeys, setPasskeys] = useState(initialPasskeys);
	const [apiKeys, setApiKeys] = useState(initialApiKeys);
	const [wallets, setWallets] = useState(initialWallets);
	const [busyAction, setBusyAction] = useState<string | null>(null);
	const [passkeyName, setPasskeyName] = useState("");
	const [apiKeyName, setApiKeyName] = useState("");
	const [apiKeyExpirationDays, setApiKeyExpirationDays] = useState("90");
	const [createdApiKey, setCreatedApiKey] = useState<{
		name: string;
		secret: string;
	} | null>(null);
	const [apiKeyToRename, setApiKeyToRename] = useState<SecurityApiKey | null>(
		null,
	);
	const [apiKeyRename, setApiKeyRename] = useState("");
	const [apiKeyToRevoke, setApiKeyToRevoke] = useState<SecurityApiKey | null>(
		null,
	);
	const [walletToUnlink, setWalletToUnlink] = useState<SecurityWallet | null>(
		null,
	);
	const [deleteConfirmation, setDeleteConfirmation] = useState("");
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [deletionReadiness, setDeletionReadiness] =
		useState<PrivacyDeletionReadiness | null>(null);
	const [deletionReadinessError, setDeletionReadinessError] = useState<
		string | null
	>(null);
	const [deletionReadinessLoading, setDeletionReadinessLoading] =
		useState(false);
	const [twoFactorDialogOpen, setTwoFactorDialogOpen] = useState(false);
	const [backupCodesPending, setBackupCodesPending] = useState(false);

	const recentAuthentication = isSessionRecent(currentSessionCreatedAt);
	const walletUiEnabled = isSiweWalletUiEnabled(
		process.env.NEXT_PUBLIC_SIWE_WALLET_UI_ENABLED,
	);
	const securityDataUnavailable =
		dataUnavailable.sessions ||
		dataUnavailable.accounts ||
		dataUnavailable.passkeys ||
		dataUnavailable.apiKeys ||
		dataUnavailable.wallets;
	const posture = getSecurityPosture({
		emailVerified: user.emailVerified,
		twoFactorEnabled: user.twoFactorEnabled,
		passkeyCount: passkeys.length,
		activeSessionCount: sessions.length,
	});
	const requiresPasswordForTwoFactor = getRequiresPasswordForTwoFactor(
		accounts,
		dataUnavailable.accounts,
	);
	const availableProviders = getAvailableSecurityProviders(
		configuredProviders,
		accounts,
	);
	const destructiveActionReady =
		deleteConfirmation === user.email &&
		recentAuthentication &&
		!dataUnavailable.accounts &&
		deletionReadiness?.canDelete === true;

	const runAction = async (
		name: string,
		action: () => Promise<void>,
		fallbackMessage: string,
	) => {
		setBusyAction(name);
		try {
			await action();
		} catch (error) {
			toast.error(getErrorMessage(error, fallbackMessage));
		} finally {
			setBusyAction(null);
		}
	};

	const reauthenticate = () =>
		runAction(
			"reauthenticate",
			async () => {
				await authClient.signOut();
				router.push("/sign-in?callbackURL=/dashboard/security");
			},
			"Unable to start a fresh sign-in",
		);

	const revokeSession = (session: SecuritySession) =>
		runAction(
			`session:${session.id}`,
			async () => {
				const { error } = await authClient.revokeSession({
					token: session.token,
				});
				if (error) throw error;
				setSessions((current) =>
					current.filter((item) => item.id !== session.id),
				);
				toast.success("Session terminated");
				if (session.isCurrent) router.push("/sign-in");
			},
			"Unable to terminate the session",
		);

	const revokeOtherSessions = () =>
		runAction(
			"sessions:others",
			async () => {
				const { error } = await authClient.revokeOtherSessions();
				if (error) throw error;
				setSessions((current) => current.filter((item) => item.isCurrent));
				toast.success("Other sessions terminated");
			},
			"Unable to terminate other sessions",
		);

	const refreshPasskeys = async () => {
		const { data, error } = await authClient.passkey.listUserPasskeys();
		if (error) throw error;
		setPasskeys(
			(data ?? []).map((item) => ({
				id: item.id,
				name: item.name ?? null,
				createdAt: new Date(item.createdAt).toISOString(),
			})),
		);
	};

	const addPasskey = () =>
		runAction(
			"passkey:add",
			async () => {
				const name = passkeyName.trim();
				if (!name) throw new Error("Enter a name for this passkey");
				const { error } = await authClient.passkey.addPasskey({ name });
				if (error) throw error;
				await refreshPasskeys();
				setPasskeyName("");
				toast.success("Passkey created");
			},
			"Unable to create the passkey",
		);

	const deletePasskey = (passkey: SecurityPasskey) =>
		runAction(
			`passkey:${passkey.id}`,
			async () => {
				await deleteAccountPasskey(authClient, passkey.id);
				setPasskeys((current) =>
					current.filter((item) => item.id !== passkey.id),
				);
				toast.success("Passkey removed");
			},
			"Unable to remove the passkey",
		);

	const toSecurityApiKey = (item: {
		id: string;
		name?: string | null;
		start?: string | null;
		enabled: boolean;
		rateLimitEnabled: boolean;
		rateLimitTimeWindow?: number | null;
		rateLimitMax?: number | null;
		requestCount: number;
		lastRequest?: Date | string | null;
		expiresAt?: Date | string | null;
		createdAt: Date | string;
		updatedAt: Date | string;
	}): SecurityApiKey => ({
		id: item.id,
		name: item.name || "Unnamed API key",
		start: item.start ?? null,
		enabled: item.enabled,
		rateLimitEnabled: item.rateLimitEnabled,
		rateLimitTimeWindow: item.rateLimitTimeWindow ?? null,
		rateLimitMax: item.rateLimitMax ?? null,
		requestCount: item.requestCount,
		lastRequest: item.lastRequest
			? new Date(item.lastRequest).toISOString()
			: null,
		expiresAt: item.expiresAt ? new Date(item.expiresAt).toISOString() : null,
		createdAt: new Date(item.createdAt).toISOString(),
		updatedAt: new Date(item.updatedAt).toISOString(),
	});

	const createApiKey = () =>
		runAction(
			"api-key:create",
			async () => {
				const name = apiKeyName.trim();
				if (!name) throw new Error("Enter a name for this API key");
				const expiresIn = Number(apiKeyExpirationDays) * 24 * 60 * 60;
				const { data, error } = await authClient.apiKey.create({
					name,
					expiresIn,
				});
				if (error) throw error;
				if (!data?.key) {
					throw new Error("The API key secret was not returned");
				}
				setCreatedApiKey({ name: data.name || name, secret: data.key });
				setApiKeys((current) => [toSecurityApiKey(data), ...current]);
				setApiKeyName("");
				toast.success("API key created");
			},
			"Unable to create the API key",
		);

	const renameApiKey = () =>
		runAction(
			`api-key:rename:${apiKeyToRename?.id ?? "unknown"}`,
			async () => {
				if (!apiKeyToRename) return;
				const name = apiKeyRename.trim();
				if (!name) throw new Error("Enter a name for this API key");
				const { data, error } = await authClient.apiKey.update({
					keyId: apiKeyToRename.id,
					name,
				});
				if (error) throw error;
				if (!data) throw new Error("The API key was not updated");
				setApiKeys((current) =>
					current.map((item) =>
						item.id === data.id ? toSecurityApiKey(data) : item,
					),
				);
				setApiKeyToRename(null);
				toast.success("API key renamed");
			},
			"Unable to rename the API key",
		);

	const toggleApiKey = (apiKey: SecurityApiKey) =>
		runAction(
			`api-key:toggle:${apiKey.id}`,
			async () => {
				const { data, error } = await authClient.apiKey.update({
					keyId: apiKey.id,
					enabled: !apiKey.enabled,
				});
				if (error) throw error;
				if (!data) throw new Error("The API key was not updated");
				setApiKeys((current) =>
					current.map((item) =>
						item.id === data.id ? toSecurityApiKey(data) : item,
					),
				);
				toast.success(apiKey.enabled ? "API key disabled" : "API key enabled");
			},
			"Unable to change the API key status",
		);

	const revokeApiKey = () =>
		runAction(
			`api-key:revoke:${apiKeyToRevoke?.id ?? "unknown"}`,
			async () => {
				if (!apiKeyToRevoke) return;
				const { error } = await authClient.apiKey.delete({
					keyId: apiKeyToRevoke.id,
				});
				if (error) throw error;
				setApiKeys((current) =>
					current.filter((item) => item.id !== apiKeyToRevoke.id),
				);
				setApiKeyToRevoke(null);
				toast.success("API key revoked");
			},
			"Unable to revoke the API key",
		);

	const copyApiKeySecret = async () => {
		if (!createdApiKey) return;
		try {
			await navigator.clipboard.writeText(createdApiKey.secret);
			toast.success("API key copied");
		} catch {
			toast.error("Copy failed. Select and copy the key manually.");
		}
	};

	const toSecurityWallet = (item: {
		id: string;
		address: string;
		chainId: number;
		isPrimary: boolean;
		createdAt: Date | string;
	}): SecurityWallet => ({
		id: item.id,
		address: item.address,
		chainId: item.chainId,
		isPrimary: item.isPrimary,
		createdAt: new Date(item.createdAt).toISOString(),
	});

	const refreshWallets = async () => {
		const { data, error } = await authClient.$fetch("/siwe/list-wallets", {
			method: "GET",
		});
		if (error) throw error;
		const result = data as {
			wallets: Array<{
				id: string;
				address: string;
				chainId: number;
				isPrimary: boolean;
				createdAt: Date | string;
			}>;
		} | null;
		setWallets((result?.wallets ?? []).map(toSecurityWallet));
	};

	const connectWallet = () =>
		runAction(
			"wallet:connect",
			async () => {
				const provider = getInjectedEthereumProvider(window);
				if (!provider) {
					throw new Error(
						"No Ethereum wallet was found. Install or enable an EIP-1193 wallet first.",
					);
				}
				const identity = await requestEthereumWalletIdentity(provider);
				if (identity.chainId !== 1) {
					throw new Error(
						"Switch your wallet to Ethereum Mainnet and try again.",
					);
				}
				await completeWalletProof({
					client: cinaAuthSiweProtocolClient,
					purpose: "link-wallet",
					walletAddress: identity.address,
					chainId: identity.chainId,
					signMessage: (message) =>
						signSiweMessage(provider, message, identity.address),
				});
				await refreshWallets();
				toast.success("Wallet connected");
			},
			"Unable to connect the wallet",
		);

	const setPrimaryWallet = (wallet: SecurityWallet) =>
		runAction(
			`wallet:primary:${wallet.id}`,
			async () => {
				const { error } = await authClient.$fetch("/siwe/set-primary-wallet", {
					method: "POST",
					body: {
						walletAddress: wallet.address,
						chainId: wallet.chainId,
					},
				});
				if (error) throw error;
				setWallets((current) =>
					current.map((item) => ({
						...item,
						isPrimary: item.id === wallet.id,
					})),
				);
				toast.success("Primary wallet updated");
			},
			"Unable to update the primary wallet",
		);

	const unlinkWallet = () =>
		runAction(
			`wallet:unlink:${walletToUnlink?.id ?? "unknown"}`,
			async () => {
				if (!walletToUnlink) return;
				const { error } = await authClient.$fetch("/siwe/unlink-wallet", {
					method: "POST",
					body: {
						walletAddress: walletToUnlink.address,
						chainId: walletToUnlink.chainId,
					},
				});
				if (error) throw error;
				await refreshWallets();
				setWalletToUnlink(null);
				toast.success("Wallet disconnected");
			},
			"Unable to disconnect the wallet",
		);

	const unlinkAccount = (account: SecurityAccount) =>
		runAction(
			`account:${account.id}`,
			async () => {
				const { error } = await authClient.unlinkAccount({
					providerId: account.providerId,
					accountId: account.accountId,
				});
				if (error) throw error;
				setAccounts((current) =>
					current.filter((item) => item.id !== account.id),
				);
				toast.success("Identity disconnected");
			},
			"Unable to disconnect the identity",
		);

	const linkProvider = (provider: SecurityOAuthProvider) =>
		runAction(
			`provider:${provider.id}`,
			async () => {
				window.location.assign(
					await getSecurityProviderLinkURL(
						{
							linkSocial: authClient.linkSocial,
							oauth2: { link: authClient.oauth2.link },
						},
						provider,
					),
				);
			},
			"Unable to connect the identity provider",
		);

	const loadDeletionReadiness = async () => {
		setDeletionReadinessLoading(true);
		setDeletionReadinessError(null);
		try {
			const response = await fetch(PRIVACY_DELETION_READINESS_PATH, {
				method: "GET",
				credentials: "include",
				cache: "no-store",
				headers: { Accept: "application/json" },
			});
			if (!response.ok) {
				throw new Error(
					response.status === 403
						? "Sign in again before deleting this account."
						: "CinaSeek could not verify deletion readiness.",
				);
			}
			const readiness = parsePrivacyDeletionReadiness(
				(await response.json()) as unknown,
			);
			if (!readiness) {
				throw new Error(
					"CinaSeek returned an invalid deletion policy response.",
				);
			}
			setDeletionReadiness(readiness);
		} catch (error) {
			setDeletionReadiness(null);
			setDeletionReadinessError(
				getErrorMessage(error, "CinaSeek could not verify deletion readiness."),
			);
		} finally {
			setDeletionReadinessLoading(false);
		}
	};

	const downloadDeletionReceipt = (receipt: PrivacyDeletionReceipt) => {
		const objectURL = URL.createObjectURL(
			new Blob([JSON.stringify(receipt, null, 2)], {
				type: "application/json;charset=utf-8",
			}),
		);
		const link = document.createElement("a");
		link.href = objectURL;
		link.download = getPrivacyDeletionReceiptFilename(receipt);
		link.rel = "noopener";
		document.body.append(link);
		link.click();
		link.remove();
		URL.revokeObjectURL(objectURL);
	};

	const deleteAccount = () =>
		runAction(
			"account:delete",
			async () => {
				const response = await fetch(PRIVACY_DELETE_ACCOUNT_PATH, {
					method: "POST",
					credentials: "include",
					cache: "no-store",
					headers: {
						Accept: "application/json",
						"Content-Type": "application/json",
					},
					body: JSON.stringify({}),
				});
				const data = (await response.json().catch(() => null)) as unknown;
				if (!response.ok) {
					if (response.status === 409) {
						const code = getResponseErrorCode(data);
						if (code === "PRIVACY_PROCESSOR_ERASURE_PENDING") {
							const retryAfter = getRetryAfterSeconds(data);
							throw new Error(
								retryAfter
									? `An external processor is still erasing account data. Try again in about ${retryAfter} seconds; no local account data was deleted.`
									: "An external processor is still erasing account data. Try again shortly; no local account data was deleted.",
							);
						}
						await loadDeletionReadiness();
						throw new Error("Account deletion is blocked by a retention hold.");
					}
					if (
						getResponseErrorCode(data) === "PRIVACY_PROCESSOR_ERASURE_FAILED"
					) {
						throw new Error(
							"A required external processor could not confirm erasure. No local account data was deleted; try again later.",
						);
					}
					if (response.status === 401 || response.status === 403) {
						throw new Error("Sign in again before deleting this account.");
					}
					throw new Error("CinaSeek could not delete this account.");
				}
				const receipt = getPrivacyDeletionReceipt(data);
				if (receipt) {
					downloadDeletionReceipt(receipt);
				}
				setDeleteDialogOpen(false);
				toast.success(
					receipt
						? "Account deleted. Your signed deletion receipt was downloaded."
						: "Account deleted.",
				);
				router.push("/");
				router.refresh();
			},
			"Unable to delete the account",
		);

	return (
		<div className="mx-auto w-full max-w-6xl">
			<DashboardPageHeader
				title="Security Center"
				description={`Manage authentication factors, active sessions, linked identities, and account lifecycle controls for ${user.email}.`}
			>
				<Badge variant={posture.level === "strong" ? "default" : "secondary"}>
					{posture.level.toUpperCase()} · {posture.completed}/{posture.total}
				</Badge>
			</DashboardPageHeader>

			{(!recentAuthentication || securityDataUnavailable) && (
				<Alert className="mb-6">
					<AlertTriangle className="h-4 w-4" />
					<AlertTitle>
						{recentAuthentication
							? "Some security data is temporarily unavailable"
							: "Recent authentication required"}
					</AlertTitle>
					<AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<span>
							{recentAuthentication
								? "Sensitive controls stay disabled until all authoritative security data can be loaded."
								: "Sign in again before changing authenticators, linked identities, or deleting the account."}
						</span>
						<Button
							size="sm"
							variant="outline"
							onClick={reauthenticate}
							disabled={busyAction === "reauthenticate"}
						>
							{busyAction === "reauthenticate" ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<RefreshCw className="mr-2 h-4 w-4" />
							)}
							Reauthenticate
						</Button>
					</AlertDescription>
				</Alert>
			)}

			{providerLinkFailed && (
				<Alert variant="destructive" className="mb-6">
					<AlertTriangle className="h-4 w-4" />
					<AlertTitle>Identity connection failed</AlertTitle>
					<AlertDescription>
						The provider did not link this identity. Try again, or contact
						support if the provider continues to reject the request.
					</AlertDescription>
				</Alert>
			)}

			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<LockKeyhole className="h-5 w-5" /> Authentication
						</CardTitle>
						<CardDescription>
							Passwordless sign-in and multi-factor protection for this account.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<SecurityRow
							label="Email verification"
							value={user.emailVerified ? "Verified" : "Not verified"}
							secure={user.emailVerified}
						/>
						<SecurityRow
							label="Two-factor authentication"
							value={user.twoFactorEnabled ? "Enabled" : "Disabled"}
							secure={user.twoFactorEnabled}
						/>
						<Separator />
						<div className="flex flex-wrap gap-2">
							<Dialog
								open={twoFactorDialogOpen}
								onOpenChange={(open) => {
									if (!open && backupCodesPending) return;
									setTwoFactorDialogOpen(open);
								}}
							>
								<DialogTrigger asChild>
									<Button
										variant={user.twoFactorEnabled ? "destructive" : "outline"}
										size="sm"
										disabled={!recentAuthentication}
									>
										{user.twoFactorEnabled ? (
											<ShieldOff className="mr-2 h-4 w-4" />
										) : (
											<ShieldCheck className="mr-2 h-4 w-4" />
										)}
										{user.twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}
									</Button>
								</DialogTrigger>
								<DialogContent
									showCloseButton={!backupCodesPending}
									onEscapeKeyDown={(event) => {
										if (backupCodesPending) event.preventDefault();
									}}
									onPointerDownOutside={(event) => {
										if (backupCodesPending) event.preventDefault();
									}}
								>
									<DialogHeader>
										<DialogTitle>
											{user.twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}
										</DialogTitle>
										<DialogDescription>
											{requiresPasswordForTwoFactor
												? "A retained legacy credential confirms this sensitive change. It cannot be used to sign in."
												: "Your recent passwordless sign-in confirms this sensitive change."}
										</DialogDescription>
									</DialogHeader>
									{user.twoFactorEnabled ? (
										<TwoFactorDisableForm
											requiresPassword={requiresPasswordForTwoFactor}
											onSuccess={() => {
												setTwoFactorDialogOpen(false);
												router.refresh();
											}}
										/>
									) : (
										<TwoFactorEnableForm
											requiresPassword={requiresPasswordForTwoFactor}
											onBackupCodesPendingChange={setBackupCodesPending}
											onSuccess={() => {
												setTwoFactorDialogOpen(false);
												router.refresh();
											}}
										/>
									)}
								</DialogContent>
							</Dialog>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Fingerprint className="h-5 w-5" /> Passkeys
						</CardTitle>
						<CardDescription>
							Phishing-resistant credentials registered to this account.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{passkeys.length > 0 ? (
							<div className="space-y-3">
								{passkeys.map((passkey) => (
									<div
										key={passkey.id}
										className="flex items-center justify-between gap-3 rounded-md border p-3"
									>
										<div>
											<p className="text-sm font-medium">
												{passkey.name || "Unnamed passkey"}
											</p>
											<p className="text-xs text-muted-foreground">
												Added {formatSecurityDate(passkey.createdAt)}
											</p>
										</div>
										<Button
											variant="ghost"
											size="icon"
											onClick={() => deletePasskey(passkey)}
											disabled={
												!recentAuthentication ||
												busyAction === `passkey:${passkey.id}`
											}
											aria-label={`Remove ${passkey.name || "passkey"}`}
										>
											{busyAction === `passkey:${passkey.id}` ? (
												<Loader2 className="h-4 w-4 animate-spin" />
											) : (
												<Trash2 className="h-4 w-4" />
											)}
										</Button>
									</div>
								))}
							</div>
						) : (
							<p className="text-sm text-muted-foreground">
								No passkeys are registered.
							</p>
						)}
						<div className="flex gap-2">
							<Input
								value={passkeyName}
								onChange={(event) => setPasskeyName(event.target.value)}
								placeholder="Work laptop"
								maxLength={64}
								disabled={!recentAuthentication}
							/>
							<Button
								onClick={addPasskey}
								disabled={!recentAuthentication || busyAction === "passkey:add"}
							>
								{busyAction === "passkey:add" ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<Fingerprint className="mr-2 h-4 w-4" />
								)}
								Add
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>

			<Card className="mt-6">
				<CardHeader className="flex-row items-start justify-between gap-4">
					<div>
						<CardTitle className="flex items-center gap-2">
							<Laptop className="h-5 w-5" /> Active sessions
						</CardTitle>
						<CardDescription className="mt-1.5">
							Authoritative sessions currently allowed to access your account.
						</CardDescription>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={revokeOtherSessions}
						disabled={
							!recentAuthentication ||
							sessions.filter((session) => !session.isCurrent).length === 0 ||
							busyAction === "sessions:others"
						}
					>
						{busyAction === "sessions:others" ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<LogOut className="mr-2 h-4 w-4" />
						)}
						Revoke others
					</Button>
				</CardHeader>
				<CardContent className="space-y-3">
					{sessions.map((session) => (
						<div
							key={session.id}
							className="flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between"
						>
							<div className="min-w-0">
								<div className="flex items-center gap-2">
									<p className="truncate text-sm font-medium">
										{summarizeUserAgent(session.userAgent)}
									</p>
									{session.isCurrent ? (
										<Badge variant="secondary">Current</Badge>
									) : null}
								</div>
								<p className="mt-1 text-xs text-muted-foreground">
									{session.ipAddress || "IP unavailable"} · Started{" "}
									{formatSecurityDate(session.createdAt)} · Expires{" "}
									{formatSecurityDate(session.expiresAt)}
								</p>
							</div>
							<Button
								variant={session.isCurrent ? "outline" : "destructive"}
								size="sm"
								onClick={() => revokeSession(session)}
								disabled={busyAction === `session:${session.id}`}
							>
								{busyAction === `session:${session.id}` ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<LogOut className="mr-2 h-4 w-4" />
								)}
								{session.isCurrent ? "Sign out" : "Terminate"}
							</Button>
						</div>
					))}
					{sessions.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							Session details require a fresh sign-in.
						</p>
					) : null}
				</CardContent>
			</Card>

			<Card className="mt-6">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<KeyRound className="h-5 w-5" /> Personal API keys
					</CardTitle>
					<CardDescription>
						Create personal credentials bound to this account for scripts and
						integrations. The full secret is shown only once.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_11rem_auto]">
						<Input
							value={apiKeyName}
							onChange={(event) => setApiKeyName(event.target.value)}
							placeholder="Production automation"
							maxLength={32}
							disabled={!recentAuthentication || dataUnavailable.apiKeys}
							aria-label="API key name"
						/>
						<Select
							value={apiKeyExpirationDays}
							onValueChange={setApiKeyExpirationDays}
							disabled={!recentAuthentication || dataUnavailable.apiKeys}
						>
							<SelectTrigger aria-label="API key expiration">
								<SelectValue placeholder="Expiration" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="30">30 days</SelectItem>
								<SelectItem value="90">90 days</SelectItem>
								<SelectItem value="365">1 year</SelectItem>
							</SelectContent>
						</Select>
						<Button
							onClick={createApiKey}
							disabled={
								!recentAuthentication ||
								dataUnavailable.apiKeys ||
								busyAction === "api-key:create"
							}
						>
							{busyAction === "api-key:create" ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<Plus className="mr-2 h-4 w-4" />
							)}
							Create key
						</Button>
					</div>

					{apiKeys.length > 0 ? (
						<div className="space-y-3">
							{apiKeys.map((apiKey) => {
								const expired = isApiKeyExpired(apiKey.expiresAt);
								const status = expired
									? "Expired"
									: apiKey.enabled
										? "Active"
										: "Disabled";
								return (
									<div
										key={apiKey.id}
										className="flex flex-col gap-3 rounded-md border p-4 lg:flex-row lg:items-center lg:justify-between"
									>
										<div className="min-w-0 space-y-1">
											<div className="flex flex-wrap items-center gap-2">
												<p className="font-medium">{apiKey.name}</p>
												<Badge
													variant={
														status === "Active" ? "default" : "secondary"
													}
												>
													{status}
												</Badge>
												<code className="rounded bg-muted px-1.5 py-0.5 text-xs">
													{formatApiKeyIdentifier(apiKey.start)}
												</code>
											</div>
											<p className="text-xs text-muted-foreground">
												Created {formatSecurityDate(apiKey.createdAt)}
												{" | "}
												{apiKey.expiresAt
													? `Expires ${formatSecurityDate(apiKey.expiresAt)}`
													: "No expiration"}
											</p>
											<p className="text-xs text-muted-foreground">
												{apiKey.lastRequest
													? `Last used ${formatSecurityDate(apiKey.lastRequest)}`
													: "Never used"}
												{" | "}
												{apiKey.requestCount} requests in the current window
											</p>
										</div>
										<div className="flex flex-wrap gap-2">
											<Button
												variant="outline"
												size="sm"
												onClick={() => {
													setApiKeyToRename(apiKey);
													setApiKeyRename(apiKey.name);
												}}
												disabled={
													!recentAuthentication || dataUnavailable.apiKeys
												}
											>
												<Pencil className="mr-2 h-4 w-4" /> Rename
											</Button>
											<Button
												variant="outline"
												size="sm"
												onClick={() => toggleApiKey(apiKey)}
												disabled={
													!recentAuthentication ||
													dataUnavailable.apiKeys ||
													expired ||
													busyAction === `api-key:toggle:${apiKey.id}`
												}
											>
												{busyAction === `api-key:toggle:${apiKey.id}` ? (
													<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												) : apiKey.enabled ? (
													<PowerOff className="mr-2 h-4 w-4" />
												) : (
													<Power className="mr-2 h-4 w-4" />
												)}
												{apiKey.enabled ? "Disable" : "Enable"}
											</Button>
											<Button
												variant="destructive"
												size="sm"
												onClick={() => setApiKeyToRevoke(apiKey)}
												disabled={
													!recentAuthentication || dataUnavailable.apiKeys
												}
											>
												<Trash2 className="mr-2 h-4 w-4" /> Revoke
											</Button>
										</div>
									</div>
								);
							})}
						</div>
					) : (
						<p className="text-sm text-muted-foreground">
							No personal API keys have been created.
						</p>
					)}
				</CardContent>
			</Card>

			<Dialog
				open={createdApiKey !== null}
				onOpenChange={(open) => {
					if (!open) setCreatedApiKey(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Copy your API key now</DialogTitle>
						<DialogDescription>
							This is the only time CinaSeek will show the full secret for
							{createdApiKey ? ` ${createdApiKey.name}` : " this key"}. Store it
							in a secrets manager; never commit it to source control.
						</DialogDescription>
					</DialogHeader>
					<Input
						value={createdApiKey?.secret ?? ""}
						readOnly
						onFocus={(event) => event.currentTarget.select()}
						aria-label="New API key secret"
						className="font-mono text-xs"
					/>
					<DialogFooter>
						<Button variant="outline" onClick={() => setCreatedApiKey(null)}>
							I have stored it
						</Button>
						<Button onClick={copyApiKeySecret}>
							<Copy className="mr-2 h-4 w-4" /> Copy key
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={apiKeyToRename !== null}
				onOpenChange={(open) => {
					if (!open) setApiKeyToRename(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Rename API key</DialogTitle>
						<DialogDescription>
							Use a name that identifies the workload and environment.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-2">
						<Label htmlFor="api-key-rename">Name</Label>
						<Input
							id="api-key-rename"
							value={apiKeyRename}
							onChange={(event) => setApiKeyRename(event.target.value)}
							maxLength={32}
						/>
					</div>
					<DialogFooter>
						<Button
							onClick={renameApiKey}
							disabled={
								!apiKeyRename.trim() ||
								busyAction === `api-key:rename:${apiKeyToRename?.id}`
							}
						>
							{busyAction === `api-key:rename:${apiKeyToRename?.id}` ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : null}
							Save name
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={apiKeyToRevoke !== null}
				onOpenChange={(open) => {
					if (!open) setApiKeyToRevoke(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Revoke this API key?</DialogTitle>
						<DialogDescription>
							{apiKeyToRevoke?.name || "This key"} will stop working
							immediately. This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="destructive"
							onClick={revokeApiKey}
							disabled={busyAction === `api-key:revoke:${apiKeyToRevoke?.id}`}
						>
							{busyAction === `api-key:revoke:${apiKeyToRevoke?.id}` ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<Trash2 className="mr-2 h-4 w-4" />
							)}
							Revoke permanently
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Card className="mt-6">
				<CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<CardTitle className="flex items-center gap-2">
							<WalletCards className="h-5 w-5" /> Ethereum wallets
						</CardTitle>
						<CardDescription className="mt-1.5">
							Prove wallet control with EIP-4361, choose a primary wallet, and
							manage wallet sign-in access.
						</CardDescription>
					</div>
					<div className="flex flex-wrap gap-2">
						<ReownWalletEntry
							capabilities={walletCapabilities}
							walletCookie={walletCookie}
							purpose="link-wallet"
							label="Connect wallet"
							variant="default"
							disabled={!recentAuthentication || dataUnavailable.wallets}
							onSuccess={() =>
								refreshWallets().catch(() => {
									router.refresh();
								})
							}
						/>
						{walletUiEnabled && walletCapabilities.methods.siwe === true ? (
							<Button
								variant="outline"
								onClick={connectWallet}
								disabled={
									!recentAuthentication ||
									dataUnavailable.wallets ||
									busyAction === "wallet:connect"
								}
							>
								{busyAction === "wallet:connect" ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<Plus className="mr-2 h-4 w-4" />
								)}
								Use browser wallet
							</Button>
						) : null}
					</div>
				</CardHeader>
				<CardContent className="space-y-3">
					{dataUnavailable.wallets ? (
						<p className="text-sm text-muted-foreground">
							Wallet data is temporarily unavailable. Sensitive controls remain
							disabled.
						</p>
					) : wallets.length > 0 ? (
						wallets.map((wallet) => (
							<div
								key={wallet.id}
								className="flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between"
							>
								<div className="min-w-0 space-y-1">
									<div className="flex flex-wrap items-center gap-2">
										<code className="text-sm font-medium">
											{formatWalletAddress(wallet.address)}
										</code>
										<Badge variant="secondary">
											{formatWalletChain(wallet.chainId)}
										</Badge>
										{wallet.isPrimary ? <Badge>Primary</Badge> : null}
									</div>
									<p className="text-xs text-muted-foreground">
										Chain ID {wallet.chainId} · Connected{" "}
										{formatSecurityDate(wallet.createdAt)}
									</p>
								</div>
								<div className="flex flex-wrap gap-2">
									{!wallet.isPrimary ? (
										<Button
											variant="outline"
											size="sm"
											onClick={() => setPrimaryWallet(wallet)}
											disabled={
												!recentAuthentication ||
												busyAction === `wallet:primary:${wallet.id}`
											}
										>
											{busyAction === `wallet:primary:${wallet.id}` ? (
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											) : null}
											Make primary
										</Button>
									) : null}
									<Button
										variant="destructive"
										size="sm"
										onClick={() => setWalletToUnlink(wallet)}
										disabled={!recentAuthentication}
									>
										<Unlink className="mr-2 h-4 w-4" /> Disconnect
									</Button>
								</div>
							</div>
						))
					) : (
						<p className="text-sm text-muted-foreground">
							No Ethereum wallets are connected to this account.
						</p>
					)}
				</CardContent>
			</Card>

			<Dialog
				open={walletToUnlink !== null}
				onOpenChange={(open) => {
					if (!open) setWalletToUnlink(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Disconnect this wallet?</DialogTitle>
						<DialogDescription>
							{walletToUnlink
								? `${formatWalletAddress(walletToUnlink.address)} on ${formatWalletChain(walletToUnlink.chainId)}`
								: "This wallet"}{" "}
							will no longer be able to sign in. CinaSeek will refuse the change
							if it would remove your last login method.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="destructive"
							onClick={unlinkWallet}
							disabled={busyAction === `wallet:unlink:${walletToUnlink?.id}`}
						>
							{busyAction === `wallet:unlink:${walletToUnlink?.id}` ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<Unlink className="mr-2 h-4 w-4" />
							)}
							Disconnect wallet
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Card className="mt-6">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Link2 className="h-5 w-5" /> Linked identities
					</CardTitle>
					<CardDescription>
						Review every sign-in identity attached to this CinaSeek account.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-3 md:grid-cols-2">
						{accounts.map((account) => (
							<div
								key={account.id}
								className="flex items-center justify-between gap-3 rounded-md border p-4"
							>
								<div className="min-w-0">
									<p className="font-medium">
										{formatOAuthProviderName(account.providerId)}
									</p>
									<p className="truncate text-xs text-muted-foreground">
										Connected {formatSecurityDate(account.createdAt)}
									</p>
								</div>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => unlinkAccount(account)}
									disabled={
										!recentAuthentication ||
										!canUnlinkAccount(accounts.length) ||
										busyAction === `account:${account.id}`
									}
									aria-label={`Disconnect ${account.providerId}`}
								>
									{busyAction === `account:${account.id}` ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<Unlink className="h-4 w-4" />
									)}
								</Button>
							</div>
						))}
					</div>
					{availableProviders.length > 0 ? (
						<div className="flex flex-wrap gap-2 border-t pt-4">
							{availableProviders.map((provider) => (
								<Button
									key={provider.id}
									variant="outline"
									size="sm"
									onClick={() => linkProvider(provider)}
									disabled={
										!recentAuthentication ||
										busyAction === `provider:${provider.id}`
									}
								>
									{busyAction === `provider:${provider.id}` ? (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									) : (
										<Link2 className="mr-2 h-4 w-4" />
									)}
									Connect {formatOAuthProviderName(provider.id)}
								</Button>
							))}
						</div>
					) : null}
				</CardContent>
			</Card>

			<Card
				id="delete-account"
				className="mt-6 border-destructive/40 scroll-mt-6"
			>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-destructive">
						<AlertTriangle className="h-5 w-5" /> Danger zone
					</CardTitle>
					<CardDescription>
						Account deletion removes the active account and invalidates every
						session. Declared security or legal evidence may remain only for its
						listed retention period.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Dialog
						open={deleteDialogOpen}
						onOpenChange={(open) => {
							setDeleteDialogOpen(open);
							if (open) {
								void loadDeletionReadiness();
							} else {
								setDeletionReadiness(null);
								setDeletionReadinessError(null);
							}
						}}
					>
						<DialogTrigger asChild>
							<Button variant="destructive" disabled={!recentAuthentication}>
								<Trash2 className="mr-2 h-4 w-4" /> Delete account
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Delete this CinaSeek account?</DialogTitle>
								<DialogDescription>
									This cannot be undone. Review the retention snapshot, then
									type the full account email to confirm. A signed JSON deletion
									receipt will download after completion.
								</DialogDescription>
							</DialogHeader>
							<div className="space-y-4">
								{deletionReadinessLoading ? (
									<div className="flex items-center gap-2 rounded-md border p-3 text-sm text-muted-foreground">
										<Loader2 className="h-4 w-4 animate-spin" /> Checking
										deletion holds and retention policy…
									</div>
								) : null}
								{deletionReadinessError ? (
									<Alert variant="destructive">
										<AlertTriangle className="h-4 w-4" />
										<AlertTitle>Deletion readiness unavailable</AlertTitle>
										<AlertDescription>
											{deletionReadinessError}
										</AlertDescription>
									</Alert>
								) : null}
								{deletionReadiness ? (
									<div className="space-y-3 rounded-md border p-4 text-sm">
										<div className="flex flex-wrap items-center justify-between gap-2">
											<p className="font-medium">Retention policy</p>
											<Badge variant="secondary">
												{deletionReadiness.policyVersion}
											</Badge>
										</div>
										{deletionReadiness.retentionExceptions.length > 0 ? (
											<ul className="space-y-2 text-muted-foreground">
												{deletionReadiness.retentionExceptions.map(
													(exception) => (
														<li key={exception.code}>
															<span className="font-medium text-foreground">
																{exception.category}
															</span>{" "}
															— {exception.purpose}
															{exception.maximumRetentionDays
																? ` (up to ${exception.maximumRetentionDays} days)`
																: ""}
														</li>
													),
												)}
											</ul>
										) : (
											<p className="text-muted-foreground">
												No retention exceptions are declared.
											</p>
										)}
										{deletionReadiness.requiredProcessors.length > 0 ? (
											<Alert>
												<ShieldCheck className="h-4 w-4" />
												<AlertTitle>
													External erasure confirmation required
												</AlertTitle>
												<AlertDescription>
													Before local deletion, CinaSeek requires signed,
													idempotent confirmation from{" "}
													{deletionReadiness.requiredProcessors
														.map((processor) => formatProcessorId(processor.id))
														.join(", ")}
													.
												</AlertDescription>
											</Alert>
										) : null}
										{deletionReadiness.blockingHolds.length > 0 ? (
											<Alert variant="destructive">
												<AlertTriangle className="h-4 w-4" />
												<AlertTitle>Deletion is currently blocked</AlertTitle>
												<AlertDescription>
													{deletionReadiness.blockingHolds
														.map((hold) => hold.reason)
														.join(" ")}
												</AlertDescription>
											</Alert>
										) : null}
									</div>
								) : null}
								<div className="space-y-2">
									<Label htmlFor="delete-confirmation">Account email</Label>
									<Input
										id="delete-confirmation"
										value={deleteConfirmation}
										onChange={(event) =>
											setDeleteConfirmation(event.target.value)
										}
										placeholder={user.email}
										autoComplete="off"
									/>
								</div>
							</div>
							<DialogFooter>
								<Button
									variant="destructive"
									onClick={deleteAccount}
									disabled={
										!destructiveActionReady || busyAction === "account:delete"
									}
								>
									{busyAction === "account:delete" ? (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									) : (
										<Trash2 className="mr-2 h-4 w-4" />
									)}
									Permanently delete
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</CardContent>
			</Card>
		</div>
	);
}

function SecurityRow({
	label,
	value,
	secure,
}: {
	label: string;
	value: string;
	secure: boolean;
}) {
	return (
		<div className="flex items-center justify-between gap-4">
			<div>
				<p className="text-sm font-medium">{label}</p>
				<p className="text-xs text-muted-foreground">{value}</p>
			</div>
			{secure ? (
				<Check className="h-5 w-5 text-emerald-600" />
			) : (
				<AlertTriangle className="h-5 w-5 text-amber-600" />
			)}
		</div>
	);
}
