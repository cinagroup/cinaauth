"use client";

import {
	getCoreRowModel,
	type ColumnDef,
	useReactTable,
} from "@tanstack/react-table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable } from "@/components/data-table/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/i18n-context";
import { fetchAdminJson } from "@/lib/client-api";

interface Subscription {
	id: string;
	plan?: string;
	status?: string;
}

interface SubscriptionResponse {
	ok?: boolean;
	data?: {
		subscriptions?: Subscription[];
	};
}

export default function BillingPage() {
	const { t } = useI18n();
	const queryClient = useQueryClient();
	const { data, isFetching, isError, refetch } = useQuery({
		queryKey: ["subscriptions"],
		queryFn: async () => {
			const payload = await fetchAdminJson<SubscriptionResponse>(
				"/api/admin/subscriptions",
			);
			return payload.data?.subscriptions ?? [];
		},
	});
	const subscriptions = data ?? [];

	const cancel = async (id: string) => {
		const response = await fetch("/api/admin/subscriptions", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ action: "cancel", subscriptionId: id }),
		});

		if (response.ok) {
			toast.success(t("billing.canceled"));
			await queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
			return true;
		}

		toast.error(t("toast.actionFailed"));
		return false;
	};

	const columns: ColumnDef<Subscription>[] = [
		{
			accessorKey: "plan",
			header: t("billing.plan"),
			cell: ({ row }) => row.original.plan ?? "-",
		},
		{
			accessorKey: "status",
			header: t("billing.status"),
			cell: ({ row }) => (
				<Badge variant={row.original.status === "active" ? "success" : "muted"}>
					{row.original.status ?? "-"}
				</Badge>
			),
		},
		{
			id: "actions",
			header: "",
			cell: ({ row }) =>
				row.original.status === "active" ? (
					<ConfirmDialog
						trigger={
							<Button variant="ghost" size="sm" className="text-error">
								{t("billing.cancel")}
							</Button>
						}
						title={t("billing.cancel")}
						danger
						confirmText={t("billing.cancel")}
						onConfirm={() => cancel(row.original.id)}
					/>
				) : null,
		},
	];
	const table = useReactTable({
		data: subscriptions,
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<div>
			<PageHeader title={t("billing.title")} />
			<DataTable
				table={table}
				emptyLabel={t("billing.empty")}
				isLoading={isFetching && !data}
				isError={isError}
				onRetry={() => void refetch()}
			/>
		</div>
	);
}
