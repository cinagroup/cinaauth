"use client";

import { Smartphone } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useI18n } from "@/lib/i18n/i18n-context";

export default function DevicesPage() {
	const { t } = useI18n();

	return (
		<div className="max-w-2xl">
			<PageHeader title={t("devices.title")} />
			<Card>
				<CardContent className="pt-5">
					<EmptyState className="py-10">
						<Smartphone size={20} aria-hidden />
						<span className="font-medium text-body">
							{t("devices.adminDisabled")}
						</span>
						<span className="max-w-lg text-[14px] leading-5">
							{t("devices.adminDisabledDescription")}
						</span>
					</EmptyState>
				</CardContent>
			</Card>
		</div>
	);
}
