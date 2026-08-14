import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/app/login/page.tsx", "utf8");

describe("Admin login page contract", () => {
	it("uses the approved card-first surface with an explicit two-color toggle", () => {
		expect(source).toContain('data-auth-layout="card-first"');
		expect(source).toContain('from "@/components/ui/card"');
		expect(source).toContain("<Card");
		expect(source).toContain('className="admin-login-card');
		expect(source).toContain("useTheme()");
		expect(source).toContain(
			'setTheme(resolvedTheme === "dark" ? "light" : "dark")',
		);
		expect(source).toContain('resolvedTheme === "dark" ? (');
		expect(source).toContain('aria-label={t("theme.toggle")}');
	});

	it("keeps one OIDC action and preserves the sanitized callback", () => {
		expect(source).toContain(
			"href={`/api/auth/oidc/login?${loginParams.toString()}`}",
		);
		expect(source).toContain(
			'const callbackURL = safeCallbackURL(searchParams.get("callbackURL"))',
		);
		expect(source.match(/<Button\b/g)).toHaveLength(2);
		expect(source).toContain('variant="outline"');
		expect(source).toContain('size="icon"');
		expect(source.match(/<input\b/gi)).toBeNull();
		expect(source).not.toMatch(/magic|passkey|google|github|facebook/i);
	});

	it("keeps administrator trust guidance and accessible error handling", () => {
		expect(source).toContain('role="alert"');
		expect(source).toContain('t("login.securityPassword")');
		expect(source).toContain('t("login.securityRole")');
		expect(source).toContain('href="#admin-login-action"');
	});
});
