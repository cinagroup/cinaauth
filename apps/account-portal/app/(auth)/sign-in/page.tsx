import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import SignIn from "./_components/sign-in";

export default function Page() {
	return (
		<AuthShell
			title="Sign in to CinaSeek"
			description="One secure account for CinaSeek products and connected applications."
			footer={
				<>
					New to CinaSeek?{" "}
					<Link
						href="/sign-up"
						className="font-medium text-link underline decoration-transparent underline-offset-4 transition-colors hover:text-link-deep hover:decoration-current"
					>
						Create an account
					</Link>
				</>
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
