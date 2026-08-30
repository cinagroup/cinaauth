import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readSource = (path: string) =>
	readFileSync(new URL(path, import.meta.url), "utf8");

describe("CinaSeek Accounts home shell contract", () => {
	it("keeps one main landmark and one skip-link target per rendered branch", () => {
		const layoutSource = readSource("../app/layout.tsx");
		const siteChromeSource = readSource("../components/site-chrome.tsx");
		const homepageSource = readSource("../app/page.tsx");

		expect(layoutSource.match(/<main\b/g) ?? []).toHaveLength(0);
		// SiteChrome renders exactly one branch per request: the dashboard,
		// authentication shell, standalone Accounts home, or marketing shell.
		// Every non-dashboard branch owns one main landmark with the skip target.
		expect(siteChromeSource.match(/<main\b/g) ?? []).toHaveLength(3);
		expect(siteChromeSource.match(/id="main"/g) ?? []).toHaveLength(3);
		expect(homepageSource.match(/<main\b/g) ?? []).toHaveLength(0);
		expect(homepageSource.match(/id="main"/g) ?? []).toHaveLength(0);
		expect(homepageSource).toContain("<HomePage");
	});

	it("keeps the Accounts homepage outside the retired marketing shell", () => {
		const siteChromeSource = readSource(
			"../components/site-chrome.tsx",
		).replace(/\s+/g, " ");

		expect(siteChromeSource).toContain('if (pathname === "/")');
		expect(siteChromeSource).toMatch(
			/if \(pathname === "\/"\).*?<main id="main".*?children.*?<\/main>/,
		);
	});

	it("uses the canonical Accounts product brand in the fixed Header", () => {
		const headerSource = readSource("../components/header.tsx").replace(
			/\s+/g,
			" ",
		);

		expect(headerSource).toContain(
			"<AccountBrand tagline={messages.accountTagline} priority />",
		);
	});
});
