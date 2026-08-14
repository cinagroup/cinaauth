import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getSignUpAvailability } from "../app/(auth)/sign-up/_components/sign-up-state";

const baseState = {
	isPending: false,
	isError: false,
	hasCreatePrompt: false,
	emailOtpReady: false,
	oauthReady: false,
};

describe("Accounts sign-up availability", () => {
	it("keeps capability loading and failures distinct from disabled methods", () => {
		expect(getSignUpAvailability({ ...baseState, isPending: true })).toEqual({
			kind: "pending",
		});
		expect(getSignUpAvailability({ ...baseState, isError: true })).toEqual({
			kind: "error",
		});
		expect(getSignUpAvailability(baseState)).toEqual({
			kind: "unavailable",
		});
	});

	it("shows only methods that are actually available", () => {
		expect(
			getSignUpAvailability({ ...baseState, emailOtpReady: true }),
		).toEqual({ kind: "ready", showEmailOtp: true, showOAuth: false });
		expect(getSignUpAvailability({ ...baseState, oauthReady: true })).toEqual({
			kind: "ready",
			showEmailOtp: false,
			showOAuth: true,
		});
		expect(
			getSignUpAvailability({
				...baseState,
				emailOtpReady: true,
				oauthReady: true,
			}),
		).toEqual({ kind: "ready", showEmailOtp: true, showOAuth: true });
	});

	it("requires email OTP for a signed prompt=create flow", () => {
		expect(
			getSignUpAvailability({
				...baseState,
				hasCreatePrompt: true,
				oauthReady: true,
			}),
		).toEqual({ kind: "create-unavailable" });
		expect(
			getSignUpAvailability({
				...baseState,
				hasCreatePrompt: true,
				emailOtpReady: true,
				oauthReady: true,
			}),
		).toEqual({ kind: "ready", showEmailOtp: true, showOAuth: false });
	});

	it("uses capability-neutral shell copy and exposes a retry action", () => {
		const pageSource = readFileSync(
			new URL("../app/(auth)/sign-up/page.tsx", import.meta.url),
			"utf8",
		);
		const signUpSource = readFileSync(
			new URL("../app/(auth)/sign-up/_components/sign-up.tsx", import.meta.url),
			"utf8",
		);

		expect(pageSource).not.toContain("Email codes create");
		expect(pageSource).toContain("available for this account service");
		expect(pageSource).toContain("<Skeleton");
		expect(signUpSource).toContain("<Alert");
		expect(signUpSource).toContain("<Skeleton");
		expect(signUpSource).toContain("capabilities.refetch()");
		expect(signUpSource).toContain("<Alert");
		expect(signUpSource).toContain('aria-live="polite"');
	});
});
