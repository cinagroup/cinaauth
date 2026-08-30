"use client";

import {
	AlertTriangle,
	Copy,
	Database,
	KeyRound,
	Loader2,
	Plus,
	RefreshCw,
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
	useSCIMProviderRevokeMutation,
	useSCIMTokenGenerateMutation,
} from "@/data/organization/enterprise-connection-mutations";
import type { SCIMProviderConnection, SSOProviderSummary } from "@/lib/auth";
import type { DashboardMessages } from "@/lib/dashboard-i18n";
import { formatDashboardMessage } from "@/lib/dashboard-i18n";
import { SSOProviderManager } from "./sso-provider-manager";

type EnterpriseConnectionsCardProps = {
	organizationId: string;
	recentAuthentication: boolean;
	authoritativeOrganizationData: boolean;
	initialSSOProviders: SSOProviderSummary[];
	initialSCIMProviders: SCIMProviderConnection[];
	dataUnavailable: {
		sso: boolean;
		scim: boolean;
	};
};

type SCIMTokenNotice = {
	providerId: string;
	token: string;
};

const getProviderIdError = (
	providerId: string,
	ssoProviders: SSOProviderSummary[],
	scimProviders: SCIMProviderConnection[],
): string | null => {
	if (!providerId) return "Enter a stable provider ID.";
	if (providerId.length > 64)
		return "Provider ID must be 64 characters or less.";
	if (!/^[a-z0-9][a-z0-9_-]*$/.test(providerId)) {
		return "Use lowercase letters, numbers, hyphens, or underscores.";
	}
	if (
		ssoProviders.some((provider) => provider.providerId === providerId) ||
		scimProviders.some((provider) => provider.providerId === providerId)
	) {
		return "That provider ID is already in use.";
	}
	return null;
};

const localizeProviderIdError = (
	error: string | null,
	messages: DashboardMessages,
) => {
	if (!error) return error;
	const localizedErrors: Record<string, string> = {
		"Enter a stable provider ID.": messages.providerIdRequired,
		"Provider ID must be 64 characters or less.": messages.providerIdTooLong,
		"Use lowercase letters, numbers, hyphens, or underscores.":
			messages.providerIdInvalid,
		"That provider ID is already in use.": messages.providerIdInUse,
	};
	return localizedErrors[error] ?? error;
};

const copyValue = async (
	value: string,
	successMessage: string,
	errorMessage: string,
) => {
	try {
		await navigator.clipboard.writeText(value);
		toast.success(successMessage);
	} catch {
		toast.error(errorMessage);
	}
};

