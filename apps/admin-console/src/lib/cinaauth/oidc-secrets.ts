import { isValidAdminOidcClientSecret } from "@cinaauth/auth-web-contract";
import { getCloudflareContext } from "@opennextjs/cloudflare";

type AdminOidcSecrets = {
	CINAADMIN_OIDC_CLIENT_SECRET?: string;
	CINAADMIN_OIDC_BRIDGE_SECRET?: string;
	CINAADMIN_OIDC_TRANSACTION_SECRET?: string;
	CINAADMIN_OIDC_CLIENT_SECRET_STORE_V2?: unknown;
	CINAADMIN_OIDC_BRIDGE_SECRET_STORE_V2?: unknown;
	CINAADMIN_OIDC_TRANSACTION_SECRET_STORE_V2?: unknown;
};

const SECRET_NAMES = [
	"CINAADMIN_OIDC_CLIENT_SECRET",
	"CINAADMIN_OIDC_BRIDGE_SECRET",
	"CINAADMIN_OIDC_TRANSACTION_SECRET",
] as const;

type AdminOidcSecretName = (typeof SECRET_NAMES)[number];
type AdminOidcStoreBindingName =
	| "CINAADMIN_OIDC_CLIENT_SECRET_STORE_V2"
	| "CINAADMIN_OIDC_BRIDGE_SECRET_STORE_V2"
	| "CINAADMIN_OIDC_TRANSACTION_SECRET_STORE_V2";

const STORE_BINDINGS = {
	CINAADMIN_OIDC_CLIENT_SECRET: "CINAADMIN_OIDC_CLIENT_SECRET_STORE_V2",
	CINAADMIN_OIDC_BRIDGE_SECRET: "CINAADMIN_OIDC_BRIDGE_SECRET_STORE_V2",
	CINAADMIN_OIDC_TRANSACTION_SECRET:
		"CINAADMIN_OIDC_TRANSACTION_SECRET_STORE_V2",
} as const satisfies Record<AdminOidcSecretName, AdminOidcStoreBindingName>;

const resolveRuntimeSecrets = async (): Promise<AdminOidcSecrets> => {
	try {
		const { env } = await getCloudflareContext({ async: true });
		return env as CloudflareEnv & AdminOidcSecrets;
	} catch {
		return {};
	}
};

const validateSecret = (
	value: string | undefined,
	name: AdminOidcSecretName,
): string => {
	const isValid =
		name === "CINAADMIN_OIDC_CLIENT_SECRET"
			? isValidAdminOidcClientSecret(value)
			: Boolean(value && value.length >= 32);
	if (!isValid) {
		throw new Error(`Missing or weak Admin OIDC secret: ${name}`);
	}
	if (typeof value !== "string") {
		throw new Error(`Missing or weak Admin OIDC secret: ${name}`);
	}
	return value;
};

const isSecretsStoreBinding = (
	value: unknown,
): value is { get: () => Promise<string> } =>
	typeof value === "object" &&
	value !== null &&
	"get" in value &&
	typeof value.get === "function";

const resolveValidatedSecret = async (
	runtime: AdminOidcSecrets,
	name: AdminOidcSecretName,
): Promise<string> => {
	const bindingName = STORE_BINDINGS[name];
	const binding = runtime[bindingName];
	if (Object.hasOwn(runtime, bindingName)) {
		if (!isSecretsStoreBinding(binding)) {
			throw new Error(
				`Invalid Admin OIDC Secrets Store binding: ${bindingName}`,
			);
		}
		let value: string;
		try {
			value = await binding.get();
		} catch {
			throw new Error(
				`Unable to read Admin OIDC Secrets Store binding: ${bindingName}`,
			);
		}
		return validateSecret(value, name);
	}
	return validateSecret(runtime[name] ?? process.env[name], name);
};

/** Loads only the HMAC secret needed to verify an Admin recent-auth proof. */
export const getAdminOidcTransactionSecret = async (): Promise<string> => {
	const runtime = await resolveRuntimeSecrets();
	return resolveValidatedSecret(runtime, "CINAADMIN_OIDC_TRANSACTION_SECRET");
};

/** Loads confidential OIDC values at request time, never at build time. */
export const getAdminOidcSecrets = async () => {
	const runtime = await resolveRuntimeSecrets();
	const [clientSecret, bridgeSecret, transactionSecret] = await Promise.all(
		SECRET_NAMES.map((name) => resolveValidatedSecret(runtime, name)),
	);
	return {
		CINAADMIN_OIDC_CLIENT_SECRET: clientSecret,
		CINAADMIN_OIDC_BRIDGE_SECRET: bridgeSecret,
		CINAADMIN_OIDC_TRANSACTION_SECRET: transactionSecret,
	};
};
