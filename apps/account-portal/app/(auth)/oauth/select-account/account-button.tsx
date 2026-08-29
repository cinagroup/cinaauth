"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { Session } from "@/lib/auth";
import { authClient } from "@/lib/auth-client";

export function SelectAccountBtn({ session }: { session: Partial<Session> }) {
	return (
		<Button
			type="button"
			className="h-auto min-h-14 w-full justify-start gap-3 px-4 py-3"
			variant="outline"
			onClick={async () => {
				try {
					if (!session.session?.token) {
						toast.error("No session");
						return;
					}
					const { data: active, error: activeError } =
						await authClient.multiSession.setActive({
							sessionToken: session.session.token,
						});
					if (activeError || !active?.session) {
						toast.error(activeError?.message ?? "Failed to set active session");
						return;
					}
					const { data, error } = await authClient.oauth2.continue({
						selected: true,
					});
					if (error || !active?.session || !data.redirect || !data?.url) {
						toast.error(error?.message ?? "Failed to continue");
						return;
					}
					window.location.href = data.url;
				} catch (error) {
					toast.error(String(error));
				}
			}}
		>
			<Avatar className="size-9 shrink-0">
				<AvatarImage
					src={session.user?.image || undefined}
					alt={session.user?.name}
				/>
				<AvatarFallback>{session.user?.name?.charAt(0)}</AvatarFallback>
			</Avatar>
			<div className="min-w-0 text-start">
				<p className="truncate text-sm font-medium text-ink">
					{session.user?.name}
				</p>
				<p className="truncate text-xs text-body">{session.user?.email}</p>
			</div>
		</Button>
	);
}

export function AnotherAccountBtn() {
	const params = useSearchParams();
	return (
		<Button asChild className="h-12 w-full" variant="outline">
			<Link href={`/sign-in${params ? `?${params.toString()}` : ""}`}>
				Another Account
			</Link>
		</Button>
	);
}
