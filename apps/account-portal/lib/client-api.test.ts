import { describe, expect, it, vi } from "vitest";
import {
	deleteAccountPasskey,
	getAccountSignInPolicy,
	getAccountStepUpNotice,
} from "./client-api";

const createClient = (deleteResult: { data: unknown; error: unknown }) => ({
	passkey: {
		deletePasskey: vi.fn().mockResolvedValue(deleteResult),
	},
	signOut: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
});

describe("step-up-aware account client requests", () => {
	it("signs out and starts the existing sign-in flow for SESSION_NOT_FRESH", async () => {
		const client = createClient({
			data: null,
			error: {
				status: 403,
				code: "SESSION_NOT_FRESH",
				message: "Recent authentication required",
				redirectUrl: "https://attacker.example/collect",
			},
		});
		const assign = vi.fn();
		const navigation = {
			pathname: "/dashboard/security",
			search: "?section=passkeys&next=https://attacker.example/path",
			assign,
		};

		await expect(
			deleteAccountPasskey(client, "passkey-1", navigation),
		).rejects.toThrow("Recent authentication required");

		expect(client.passkey.deletePasskey).toHaveBeenCalledWith({
			id: "passkey-1",
		});
		expect(client.signOut).toHaveBeenCalledTimes(1);
		expect(assign).toHaveBeenCalledWith(
			"/sign-in?mode=step-up&callbackURL=%2Fdashboard%2Fsecurity%3Fsection%3Dpasskeys%26next%3Dhttps%3A%2F%2Fattacker.example%2Fpath",
		);
		expect(client.signOut.mock.invocationCallOrder[0]).toBeLessThan(
			assign.mock.invocationCallOrder[0]!,
		);
	});

	it("does not report deletion success while sign-out verification fails", async () => {
		const client = createClient({
			data: null,
			error: {
				status: 403,
				code: "SESSION_NOT_FRESH",
				message: "Recent authentication required",
			},
		});
		client.signOut.mockResolvedValue({
			data: null,
			error: { message: "Unable to end the stale session" },
		});
		const assign = vi.fn();

		await expect(
			deleteAccountPasskey(client, "passkey-1", {
				pathname: "/dashboard",
				search: "",
				assign,
			}),
		).rejects.toThrow("Unable to end the stale session");
		expect(assign).not.toHaveBeenCalled();
	});

	it("preserves successful deletion without starting step-up", async () => {
		const client = createClient({ data: { status: true }, error: null });
		const assign = vi.fn();

		await expect(
			deleteAccountPasskey(client, "passkey-1", {
				pathname: "/dashboard/security",
				search: "",
				assign,
			}),
		).resolves.toEqual({ status: true });
		expect(client.signOut).not.toHaveBeenCalled();
		expect(assign).not.toHaveBeenCalled();
	});

	it("provides explicit copy only for a verified step-up request", () => {
		expect(getAccountStepUpNotice("step-up")).toBe(
			"Confirm your identity to continue this sensitive security change.",
		);
		expect(getAccountStepUpNotice("login")).toBeNull();
		expect(getAccountStepUpNotice(null)).toBeNull();
	});

	it("disables social providers and One Tap during account step-up", () => {
		expect(getAccountSignInPolicy("step-up")).toEqual({
			allowFederatedProviders: false,
			requiresUserPresence: true,
		});
		expect(getAccountSignInPolicy(null)).toEqual({
			allowFederatedProviders: true,
			requiresUserPresence: false,
		});
	});
});
