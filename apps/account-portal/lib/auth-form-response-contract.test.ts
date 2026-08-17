import { describe, expect, it, vi } from "vitest";
import { completeLocalSignInSuccess } from "./auth-form-response";

describe("authentication form response handling", () => {
	it("leaves a two-factor redirect exclusively to the two-factor client", () => {
		const notifySuccess = vi.fn();
		const navigateAfterSuccess = vi.fn();

		expect(
			completeLocalSignInSuccess(
				{ twoFactorRedirect: true, twoFactorMethods: ["totp"] },
				{
					notifySuccess,
					onSuccess: navigateAfterSuccess,
				},
			),
		).toBe(false);
		expect(notifySuccess).not.toHaveBeenCalled();
		expect(navigateAfterSuccess).not.toHaveBeenCalled();
	});

	it("keeps the existing local success behavior for a completed session", () => {
		const notifySuccess = vi.fn();
		const navigateAfterSuccess = vi.fn();

		expect(
			completeLocalSignInSuccess(
				{ token: "session-token", user: { id: "user-1" } },
				{
					notifySuccess,
					onSuccess: navigateAfterSuccess,
				},
			),
		).toBe(true);
		expect(notifySuccess).toHaveBeenCalledOnce();
		expect(navigateAfterSuccess).toHaveBeenCalledOnce();
	});
});
