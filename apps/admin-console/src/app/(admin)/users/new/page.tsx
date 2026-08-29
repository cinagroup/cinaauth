"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { fetchAdminResponse } from "@/lib/client-api";
import { useI18n } from "@/lib/i18n/i18n-context";

export default function NewUserPage() {
	const { t } = useI18n();
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [name, setName] = useState("");
	const [password, setPassword] = useState("");
	const [role, setRole] = useState("user");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const submit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setSubmitting(true);
		try {
			const r = await fetchAdminResponse("/api/admin/users/create", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ email, name, password, role }),
			});
			if (r.ok) {
				router.push("/users");
				return;
			}
			const d = (await r.json().catch(() => null)) as {
				error?: { message?: string };
			} | null;
			setError(d?.error?.message ?? t("users.create.failed"));
		} catch {
			setError(t("login.networkError"));
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="max-w-md">
			<PageHeader
				title={t("users.create.manual")}
				backHref="/users"
				backLabel={t("users.back")}
			/>
			<Card>
				<CardContent>
					<form onSubmit={submit} className="space-y-4">
						<div className="space-y-1.5">
							<Label htmlFor="email">{t("users.col.email")}</Label>
							<Input
								id="email"
								type="email"
								required
								value={email}
								onChange={(e) => setEmail(e.target.value)}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="name">{t("users.col.name")}</Label>
							<Input
								id="name"
								value={name}
								onChange={(e) => setName(e.target.value)}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="password">{t("users.create.password")}</Label>
							<Input
								id="password"
								type="password"
								required
								minLength={8}
								value={password}
								onChange={(e) => setPassword(e.target.value)}
							/>
							<p className="text-[12px] leading-4 text-mute">
								{t("users.create.passwordHint")}
							</p>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="new-user-role">
								{t("userDetail.profile.role")}
							</Label>
							<Select value={role} onValueChange={setRole}>
								<SelectTrigger id="new-user-role" className="h-10">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="user">user</SelectItem>
									<SelectItem value="security_admin">security_admin</SelectItem>
									<SelectItem value="super_admin">super_admin</SelectItem>
								</SelectContent>
							</Select>
						</div>
						{error && (
							<div role="alert" className="text-[14px] leading-5 text-error">
								{error}
							</div>
						)}
						<Button
							type="submit"
							disabled={submitting}
							className="w-full sm:w-auto"
						>
							<Plus size={15} />
							{submitting ? t("common.creating") : t("users.create")}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
