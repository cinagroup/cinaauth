import { describe, expect, it, vi } from "vitest";
import {
	completeLocalSignInSuccess,
	completePasswordResetRequest,
} from "./auth-form-response";

describe("authentication form response handling", () => {
	it("does not report a default non-throw password-reset error as success", async () => {
		const onSuccess = vi.fn();

		await expect(
			completePasswordResetRequest(
				async () => ({ error: { message: "Human verification failed" } }),
				onSuccess,
			),
		).rejects.toThrow("Human verification failed");
		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("reports password-reset success only after a successful result", async () => {
		const onSuccess = vi.fn();

		await completePasswordResetRequest(
			async () => ({ error: null }),
			onSuccess,
		);
		expect(onSuccess).toHaveBeenCalledOnce();
	});

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
