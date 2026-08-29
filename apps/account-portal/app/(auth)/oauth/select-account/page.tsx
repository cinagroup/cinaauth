import type { Metadata } from "next";
import { headers } from "next/headers";
import { AuthShell } from "@/components/auth/auth-shell";
import { auth } from "@/lib/auth";
import { AnotherAccountBtn, SelectAccountBtn } from "./account-button";

export const metadata: Metadata = {
	title: "Select Account",
	description: "Select account to authorize this application",
};

export default async function SelectAccountPage() {
	const sessions = await auth.api.listDeviceSessions({
		headers: await headers(),
	});
	return (
		<AuthShell
			variant="transaction"
			title="Choose an account"
			description="Select the CinaSeek account you want to use for this authorization request."
		>
			<div className="space-y-3">
				{sessions.length ? (
					sessions.map((session, index) => (
						<SelectAccountBtn
							key={session.session.id ?? index}
							session={session}
						/>
					))
				) : (
					<p className="rounded-md border border-hairline bg-canvas-soft p-4 text-sm text-body">
						No signed-in accounts are available in this browser.
					</p>
				)}
				<AnotherAccountBtn />
			</div>
		</AuthShell>
	);
}
