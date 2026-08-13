import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
	ACCOUNT_RETURN_PATH_HEADER,
	buildAccountSignInPath,
} from "@/lib/sign-in-experience";

export default async function DevicePage({
	children,
}: {
	children: React.ReactNode;
}) {
	const requestHeaders = await headers();
	const session = await auth.api.getSession({
		headers: requestHeaders,
	});
	if (session === null) {
		throw redirect(
			buildAccountSignInPath(
				requestHeaders.get(ACCOUNT_RETURN_PATH_HEADER) ?? "/device",
			),
		);
	}
	return children;
}
