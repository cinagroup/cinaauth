import assert from "node:assert/strict";
import test from "node:test";
import {
	DELIVERY_QUEUE_RETENTION_SECONDS,
	evaluateRetentionChange,
} from "./configure-delivery-queues.mjs";

test("keeps the exact 24-hour retention unchanged", () => {
	assert.equal(
		evaluateRetentionChange({
			currentRetentionSeconds: DELIVERY_QUEUE_RETENTION_SECONDS,
		}),
		"unchanged",
	);
});

test("allows an empty queue to reduce from the four-day default", () => {
	assert.equal(
		evaluateRetentionChange({
			currentRetentionSeconds: 345_600,
			backlogCount: 0,
		}),
		"update",
	);
});

test("blocks retention reduction while any message is backlogged", () => {
	assert.equal(
		evaluateRetentionChange({
			currentRetentionSeconds: 345_600,
			backlogCount: 1,
		}),
		"blocked",
	);
	assert.equal(
		evaluateRetentionChange({
			currentRetentionSeconds: 345_600,
		}),
		"blocked",
	);
});

test("allows a shorter retention setting to be normalized", () => {
	assert.equal(
		evaluateRetentionChange({
			currentRetentionSeconds: 3_600,
		}),
		"update",
	);
});
