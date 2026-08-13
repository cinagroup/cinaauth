"use client";

import { useCallback, useEffect, useState } from "react";

const RESEND_COOLDOWN_SECONDS = 60;

const normalizeCooldown = (seconds: number) => Math.max(0, Math.floor(seconds));

export function useResendCooldown(initialSeconds = 0) {
	const [cooldown, setCooldown] = useState(() =>
		normalizeCooldown(initialSeconds),
	);

	useEffect(() => {
		if (cooldown <= 0) return;

		const timeout = window.setTimeout(() => {
			setCooldown((current) => Math.max(0, current - 1));
		}, 1000);

		return () => window.clearTimeout(timeout);
	}, [cooldown]);

	const startCooldown = useCallback(
		(seconds = RESEND_COOLDOWN_SECONDS) =>
			setCooldown(normalizeCooldown(seconds)),
		[],
	);
	const resetCooldown = useCallback(() => setCooldown(0), []);

	return {
		cooldown,
		isCoolingDown: cooldown > 0,
		startCooldown,
		resetCooldown,
	};
}
