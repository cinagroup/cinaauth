"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { buildPreservedAuthPath } from "@/lib/oidc-navigation";
import { getAccountCallbackURL } from "@/lib/sign-in-experience";

export function SignUpLink() {
	const searchParams = useSearchParams();
	const callbackURL = getAccountCallbackURL(searchParams);

	return (
		<>
			New to CinaSeek?{" "}
			<Link
				href={buildPreservedAuthPath("/sign-up", searchParams, callbackURL)}
				className="font-medium text-link underline decoration-transparent underline-offset-4 transition-colors hover:text-link-deep hover:decoration-current"
			>
				Create an account
			</Link>
		</>
	);
}
