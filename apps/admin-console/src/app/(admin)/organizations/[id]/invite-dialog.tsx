"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { fetchAdminResponse } from "@/lib/client-api";
import { useI18n } from "@/lib/i18n/i18n-context";

export function InviteDialog({ orgId }: { orgId: string }) {
	const { t } = useI18n();
	const qc = useQueryClient();
	const [email, setEmail] = useState("");
	const [role, setRole] = useState("member");
	const [inviting, setInviting] = useState(false);

	const invite = async () => {
		setInviting(true);
		try {
			const r = await fetchAdminResponse(
				`/api/admin/organizations/${orgId}/invite`,
				{
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ email, role }),
				},
			);
			if (!r.ok) {
				toast.error(t("toast.actionFailed"));
				return false;
			}
			setEmail("");
			toast.success(t("toast.inviteSent"));
			await Promise.all([
				qc.invalidateQueries({ queryKey: ["organization", orgId] }),
				qc.invalidateQueries({ queryKey: ["organization-members", orgId] }),
			]);
			return true;
		} finally {
			setInviting(false);
		}
	};

	return (
		<ConfirmDialog
			trigger={
				<Button variant="primary" size="sm">
					{t("organizations.invite")}
				</Button>
			}
			title={t("organizations.invite")}
			confirmText={inviting ? t("common.inviting") : t("common.send")}
			onConfirm={invite}
		>
			<Input
				aria-label={t("users.col.email")}
				type="email"
				required
				value={email}
				onChange={(e) => setEmail(e.target.value)}
				placeholder="user@example.com"
			/>
			<Select value={role} onValueChange={setRole}>
				<SelectTrigger aria-label={t("users.col.role")} className="h-10">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="member">Member</SelectItem>
					<SelectItem value="admin">Admin</SelectItem>
				</SelectContent>
			</Select>
		</ConfirmDialog>
	);
}
