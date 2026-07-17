import { spawnSync } from "node:child_process";

const REQUIRED_SECRETS = [
	"CINAAUTH_DELIVERY_WEBHOOK_SECRET",
	"RESEND_API_KEY",
	"RESEND_EMAIL_FROM",
	"TWILIO_ACCOUNT_SID",
	"TWILIO_AUTH_TOKEN",
	"TWILIO_FROM_NUMBER",
];

const isDryRun = process.argv.includes("--dry-run");

const fail = (message) => {
	console.error(message);
	process.exit(1);
};

const hasValue = (name) => {
	const value = process.env[name];
	return typeof value === "string" && value.length > 0;
};

for (const name of REQUIRED_SECRETS) {
	if (!hasValue(name)) {
		fail(`Missing required environment variable ${name}`);
	}
}
if (process.env.CINAAUTH_DELIVERY_WEBHOOK_SECRET.length < 32) {
	fail("CINAAUTH_DELIVERY_WEBHOOK_SECRET must be at least 32 characters");
}

for (const name of REQUIRED_SECRETS) {
	if (isDryRun) {
		console.log(`Would provision ${name}`);
		continue;
	}
	const result = spawnSync("wrangler", ["secret", "put", name], {
		input: process.env[name],
		shell: true,
		stdio: ["pipe", "inherit", "inherit"],
	});
	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
	console.log(`Provisioned ${name}`);
}

console.log("Delivery Worker secret provisioning complete.");
