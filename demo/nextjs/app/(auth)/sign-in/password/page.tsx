"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SignInForm } from "@/components/forms/sign-in-form";

export default function PasswordSignInPage() {
	const params = useSearchParams();

	return (
		<div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-12">
			<div className="w-full max-w-[400px]">
				<div className="flex flex-col gap-6">
					{/* Back Link */}
					<Link
						href="/sign-in"
						className="text-sm text-body hover:text-ink flex items-center gap-1 w-fit"
					>
						<ArrowLeft size={16} />
						Back to sign in.
					</Link>

					{/* Header */}
					{/* Spec: display-lg (32/600/-1.28px), sentence-case + period. */}
					<h1 className="text-[32px] font-semibold leading-[40px] tracking-[-1.28px] text-ink">
						Sign in with password.
					</h1>

					{/* Password Sign In Form */}
					<SignInForm
						callbackURL={params.get("callbackURL") ?? "/dashboard"}
						onSuccess={() =>
							(window.location.href = params.get("callbackURL") ?? "/dashboard")
						}
					/>
				</div>
			</div>
		</div>
	);
}
