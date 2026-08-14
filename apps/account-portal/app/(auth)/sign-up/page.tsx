import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Skeleton } from "@/components/ui/skeleton";
import SignUp from "./_components/sign-up";

export default function Page() {
	return (
		<AuthShell
			title="Create your CinaSeek account"
			description="Choose a secure sign-up method available for this account service."
		>
			<Suspense
				fallback={
					<div className="grid gap-3" role="status" aria-live="polite">
						<p className="text-center text-sm text-body">
							Checking available sign-up methods...
						</p>
						<Skeleton className="h-12 w-full" aria-hidden />
						<Skeleton className="h-12 w-full" aria-hidden />
					</div>
				}
			>
				<SignUp />
			</Suspense>
		</AuthShell>
	);
}
