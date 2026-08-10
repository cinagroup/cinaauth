"use client";

import {
	AlertTriangle,
	ArrowLeft,
	Clock3,
	Database,
	Download,
	FileCheck2,
	KeyRound,
	Loader2,
	RefreshCw,
	ShieldCheck,
	Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
	getPersonalDataExportFilename,
	parsePrivacyAsyncExportStatus,
	type PrivacyAsyncExportStatus,
	PRIVACY_ASYNC_EXPORT_DOWNLOAD_PATH,
	PRIVACY_ASYNC_EXPORT_PATH,
	PRIVACY_ASYNC_EXPORT_STATUS_PATH,
	PRIVACY_EXPORT_CATEGORIES,
	PRIVACY_EXPORT_PATH,
} from "@/lib/privacy-center";

const ACTIVE_ASYNC_EXPORT_STATES = new Set([
	"queued",
	"processing",
	"retrying",
]);

const saveExportResponse = async (response: Response) => {
	const objectURL = URL.createObjectURL(await response.blob());
	try {
		const link = document.createElement("a");
		link.href = objectURL;
		link.download = getPersonalDataExportFilename(
			response.headers.get("content-disposition"),
		);
		link.rel = "noopener";
		document.body.append(link);
		link.click();
		link.remove();
	} finally {
		URL.revokeObjectURL(objectURL);
	}
};

const readableBytes = (size: number | undefined) => {
	if (size === undefined) return null;
	if (size < 1_024) return `${size} B`;
	if (size < 1_024 * 1_024) return `${(size / 1_024).toFixed(1)} KB`;
	return `${(size / (1_024 * 1_024)).toFixed(1)} MB`;
};

