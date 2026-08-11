import { spawnSync } from "node:child_process";

const LEGACY_SECRETS = [
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

const selectedSecrets = LEGACY_SECRETS.filter(hasValue);
if (
	hasValue("CINAAUTH_DELIVERY_WEBHOOK_SECRET") &&
	process.env.CINAAUTH_DELIVERY_WEBHOOK_SECRET.length < 32
) {
	fail("CINAAUTH_DELIVERY_WEBHOOK_SECRET must be at least 32 characters");
}
const legacyProviderGroups = [
	["RESEND_API_KEY", "RESEND_EMAIL_FROM"],
	["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"],
];
for (const group of legacyProviderGroups) {
	const configured = group.filter(hasValue);
	if (configured.length > 0 && configured.length !== group.length) {
		fail(
			`Legacy provider values must be supplied together: ${group.join(", ")}`,
		);
	}
}

for (const name of selectedSecrets) {
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

console.log(
	selectedSecrets.length > 0
		? "Legacy Delivery Worker secret provisioning complete."
		: "No legacy Worker secrets selected; post-deploy provider configuration remains enabled.",
);
