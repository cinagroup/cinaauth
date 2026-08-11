import { spawnSync } from "node:child_process";

const REQUIRED_SECRETS = [
	"CINAADMIN_OIDC_CLIENT_SECRET",
	"CINAADMIN_OIDC_BRIDGE_SECRET",
	"CINAADMIN_OIDC_TRANSACTION_SECRET",
];
const isDryRun = process.argv.includes("--dry-run");
const ADMIN_OIDC_CLIENT_SECRET_PREFIX = "cina_cs_";
const ADMIN_OIDC_CLIENT_SECRET_MIN_PAYLOAD_LENGTH = 32;

const fail = (message) => {
	console.error(message);
	process.exit(1);
};

for (const name of REQUIRED_SECRETS) {
	const value = process.env[name];
	if (!value || value.length < 32) {
		fail(`${name} must be configured with at least 32 characters`);
	}
	if (
		name === "CINAADMIN_OIDC_CLIENT_SECRET" &&
		(!value.startsWith(ADMIN_OIDC_CLIENT_SECRET_PREFIX) ||
			value.length - ADMIN_OIDC_CLIENT_SECRET_PREFIX.length <
				ADMIN_OIDC_CLIENT_SECRET_MIN_PAYLOAD_LENGTH)
	) {
		fail(
			`CINAADMIN_OIDC_CLIENT_SECRET must start with ${ADMIN_OIDC_CLIENT_SECRET_PREFIX} and contain at least ${ADMIN_OIDC_CLIENT_SECRET_MIN_PAYLOAD_LENGTH} payload characters`,
		);
	}
	if (isDryRun) {
		console.log(`Would provision ${name}`);
		continue;
	}
	const result = spawnSync("wrangler", ["secret", "put", name], {
		input: value,
		shell: true,
		stdio: ["pipe", "inherit", "inherit"],
	});
	if (result.status !== 0) process.exit(result.status ?? 1);
	console.log(`Provisioned ${name}`);
}

console.log("Admin Console OIDC secret provisioning complete.");
