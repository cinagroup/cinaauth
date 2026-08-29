"use client";

import type { Organization } from "cinaauth/plugins";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SelectOrganizationBtn({
	organization,
}: {
	organization: Partial<Organization>;
}) {
	return (
		<Button
			type="button"
			className="h-auto min-h-14 w-full justify-start gap-3 px-4 py-3"
			variant="outline"
			onClick={async () => {
				try {
					if (!organization.id) {
						toast.error("No organization");
						return;
					}
					const { data: active, error: activeError } =
						await authClient.organization.setActive({
							organizationId: organization.id,
						});
					if (activeError || !active) {
						toast.error(
							activeError?.message ?? "Failed to set active organization",
						);
						return;
					}
					const { data, error } = await authClient.oauth2.continue({
						postLogin: true,
					});
					if (error || !data?.redirect || !data.url) {
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
					src={organization.logo || undefined}
					alt={organization?.name}
				/>
				<AvatarFallback>{organization?.name?.charAt(0)}</AvatarFallback>
			</Avatar>
			<div className="min-w-0 text-start">
				<p className="truncate text-sm font-medium text-ink">
					{organization?.name}
				</p>
			</div>
		</Button>
	);
}

export function GoBackBtn() {
	const router = useRouter();
	return (
		<Button
			type="button"
			className="h-12 w-full"
			size="lg"
			variant="outline"
			onClick={() => router.back()}
		>
			Go back
		</Button>
	);
}
