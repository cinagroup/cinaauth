"use client";

import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Search } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchAdminJsonWithTimeout } from "@/lib/client-api";
import { useI18n } from "@/lib/i18n/i18n-context";
import type {
	OpenApiDocument,
	OpenApiMethod,
	OpenApiOperationEntry,
} from "@/lib/openapi-docs";
import {
	collectOpenApiOperations,
	matchesOpenApiSearch,
} from "@/lib/openapi-docs";

interface OpenApiAdminResponse {
	ok?: boolean;
	data?: OpenApiDocument;
}

const PAGE_SIZE = 50;
const methodStyles: Record<OpenApiMethod, string> = {
	get: "bg-success-soft text-success",
	post: "bg-accent-soft text-accent",
	put: "bg-warning-soft text-warning",
	patch: "bg-warning-soft text-warning",
	delete: "bg-error-soft text-error",
	options: "bg-canvas-soft-2 text-body",
	head: "bg-canvas-soft-2 text-body",
};

function EndpointCard({
	entry,
	parametersLabel,
	responsesLabel,
	requiredLabel,
}: {
	entry: OpenApiOperationEntry;
	parametersLabel: string;
	responsesLabel: string;
	requiredLabel: string;
}) {
	const responses = Object.entries(entry.responses ?? {});
	return (
		<article className="[content-visibility:auto] [contain-intrinsic-size:0_104px] rounded-[var(--radius-md)] border border-hairline bg-canvas p-4 shadow-card">
			<div className="flex min-w-0 flex-wrap items-center gap-2">
				<span
					className={`inline-flex min-w-14 justify-center rounded px-2 py-1 font-mono text-[11px] font-semibold uppercase ${methodStyles[entry.method]}`}
				>
					{entry.method}
				</span>
				<code className="min-w-0 break-all font-mono text-[13px] font-medium text-ink">
					{entry.path}
				</code>
				{entry.tags?.map((tag) => (
					<Badge key={tag} variant="outline">
						{tag}
					</Badge>
				))}
			</div>
			{entry.summary && (
				<h2 className="mt-3 text-[14px] font-semibold text-ink">
					{entry.summary}
				</h2>
			)}
			{entry.description && (
				<p className="mt-1 whitespace-pre-line text-[12px] leading-5 text-body">
					{entry.description}
				</p>
			)}
			{((entry.parameters?.length ?? 0) > 0 || responses.length > 0) && (
				<details className="mt-3 border-t border-hairline pt-3 text-[12px] text-body">
					<summary className="cursor-pointer select-none font-medium text-ink">
						{parametersLabel} · {responsesLabel}
					</summary>
					{(entry.parameters?.length ?? 0) > 0 && (
						<div className="mt-3">
							<h3 className="font-semibold text-ink">{parametersLabel}</h3>
							<ul className="mt-1 space-y-1">
								{entry.parameters?.map((parameter, index) => (
									<li key={`${parameter.in}-${parameter.name}-${index}`}>
										<code>{parameter.name ?? "—"}</code>
										{parameter.in ? ` · ${parameter.in}` : ""}
										{parameter.required ? ` · ${requiredLabel}` : ""}
										{parameter.description ? ` — ${parameter.description}` : ""}
									</li>
								))}
							</ul>
						</div>
					)}
					{responses.length > 0 && (
						<div className="mt-3">
							<h3 className="font-semibold text-ink">{responsesLabel}</h3>
							<ul className="mt-1 space-y-1">
								{responses.map(([status, response]) => (
									<li key={status}>
										<code>{status}</code>
										{response.description ? ` — ${response.description}` : ""}
									</li>
								))}
							</ul>
						</div>
					)}
				</details>
			)}
		</article>
	);
}

