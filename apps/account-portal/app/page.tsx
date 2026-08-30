import { headers } from "next/headers";
import { HomePage } from "@/components/home-page";
import { auth } from "@/lib/auth";

export default async function Page() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	return <HomePage authenticated={Boolean(session?.session)} />;
}
