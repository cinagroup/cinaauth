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

const copyValue = async (value: string, label: string) => {
	try {
		await navigator.clipboard.writeText(value);
		toast.success(`${label} copied`);
	} catch {
		toast.error(`Unable to copy ${label.toLowerCase()}`);
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
	const router = useRouter();
	const [scimToken, setSCIMToken] = useState<SCIMTokenNotice | null>(null);
	const [createSCIMOpen, setCreateSCIMOpen] = useState(false);
	const [newProviderId, setNewProviderId] = useState("");
	const generateSCIMMutation = useSCIMTokenGenerateMutation();
	const revokeSCIMMutation = useSCIMProviderRevokeMutation();
	const writeActionsAvailable =
		recentAuthentication && authoritativeOrganizationData;
	const normalizedProviderId = newProviderId.trim().toLowerCase();
	const providerIdError = getProviderIdError(
		normalizedProviderId,
		initialSSOProviders,
		initialSCIMProviders,
	);

	const generateToken = (providerId: string) => {
		generateSCIMMutation.mutate(
			{ providerId, organizationId },
			{
				onSuccess: (token) => {
					setCreateSCIMOpen(false);
					setNewProviderId("");
					setSCIMToken({ providerId, token });
					toast.success("SCIM token generated. Copy it now.");
					router.refresh();
				},
			},
		);
	};

	const revokeProvider = (providerId: string) => {
		revokeSCIMMutation.mutate(providerId, {
			onSuccess: () => {
				toast.success("SCIM token revoked");
				router.refresh();
			},
		});
	};

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle>Enterprise connections</CardTitle>
					<CardDescription>
						Authoritative SSO and SCIM connections scoped to this organization.
						Secret material is only shown at issuance.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{!recentAuthentication ? (
						<Alert>
							<AlertTriangle className="h-4 w-4" />
							<AlertTitle>Fresh sign-in required for changes</AlertTitle>
							<AlertDescription>
								Inventory remains visible, but DNS verification and SCIM token
								changes are disabled until you sign in again.
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
										<Plus className="h-4 w-4" /> New token
									</Button>
								</div>
							</div>
							{dataUnavailable.scim ? (
								<Alert>
									<AlertTriangle className="h-4 w-4" />
									<AlertTitle>SCIM inventory unavailable</AlertTitle>
									<AlertDescription>
										No cached token connection data is shown and changes are
										disabled.
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
												Token is stored hashed and cannot be recovered.
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
															<RefreshCw className="h-4 w-4" /> Rotate
														</Button>
													</AlertDialogTrigger>
													<AlertDialogContent>
														<AlertDialogHeader>
															<AlertDialogTitle>
																Rotate SCIM token?
															</AlertDialogTitle>
															<AlertDialogDescription>
																The current token stops working immediately. The
																replacement is shown once and must be copied
																before closing.
															</AlertDialogDescription>
														</AlertDialogHeader>
														<AlertDialogFooter>
															<AlertDialogCancel>
																Keep current token
															</AlertDialogCancel>
															<AlertDialogAction
																onClick={() =>
																	generateToken(provider.providerId)
																}
															>
																Rotate token
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
															<Trash2 className="h-4 w-4" /> Revoke
														</Button>
													</AlertDialogTrigger>
													<AlertDialogContent>
														<AlertDialogHeader>
															<AlertDialogTitle>
																Revoke SCIM token?
															</AlertDialogTitle>
															<AlertDialogDescription>
																Provisioning requests using this provider stop
																immediately. This cannot be undone.
															</AlertDialogDescription>
														</AlertDialogHeader>
														<AlertDialogFooter>
															<AlertDialogCancel>Keep token</AlertDialogCancel>
															<AlertDialogAction
																className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
																onClick={() =>
																	revokeProvider(provider.providerId)
																}
															>
																Revoke token
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
									No SCIM token connection exists for this organization.
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
						<DialogTitle>Create SCIM token</DialogTitle>
						<DialogDescription>
							Use a stable provider ID for this IdP. The token is scoped to the
							active organization and shown once.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-2">
						<Label htmlFor="new-scim-provider-id">Provider ID</Label>
						<Input
							id="new-scim-provider-id"
							placeholder="acme-scim"
							maxLength={64}
							value={newProviderId}
							onChange={(event) => setNewProviderId(event.target.value)}
						/>
						<p className="text-xs text-muted-foreground">
							Lowercase letters, numbers, hyphens, and underscores only.
						</p>
						{newProviderId && providerIdError ? (
							<p className="text-sm text-destructive">{providerIdError}</p>
						) : null}
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setCreateSCIMOpen(false)}>
							Cancel
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
							Generate token
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
						<DialogTitle>Copy this SCIM token now</DialogTitle>
						<DialogDescription>
							CinaSeek stores only a hash. Closing this dialog permanently hides
							the token; rotate it to obtain another one.
						</DialogDescription>
					</DialogHeader>
					<Alert>
						<KeyRound className="h-4 w-4" />
						<AlertTitle>One-time secret for {scimToken?.providerId}</AlertTitle>
						<AlertDescription>
							Store it in the identity provider secret field, never in source
							control or browser storage.
						</AlertDescription>
					</Alert>
					<code className="block max-h-40 overflow-auto break-all rounded bg-muted p-4 text-xs">
						{scimToken?.token}
					</code>
					<div className="rounded-lg border p-4 text-sm">
						<p className="font-medium">SCIM base URL</p>
						<p className="mt-1 break-all text-xs text-muted-foreground">
							https://auth.cinaseek.ai/api/auth/scim/v2
						</p>
					</div>
					<DialogFooter>
						<Button
							onClick={() => {
								if (scimToken) void copyValue(scimToken.token, "SCIM token");
							}}
						>
							<Copy className="h-4 w-4" /> Copy token
						</Button>
						<Button variant="outline" onClick={() => setSCIMToken(null)}>
							I stored it securely
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
