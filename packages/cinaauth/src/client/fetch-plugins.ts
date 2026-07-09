import type { BetterFetchPlugin } from "@better-fetch/fetch";
import { isSafeUrlScheme } from "@cinaauth/core/utils/url";

export const redirectPlugin = {
	id: "redirect",
	name: "Redirect",
	hooks: {
		onSuccess(context) {
			if (
				context.data?.url &&
				context.data?.redirect &&
				isSafeUrlScheme(context.data.url)
			) {
				if (typeof window !== "undefined" && window.location) {
					if (window.location) {
						try {
							window.location.href = context.data.url;
						} catch {}
					}
				}
			}
		},
	},
} satisfies BetterFetchPlugin;
