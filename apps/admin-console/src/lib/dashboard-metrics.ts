import type { SignupPointDTO } from "@/lib/cinaauth/dto";

const DAY_MS = 86_400_000;

/** Sum one exact trailing window from a chronologically sortable signup series. */
export function sumTrailingSignupWindow(
	series: SignupPointDTO[],
	days: number,
	skipDays = 0,
): number {
	const ordered = [...series].sort((left, right) =>
		left.date.localeCompare(right.date),
	);
	const end = Math.max(0, ordered.length - skipDays);
	const start = Math.max(0, end - days);
	return ordered
		.slice(start, end)
		.reduce((total, point) => total + point.count, 0);
}

/** Return the UTC calendar-day keys for the displayed trailing window. */
export function trailingUtcDayKeys(days: number, now = new Date()): string[] {
	const today = Date.UTC(
		now.getUTCFullYear(),
		now.getUTCMonth(),
		now.getUTCDate(),
	);
	return Array.from({ length: days }, (_, index) =>
		new Date(today - (days - index - 1) * DAY_MS).toISOString().slice(0, 10),
	);
}

/** Build the bounded audit query shared by dashboard login-activity charts. */
export function buildLoginActivityPath(days: number, now = new Date()): string {
	const [startDay] = trailingUtcDayKeys(days, now);
	const query = new URLSearchParams({
		action: "user.login",
		result: "success",
		start: `${startDay}T00:00:00.000Z`,
		limit: "1000",
	});
	return `/api/admin/audit?${query.toString()}`;
}
