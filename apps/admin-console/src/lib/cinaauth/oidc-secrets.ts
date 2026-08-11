import { isValidAdminOidcClientSecret } from "@cinaauth/auth-web-contract";
import { getCloudflareContext } from "@opennextjs/cloudflare";

type AdminOidcSecrets = {
	CINAADMIN_OIDC_CLIENT_SECRET?: string;
	CINAADMIN_OIDC_BRIDGE_SECRET?: string;
	CINAADMIN_OIDC_TRANSACTION_SECRET?: string;
};

const SECRET_NAMES = [
	"CINAADMIN_OIDC_CLIENT_SECRET",
	"CINAADMIN_OIDC_BRIDGE_SECRET",
	"CINAADMIN_OIDC_TRANSACTION_SECRET",
] as const;

const resolveRuntimeSecrets = async (): Promise<AdminOidcSecrets> => {
	try {
		const { env } = await getCloudflareContext({ async: true });
		return env as CloudflareEnv & AdminOidcSecrets;
	} catch {
		return {};
	}
};

const resolveValidatedSecret = (
	runtime: AdminOidcSecrets,
	name: (typeof SECRET_NAMES)[number],
): string => {
	const value = runtime[name] ?? process.env[name];
	const isValid =
		name === "CINAADMIN_OIDC_CLIENT_SECRET"
			? isValidAdminOidcClientSecret(value)
			: Boolean(value && value.length >= 32);
	if (!isValid) {
		throw new Error(`Missing or weak Admin OIDC secret: ${name}`);
	}
	return value!;
};

/** Loads only the HMAC secret needed to verify an Admin recent-auth proof. */
export const getAdminOidcTransactionSecret = async (): Promise<string> => {
	const runtime = await resolveRuntimeSecrets();
	return resolveValidatedSecret(runtime, "CINAADMIN_OIDC_TRANSACTION_SECRET");
};

/** Loads confidential OIDC values at request time, never at build time. */
export const getAdminOidcSecrets = async () => {
	const runtime = await resolveRuntimeSecrets();
	const result: Record<(typeof SECRET_NAMES)[number], string> = {
		CINAADMIN_OIDC_CLIENT_SECRET: "",
		CINAADMIN_OIDC_BRIDGE_SECRET: "",
		CINAADMIN_OIDC_TRANSACTION_SECRET: "",
	};
	for (const name of SECRET_NAMES) {
		result[name] = resolveValidatedSecret(runtime, name);
	}
	return result;
};
