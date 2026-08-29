"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Download, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	buildAuditExportPath,
	buildAuditListPath,
	resolveAuditFilters,
} from "@/lib/audit-query";
import type { AuditLogDTO } from "@/lib/cinaauth/dto";
import { downloadAdminCsv, fetchAdminJson } from "@/lib/client-api";
import { useI18n } from "@/lib/i18n/i18n-context";

const CATEGORIES = [
	"user",
	"session",
	"auth",
	"admin",
	"risk",
	"wallet",
	"org",
	"apikey",
];
const PAGE_SIZE = 100;

export default function AuditPage() {
	const { t } = useI18n();
	const [category, setCategory] = useState("all");
	const [result, setResult] = useState("all");
	const [dateRange, setDateRange] = useState("all");
	const [search, setSearch] = useState("");
	const [offset, setOffset] = useState(0);
	const auditFilters = useMemo(
		() => resolveAuditFilters({ category, result, dateRange }),
		[category, dateRange, result],
	);

	// Only the server-side facets belong in the query key. `search` is a
	// purely client-side filter over the already-fetched page, so keeping it
	// out of the key means typing filters instantly without re-hitting the API
	// on every keystroke.
	const { data, isFetching, isError, refetch } = useQuery({
		queryKey: ["audit", auditFilters, offset],
		queryFn: async () => {
			const d = await fetchAdminJson<{
				ok: boolean;
				data?: { rows: AuditLogDTO[]; total: number };
			}>(buildAuditListPath(auditFilters, offset, PAGE_SIZE));
			return d.data ?? { rows: [], total: 0 };
		},
		placeholderData: keepPreviousData,
	});

	// Client-side search filter (IP, actor, action, target, category).
	const rows = useMemo(() => {
		const all = data?.rows ?? [];
		const q = search.trim().toLowerCase();
		if (!q) return all;
		return all.filter(
			(r) =>
				(r.actorIp ?? "").toLowerCase().includes(q) ||
				(r.actorId ?? "").toLowerCase().includes(q) ||
				(r.action ?? "").toLowerCase().includes(q) ||
				(r.targetId ?? "").toLowerCase().includes(q) ||
				(r.category ?? "").toLowerCase().includes(q),
		);
	}, [data, search]);

	const columns = useMemo<ColumnDef<AuditLogDTO>[]>(
		() => [
			{
				accessorKey: "timestamp",
				header: t("audit.col.time"),
				cell: ({ row }) => new Date(row.original.timestamp).toLocaleString(),
			},
			{ accessorKey: "category", header: t("audit.col.category") },
			{ accessorKey: "action", header: t("audit.col.action") },
			{ accessorKey: "actorId", header: t("audit.col.actor") },
			{
				accessorKey: "actorIp",
				header: t("audit.col.ip"),
				cell: ({ row }) => {
					const ip = row.original.actorIp;
					if (!ip) return "—";
					// Mask last two octets for privacy: 1.2.3.4 → 1.2.x.x
					const v4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
					if (v4)
						return (
							<span className="font-mono text-[12px] text-mute">
								{v4[1]}.{v4[2]}.x.x
							</span>
						);
					return <span className="font-mono text-[12px] text-mute">{ip}</span>;
				},
			},
			{
				header: t("audit.col.result"),
				cell: ({ row }) =>
					row.original.result === "failure" ? (
						<Badge variant="danger">{t("common.result.failure")}</Badge>
					) : (
						<Badge variant="success">{t("common.result.success")}</Badge>
					),
			},
		],
		[t],
	);

	const table = useReactTable({
		data: rows,
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	const exportHref = buildAuditExportPath(auditFilters);
	const total = data?.total ?? 0;

	return (
		<div>
			<PageHeader title={t("audit.title")}>
				<Button
					variant="secondary"
					size="sm"
					onClick={() => void downloadAdminCsv(exportHref, "audit.csv")}
				>
					<Download size={15} />
					{t("audit.export")}
				</Button>
			</PageHeader>
			<div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[160px_160px_140px_minmax(220px,1fr)]">
				<Select
					value={category}
					onValueChange={(value) => {
						setCategory(value);
						setOffset(0);
					}}
				>
					<SelectTrigger
						aria-label={t("audit.filter.category")}
						className="h-10 w-full"
					>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{t("audit.allCategories")}</SelectItem>
						{CATEGORIES.map((c) => (
							<SelectItem key={c} value={c}>
								{c}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select
					value={result}
					onValueChange={(value) => {
						setResult(value);
						setOffset(0);
					}}
				>
					<SelectTrigger
						aria-label={t("audit.filter.result")}
						className="h-10 w-full"
					>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{t("audit.allResults")}</SelectItem>
						<SelectItem value="success">
							{t("common.result.success")}
						</SelectItem>
						<SelectItem value="failure">
							{t("common.result.failure")}
						</SelectItem>
					</SelectContent>
				</Select>
				<Select
					value={dateRange}
					onValueChange={(value) => {
						setDateRange(value);
						setOffset(0);
					}}
				>
					<SelectTrigger
						aria-label={t("audit.filter.date")}
						className="h-10 w-full"
					>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{t("audit.allTime")}</SelectItem>
						<SelectItem value="1">{t("audit.last1d")}</SelectItem>
						<SelectItem value="7">{t("audit.last7d")}</SelectItem>
						<SelectItem value="30">{t("audit.last30d")}</SelectItem>
					</SelectContent>
				</Select>
				<div className="relative flex-1">
					<Search
						size={14}
						className="absolute left-3 top-1/2 -translate-y-1/2 text-mute"
					/>
					<Input
						aria-label={t("audit.filter.search")}
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder={t("common.search")}
						className="pl-9"
					/>
				</div>
			</div>
			<DataTable
				table={table}
				rowClassName={(r) =>
					r.result === "failure" ? "bg-error-soft" : undefined
				}
				emptyLabel={t("audit.empty")}
				isLoading={isFetching && !data}
				isError={isError}
				onRetry={() => void refetch()}
			/>
			<Pagination
				offset={offset}
				pageSize={PAGE_SIZE}
				total={total}
				onPrev={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))}
				onNext={() => setOffset((current) => current + PAGE_SIZE)}
			/>
		</div>
	);
}
