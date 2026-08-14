import { describe, expect, it } from "vitest";
import { getReownInitialCookie } from "./reown-wallet-cookie";

describe("Reown SSR cookie boundary", () => {
	it("passes only the public Wagmi store into the client runtime", () => {
		expect(
			getReownInitialCookie(
				"cinaauth.session_token=secret; wagmi.store=%7B%22state%22%3A%7B%7D%7D; theme=dark",
			),
		).toBe("wagmi.store=%7B%22state%22%3A%7B%7D%7D");
	});

	it("fails closed for absent or oversized wallet cookies", () => {
		expect(getReownInitialCookie(null)).toBeNull();
		expect(getReownInitialCookie("cinaauth.session_token=secret")).toBeNull();
		expect(getReownInitialCookie(`wagmi.store=${"x".repeat(4097)}`)).toBeNull();
	});
});
