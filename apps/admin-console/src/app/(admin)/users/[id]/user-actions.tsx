"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RoleGuard } from "@/components/role-guard";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n/i18n-context";
import { fetchAdminResponse } from "@/lib/client-api";
import { BanDialog } from "./ban-dialog";

/** Role-gated action buttons for a user (ban/delete/reset-2fa). */
export function UserActions({
	userId,
	banned,
	role,
	twoFactorEnabled,
}: {
	userId: string;
	banned: boolean;
	role: string;
	twoFactorEnabled?: boolean;
}) {
	const { t } = useI18n();
	const qc = useQueryClient();
	const [newPassword, setNewPassword] = useState("");

	// Refresh this user's detail query (and the list) so status badges and
	// the actions row reflect the change without a jarring full-page reload.
	const refreshUser = () =>
		Promise.all([
			qc.invalidateQueries({ queryKey: ["user", userId] }),
			qc.invalidateQueries({ queryKey: ["users"] }),
		]);

	const resetPassword = async () => {
		if (newPassword.length < 8) return false;
		const r = await fetchAdminResponse(`/api/admin/users/${userId}/reset-password`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ newPassword }),
		});
		if (r.ok) {
			toast.success(t("toast.passwordReset"));
			setNewPassword("");
			return true;
		} else {
			toast.error(t("toast.saveFailed"));
			return false;
		}
	};
	const remove = async () => {
		const r = await fetchAdminResponse(`/api/admin/users/${userId}`, {
			method: "DELETE",
		});
		if (r.ok) {
			toast.success(t("toast.deleted"));
			window.location.href = "/users";
			return true;
		} else {
			toast.error(t("toast.deleteFailed"));
			return false;
		}
	};

	return (
		<div className="flex flex-wrap items-center gap-2">
			<RoleGuard allow={["super_admin", "security_admin"]}>
				{banned ? (
					<Button
						variant="secondary"
						size="sm"
						onClick={async () => {
							const r = await fetchAdminResponse(`/api/admin/users/${userId}/unban`, {
								method: "POST",
							});
							if (r.ok) {
								toast.success(t("toast.unbanned"));
								await refreshUser();
							} else {
								toast.error(t("toast.actionFailed"));
							}
						}}
					>
						{t("userDetail.actions.unban")}
					</Button>
				) : (
					<BanDialog userId={userId} />
				)}
			</RoleGuard>
			<RoleGuard allow={["super_admin"]}>
				<ConfirmDialog
					trigger={
						<Button variant="outline" size="sm">
							{t("userDetail.actions.resetPassword")}
						</Button>
					}
					title={t("userDetail.resetPassword.title")}
					description={t("userDetail.resetPassword.hint")}
					confirmText={t("userDetail.resetPassword.confirm")}
					onConfirm={resetPassword}
				>
					<div className="space-y-1.5">
						<Label htmlFor="new-password">{t("userDetail.resetPassword.label")}</Label>
						<Input
							id="new-password"
							type="password"
							required
							minLength={8}
							value={newPassword}
							onChange={(e) => setNewPassword(e.target.value)}
							placeholder={t("userDetail.resetPassword.placeholder")}
						/>
					</div>
				</ConfirmDialog>
			</RoleGuard>
			{twoFactorEnabled && (
				<RoleGuard allow={["super_admin"]}>
					<ConfirmDialog
						trigger={
							<Button variant="outline" size="sm">
								{t("userDetail.actions.reset2fa")}
							</Button>
						}
						title={t("userDetail.actions.reset2fa")}
						description={t("userDetail.reset2fa.hint")}
						danger
						confirmText={t("userDetail.reset2fa.confirm")}
						onConfirm={async () => {
							const r = await fetchAdminResponse(`/api/admin/users/${userId}/reset-2fa`, {
								method: "POST",
							});
							if (r.ok) {
								toast.success(t("toast.reset2fa"));
								await refreshUser();
								return true;
							} else {
								toast.error(t("toast.saveFailed"));
								return false;
							}
						}}
					/>
				</RoleGuard>
			)}
			<RoleGuard allow={["super_admin"]}>
				<ConfirmDialog
					trigger={
						<Button
							variant="outline"
							size="sm"
							disabled={role === "super_admin" || role === "security_admin"}
							title={role === "super_admin" || role === "security_admin" ? t("userDetail.actions.impersonateBlocked") : undefined}
						>
							{t("userDetail.actions.impersonate")}
						</Button>
					}
					title={t("userDetail.actions.impersonate")}
					description={t("userDetail.impersonate.hint")}
					confirmText={t("userDetail.impersonate.start")}
					onConfirm={async () => {
						const r = await fetchAdminResponse(`/api/admin/users/${userId}/impersonate`, {
							method: "POST",
						});
						if (r.ok) {
							toast.success(t("toast.impersonating"));
							window.location.reload();
							return true;
						} else {
							toast.error(t("toast.actionFailed"));
							return false;
						}
					}}
				/>
			</RoleGuard>
			<RoleGuard allow={["super_admin"]}>
				<ConfirmDialog
					trigger={
						<Button variant="danger" size="sm">
							{t("common.delete")}
						</Button>
					}
					title={t("userDetail.delete.title")}
					description={t("userDetail.delete.confirm")}
					danger
					confirmText={t("userDetail.delete.permanent")}
					confirmationText={userId}
					confirmationLabel={t("common.typeToConfirm", { value: userId })}
					onConfirm={remove}
				/>
			</RoleGuard>

			{/* Send verification (email OTP / magic link) */}
			<RoleGuard allow={["super_admin", "security_admin"]}>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="sm">
							{t("userDetail.actions.sendVerification")}
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={async () => {
							const r = await fetchAdminResponse(`/api/admin/users/${userId}/send-verification`, {
								method: "POST",
								headers: { "content-type": "application/json" },
								body: JSON.stringify({ type: "email-otp" }),
							});
							if (r.ok) toast.success(t("toast.otpSent"));
							else toast.error(t("toast.saveFailed"));
						}}>
							{t("userDetail.sendVerification.emailOTP")}
						</DropdownMenuItem>
						<DropdownMenuItem onClick={async () => {
							const r = await fetchAdminResponse(`/api/admin/users/${userId}/send-verification`, {
								method: "POST",
								headers: { "content-type": "application/json" },
								body: JSON.stringify({ type: "magic-link" }),
							});
							if (r.ok) toast.success(t("toast.magicLinkSent"));
							else toast.error(t("toast.saveFailed"));
						}}>
							{t("userDetail.sendVerification.magicLink")}
						</DropdownMenuItem>
						<DropdownMenuItem onClick={async () => {
							const r = await fetchAdminResponse(`/api/admin/users/${userId}/send-verification`, {
								method: "POST",
								headers: { "content-type": "application/json" },
								body: JSON.stringify({ type: "phone-number" }),
							});
							if (r.ok) toast.success(t("toast.otpSent"));
							else toast.error(t("toast.saveFailed"));
						}}>
							{t("userDetail.sendVerification.phoneNumber")}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</RoleGuard>
		</div>
	);
}
