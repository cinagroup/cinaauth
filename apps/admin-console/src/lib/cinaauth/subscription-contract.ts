const SUBSCRIPTION_STATUSES = [
	"active",
	"canceled",
	"incomplete",
	"incomplete_expired",
	"past_due",
	"paused",
	"trialing",
	"unpaid",
] as const;

export type BillingScope = "user" | "organization";
export type BillingAction = "cancel" | "portal" | "upgrade";
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export type AdminSubscriptionView = {
	id: string;
	plan: string;
	status: SubscriptionStatus;
	stripeSubscriptionId?: string;
	periodEnd?: string;
	cancelAtPeriodEnd?: boolean;
	billingInterval?: "day" | "week" | "month" | "year";
	seats?: number;
};

export type AdminSubscriptionList = {
	available: boolean;
	scope: BillingScope;
	referenceId: string;
	subscriptions: AdminSubscriptionView[];
};

export type BillingRedirect = {
	url: string;
	scope: BillingScope;
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

export const isBillingScope = (value: unknown): value is BillingScope =>
	value === "user" || value === "organization";

export const isBillingAction = (value: unknown): value is BillingAction =>
	value === "cancel" || value === "portal" || value === "upgrade";

const isSubscriptionStatus = (value: unknown): value is SubscriptionStatus =>
	SUBSCRIPTION_STATUSES.some((candidate) => candidate === value);

const optionalString = (
	value: unknown,
	maximumLength: number,
): string | undefined =>
	typeof value === "string" && value.length > 0 && value.length <= maximumLength
		? value
		: undefined;

/** Normalize and minimize the raw Stripe plugin list response for the Admin UI. */
export const normalizeSubscriptionList = (
	value: unknown,
): AdminSubscriptionView[] | null => {
	if (!Array.isArray(value)) return null;
	const subscriptions: AdminSubscriptionView[] = [];
	for (const candidate of value) {
		if (
			!isRecord(candidate) ||
			typeof candidate.id !== "string" ||
			candidate.id.length === 0 ||
			typeof candidate.plan !== "string" ||
			candidate.plan.length === 0 ||
			!isSubscriptionStatus(candidate.status)
		) {
			return null;
		}
		const stripeSubscriptionId = optionalString(
			candidate.stripeSubscriptionId,
			255,
		);
		const periodEnd = optionalString(candidate.periodEnd, 64);
		const billingInterval =
			candidate.billingInterval === "day" ||
			candidate.billingInterval === "week" ||
			candidate.billingInterval === "month" ||
			candidate.billingInterval === "year"
				? candidate.billingInterval
				: undefined;
		const seats =
			typeof candidate.seats === "number" &&
			Number.isSafeInteger(candidate.seats) &&
			candidate.seats > 0
				? candidate.seats
				: undefined;

		subscriptions.push({
			id: candidate.id,
			plan: candidate.plan,
			status: candidate.status,
			...(stripeSubscriptionId ? { stripeSubscriptionId } : {}),
			...(periodEnd ? { periodEnd } : {}),
			...(typeof candidate.cancelAtPeriodEnd === "boolean"
				? { cancelAtPeriodEnd: candidate.cancelAtPeriodEnd }
				: {}),
			...(billingInterval ? { billingInterval } : {}),
			...(seats ? { seats } : {}),
		});
	}
	return subscriptions;
};

/** Resolve only a root-relative path and query against the Admin request origin. */
export const resolveSameOriginReturnUrl = (
	requestUrl: string,
	value: unknown,
	fallbackPath = "/billing",
): string | null => {
	const path = value === undefined ? fallbackPath : value;
	if (
		typeof path !== "string" ||
		path.length === 0 ||
		path.length > 2048 ||
		!path.startsWith("/") ||
		path.startsWith("//") ||
		path.startsWith("/\\") ||
		path.includes("\u0000")
	) {
		return null;
	}
	try {
		const base = new URL(requestUrl);
		const target = new URL(path, base);
		if (
			target.origin !== base.origin ||
			target.username ||
			target.password ||
			target.hash
		) {
			return null;
		}
		return target.toString();
	} catch {
		return null;
	}
};

const TRUSTED_STRIPE_REDIRECT_HOSTS = new Set([
	"billing.stripe.com",
	"checkout.stripe.com",
]);

/** Accept a redirect only when it is our exact return URL or a Stripe surface. */
export const isTrustedBillingRedirect = (
	value: unknown,
	requestUrl: string,
): value is string => {
	if (typeof value !== "string" || value.length === 0 || value.length > 4096) {
		return false;
	}
	try {
		const target = new URL(value);
		const requestOrigin = new URL(requestUrl).origin;
		if (target.origin === requestOrigin) return true;
		return (
			target.protocol === "https:" &&
			!target.username &&
			!target.password &&
			target.port === "" &&
			TRUSTED_STRIPE_REDIRECT_HOSTS.has(target.hostname)
		);
	} catch {
		return false;
	}
};
