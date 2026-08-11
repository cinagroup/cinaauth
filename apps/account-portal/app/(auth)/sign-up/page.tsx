import Link from "next/link";
import SignUp from "./_components/sign-up";

export default function Page() {
	return (
		<div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-12">
			<div className="w-full max-w-[400px]">
				<div className="flex flex-col gap-6">
					{/* Header */}
					<div className="text-center">
						{/* Spec: display-lg (32/600/-1.28px), sentence-case + period. */}
						<h1 className="text-[32px] font-semibold leading-[40px] tracking-[-1.28px] text-ink">
							Your first deploy is just a sign-up away.
						</h1>
					</div>

					{/* Sign Up Form */}
					<SignUp />

					{/* Legal Text */}
					<p className="text-xs text-center text-mute">
						By joining, you agree to our{" "}
						<Link
							href="https://www.cinagroup.com/terms"
							className="text-link hover:text-link-deep underline underline-offset-4"
							target="_blank"
						>
							Terms of Service
						</Link>{" "}
						and{" "}
						<Link
							href="https://www.cinagroup.com/privacy"
							className="text-link hover:text-link-deep underline underline-offset-4"
							target="_blank"
						>
							Privacy Policy
						</Link>
					</p>

					{/* Footer Link */}
					<div className="text-center text-sm text-body">
						Already have an account?{" "}
						<Link
							href="/sign-in"
							className="text-link hover:text-link-deep underline underline-offset-4"
						>
							Log in.
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
