const DEFAULT_DELIVERY_URL =
	"https://cinaauth-delivery.cinagroup.com/cinaauth/delivery";
const textEncoder = new TextEncoder();

const fail = (message) => {
	console.error(message);
	process.exit(1);
};

const required = (name) => {
	const value = process.env[name]?.trim();
	if (!value) fail(`Missing required environment variable ${name}`);
	return value;
};

const hex = (bytes) =>
	[...new Uint8Array(bytes)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");

const hmacSha256 = async (secret, payload) => {
	const key = await crypto.subtle.importKey(
		"raw",
		textEncoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	return hex(
		await crypto.subtle.sign("HMAC", key, textEncoder.encode(payload)),
	);
};

const send = async ({ url, secret, message, deliveryId }) => {
	const body = JSON.stringify(message);
	const timestamp = Math.floor(Date.now() / 1000).toString();
	const signature = await hmacSha256(
		secret,
		`${timestamp}.${deliveryId}.${body}`,
	);
	const response = await fetch(url, {
		method: "POST",
		signal: AbortSignal.timeout(15_000),
		headers: {
			Accept: "application/json",
			Authorization: `Bearer ${secret}`,
			"Content-Type": "application/json",
			"X-CinaAuth-Delivery-Id": deliveryId,
			"X-CinaAuth-Delivery-Signature": `v1=${signature}`,
			"X-CinaAuth-Delivery-Timestamp": timestamp,
		},
		body,
	});
	const result = await response.json().catch(() => undefined);
	if (
		!response.ok ||
		!result ||
		typeof result !== "object" ||
		result.success !== true
	) {
		fail(
			`${message.kind} acceptance delivery failed with HTTP ${response.status}`,
		);
	}
	return result;
};

const main = async () => {
	if (!process.argv.includes("--send")) {
		console.log(
			"Provider acceptance is dry by default. Set CINAAUTH_ACCEPTANCE_EMAIL, CINAAUTH_ACCEPTANCE_PHONE, and CINAAUTH_DELIVERY_WEBHOOK_SECRET, then rerun with --send.",
		);
		return;
	}

	const email = required("CINAAUTH_ACCEPTANCE_EMAIL");
	const phoneNumber = required("CINAAUTH_ACCEPTANCE_PHONE");
	const secret = required("CINAAUTH_DELIVERY_WEBHOOK_SECRET");
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		fail("CINAAUTH_ACCEPTANCE_EMAIL must be a valid email address");
	}
	if (!/^\+[1-9]\d{7,14}$/.test(phoneNumber)) {
		fail("CINAAUTH_ACCEPTANCE_PHONE must use E.164 format");
	}
	if (secret.length < 32) {
		fail("CINAAUTH_DELIVERY_WEBHOOK_SECRET must be at least 32 characters");
	}

	const url = new URL(
		process.env.CINAAUTH_DELIVERY_ACCEPTANCE_URL || DEFAULT_DELIVERY_URL,
	);
	if (url.protocol !== "https:") {
		fail("CINAAUTH_DELIVERY_ACCEPTANCE_URL must use HTTPS");
	}

	const messages = [
		{
			kind: "email-otp",
			payload: { email, otp: "482913", type: "delivery-acceptance" },
		},
		{
			kind: "magic-link",
			payload: {
				email,
				url: "https://accounts.cinaseek.ai/sign-in?acceptance=magic-link",
			},
		},
		{
			kind: "password-reset",
			payload: {
				email,
				url: "https://accounts.cinaseek.ai/reset-password?acceptance=true",
			},
		},
		{
			kind: "phone-otp",
			payload: { phoneNumber, code: "482913" },
		},
		{
			kind: "phone-reset-otp",
			payload: { phoneNumber, code: "731824" },
		},
	];

	let replay;
	for (const message of messages) {
		const deliveryId = crypto.randomUUID();
		const result = await send({ url, secret, message, deliveryId });
		if (result.duplicate !== false) {
			fail(`${message.kind} was unexpectedly classified as a duplicate`);
		}
		console.log(`${message.kind}: provider accepted`);
		if (!replay) replay = { message, deliveryId };
	}

	const duplicate = await send({ url, secret, ...replay });
	if (duplicate.duplicate !== true) {
		fail("Replay KV did not suppress the repeated delivery id");
	}
	console.log("replay-kv: duplicate suppressed");
	console.log(
		"Provider acceptance requests completed. Confirm receipt in the approved email inbox and phone before marking delivery E2E complete.",
	);
};

await main();
