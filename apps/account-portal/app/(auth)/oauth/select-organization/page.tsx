import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { GoBackBtn, SelectOrganizationBtn } from "./org-buttons";

export const metadata: Metadata = {
	title: "Select Organization",
	description: "Specify which organization to authorize to this application",
};

export default async function SelectOrganizationPage() {
	const organizations = await auth.api.listOrganizations({
		headers: await headers(),
	});
	return (
		<AuthShell
			variant="transaction"
			title="Choose an organization"
			description="Select the organization whose information this application may access."
		>
			{organizations.length ? (
				<div className="space-y-3">
					{organizations.map((organization, index) => (
						<SelectOrganizationBtn
							key={organization.id ?? index}
							organization={organization}
						/>
					))}
				</div>
			) : (
				<div className="space-y-4">
					<p className="rounded-md border border-hairline bg-canvas-soft p-4 text-sm leading-6 text-body">
						This application requested organization access, but this account
						does not have an organization yet.
					</p>
					<div className="grid gap-3 sm:grid-cols-2">
						<Button asChild size="lg" className="w-full">
							<Link href="/dashboard">Create organization</Link>
						</Button>
						<GoBackBtn />
					</div>
				</div>
			)}
		</AuthShell>
	);
}