export function PrivacyCenter({
	recentAuthentication,
}: {
	recentAuthentication: boolean;
}) {
	const [isExporting, setIsExporting] = useState(false);
	const [isQueueingExport, setIsQueueingExport] = useState(false);
	const [isDownloadingAsync, setIsDownloadingAsync] = useState(false);
	const [asyncExport, setAsyncExport] =
		useState<PrivacyAsyncExportStatus | null>(null);
	const asyncJobId = asyncExport?.jobId;
	const asyncExportActive = Boolean(
		asyncExport && ACTIVE_ASYNC_EXPORT_STATES.has(asyncExport.status),
	);

	useEffect(() => {
		if (!asyncJobId || !asyncExportActive) return;
		const controller = new AbortController();
		let timeout: ReturnType<typeof setTimeout> | undefined;

		const poll = async () => {
			try {
				const response = await fetch(
					`${PRIVACY_ASYNC_EXPORT_STATUS_PATH}?jobId=${encodeURIComponent(asyncJobId)}`,
					{
						credentials: "include",
						cache: "no-store",
						headers: { Accept: "application/json" },
						signal: controller.signal,
					},
				);
				const status = parsePrivacyAsyncExportStatus(await response.json());
				if (!response.ok && response.status !== 410) {
					throw new Error(`Export status returned HTTP ${response.status}`);
				}
				if (!status) throw new Error("Invalid export status response");
				if (controller.signal.aborted) return;
				setAsyncExport(status);
				if (ACTIVE_ASYNC_EXPORT_STATES.has(status.status)) {
					timeout = setTimeout(poll, 3_000);
				} else if (status.status === "ready") {
					toast.success("Your encrypted personal data export is ready.");
				} else if (status.status === "failed") {
					toast.error("The encrypted export could not be prepared. Try again.");
				}
			} catch (error) {
				if (controller.signal.aborted) return;
				console.warn("Privacy export status poll failed", error);
				timeout = setTimeout(poll, 5_000);
			}
		};

		timeout = setTimeout(poll, 2_000);
		return () => {
			controller.abort();
			if (timeout) clearTimeout(timeout);
		};
	}, [asyncExportActive, asyncJobId]);

	const requestAsyncExport = async () => {
		setIsQueueingExport(true);
		try {
			const response = await fetch(PRIVACY_ASYNC_EXPORT_PATH, {
				method: "POST",
				credentials: "include",
				cache: "no-store",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
				},
				body: "{}",
			});
			const status = parsePrivacyAsyncExportStatus(await response.json());
			if (!response.ok || !status) {
				throw new Error(
					response.status === 403
						? "Sign in again before requesting an encrypted export."
						: "CinaAuth could not queue the encrypted export.",
				);
			}
			setAsyncExport(status);
			toast.success("Encrypted export queued. This page will update automatically.");
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "CinaAuth could not queue the encrypted export.",
			);
		} finally {
			setIsQueueingExport(false);
		}
	};

	const exportPersonalData = async () => {
		setIsExporting(true);
		try {
			const response = await fetch(PRIVACY_EXPORT_PATH, {
				method: "GET",
				credentials: "include",
				cache: "no-store",
				headers: { Accept: "application/json" },
			});
			if (response.status === 413) {
				await requestAsyncExport();
				return;
			}
			if (!response.ok) {
				throw new Error(
					response.status === 403
						? "Sign in again before exporting personal data."
						: "CinaAuth could not prepare the personal data export.",
				);
			}

			await saveExportResponse(response);
			toast.success("Your personal data export is ready.");
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "CinaAuth could not prepare the personal data export.",
			);
		} finally {
			setIsExporting(false);
		}
	};

	const downloadAsyncExport = async () => {
		if (!asyncExport || asyncExport.status !== "ready") return;
		setIsDownloadingAsync(true);
		try {
			const response = await fetch(
				`${PRIVACY_ASYNC_EXPORT_DOWNLOAD_PATH}?jobId=${encodeURIComponent(asyncExport.jobId)}`,
				{
					credentials: "include",
					cache: "no-store",
					headers: { Accept: "application/json" },
				},
			);
			if (!response.ok) {
				throw new Error("The encrypted export is no longer available.");
			}
			await saveExportResponse(response);
			toast.success("Encrypted personal data export downloaded.");
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "CinaAuth could not download the encrypted export.",
			);
		} finally {
			setIsDownloadingAsync(false);
		}
	};

	const cancelAsyncExport = async () => {
		if (!asyncExport) return;
		try {
			const response = await fetch(PRIVACY_ASYNC_EXPORT_PATH, {
				method: "DELETE",
				credentials: "include",
				cache: "no-store",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ jobId: asyncExport.jobId }),
			});
			if (!response.ok) throw new Error("Export deletion failed");
			setAsyncExport(null);
			toast.success("Encrypted export artifacts deleted.");
		} catch {
			toast.error("CinaAuth could not delete the encrypted export.");
		}
	};

	return (
		<div className="mx-auto w-full max-w-5xl py-6">
			<div className="mb-6 flex flex-wrap items-center justify-between gap-3">
				<div>
					<p className="text-sm font-medium text-primary">CinaAuth account</p>
					<h1 className="text-3xl font-semibold tracking-tight">
						Privacy Center
					</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						Export your authentication data and review deletion controls.
					</p>
				</div>
				<Button asChild variant="outline">
					<Link href="/dashboard">
						<ArrowLeft className="mr-2 h-4 w-4" /> Dashboard
					</Link>
				</Button>
			</div>

			{recentAuthentication ? null : (
				<Alert className="mb-6 border-amber-500/40">
					<AlertTriangle className="h-4 w-4" />
					<AlertTitle>Recent authentication required</AlertTitle>
					<AlertDescription>
						Sign out and sign in again before exporting or deleting personal
						data.
					</AlertDescription>
				</Alert>
			)}

			<div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
				<Card>
					<CardHeader>
						<div className="flex flex-wrap items-start justify-between gap-3">
							<div>
								<CardTitle className="flex items-center gap-2">
									<Database className="h-5 w-5" /> Personal data export
								</CardTitle>
								<CardDescription className="mt-2">
									Download a structured, machine-readable JSON copy.
								</CardDescription>
							</div>
							<Badge variant="secondary">JSON · schema v1</Badge>
						</div>
					</CardHeader>
					<CardContent className="space-y-5">
						<ul className="grid gap-3 sm:grid-cols-2">
							{PRIVACY_EXPORT_CATEGORIES.map((category) => (
								<li
									key={category}
									className="flex items-start gap-2 rounded-md border p-3 text-sm"
								>
									<FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
									{category}
								</li>
							))}
						</ul>
						<Alert>
							<KeyRound className="h-4 w-4" />
							<AlertTitle>Credential secrets stay excluded</AlertTitle>
							<AlertDescription>
								The file never contains passwords, session tokens, OAuth tokens,
								API key hashes, TOTP secrets, recovery codes, or WebAuthn key
								material.
							</AlertDescription>
						</Alert>
						<div className="flex flex-wrap gap-3">
							<Button
								onClick={exportPersonalData}
								disabled={!recentAuthentication || isExporting}
							>
								{isExporting ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<Download className="mr-2 h-4 w-4" />
								)}
								Download now
							</Button>
							<Button
								variant="outline"
								onClick={requestAsyncExport}
								disabled={
									!recentAuthentication ||
									isQueueingExport ||
									asyncExportActive
								}
							>
								{isQueueingExport ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<Clock3 className="mr-2 h-4 w-4" />
								)}
								Prepare encrypted export
							</Button>
						</div>
						{asyncExport ? (
							<div
								className="space-y-3 rounded-md border bg-muted/30 p-4"
								aria-live="polite"
							>
								<div className="flex flex-wrap items-center justify-between gap-2">
									<div>
										<p className="text-sm font-medium">Encrypted export</p>
										<p className="text-xs text-muted-foreground">
											Status: {asyncExport.status}
											{readableBytes(asyncExport.size)
												? ` · ${readableBytes(asyncExport.size)}`
												: ""}
										</p>
									</div>
									{asyncExportActive ? (
										<RefreshCw className="h-4 w-4 animate-spin text-primary" />
									) : null}
								</div>
								<p className="text-xs text-muted-foreground">
									Stored with a per-object customer encryption key and deleted no
									later than {new Date(asyncExport.expiresAt).toLocaleString()}.
								</p>
								<div className="flex flex-wrap gap-2">
									{asyncExport.status === "ready" ? (
										<Button
											size="sm"
											onClick={downloadAsyncExport}
											disabled={isDownloadingAsync}
										>
											{isDownloadingAsync ? (
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											) : (
												<Download className="mr-2 h-4 w-4" />
											)}
											Download encrypted export
										</Button>
									) : null}
									<Button size="sm" variant="ghost" onClick={cancelAsyncExport}>
										Delete export
									</Button>
								</div>
							</div>
						) : null}
					</CardContent>
				</Card>

				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-base">
								<ShieldCheck className="h-5 w-5" /> Export safeguards
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3 text-sm text-muted-foreground">
							<p>Only records linked to the signed-in subject are selected.</p>
							<p>Responses are attachments with no-store and nosniff headers.</p>
							<p>Oversized sections fail instead of being silently truncated.</p>
						</CardContent>
					</Card>

					<Card className="border-destructive/40">
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-base text-destructive">
								<Trash2 className="h-5 w-5" /> Delete account
							</CardTitle>
							<CardDescription>
								Review current retention exceptions and blocking holds before a
								permanent deletion. CinaAuth downloads a signed JSON receipt after
								completion.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Button asChild variant="destructive">
								<Link href="/dashboard/security#delete-account">
									Review deletion controls
								</Link>
							</Button>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
