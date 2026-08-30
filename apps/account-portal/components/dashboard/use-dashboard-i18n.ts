"use client";

import { useI18n } from "@/components/i18n-provider";
import { dashboardMessages } from "@/lib/dashboard-i18n";

export function useDashboardI18n() {
	const { locale, messages: baseMessages } = useI18n();
	return { locale, messages: dashboardMessages[locale], baseMessages };
}
