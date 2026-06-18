"use client";

import Link from "next/link";
import SignUp from "./_components/sign-up";

export default function Page() {
	return (
		<div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-12">
			<div className="w-full max-w-[400px]">
				<div className="flex flex-col gap-6">
					{/* Header */}
					<div className="text-center">
						<h1 className="text-3xl font-semibold tracking-tight">
							Your first deploy is just a sign-up away.
						</h1>
					</div>

					{/* Sign Up Form */}
					<SignUp />

					{/* Legal Text */}
					<p className="text-xs text-center text-muted-foreground">
						By joining, you agree to our{" "}
						<Link
							href="https://www.cinagroup.com/terms"
							className="text-foreground underline underline-offset-4 hover:no-underline"
							target="_blank"
						>
							Terms of Service
						</Link>{" "}
						and{" "}
						<Link
							href="https://www.cinagroup.com/privacy"
							className="text-foreground underline underline-offset-4 hover:no-underline"
							target="_blank"
						>
							Privacy Policy
						</Link>
					</p>

					{/* Footer Link */}
					<div className="text-center text-sm text-muted-foreground">
						Already have an account?{" "}
						<Link
							href="/sign-in"
							className="text-foreground underline underline-offset-4 hover:no-underline"
						>
							Log In
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
