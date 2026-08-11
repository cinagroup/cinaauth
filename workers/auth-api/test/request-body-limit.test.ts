import { describe, expect, it } from "vitest";
import { readBoundedJsonBody } from "../src/index";

const CHUNK_BYTES = 1024;
const TOTAL_CHUNKS = 128;

const createOversizedStreamRequest = (declaredLength?: string) => {
	let pulls = 0;
	let cancelled = false;
	const body = new ReadableStream<Uint8Array>({
		pull(controller) {
			if (pulls >= TOTAL_CHUNKS) {
				controller.close();
				return;
			}
			pulls += 1;
			controller.enqueue(new Uint8Array(CHUNK_BYTES).fill(0x61));
		},
		cancel() {
			cancelled = true;
		},
	});
	const headers = new Headers({ "Content-Type": "application/json" });
	if (declaredLength !== undefined) {
		headers.set("Content-Length", declaredLength);
	}
	const request = new Request("https://auth.cinaseek.ai/test", {
		method: "POST",
		headers,
		body,
		duplex: "half",
	} as RequestInit & { duplex: "half" });
	return {
		request,
		getPulls: () => pulls,
		wasCancelled: () => cancelled,
	};
};

describe("bounded JSON request bodies", () => {
	it.each([
		["without Content-Length", undefined],
		["with a lying Content-Length", "2"],
	])("cancels an oversized stream %s", async (_label, declaredLength) => {
		const stream = createOversizedStreamRequest(declaredLength);

		await expect(readBoundedJsonBody(stream.request)).resolves.toBeUndefined();
		expect(stream.getPulls()).toBeLessThan(TOTAL_CHUNKS);
		expect(stream.wasCancelled()).toBe(true);
	});

	it("preserves an ordinary empty JSON object", async () => {
		const request = new Request("https://auth.cinaseek.ai/test", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: "{}",
		});

		await expect(readBoundedJsonBody(request)).resolves.toEqual({});
		await expect(request.json()).resolves.toEqual({});
	});
});