export function EnterpriseConnectionsCard({
	organizationId,
	recentAuthentication,
	authoritativeOrganizationData,
	initialSSOProviders,
	initialSCIMProviders,
	dataUnavailable,
}: EnterpriseConnectionsCardProps) {
	const { messages } = useDashboardI18n();
	const router = useRouter();
	const [scimToken, setSCIMToken] = useState<SCIMTokenNotice | null>(null);
	const [createSCIMOpen, setCreateSCIMOpen] = useState(false);
	const [newProviderId, setNewProviderId] = useState("");
	const generateSCIMMutation = useSCIMTokenGenerateMutation();
	const revokeSCIMMutation = useSCIMProviderRevokeMutation();
	const writeActionsAvailable =
		recentAuthentication && authoritativeOrganizationData;
	const normalizedProviderId = newProviderId.trim().toLowerCase();
	const providerIdError = localizeProviderIdError(
		getProviderIdError(
			normalizedProviderId,
			initialSSOProviders,
			initialSCIMProviders,
		),
		messages,
	);

	const generateToken = (providerId: string) => {
		generateSCIMMutation.mutate(
			{ providerId, organizationId },
			{
				onSuccess: (token) => {
					setCreateSCIMOpen(false);
					setNewProviderId("");
					setSCIMToken({ providerId, token });
					toast.success(messages.scimTokenGenerated);
					router.refresh();
				},
			},
		);
	};

	const revokeProvider = (providerId: string) => {
		revokeSCIMMutation.mutate(providerId, {
			onSuccess: () => {
				toast.success(messages.scimTokenRevoked);
				router.refresh();
			},
		});
	};

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle>{messages.enterpriseConnections}</CardTitle>
					<CardDescription>
						{messages.enterpriseConnectionsDescription}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{!recentAuthentication ? (
						<Alert>
							<AlertTriangle className="h-4 w-4" />
							<AlertTitle>{messages.freshSignInChanges}</AlertTitle>
							<AlertDescription>
								{messages.freshSignInChangesDescription}
							</AlertDescription>
						</Alert>
					) : null}

					<div className="grid gap-6 lg:grid-cols-2">
						<SSOProviderManager
							organizationId={organizationId}
							recentAuthentication={recentAuthentication}
							authoritativeOrganizationData={authoritativeOrganizationData}
							providers={initialSSOProviders}
							scimProviders={initialSCIMProviders}
							unavailable={dataUnavailable.sso}
						/>

						<section
							className="space-y-3"
							aria-labelledby="scim-connections-title"
						>
							<div className="flex items-center justify-between gap-3">
								<h3
									id="scim-connections-title"
									className="flex items-center gap-2 text-sm font-semibold"
								>
									<Database className="h-4 w-4 text-muted-foreground" /> SCIM
								</h3>
								<div className="flex items-center gap-2">
									<Badge variant="outline">{initialSCIMProviders.length}</Badge>
									<Button
										size="sm"
										variant="outline"
										onClick={() => setCreateSCIMOpen(true)}
										disabled={!writeActionsAvailable || dataUnavailable.scim}
									>
										<Plus className="h-4 w-4" /> {messages.newToken}
									</Button>
								</div>
							</div>
							{dataUnavailable.scim ? (
								<Alert>
									<AlertTriangle className="h-4 w-4" />
									<AlertTitle>{messages.scimInventoryUnavailable}</AlertTitle>
									<AlertDescription>
										{messages.scimInventoryUnavailableDescription}
									</AlertDescription>
								</Alert>
							) : initialSCIMProviders.length > 0 ? (
								<div className="space-y-3">
									{initialSCIMProviders.map((provider) => (
										<div key={provider.id} className="rounded-lg border p-4">
											<p className="text-sm font-medium">
												{provider.providerId}
											</p>
											<p className="mt-2 break-all text-xs text-muted-foreground">
												https://auth.cinaseek.ai/api/auth/scim/v2
											</p>
											<p className="mt-1 text-xs text-muted-foreground">
												{messages.scimTokenHashed}
											</p>
											<div className="mt-4 flex flex-wrap gap-2">
												<AlertDialog>
													<AlertDialogTrigger asChild>
														<Button
															size="sm"
															variant="outline"
															disabled={
																!writeActionsAvailable ||
																generateSCIMMutation.isPending
															}
														>
															<RefreshCw className="h-4 w-4" />{" "}
															{messages.rotate}
														</Button>
													</AlertDialogTrigger>
													<AlertDialogContent>
														<AlertDialogHeader>
															<AlertDialogTitle>
																{messages.rotateScimToken}
															</AlertDialogTitle>
															<AlertDialogDescription>
																{messages.rotateScimTokenDescription}
															</AlertDialogDescription>
														</AlertDialogHeader>
														<AlertDialogFooter>
															<AlertDialogCancel>
																{messages.keepCurrentToken}
															</AlertDialogCancel>
															<AlertDialogAction
																onClick={() =>
																	generateToken(provider.providerId)
																}
															>
																{messages.rotateToken}
															</AlertDialogAction>
														</AlertDialogFooter>
													</AlertDialogContent>
												</AlertDialog>
												<AlertDialog>
													<AlertDialogTrigger asChild>
														<Button
															size="sm"
															variant="destructive"
															disabled={
																!writeActionsAvailable ||
																revokeSCIMMutation.isPending
															}
														>
															<Trash2 className="h-4 w-4" /> {messages.revoke}
														</Button>
													</AlertDialogTrigger>
													<AlertDialogContent>
														<AlertDialogHeader>
															<AlertDialogTitle>
																{messages.revokeScimToken}
															</AlertDialogTitle>
															<AlertDialogDescription>
																{messages.revokeScimTokenDescription}
															</AlertDialogDescription>
														</AlertDialogHeader>
														<AlertDialogFooter>
															<AlertDialogCancel>
																{messages.keepToken}
															</AlertDialogCancel>
															<AlertDialogAction
																className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
																onClick={() =>
																	revokeProvider(provider.providerId)
																}
															>
																{messages.revokeToken}
															</AlertDialogAction>
														</AlertDialogFooter>
													</AlertDialogContent>
												</AlertDialog>
											</div>
										</div>
									))}
								</div>
							) : (
								<p className="text-sm text-muted-foreground">
									{messages.noScimConnection}
								</p>
							)}
						</section>
					</div>
				</CardContent>
			</Card>

			<Dialog
				open={createSCIMOpen}
				onOpenChange={(open) => {
					setCreateSCIMOpen(open);
					if (!open) setNewProviderId("");
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{messages.createScimToken}</DialogTitle>
						<DialogDescription>
							{messages.createScimTokenDescription}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-2">
						<Label htmlFor="new-scim-provider-id">{messages.providerId}</Label>
						<Input
							id="new-scim-provider-id"
							placeholder={messages.providerIdPlaceholder}
							maxLength={64}
							value={newProviderId}
							onChange={(event) => setNewProviderId(event.target.value)}
						/>
						<p className="text-xs text-muted-foreground">
							{messages.providerIdHint}
						</p>
						{newProviderId && providerIdError ? (
							<p className="text-sm text-destructive">{providerIdError}</p>
						) : null}
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setCreateSCIMOpen(false)}>
							{messages.cancel}
						</Button>
						<Button
							onClick={() => generateToken(normalizedProviderId)}
							disabled={
								providerIdError !== null || generateSCIMMutation.isPending
							}
						>
							{generateSCIMMutation.isPending ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<KeyRound className="h-4 w-4" />
							)}
							{messages.generateToken}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={scimToken !== null}
				onOpenChange={(open) => {
					if (!open) setSCIMToken(null);
				}}
			>
				<DialogContent className="sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle>{messages.copyScimTokenNow}</DialogTitle>
						<DialogDescription>
							{messages.copyScimTokenNowDescription}
						</DialogDescription>
					</DialogHeader>
					<Alert>
						<KeyRound className="h-4 w-4" />
						<AlertTitle>
							{formatDashboardMessage(messages.oneTimeSecretFor, {
								provider: scimToken?.providerId ?? "",
							})}
						</AlertTitle>
						<AlertDescription>
							{messages.oneTimeSecretDescription}
						</AlertDescription>
					</Alert>
					<code className="block max-h-40 overflow-auto break-all rounded bg-muted p-4 text-xs">
						{scimToken?.token}
					</code>
					<div className="rounded-lg border p-4 text-sm">
						<p className="font-medium">{messages.scimBaseUrl}</p>
						<p className="mt-1 break-all text-xs text-muted-foreground">
							https://auth.cinaseek.ai/api/auth/scim/v2
						</p>
					</div>
					<DialogFooter>
						<Button
							onClick={() => {
								if (scimToken) {
									void copyValue(
										scimToken.token,
										messages.scimTokenCopied,
										messages.unableCopyScimToken,
									);
								}
							}}
						>
							<Copy className="h-4 w-4" /> {messages.copyToken}
						</Button>
						<Button variant="outline" onClick={() => setSCIMToken(null)}>
							{messages.storedSecurely}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
