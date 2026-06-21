import Link from "next/link";
import { Suspense } from "react";
import SignIn from "./_components/sign-in";

export default function Page() {
	return (
		<div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-12">
			<div className="w-full max-w-[400px]">
				<div className="flex flex-col gap-6">
					{/* Header */}
					{/* Spec: display-lg (32/600/-1.28px), sentence-case + period. */}
					<h1 className="text-[32px] font-semibold leading-[40px] tracking-[-1.28px] text-ink text-center">
						Log in to CinaAuth.
					</h1>

					{/* Sign In Form — Suspense boundary required because SignIn
					    uses useSearchParams (Next 15). */}
					<Suspense>
						<SignIn />
					</Suspense>

					{/* Footer Link */}
					<div className="text-center text-sm text-body">
						Don't have an account?{" "}
						<Link
							href="/sign-up"
							className="text-link hover:text-link-deep underline underline-offset-4"
						>
							Sign up.
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
