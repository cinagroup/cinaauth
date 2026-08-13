import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import SignUp from "./_components/sign-up";

export default function Page() {
	return (
		<AuthShell
			title="Create your CinaSeek account"
			description="Choose a secure sign-up method. Email codes create a verified account without a password."
		>
			<Suspense
				fallback={
					<p className="py-8 text-center text-sm text-body" role="status">
						Loading secure sign-up options...
					</p>
				}
			>
				<SignUp />
			</Suspense>
		</AuthShell>
	);
}
