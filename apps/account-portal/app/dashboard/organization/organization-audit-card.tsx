"use client";

import {
	AlertTriangle,
	FileJson,
	FileSpreadsheet,
	Filter,
	History,
	Loader2,
	RefreshCw,
} from "lucide-react";
import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type {
	OrganizationAuditFilters,
	OrganizationAuditPage,
	OrganizationAuditResult,
} from "@/data/organization/organization-audit";
import {
	loadOrganizationAuditExport,
	useOrganizationAuditPageQuery,
} from "@/data/organization/organization-audit";
import type { OrganizationAuditExportFormat } from "@/lib/organization-audit-export";
import {
	createOrganizationAuditCSV,
	createOrganizationAuditExportFilename,
	createOrganizationAuditJSON,
	getOrganizationAuditDateRange,
} from "@/lib/organization-audit-export";
import {
	formatOrganizationAuditActor,
	formatOrganizationDate,
	getOrganizationAuditActionLabel,
} from "@/lib/organization-console";

const PAGE_SIZE = 25;

type OrganizationAuditCardProps = {
	organizationId: string;
	organizationName: string;
	currentUserId: string;
	initialPage: OrganizationAuditPage;
	initiallyUnavailable: boolean;
};

type AuditFilterDraft = {
	startDate: string;
	endDate: string;
	action: string;
	result: OrganizationAuditResult | "all";
};

const EMPTY_FILTER_DRAFT: AuditFilterDraft = {
	startDate: "",
	endDate: "",
	action: "",
	result: "all",
};

const downloadExport = (
	contents: string,
	filename: string,
	contentType: string,
) => {
	const blob = new Blob([contents], { type: contentType });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	anchor.rel = "noopener";
	document.body.append(anchor);
	anchor.click();
	anchor.remove();
	URL.revokeObjectURL(url);
};

const getErrorMessage = (error: unknown, fallback: string) =>
	error instanceof Error && error.message ? error.message : fallback;

