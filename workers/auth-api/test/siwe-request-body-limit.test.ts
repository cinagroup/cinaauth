import { readFileSync } from "node:fs";
import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import {
	createSiweRequestBodyLimitMiddleware,
	getSiweRequestBodyLimit,
	inspectSiweRequestBody,
	SIWE_CHALLENGE_REQUEST_BODY_LIMIT_BYTES,
	SIWE_PROOF_REQUEST_BODY_LIMIT_BYTES,
} from "../src/siwe-request-body-limit";

const createStreamRequest = ({
	pathname,
	chunkSizes,
	declaredLength,
}: {
	pathname: string;
	chunkSizes: readonly number[];
	declaredLength?: string;
}) => {
	let chunkIndex = 0;
	let cancelled = false;
	const body = new ReadableStream<Uint8Array>({
		pull(controller) {
			const size = chunkSizes[chunkIndex];
			if (size === undefined) {
				controller.close();
				return;
			}
			chunkIndex += 1;
			controller.enqueue(new Uint8Array(size).fill(0x61));
		},
		cancel() {
			cancelled = true;
		},
	});
	const headers = new Headers({ "Content-Type": "application/json" });
	if (declaredLength !== undefined) {
		headers.set("Content-Length", declaredLength);
	}
	const request = new Request(`https://auth.cinaseek.ai${pathname}`, {
		method: "POST",
		headers,
		body,
		duplex: "half",
	} as RequestInit & { duplex: "half" });
	return {
		request,
		getChunksRead: () => chunkIndex,
		wasCancelled: () => cancelled,
	};
};

describe("SIWE raw request body limits", () => {
	it.each([
		["/api/auth/siwe/challenge", SIWE_CHALLENGE_REQUEST_BODY_LIMIT_BYTES],
		["/api/auth/siwe/nonce", SIWE_CHALLENGE_REQUEST_BODY_LIMIT_BYTES],
		["/api/auth/siwe/get-nonce/", SIWE_CHALLENGE_REQUEST_BODY_LIMIT_BYTES],
		["/api/auth/siwe/verify", SIWE_PROOF_REQUEST_BODY_LIMIT_BYTES],
		["/api/auth/siwe/link-wallet/", SIWE_PROOF_REQUEST_BODY_LIMIT_BYTES],
	])("maps POST %s to its raw-byte limit", (pathname, expected) => {
		expect(getSiweRequestBodyLimit(pathname, "POST")).toBe(expected);
	});

	it.each([
		["wrong method", "/api/auth/siwe/challenge", "GET"],
		["unknown SIWE route", "/api/auth/siwe/list-wallets", "POST"],
		["lookalike suffix", "/api/auth/siwe/challenge/extra", "POST"],
		["outside Auth base path", "/siwe/challenge", "POST"],
	])("does not limit the %s", (_label, pathname, method) => {
		expect(getSiweRequestBodyLimit(pathname, method)).toBeUndefined();
	});

	it("rejects an oversized body when Content-Length is absent", async () => {
		const stream = createStreamRequest({
			pathname: "/api/auth/siwe/challenge",
			chunkSizes: [1024, 1024, 1, ...Array<number>(32).fill(1024)],
		});

		await expect(
			inspectSiweRequestBody(
				stream.request,
				SIWE_CHALLENGE_REQUEST_BODY_LIMIT_BYTES,
			),
		).resolves.toBe("too-large");
		expect(stream.getChunksRead()).toBeLessThan(35);
		expect(stream.wasCancelled()).toBe(true);
	});

	it("allows a chunked body exactly at the challenge limit", async () => {
		const stream = createStreamRequest({
			pathname: "/api/auth/siwe/challenge",
			chunkSizes: [1024, 1024],
		});

		await expect(
			inspectSiweRequestBody(
				stream.request,
				SIWE_CHALLENGE_REQUEST_BODY_LIMIT_BYTES,
			),
		).resolves.toBe("allowed");
		await expect(stream.request.arrayBuffer()).resolves.toHaveProperty(
			"byteLength",
			SIWE_CHALLENGE_REQUEST_BODY_LIMIT_BYTES,
		);
		expect(stream.wasCancelled()).toBe(false);
	});

	it("counts a chunked body instead of trusting a forged small length", async () => {
		const stream = createStreamRequest({
			pathname: "/api/auth/siwe/verify",
			chunkSizes: [8192, 8192, 4096, 1, ...Array<number>(32).fill(4096)],
			declaredLength: "1",
		});

		await expect(
			inspectSiweRequestBody(
				stream.request,
				SIWE_PROOF_REQUEST_BODY_LIMIT_BYTES,
			),
		).resolves.toBe("too-large");
		expect(stream.getChunksRead()).toBeLessThan(36);
		expect(stream.wasCancelled()).toBe(true);
	});

	it("rejects a declared oversized body without waiting for its stream", async () => {
		const stream = createStreamRequest({
			pathname: "/api/auth/siwe/challenge",
			chunkSizes: [2],
			declaredLength: String(SIWE_CHALLENGE_REQUEST_BODY_LIMIT_BYTES + 1),
		});

		await expect(
			inspectSiweRequestBody(
				stream.request,
				SIWE_CHALLENGE_REQUEST_BODY_LIMIT_BYTES,
			),
		).resolves.toBe("too-large");
		expect(stream.wasCancelled()).toBe(true);
	});

	it("preserves an accepted body for the Auth handler", async () => {
		const body = JSON.stringify({ walletAddress: "0xabc", chainId: 1 });
		const request = new Request(
			"https://auth.cinaseek.ai/api/auth/siwe/challenge",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body,
			},
		);

		await expect(
			inspectSiweRequestBody(request, SIWE_CHALLENGE_REQUEST_BODY_LIMIT_BYTES),
		).resolves.toBe("allowed");
		await expect(request.text()).resolves.toBe(body);
	});

	it("allows an absent body to reach endpoint validation", async () => {
		const request = new Request(
			"https://auth.cinaseek.ai/api/auth/siwe/challenge",
			{ method: "POST" },
		);

		await expect(
			inspectSiweRequestBody(request, SIWE_CHALLENGE_REQUEST_BODY_LIMIT_BYTES),
		).resolves.toBe("allowed");
	});
});

