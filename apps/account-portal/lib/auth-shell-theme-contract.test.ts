import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readSource = (path: string) =>
	readFileSync(new URL(path, import.meta.url), "utf8");

describe("Accounts authentication shell theme contract", () => {
	it("keeps the complete authentication experience inside one composed card", () => {
		const shellSource = readSource("../components/auth/auth-shell.tsx");
		const cardStart = shellSource.indexOf("<Card");
		const cardEnd = shellSource.lastIndexOf("</Card>");

		expect(shellSource).toContain('from "@/components/theme-toggle"');
		expect(shellSource).toContain('from "@/components/ui/card"');
		expect(shellSource).toContain('from "@/components/ui/separator"');
		expect(shellSource).toContain("<CardHeader");
		expect(shellSource).toContain("<CardContent");
		expect(shellSource).toContain("<CardFooter");
		expect(shellSource).toContain("min-h-svh");
		expect(shellSource).not.toContain("min-h-[calc(100svh-4rem)]");
		expect(shellSource).not.toContain("overflow-hidden");
		expect(cardStart).toBeGreaterThan(-1);
		expect(cardEnd).toBeGreaterThan(cardStart);

		for (const fragment of [
			"<ThemeToggle label={themeLabel} />",
			"<Logo",
			'id="auth-title"',
			"{children}",
			"{footer ? (",
			"{protectedLabel}",
		]) {
			const position = shellSource.indexOf(fragment);
			expect(position).toBeGreaterThan(cardStart);
			expect(position).toBeLessThan(cardEnd);
		}
	});

	it("uses accessible Lucide theme icons without hydration-sensitive artwork", () => {
		const toggleSource = readSource("../components/theme-toggle.tsx");

		expect(toggleSource).toContain('import { Moon, Sun } from "lucide-react"');
		expect(toggleSource).toContain('label = "Toggle color theme"');
		expect(toggleSource).toContain("aria-label={label}");
		expect(toggleSource).toContain("title={label}");
		expect(toggleSource).toContain('type="button"');
		expect(toggleSource).toContain("suppressHydrationWarning");
		expect(toggleSource).toContain('resolvedTheme === "dark"');
		expect(toggleSource).not.toContain("<svg");
	});

	it("defines one semantic light and dark visual system for the authentication card", () => {
		const globalStyles = readSource("../app/globals.css");

		expect(globalStyles).toContain("--cina-auth-card-radius:");
		expect(globalStyles).toContain("--cina-auth-card-border:");
		expect(globalStyles).toContain("color-scheme: light");
		expect(globalStyles).toContain("color-scheme: dark");
		expect(globalStyles).toContain("--link: hsl(210 100% 66%);");
		expect(globalStyles).toContain("--link-deep: hsl(210 100% 77%);");
		expect(globalStyles).toContain(
			"--cina-auth-control-border: hsl(0 0% 46%);",
		);
		expect(globalStyles).toContain(
			"--cina-auth-control-border: hsl(0 0% 48%);",
		);
		expect(globalStyles).toContain("--input: var(--cina-auth-control-border);");
		expect(globalStyles).toContain(".cina-auth-card .border-hairline");
		expect(globalStyles).toContain(".cina-auth-backdrop");
		expect(globalStyles).toContain("background-image: none");
		expect(globalStyles).toContain(".cina-auth-card");
	});
});
