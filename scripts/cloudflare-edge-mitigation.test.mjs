import assert from "node:assert/strict";
import test from "node:test";

import { classifyCloudflareEdgeMitigation } from "./cloudflare-edge-mitigation.mjs";

const classify = ({ status = 403, headers = {}, body = "" } = {}) =>
	classifyCloudflareEdgeMitigation({
		status,
		headers: new Headers(headers),
		body,
	});

test("accepts only an HTTP 403 Cloudflare challenge header", () => {
	assert.deepEqual(
		classify({
			headers: {
				"cf-mitigated": " challenge ",
				"content-type": "text/html; charset=UTF-8",
			},
		}),
		{
			kind: "edge-mitigated",
			evidence: "cf-mitigated-challenge",
		},
	);
	assert.equal(
		classify({
			status: 429,
			headers: { "cf-mitigated": "challenge" },
		}),
		undefined,
	);
	assert.equal(classify({ headers: { "cf-mitigated": "managed" } }), undefined);
	for (const contentType of [undefined, "application/json"]) {
		assert.equal(
			classify({
				headers: {
					"cf-mitigated": "challenge",
					...(contentType ? { "content-type": contentType } : {}),
				},
			}),
			undefined,
		);
	}
});

test("accepts an HTTP 403 Cloudflare branded blocking page with a Ray", () => {
	assert.deepEqual(
		classify({
			headers: {
				"cf-ray": "9b1234567890-SIN",
				"content-type": "text/html; charset=UTF-8",
			},
			body: "<!doctype html><html><head><title>Attention Required! | Cloudflare</title></head><body>Sorry, you have been blocked. <span>Cloudflare Ray ID: 9b1234567890</span></body></html>",
		}),
		{
			kind: "edge-mitigated",
			evidence: "cf-ray-block-page",
		},
	);
	assert.deepEqual(
		classify({
			headers: {
				"cf-ray": "A2AE9A6F5E4F6DC4-SEA",
				"content-type": "text/html",
			},
			body: "<!doctype html><title>Attention Required! | Cloudflare</title><p>Cloudflare Ray ID: <strong>a2ae9a6f5e4f6dc4</strong></p>",
		}),
		{
			kind: "edge-mitigated",
			evidence: "cf-ray-block-page",
		},
	);
});

test("rejects a branded page whose Ray does not match the response header", () => {
	assert.equal(
		classify({
			headers: {
				"cf-ray": "9b1234567890-SIN",
				"content-type": "text/html",
			},
			body: "<!doctype html><title>Attention Required! | Cloudflare</title><p>Sorry, you have been blocked. Cloudflare Ray ID: a2ae9a6f5e4f6dc4</p>",
		}),
		undefined,
	);
	assert.equal(
		classify({
			headers: {
				"cf-ray": "9b1234567890-SIN",
				"content-type": "text/html",
			},
			body: "<!doctype html><title>Attention Required! | Cloudflare</title><p>Sorry, you have been blocked.</p>",
		}),
		undefined,
	);
});

test("rejects ordinary JSON 403 responses even when they traverse Cloudflare", () => {
	assert.equal(
		classify({
			headers: {
				"cf-ray": "9b1234567890-SIN",
				"content-type": "application/json",
			},
			body: '{"error":"forbidden by application policy","provider":"cloudflare"}',
		}),
		undefined,
	);
});

test("rejects branded blocking HTML without a Cloudflare Ray", () => {
	assert.equal(
		classify({
			headers: { "content-type": "text/html" },
			body: "<!doctype html><title>Attention Required! | Cloudflare</title>",
		}),
		undefined,
	);
	assert.equal(
		classify({
			headers: {
				"cf-ray": "9b1234567890-SIN",
				"content-type": "application/json",
			},
			body: "<!doctype html><title>Attention Required! | Cloudflare</title>",
		}),
		undefined,
	);
});

test("rejects generic HTML and non-403 branded pages", () => {
	assert.equal(
		classify({
			headers: {
				"cf-ray": "9b1234567890-SIN",
				"content-type": "text/html",
			},
			body: "<!doctype html><p>Cloudflare powers this site.</p>",
		}),
		undefined,
	);
	assert.equal(
		classify({
			status: 503,
			headers: {
				"cf-ray": "9b1234567890-SIN",
				"content-type": "text/html",
			},
			body: "<!doctype html><title>Attention Required! | Cloudflare</title>",
		}),
		undefined,
	);
});
