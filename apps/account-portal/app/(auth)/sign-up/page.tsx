import { redirect } from "next/navigation";
import type { LegacyAuthSearchParams } from "@/lib/legacy-auth-redirect";
import { buildUnifiedSignUpRedirect } from "@/lib/legacy-auth-redirect";

export default async function LegacySignUpPage({
	searchParams,
}: {
	searchParams: Promise<LegacyAuthSearchParams>;
}) {
	redirect(buildUnifiedSignUpRedirect(await searchParams));
}
