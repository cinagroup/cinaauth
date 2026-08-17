import { redirect } from "next/navigation";
import type { LegacyAuthSearchParams } from "@/lib/legacy-auth-redirect";
import { buildRetiredEmailTwoFactorRedirect } from "@/lib/legacy-auth-redirect";

export default async function Page({
	searchParams,
}: {
	searchParams: Promise<LegacyAuthSearchParams>;
}) {
	redirect(buildRetiredEmailTwoFactorRedirect(await searchParams));
}
