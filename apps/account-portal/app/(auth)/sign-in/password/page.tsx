import { redirect } from "next/navigation";
import type { LegacyAuthSearchParams } from "@/lib/legacy-auth-redirect";
import { buildLegacyPasswordSignInRedirect } from "@/lib/legacy-auth-redirect";

export default async function PasswordSignInPage({
	searchParams,
}: {
	searchParams: Promise<LegacyAuthSearchParams>;
}) {
	redirect(buildLegacyPasswordSignInRedirect(await searchParams));
}
