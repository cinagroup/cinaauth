import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readPngDimensions = (bytes: Uint8Array) => {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	return {
		width: view.getUint32(16),
		height: view.getUint32(20),
	};
};

describe("CinaSeek social brand assets", () => {
	it("uses the production CinaSeek mark without the retired placeholder SVG", () => {
		const logoPath = new URL("../public/logo.png", import.meta.url);
		const retiredPlaceholderPath = new URL(
			"../public/logo.svg",
			import.meta.url,
		);
		const logo = readFileSync(logoPath);

		expect([...logo.subarray(0, 8)]).toEqual([
			0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
		]);
		expect(readPngDimensions(logo)).toEqual({ width: 256, height: 256 });
		expect(existsSync(retiredPlaceholderPath)).toBe(false);
	});

	it("publishes named dark and light Accounts manifests with valid icon URLs", () => {
		const manifests = [
			{
				path: "../public/favicon/site.webmanifest",
				prefix: "/favicon/",
			},
			{
				path: "../public/favicon/light/site.webmanifest",
				prefix: "/favicon/light/",
			},
		].map(({ path, prefix }) => ({
			manifest: JSON.parse(
				readFileSync(new URL(path, import.meta.url), "utf8"),
			) as {
				name: string;
				short_name: string;
				theme_color: string;
				background_color: string;
				icons: Array<{ src: string }>;
			},
			prefix,
		}));

		for (const { manifest, prefix } of manifests) {
			expect(manifest.name).toBe("CinaSeek Accounts");
			expect(manifest.short_name).toBe("Accounts");
			expect(manifest.icons).toHaveLength(2);
			for (const icon of manifest.icons) {
				expect(icon.src.startsWith(prefix)).toBe(true);
			}
		}
		expect(manifests[0]?.manifest.theme_color).toBe("#ffffff");
		expect(manifests[0]?.manifest.background_color).toBe("#ffffff");
	});

	it("ships a real 1200x630 PNG Open Graph card", () => {
		const bytes = readFileSync(new URL("../public/og.png", import.meta.url));
		expect([...bytes.subarray(0, 8)]).toEqual([
			0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
		]);
		expect(readPngDimensions(bytes)).toEqual({ width: 1200, height: 630 });
	});
});
