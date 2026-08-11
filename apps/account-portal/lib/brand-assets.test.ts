import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readPngDimensions = (bytes: Uint8Array) => {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	return {
		width: view.getUint32(16),
		height: view.getUint32(20),
	};
};

describe("CinaSeek social brand assets", () => {
	it("ships a real 1200x630 PNG Open Graph card", () => {
		const bytes = readFileSync(new URL("../public/og.png", import.meta.url));
		expect([...bytes.subarray(0, 8)]).toEqual([
			0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
		]);
		expect(readPngDimensions(bytes)).toEqual({ width: 1200, height: 630 });
	});
});
