"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/i18n-context";
import { fetchAdminResponse } from "@/lib/client-api";

/** Ban dialog with duration (7d/30d/permanent) + reason. On confirm, POSTs
 *  /api/admin/users/[id]/ban then refreshes the user's detail + list queries. */
export function BanDialog({ userId }: { userId: string }) {
	const { t } = useI18n();
	const qc = useQueryClient();
	const [duration, setDuration] = useState("permanent");
	const [reason, setReason] = useState("");

	const ban = async () => {
		const expirationTime =
			duration === "7d"
				? new Date(Date.now() + 7 * 86_400_000).toISOString()
				: duration === "30d"
					? new Date(Date.now() + 30 * 86_400_000).toISOString()
					: undefined;
		const r = await fetchAdminResponse(`/api/admin/users/${userId}/ban`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				banReason: reason,
				...(expirationTime ? { expirationTime } : {}),
			}),
		});
		if (r.ok) {
			toast.success(t("toast.banned"));
			setReason("");
			await Promise.all([
				qc.invalidateQueries({ queryKey: ["user", userId] }),
				qc.invalidateQueries({ queryKey: ["users"] }),
			]);
			return true;
		} else {
			const d = (await r.json().catch(() => null)) as {
				error?: { message?: string };
			} | null;
			toast.error(d?.error?.message ?? t("toast.actionFailed"));
			return false;
		}
	};

	return (
		<ConfirmDialog
			trigger={
				<Button variant="danger" size="sm">
					{t("userDetail.actions.ban")}
				</Button>
			}
			title={t("userDetail.ban.title")}
			danger
			confirmText={t("userDetail.actions.ban")}
			onConfirm={ban}
		>
			<Select value={duration} onValueChange={setDuration}>
				<SelectTrigger className="h-10">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="7d">{t("userDetail.ban.7d")}</SelectItem>
					<SelectItem value="30d">{t("userDetail.ban.30d")}</SelectItem>
					<SelectItem value="permanent">{t("common.permanent")}</SelectItem>
				</SelectContent>
			</Select>
			<Input
				value={reason}
				onChange={(e) => setReason(e.target.value)}
				placeholder={t("userDetail.ban.reason")}
			/>
		</ConfirmDialog>
	);
}