export function OrganizationAuditCard({
	organizationId,
	organizationName,
	currentUserId,
	initialPage,
	initiallyUnavailable,
}: OrganizationAuditCardProps) {
	const [draft, setDraft] = useState<AuditFilterDraft>(EMPTY_FILTER_DRAFT);
	const [filters, setFilters] = useState<OrganizationAuditFilters>({});
	const [offset, setOffset] = useState(0);
	const [exportingFormat, setExportingFormat] =
		useState<OrganizationAuditExportFormat | null>(null);
	const hasInitialQuery =
		offset === 0 &&
		!filters.start &&
		!filters.end &&
		!filters.action &&
		!filters.result;
	const auditQuery = useOrganizationAuditPageQuery(
		{
			organizationId,
			limit: PAGE_SIZE,
			offset,
			...filters,
		},
		hasInitialQuery && !initiallyUnavailable ? initialPage : undefined,
	);
	const page = auditQuery.data;
	const exporting = exportingFormat !== null;

	const applyFilters = () => {
		try {
			const action = draft.action.trim();
			if (action.length > 128) {
				throw new Error("Action filter must be 128 characters or fewer.");
			}
			setFilters({
				...getOrganizationAuditDateRange(draft.startDate, draft.endDate),
				...(action ? { action } : {}),
				...(draft.result === "all" ? {} : { result: draft.result }),
			});
			setOffset(0);
		} catch (error) {
			toast.error(getErrorMessage(error, "Audit filters are invalid"));
		}
	};

	const clearFilters = () => {
		setDraft(EMPTY_FILTER_DRAFT);
		setFilters({});
		setOffset(0);
	};

	const exportAudit = async (format: OrganizationAuditExportFormat) => {
		setExportingFormat(format);
		try {
			const records = await loadOrganizationAuditExport({
				organizationId,
				...filters,
			});
			const exportedAt = new Date().toISOString();
			const filename = createOrganizationAuditExportFilename(
				organizationName,
				format,
				exportedAt,
			);
			if (format === "json") {
				downloadExport(
					createOrganizationAuditJSON({
						organizationId,
						exportedAt,
						filters,
						records,
					}),
					filename,
					"application/json;charset=utf-8",
				);
			} else {
				downloadExport(
					`\uFEFF${createOrganizationAuditCSV(records)}`,
					filename,
					"text/csv;charset=utf-8",
				);
			}
			toast.success(`Exported ${records.length.toLocaleString()} audit events`);
		} catch (error) {
			toast.error(getErrorMessage(error, "Unable to export audit events"));
		} finally {
			setExportingFormat(null);
		}
	};

	const firstVisible = page && page.total > 0 ? offset + 1 : 0;
	const lastVisible = page
		? Math.min(offset + page.rows.length, page.total)
		: 0;
	const previousDisabled = offset === 0 || auditQuery.isFetching;
	const nextDisabled =
		!page || lastVisible >= page.total || auditQuery.isFetching;

	return (
		<Card>
			<CardHeader className="gap-4 lg:flex-row lg:items-start lg:justify-between">
				<div>
					<CardTitle>Organization activity</CardTitle>
					<CardDescription>
						Tenant-scoped security events for owners and administrators.
					</CardDescription>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => exportAudit("json")}
						disabled={exporting || auditQuery.isError}
					>
						{exportingFormat === "json" ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<FileJson className="mr-2 h-4 w-4" />
						)}
						Export JSON
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => exportAudit("csv")}
						disabled={exporting || auditQuery.isError}
					>
						{exportingFormat === "csv" ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<FileSpreadsheet className="mr-2 h-4 w-4" />
						)}
						Export CSV
					</Button>
				</div>
			</CardHeader>
			<CardContent className="space-y-5">
				<div className="grid gap-3 rounded-lg border bg-muted/20 p-4 md:grid-cols-2 xl:grid-cols-4">
					<div className="space-y-2">
						<Label htmlFor="audit-start-date">Start date (UTC)</Label>
						<Input
							id="audit-start-date"
							type="date"
							value={draft.startDate}
							onChange={(event) =>
								setDraft((current) => ({
									...current,
									startDate: event.target.value,
								}))
							}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="audit-end-date">End date (UTC)</Label>
						<Input
							id="audit-end-date"
							type="date"
							value={draft.endDate}
							onChange={(event) =>
								setDraft((current) => ({
									...current,
									endDate: event.target.value,
								}))
							}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="audit-action">Action</Label>
						<Input
							id="audit-action"
							placeholder="org.member_role_update"
							value={draft.action}
							onChange={(event) =>
								setDraft((current) => ({
									...current,
									action: event.target.value,
								}))
							}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="audit-result">Result</Label>
						<Select
							value={draft.result}
							onValueChange={(result) =>
								setDraft((current) => ({
									...current,
									result: result as AuditFilterDraft["result"],
								}))
							}
						>
							<SelectTrigger id="audit-result">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All results</SelectItem>
								<SelectItem value="success">Success</SelectItem>
								<SelectItem value="failure">Failure</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-4">
						<Button size="sm" onClick={applyFilters}>
							<Filter className="mr-2 h-4 w-4" /> Apply filters
						</Button>
						<Button size="sm" variant="ghost" onClick={clearFilters}>
							Clear
						</Button>
						<Button
							size="sm"
							variant="ghost"
							onClick={() => auditQuery.refetch()}
							disabled={auditQuery.isFetching}
						>
							<RefreshCw
								className={`mr-2 h-4 w-4 ${auditQuery.isFetching ? "animate-spin" : ""}`}
							/>
							Refresh
						</Button>
					</div>
				</div>

				{auditQuery.isError ? (
					<Alert variant="destructive">
						<AlertTriangle className="h-4 w-4" />
						<AlertTitle>Activity is temporarily unavailable</AlertTitle>
						<AlertDescription>
							No cached events or exports are shown. Retry after the
							authoritative audit service recovers.
						</AlertDescription>
					</Alert>
				) : auditQuery.isPending ? (
					<div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" /> Loading audit events…
					</div>
				) : page && page.rows.length > 0 ? (
					<div className="space-y-3">
						{page.rows.map((event) => (
							<div
								key={event.id}
								className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
							>
								<div>
									<p className="text-sm font-medium">
										{getOrganizationAuditActionLabel(event.action)}
									</p>
									<p className="mt-1 text-xs text-muted-foreground">
										{formatOrganizationAuditActor(event.actorId, currentUserId)}{" "}
										· {formatOrganizationDate(String(event.timestamp))}
									</p>
								</div>
								<Badge
									variant={
										event.result === "success" ? "secondary" : "destructive"
									}
								>
									{event.result === "success" ? "Success" : "Failed"}
								</Badge>
							</div>
						))}
					</div>
				) : (
					<div className="flex items-center gap-2 py-5 text-sm text-muted-foreground">
						<History className="h-4 w-4" /> No audit events match these filters.
					</div>
				)}

				<div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
					<p className="text-xs text-muted-foreground">
						Showing {firstVisible.toLocaleString()}–
						{lastVisible.toLocaleString()} of{" "}
						{(page?.total ?? 0).toLocaleString()} events. Exports are capped at
						10,000 events and fail rather than truncate.
					</p>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							disabled={previousDisabled}
							onClick={() =>
								setOffset((current) => Math.max(0, current - PAGE_SIZE))
							}
						>
							Previous
						</Button>
						<Button
							variant="outline"
							size="sm"
							disabled={nextDisabled}
							onClick={() => setOffset((current) => current + PAGE_SIZE)}
						>
							Next
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
