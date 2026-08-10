import assert from "node:assert/strict";
import test from "node:test";
import {
	DEFAULT_TURNSTILE_DOMAINS,
	parseTurnstileDomains,
	selectCloudflareAccount,
	selectTurnstileWidget,
	turnstileWidgetNeedsUpdate,
} from "./configure-turnstile.mjs";

test("uses a unique and sorted production hostname allow-list", () => {
	assert.deepEqual(parseTurnstileDomains(), [...DEFAULT_TURNSTILE_DOMAINS].sort());
	assert.deepEqual(
		parseTurnstileDomains("demo-auth.cinagroup.com,AUTH.CINASEEK.AI,demo-auth.cinagroup.com"),
		["auth.cinaseek.ai", "demo-auth.cinagroup.com"],
	);
});

test("rejects URLs and malformed hostname inputs", () => {
	assert.throws(
		() => parseTurnstileDomains("https://demo-auth.cinagroup.com"),
		/Invalid Turnstile domain/,
	);
	assert.throws(
		() => parseTurnstileDomains("demo-auth.cinagroup.com/path"),
		/Invalid Turnstile domain/,
	);
});

test("requires an unambiguous Cloudflare account", () => {
	assert.deepEqual(
		selectCloudflareAccount([{ id: "one", name: "CinaGroup" }]),
		{ id: "one", name: "CinaGroup" },
	);
	assert.deepEqual(selectCloudflareAccount([], "configured"), {
		id: "configured",
		name: "configured account",
	});
	assert.throws(() => selectCloudflareAccount([]), /CLOUDFLARE_ACCOUNT_ID/);
});

test("never chooses between duplicate widget names", () => {
	assert.equal(
		selectTurnstileWidget([{ name: "CinaAuth Production", sitekey: "one" }], "CinaAuth Production")
			?.sitekey,
		"one",
	);
	assert.throws(
		() =>
			selectTurnstileWidget(
				[
					{ name: "CinaAuth Production", sitekey: "one" },
					{ name: "CinaAuth Production", sitekey: "two" },
				],
				"CinaAuth Production",
			),
		/Multiple Turnstile widgets/,
	);
});

test("updates only when managed widget policy drifts", () => {
	const domains = ["auth.cinaseek.ai", "demo-auth.cinagroup.com"];
	assert.equal(
		turnstileWidgetNeedsUpdate(
			{
				mode: "managed",
				clearance_level: "no_clearance",
				domains: [...domains].reverse(),
			},
			domains,
		),
		false,
	);
	assert.equal(
		turnstileWidgetNeedsUpdate(
			{ mode: "invisible", clearance_level: "no_clearance", domains },
			domains,
		),
		true,
	);
});