/** Searchable same-origin OpenAPI reference without a blocking remote iframe. */
export default function ApiDocsPage() {
	const { t } = useI18n();
	const [search, setSearch] = useState("");
	const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
	const deferredSearch = useDeferredValue(search);
	const cinaauthUrl =
		process.env.NEXT_PUBLIC_CINAUTH_BASE_URL ?? "https://auth.cinaseek.ai";
	const { data, isPending, isError, refetch } = useQuery({
		queryKey: ["admin-openapi-schema"],
		queryFn: async ({ signal }) => {
			const payload = await fetchAdminJsonWithTimeout<OpenApiAdminResponse>(
				"/api/admin/openapi",
				{ signal },
			);
			if (!payload.data) throw new Error("Missing OpenAPI document");
			return payload.data;
		},
		retry: false,
		staleTime: 5 * 60_000,
	});
	const operations = useMemo(() => collectOpenApiOperations(data), [data]);
	const filteredOperations = useMemo(
		() =>
			operations.filter((entry) => matchesOpenApiSearch(entry, deferredSearch)),
		[deferredSearch, operations],
	);
	const visibleOperations = filteredOperations.slice(0, visibleCount);
	const schemaCount = Object.keys(data?.components?.schemas ?? {}).length;

	return (
		<div className="max-w-6xl">
			<PageHeader
				title={t("apiDocs.title")}
				description={t("apiDocs.description")}
			>
				<Button asChild variant="secondary" size="sm">
					<a
						href={`${cinaauthUrl}/api/auth/reference`}
						target="_blank"
						rel="noopener noreferrer"
					>
						<ExternalLink size={15} />
						{t("apiDocs.openExternal")}
					</a>
				</Button>
			</PageHeader>

			<div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
				<div>
					<label htmlFor="api-docs-search" className="sr-only">
						{t("apiDocs.searchPlaceholder")}
					</label>
					<div className="relative">
						<Search
							size={16}
							className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute"
						/>
						<Input
							id="api-docs-search"
							type="search"
							className="pl-9"
							placeholder={t("apiDocs.searchPlaceholder")}
							value={search}
							onChange={(event) => {
								setSearch(event.target.value);
								setVisibleCount(PAGE_SIZE);
							}}
						/>
					</div>
				</div>
				{data && (
					<div className="flex flex-wrap gap-2 text-[12px] text-body">
						<Badge variant="outline">
							{t("apiDocs.endpointCount", { count: operations.length })}
						</Badge>
						<Badge variant="outline">
							{t("apiDocs.schemaCount", { count: schemaCount })}
						</Badge>
						{data.info?.version && (
							<Badge variant="muted">v{data.info.version}</Badge>
						)}
					</div>
				)}
			</div>

			{isPending && (
				<div className="rounded-[var(--radius-md)] border border-hairline bg-canvas p-6 text-[13px] text-body shadow-card">
					{t("apiDocs.loading")}
				</div>
			)}
			{isError && (
				<div className="rounded-[var(--radius-md)] border border-error/30 bg-error-soft p-6 text-[13px] text-error">
					<p>{t("apiDocs.loadError")}</p>
					<Button
						variant="secondary"
						size="sm"
						className="mt-3"
						onClick={() => void refetch()}
					>
						{t("error.retry")}
					</Button>
				</div>
			)}
			{data && filteredOperations.length === 0 && (
				<div className="rounded-[var(--radius-md)] border border-hairline bg-canvas p-6 text-center text-[13px] text-body shadow-card">
					{t("apiDocs.noResults")}
				</div>
			)}
			{visibleOperations.length > 0 && (
				<div className="space-y-3">
					{visibleOperations.map((entry) => (
						<EndpointCard
							key={`${entry.method}-${entry.path}`}
							entry={entry}
							parametersLabel={t("apiDocs.parameters")}
							responsesLabel={t("apiDocs.responses")}
							requiredLabel={t("apiDocs.required")}
						/>
					))}
				</div>
			)}
			{visibleCount < filteredOperations.length && (
				<div className="mt-4 flex justify-center">
					<Button
						variant="secondary"
						onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
					>
						{t("apiDocs.showMore", {
							count: filteredOperations.length - visibleCount,
						})}
					</Button>
				</div>
			)}
		</div>
	);
}
