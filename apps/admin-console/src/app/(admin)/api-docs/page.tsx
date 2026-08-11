"use client";

import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/i18n-context";

/**
 * API Documentation page — embeds cinaauth's OpenAPI reference (Scalar UI)
 * served at /api/auth/reference on the auth worker.
 *
 * The OpenAPI plugin generates a complete API schema from the loaded
 * plugins, so this page always reflects the current endpoint set.
 */
export default function ApiDocsPage() {
	const { t } = useI18n();
	const cinaauthUrl =
		process.env.NEXT_PUBLIC_CINAUTH_BASE_URL ?? "https://auth.cinaseek.ai";

	return (
		<div className="flex min-h-0 flex-col">
			<PageHeader title={t("apiDocs.title")}>
				<Button asChild variant="secondary" size="sm">
					<a
						href={`${cinaauthUrl}/api/auth/reference`}
						target="_blank"
						rel="noopener noreferrer"
					>
						<ExternalLink size={15} />
						{t("apiDocs.openExternal")}
					</a>
				</Button>
			</PageHeader>
			<div className="flex-1 overflow-hidden rounded-[var(--radius-lg)] border border-hairline bg-canvas shadow-card">
				<iframe
					src={`${cinaauthUrl}/api/auth/reference`}
					className="h-[calc(100dvh-180px)] min-h-[32rem] w-full"
					title="CinaSeek Identity API Reference"
					referrerPolicy="no-referrer"
				/>
			</div>
		</div>
	);
}
