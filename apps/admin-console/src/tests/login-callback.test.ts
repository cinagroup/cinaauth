import { describe, expect, it } from "vitest";
import { safeCallbackURL } from "@/lib/safe-callback-url";

// jsdom's default origin is http://localhost:3000 (see vitest environment).
const ORIGIN = "http://localhost:3000";

describe("safeCallbackURL (open-redirect guard)", () => {
	it("defaults to /dashboard for null/empty", () => {
		expect(safeCallbackURL(null)).toBe("/dashboard");
		expect(safeCallbackURL("")).toBe("/dashboard");
	});

	it("allows a plain relative path", () => {
		expect(safeCallbackURL("/users")).toBe("/users");
		expect(safeCallbackURL("/organizations/abc?tab=members")).toBe(
			"/organizations/abc?tab=members",
		);
	});

	it("rejects protocol-relative and backslash tricks", () => {
		expect(safeCallbackURL("//evil.example")).toBe("/dashboard");
		expect(safeCallbackURL("/\\evil.example")).toBe("/dashboard");
	});

	it("rejects control-character smuggling that browsers strip into //host", () => {
		// A browser removes tab/LF/CR from the URL before navigating, so
		// "/\t/evil.com" would collapse to "//evil.com" — must be rejected.
		expect(safeCallbackURL("/\t/evil.com")).toBe("/dashboard");
		expect(safeCallbackURL("/\n/evil.com")).toBe("/dashboard");
		expect(safeCallbackURL("/\r/evil.com")).toBe("/dashboard");
		expect(safeCallbackURL("/\t\\evil.com")).toBe("/dashboard");
		expect(safeCallbackURL("//evil.com")).toBe("/dashboard");
	});

	it("rejects absolute URLs on another origin", () => {
		expect(safeCallbackURL("https://evil.example/phish")).toBe("/dashboard");
		expect(safeCallbackURL("http://evil.example")).toBe("/dashboard");
	});

	it("reduces a same-origin absolute URL to its path", () => {
		expect(safeCallbackURL(`${ORIGIN}/audit?x=1`)).toBe("/audit?x=1");
	});

	it("rejects junk that is neither a path nor a URL", () => {
		expect(safeCallbackURL("javascript:alert(1)")).toBe("/dashboard");
		expect(safeCallbackURL("mailto:x@y.z")).toBe("/dashboard");
	});
});
