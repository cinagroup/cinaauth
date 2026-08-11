import type { ApiKeyDTO } from "@cinaauth/auth-web-contract";

type ApiKeyCreateBody = {
	name: string;
	prefix?: string;
};

type ApiKeyUpdateBody = {
	keyId: string;
	name?: string;
	expiresIn?: number | null;
};

export type ApiKeyRotationCreateBody = {
	configId: string;
	name: string;
	prefix: string;
	expiresIn: number | null;
	metadata?: Record<string, unknown>;
};

type ValidationFailure = {
	ok: false;
	error: { code: string; message: string };
};

type ValidationSuccess<T> = { ok: true; value: T };

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const invalid = (code: string, message: string): ValidationFailure => ({
	ok: false,
	error: { code, message },
});

/** Validate the intentionally narrow, actor-owned Admin create contract. */
export const parseAdminApiKeyCreateBody = (
	value: unknown,
): ValidationResult<ApiKeyCreateBody> => {
	if (!isRecord(value)) {
		return invalid("BAD_REQUEST", "Request body must be an object");
	}
	const unsupportedField = Object.keys(value).find(
		(field) => field !== "name" && field !== "prefix",
	);
	if (unsupportedField) {
		return invalid(
			"UNSUPPORTED_API_KEY_FIELD",
			`Field '${unsupportedField}' is not available through the Admin actor-owned API key endpoint`,
		);
	}

	const name = typeof value.name === "string" ? value.name.trim() : "";
	if (!name || name.length > 128) {
		return invalid(
			"BAD_REQUEST",
			"name is required and must be at most 128 characters",
		);
	}
	if (value.prefix === undefined || value.prefix === "") {
		return { ok: true, value: { name } };
	}
	if (
		typeof value.prefix !== "string" ||
		!value.prefix.match(/^[a-zA-Z0-9_-]+$/)
	) {
		return invalid(
			"BAD_REQUEST",
			"prefix must contain only letters, numbers, underscores, or hyphens",
		);
	}
	return { ok: true, value: { name, prefix: value.prefix } };
};

/** Map the Admin date-oriented edit DTO to the package's expiresIn contract. */
export const parseAdminApiKeyUpdateBody = (
	keyId: string,
	value: unknown,
	now = Date.now(),
): ValidationResult<ApiKeyUpdateBody> => {
	if (!isRecord(value)) {
		return invalid("BAD_REQUEST", "Request body must be an object");
	}
	const unsupportedField = Object.keys(value).find(
		(field) => field !== "name" && field !== "expiresAt",
	);
	if (unsupportedField) {
		return invalid(
			"UNSUPPORTED_API_KEY_FIELD",
			`Field '${unsupportedField}' is not editable through the Admin API key endpoint`,
		);
	}

	const update: ApiKeyUpdateBody = { keyId };
	if (value.name !== undefined) {
		const name = typeof value.name === "string" ? value.name.trim() : "";
		if (!name || name.length > 128) {
			return invalid(
				"BAD_REQUEST",
				"name must be a non-empty string of at most 128 characters",
			);
		}
		update.name = name;
	}
	if (value.expiresAt !== undefined) {
		if (value.expiresAt === null) {
			update.expiresIn = null;
		} else if (typeof value.expiresAt === "string") {
			const expiresAt = Date.parse(value.expiresAt);
			if (!Number.isFinite(expiresAt) || expiresAt <= now) {
				return invalid("BAD_REQUEST", "expiresAt must be a valid future date");
			}
			update.expiresIn = Math.ceil((expiresAt - now) / 1000);
		} else {
			return invalid("BAD_REQUEST", "expiresAt must be a date string or null");
		}
	}
	if (Object.keys(update).length === 1) {
		return invalid("BAD_REQUEST", "No fields to update");
	}
	return { ok: true, value: update };
};

/**
 * Build the public create payload for a non-atomic rotation.
 *
 * Values that the HTTP endpoint cannot preserve are rejected before a new key
 * is created. Rate-limit defaults are reapplied from the preserved configId;
 * request counters intentionally restart for the replacement credential.
 */
export const buildApiKeyRotationCreateBody = (
	key: ApiKeyDTO,
	now = Date.now(),
): ValidationResult<ApiKeyRotationCreateBody> => {
	const unsupportedFields: string[] = [];
	if (!key.enabled) unsupportedFields.push("enabled");
	if (key.permissions !== null) unsupportedFields.push("permissions");
	if (key.remaining !== null) unsupportedFields.push("remaining");
	if (key.refillAmount !== null) unsupportedFields.push("refillAmount");
	if (key.refillInterval !== null) unsupportedFields.push("refillInterval");
	if (!key.name?.trim()) unsupportedFields.push("name");
	if (!key.prefix) unsupportedFields.push("prefix");
	if (!key.configId) unsupportedFields.push("configId");

	let expiresIn: number | null = null;
	if (key.expiresAt !== null) {
		const expiresAt = new Date(key.expiresAt).getTime();
		if (!Number.isFinite(expiresAt) || expiresAt <= now) {
			unsupportedFields.push("expiresAt");
		} else {
			expiresIn = Math.ceil((expiresAt - now) / 1000);
		}
	}

	if (unsupportedFields.length > 0) {
		return invalid(
			"API_KEY_ROTATION_UNSUPPORTED_CONFIGURATION",
			`Rotation cannot preserve: ${unsupportedFields.join(", ")}`,
		);
	}

	const value: ApiKeyRotationCreateBody = {
		configId: key.configId,
		name: key.name as string,
		prefix: key.prefix as string,
		expiresIn,
	};
	if (key.metadata !== null) value.metadata = key.metadata;
	return { ok: true, value };
};
