import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const linearChannel = (value: number) => {
	const normalized = value / 255;
	return normalized <= 0.04045
		? normalized / 12.92
		: ((normalized + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: string) => {
	const channels = hex
		.slice(1)
		.match(/.{2}/g)
		?.map((channel) => linearChannel(Number.parseInt(channel, 16)));
	if (!channels || channels.length !== 3)
		throw new Error(`Invalid color: ${hex}`);
	return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};

const contrastRatio = (foreground: string, background: string) => {
	const values = [luminance(foreground), luminance(background)].sort(
		(a, b) => b - a,
	);
	return (values[0] + 0.05) / (values[1] + 0.05);
};

describe("Admin theme contrast", () => {
	it("keeps dark muted small text at WCAG AA contrast", () => {
		const css = readFileSync("src/app/globals.css", "utf8");
		const dark = css.match(/\.dark\s*\{([\s\S]*?)\n\}/)?.[1];
		const canvas = dark?.match(/--canvas:\s*(#[0-9a-fA-F]{6})/)?.[1];
		const mute = dark?.match(/--mute:\s*(#[0-9a-fA-F]{6})/)?.[1];

		expect(canvas).toBeTruthy();
		expect(mute).toBeTruthy();
		expect(
			contrastRatio(mute ?? "#000000", canvas ?? "#ffffff"),
		).toBeGreaterThanOrEqual(4.5);
	});
});
