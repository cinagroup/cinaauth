"use client";

import Link from "next/link";
import SignIn from "./_components/sign-in";

export default function Page() {
	return (
		<div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-12">
			<div className="w-full max-w-[400px]">
				<div className="flex flex-col gap-6">
					{/* Header */}
					<h1 className="text-3xl font-semibold tracking-tight text-center">
						Log in to CinaAuth
					</h1>

					{/* Sign In Form */}
					<SignIn />

					{/* Footer Link */}
					<div className="text-center text-sm text-muted-foreground">
						Don't have an account?{" "}
						<Link
							href="/sign-up"
							className="text-foreground underline underline-offset-4 hover:no-underline"
						>
							Sign Up
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
