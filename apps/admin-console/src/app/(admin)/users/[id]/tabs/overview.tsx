"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useAdminSession } from "@/hooks/use-admin-session";
import type { UserDTO } from "@/lib/cinaauth/dto";
import { fetchAdminResponse } from "@/lib/client-api";
import { useI18n } from "@/lib/i18n/i18n-context";

/**
 * User profile overview: read-only details + an editable form (name / email /
 * role) PATCHed to /api/admin/users/[id]. Email + role edits are gated to
 * super_admin at the API layer; the form hides those fields for
 * security_admin.
 */
export function OverviewTab({ user }: { user: UserDTO }) {
	const { t } = useI18n();
	const qc = useQueryClient();
	const { data: session } = useAdminSession();
	const isSuperAdmin = session?.role === "super_admin";

	const [name, setName] = useState(user.name ?? "");
	const [email, setEmail] = useState(user.email);
	const [role, setRole] = useState(user.role);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [saved, setSaved] = useState(false);

	const save = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setError(null);
		setSaved(false);
		const body: Record<string, string> = {};
		if (name !== (user.name ?? "")) body.name = name;
		if (isSuperAdmin && email !== user.email) body.email = email;
		if (isSuperAdmin && role !== user.role) body.role = role;
		if (Object.keys(body).length === 0) {
			setSaving(false);
			return;
		}
		const r = await fetchAdminResponse(`/api/admin/users/${user.id}`, {
			method: "PATCH",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(body),
		});
		setSaving(false);
		if (r.ok) {
			toast.success(t("toast.saved"));
			setSaved(true);
			// Refresh both the list and THIS user's detail query so the
			// read-only card + header reflect the new name/email/role without
			// a full reload.
			await Promise.all([
				qc.invalidateQueries({ queryKey: ["users"] }),
				qc.invalidateQueries({ queryKey: ["user", user.id] }),
			]);
		} else {
			const d = (await r.json().catch(() => null)) as {
				error?: { message?: string };
			} | null;
			const msg = d?.error?.message ?? t("toast.saveFailed");
			setError(msg);
			toast.error(msg);
		}
	};

	return (
		<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
			{/* Read-only details */}
			<Card>
				<CardHeader>
					<div className="text-[14px] leading-5 text-body">
						{t("userDetail.profile.title")}
					</div>
				</CardHeader>
				<CardContent>
					<dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-[14px] leading-5">
						<dt className="whitespace-nowrap text-mute">
							{t("users.col.email")}
						</dt>
						<dd className="break-all text-ink">{user.email}</dd>
						<dt className="whitespace-nowrap text-mute">
							{t("users.col.name")}
						</dt>
						<dd className="text-ink">{user.name || "—"}</dd>
						<dt className="whitespace-nowrap text-mute">
							{t("userDetail.profile.role")}
						</dt>
						<dd>
							<Badge variant="outline">{user.role}</Badge>
						</dd>
						<dt className="whitespace-nowrap text-mute">2FA</dt>
						<dd>
							{user.twoFactorEnabled ? (
								<Badge variant="success">
									{t("userDetail.profile.2fa.on")}
								</Badge>
							) : (
								<Badge variant="warning">
									{t("userDetail.profile.2fa.off")}
								</Badge>
							)}
						</dd>
						<dt className="whitespace-nowrap text-mute">
							{t("userDetail.profile.emailVerified")}
						</dt>
						<dd className="flex items-center gap-2">
							{user.emailVerified ? (
								<Badge variant="success">
									{t("userDetail.profile.verified")}
								</Badge>
							) : (
								<>
									<Badge variant="muted">
										{t("userDetail.profile.unverified")}
									</Badge>
									{isSuperAdmin && (
										<Button
											type="button"
											variant="link"
											size="sm"
											className="h-auto p-0 text-[12px] max-sm:min-h-11"
											onClick={async () => {
												const r = await fetchAdminResponse(
													`/api/admin/users/${user.id}`,
													{
														method: "PATCH",
														headers: { "content-type": "application/json" },
														body: JSON.stringify({ emailVerified: true }),
													},
												);
												if (r.ok) {
													toast.success(t("userDetail.profile.verified"));
													await qc.invalidateQueries({
														queryKey: ["user", user.id],
													});
												} else {
													toast.error(t("toast.saveFailed"));
												}
											}}
										>
											{t("userDetail.profile.markVerified")}
										</Button>
									)}
								</>
							)}
						</dd>
						<dt className="whitespace-nowrap text-mute">
							{t("userDetail.actions.ban")}
						</dt>
						<dd>
							{user.banned ? (
								<Badge variant="danger">
									{user.banReason ?? t("userDetail.profile.banned")}
								</Badge>
							) : (
								<Badge variant="success">{t("users.status.active")}</Badge>
							)}
						</dd>
						<dt className="whitespace-nowrap text-mute">
							{t("userDetail.profile.createdAt")}
						</dt>
						<dd className="text-ink">
							{new Date(user.createdAt).toLocaleString()}
						</dd>
						<dt className="whitespace-nowrap text-mute">
							{t("userDetail.profile.userId")}
						</dt>
						<dd className="break-all font-mono text-[12px] leading-4 text-mute">
							{user.id}
						</dd>
					</dl>
				</CardContent>
			</Card>

			{/* Edit form */}
			<Card>
				<CardHeader>
					<div className="text-[14px] leading-5 text-body">
						{t("userDetail.profile.edit")}
					</div>
				</CardHeader>
				<CardContent>
					<form onSubmit={save} className="space-y-4">
						<div className="space-y-1.5">
							<Label htmlFor="name">{t("users.col.name")}</Label>
							<Input
								id="name"
								value={name}
								onChange={(e) => setName(e.target.value)}
							/>
						</div>
						{isSuperAdmin && (
							<div className="space-y-1.5">
								<Label htmlFor="email">{t("users.col.email")}</Label>
								<Input
									id="email"
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
								/>
							</div>
						)}
						{isSuperAdmin && (
							<div className="space-y-1.5">
								<Label htmlFor="user-role">
									{t("userDetail.profile.role")}
								</Label>
								<Select value={role} onValueChange={setRole}>
									<SelectTrigger id="user-role" className="h-10">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="user">user</SelectItem>
										<SelectItem value="security_admin">
											security_admin
										</SelectItem>
										<SelectItem value="super_admin">super_admin</SelectItem>
									</SelectContent>
								</Select>
							</div>
						)}
						{!isSuperAdmin && (
							<p className="text-[12px] leading-4 text-mute">
								{t("userDetail.profile.editHint")}
							</p>
						)}
						{error && (
							<div className="text-[14px] leading-5 text-error">{error}</div>
						)}
						{saved && (
							<div className="text-[14px] leading-5 text-success">
								{t("common.saved")}
							</div>
						)}
						<Button type="submit" disabled={saving}>
							{saving ? t("common.saving") : t("common.save")}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