describe("SIWE body-limit Hono middleware", () => {
	const makeApp = () => {
		const app = new Hono();
		const downstream = vi.fn();
		app.use("/api/auth/*", createSiweRequestBodyLimitMiddleware());
		app.post("/api/auth/siwe/*", async (context) => {
			const body = await context.req.raw.text();
			downstream(body);
			return context.json({ body });
		});
		return { app, downstream };
	};

	it("returns 413 no-store before the Auth handler", async () => {
		const { app, downstream } = makeApp();
		const response = await app.request(
			"https://auth.test/api/auth/siwe/challenge",
			{
				method: "POST",
				headers: {
					"Content-Length": "1",
					"Content-Type": "application/json",
				},
				body: "a".repeat(SIWE_CHALLENGE_REQUEST_BODY_LIMIT_BYTES + 1),
			},
		);

		expect(response.status).toBe(413);
		expect(response.headers.get("cache-control")).toBe("no-store");
		await expect(response.json()).resolves.toEqual({
			code: "REQUEST_BODY_TOO_LARGE",
			message: "Request body exceeds the configured limit",
		});
		expect(downstream).not.toHaveBeenCalled();
	});

	it("passes an accepted proof body through unchanged", async () => {
		const { app, downstream } = makeApp();
		const body = JSON.stringify({
			message: "a".repeat(SIWE_CHALLENGE_REQUEST_BODY_LIMIT_BYTES),
			signature: "0x1234",
		});
		const response = await app.request(
			"https://auth.test/api/auth/siwe/verify",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body,
			},
		);

		expect(response.status).toBe(200);
		expect(downstream).toHaveBeenCalledWith(body);
	});

	it("registers the production limit after impersonation and before concrete Auth routes", () => {
		const source = readFileSync(
			new URL("../src/index.ts", import.meta.url),
			"utf8",
		);
		const impersonationRegistration = source.indexOf(
			"createImpersonationMutationGuardMiddleware<AppEnv>({",
		);
		const impersonationUseRegistration = source.lastIndexOf(
			"app.use(",
			impersonationRegistration,
		);
		const limitRegistration = source.indexOf(
			"createSiweRequestBodyLimitMiddleware<AppEnv>()",
		);
		const limitUseRegistration = source.lastIndexOf(
			"app.use(",
			limitRegistration,
		);
		const concreteAuthRouteRegistrations = [
			...source.matchAll(
				/app\.(?:get|post|put|patch|delete)\(\s*["']\/api\/auth/g,
			),
		].map((match) => match.index);
		const onAuthRouteRegistrations = [
			...source.matchAll(/app\.on\([\s\S]{0,500}?["']\/api\/auth/g),
		].map((match) => match.index);
		const firstConcreteAuthRouteRegistration = Math.min(
			...concreteAuthRouteRegistrations,
			...onAuthRouteRegistrations,
		);

		expect(impersonationRegistration).toBeGreaterThan(-1);
		expect(impersonationUseRegistration).toBeGreaterThan(-1);
		expect(limitRegistration).toBeGreaterThan(-1);
		expect(limitUseRegistration).toBeGreaterThan(-1);
		expect(limitUseRegistration).toBeGreaterThan(impersonationUseRegistration);
		expect(limitUseRegistration).toBeLessThan(
			firstConcreteAuthRouteRegistration,
		);
	});
});
