import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import SignIn from "./_components/sign-in";
import { SignUpLink } from "./_components/sign-up-link";

export default function Page() {
	return (
		<AuthShell
			title="Sign in to CinaSeek"
			description="One secure account for CinaSeek products and connected applications."
			footer={
				<Suspense fallback="New to CinaSeek? Create an account">
					<SignUpLink />
				</Suspense>
			}
		>
			<Suspense
				fallback={
					<p className="py-8 text-center text-sm text-body" role="status">
						Loading secure sign-in options…
					</p>
				}
			>
				<SignIn />
			</Suspense>
		</AuthShell>
	);
}
