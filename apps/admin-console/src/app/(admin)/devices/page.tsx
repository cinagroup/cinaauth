"use client";

import { useState } from "react";
import { Check, Search, Smartphone, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchAdminJson } from "@/lib/client-api";
import { useI18n } from "@/lib/i18n/i18n-context";

interface DeviceLookupResponse {
	ok?: boolean;
	data?: Record<string, unknown>;
}

export default function DevicesPage() {
	const { t } = useI18n();
	const [userCode, setUserCode] = useState("");
	const [device, setDevice] = useState<Record<string, unknown> | null>(null);
	const [lookingUp, setLookingUp] = useState(false);
	const [actionPending, setActionPending] = useState(false);

	const lookup = async (event: React.FormEvent) => {
		event.preventDefault();
		const code = userCode.trim();
		if (!code) return;
		setLookingUp(true);
		try {
			const payload = await fetchAdminJson<DeviceLookupResponse>(
				"/api/admin/device/approve",
				{
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ userCode: code, action: "lookup" }),
				},
			);
			if (!payload.data) throw new Error("Device not found");
			setDevice(payload.data);
		} catch {
			setDevice(null);
			toast.error(t("devices.notFound"));
		} finally {
			setLookingUp(false);
		}
	};

	const act = async (action: "approve" | "deny") => {
		setActionPending(true);
		try {
			await fetchAdminJson(`/api/admin/device/${action}`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ userCode: userCode.trim() }),
			});
			toast.success(
				action === "approve" ? t("devices.approved") : t("devices.denied"),
			);
			setDevice(null);
			setUserCode("");
		} catch {
			toast.error(t("toast.actionFailed"));
		} finally {
			setActionPending(false);
		}
	};

	return (
		<div className="max-w-2xl">
			<PageHeader title={t("devices.title")} />
			<Card>
				<CardContent className="space-y-4 pt-5">
					<form onSubmit={lookup} className="space-y-1.5">
						<Label htmlFor="device-user-code">{t("devices.userCode")}</Label>
						<div className="flex flex-col gap-2 sm:flex-row">
							<Input
								id="device-user-code"
								required
								value={userCode}
								onChange={(event) => setUserCode(event.target.value)}
								className="font-mono"
								autoComplete="one-time-code"
							/>
							<Button
								type="submit"
								variant="secondary"
								disabled={lookingUp || !userCode.trim()}
							>
								<Search size={15} />
								{t("devices.lookup")}
							</Button>
						</div>
					</form>

					{device ? (
						<div className="rounded-[var(--radius-md)] border border-hairline bg-canvas-soft p-4">
							<pre className="mb-4 max-h-72 overflow-auto whitespace-pre-wrap break-all font-mono text-[12px] leading-5 text-body">
								{JSON.stringify(device, null, 2)}
							</pre>
							<div className="flex flex-col gap-2 sm:flex-row">
								<Button
									variant="primary"
									size="sm"
									disabled={actionPending}
									onClick={() => act("approve")}
								>
									<Check size={15} />
									{t("devices.approve")}
								</Button>
								<Button
									variant="danger"
									size="sm"
									disabled={actionPending}
									onClick={() => act("deny")}
								>
									<X size={15} />
									{t("devices.deny")}
								</Button>
							</div>
						</div>
					) : (
						<EmptyState className="py-10">
							<Smartphone size={20} aria-hidden />
							<span>{t("devices.empty")}</span>
						</EmptyState>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
