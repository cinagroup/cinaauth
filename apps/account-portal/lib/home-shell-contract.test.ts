import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readSource = (path: string) =>
	readFileSync(new URL(path, import.meta.url), "utf8");

describe("CinaSeek Accounts home shell contract", () => {
	it("keeps one main landmark and one skip-link target", () => {
		const layoutSource = readSource("../app/layout.tsx");
		const homepageSource = readSource("../app/page.tsx");

		expect(layoutSource.match(/<main\b/g) ?? []).toHaveLength(1);
		expect(layoutSource.match(/id="main"/g) ?? []).toHaveLength(1);
		expect(homepageSource.match(/<main\b/g) ?? []).toHaveLength(0);
		expect(homepageSource.match(/id="main"/g) ?? []).toHaveLength(0);
		expect(homepageSource).toContain('aria-labelledby="home-hero-title"');
		expect(homepageSource).toContain('id="home-hero-title"');
	});

	it("gives the fixed Header mark a stable responsive image contract", () => {
		const headerSource = readSource("../components/header.tsx").replace(
			/\s+/g,
			" ",
		);

		expect(headerSource).toContain(
			'<Logo size={28} sizes="28px" className="shrink-0" />',
		);
	});
});
