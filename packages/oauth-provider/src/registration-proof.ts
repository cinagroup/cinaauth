import type { AuthContext, GenericEndpointContext } from "@cinaauth/core";
import { makeSignature } from "cinaauth/crypto";

const registrationProofPrefix = "oauth-provider:prompt-create:";
const registrationChallengeBridgePrefix =
	"oauth-provider:prompt-create-challenge:";

export type RegistrationProofIntent = {
	querySignature: string;
	expiresAt: Date;
};

type RegistrationProofBinding = {
	querySignature: string;
	sessionId: string;
	userId: string;
};

export function supportsAtomicRegistrationProofStorage(
	ctx: GenericEndpointContext | AuthContext,
) {
	const context = "context" in ctx ? ctx.context : ctx;
	const secondaryStorage = context.options.secondaryStorage;
	return (
		!secondaryStorage ||
		context.options.verification?.storeInDatabase === true ||
		typeof secondaryStorage.getAndDelete === "function"
	);
}

export function supportsDatabaseBackedRegistrationBridge(
	ctx: GenericEndpointContext | AuthContext,
) {
	const context = "context" in ctx ? ctx.context : ctx;
	return (
		!context.options.secondaryStorage ||
		context.options.verification?.storeInDatabase === true
	);
}

async function getRegistrationProofIdentifier(
	secret: string,
	binding: RegistrationProofBinding,
) {
	const digest = await makeSignature(
		JSON.stringify([
			"oauth-provider-prompt-create",
			binding.querySignature,
			binding.sessionId,
			binding.userId,
		]),
		secret,
	);
	return `${registrationProofPrefix}${digest}`;
}

async function getRegistrationChallengeBridgeIdentifier(
	secret: string,
	challengeId: string,
) {
	const digest = await makeSignature(
		JSON.stringify(["oauth-provider-prompt-create-challenge", challengeId]),
		secret,
	);
	return `${registrationChallengeBridgePrefix}${digest}`;
}

export async function issueRegistrationChallengeBridge(
	ctx: GenericEndpointContext | AuthContext,
	challengeId: string,
	intent: RegistrationProofIntent,
	challengeExpiresAt: Date,
) {
	const context = "context" in ctx ? ctx.context : ctx;
	if (!supportsDatabaseBackedRegistrationBridge(context)) return false;
	const expiresAt = new Date(
		Math.min(intent.expiresAt.getTime(), challengeExpiresAt.getTime()),
	);
	if (expiresAt.getTime() <= Date.now()) return false;

	const identifier = await getRegistrationChallengeBridgeIdentifier(
		context.secret,
		challengeId,
	);
	await context.internalAdapter.createVerificationValue({
		identifier,
		value: JSON.stringify({
			querySignature: intent.querySignature,
			expiresAt: intent.expiresAt.toISOString(),
		}),
		expiresAt,
	});
	return true;
}

export async function consumeRegistrationChallengeBridge(
	ctx: GenericEndpointContext | AuthContext,
	challengeId: string,
): Promise<RegistrationProofIntent | null> {
	const context = "context" in ctx ? ctx.context : ctx;
	if (!supportsDatabaseBackedRegistrationBridge(context)) return null;
	const identifier = await getRegistrationChallengeBridgeIdentifier(
		context.secret,
		challengeId,
	);
	const bridge =
		await context.internalAdapter.consumeVerificationValue(identifier);
	if (!bridge) return null;

	try {
		const parsed = JSON.parse(bridge.value) as {
			querySignature?: unknown;
			expiresAt?: unknown;
		};
		if (
			typeof parsed.querySignature !== "string" ||
			typeof parsed.expiresAt !== "string"
		) {
			return null;
		}
		const expiresAt = new Date(parsed.expiresAt);
		if (
			!Number.isFinite(expiresAt.getTime()) ||
			expiresAt.getTime() <= Date.now()
		) {
			return null;
		}
		return { querySignature: parsed.querySignature, expiresAt };
	} catch {
		return null;
	}
}

export async function issueRegistrationProof(
	ctx: GenericEndpointContext | AuthContext,
	binding: RegistrationProofBinding,
	expiresAt: Date,
) {
	const context = "context" in ctx ? ctx.context : ctx;
	if (!supportsAtomicRegistrationProofStorage(ctx)) return false;
	if (expiresAt.getTime() <= Date.now()) return false;

	const identifier = await getRegistrationProofIdentifier(
		context.secret,
		binding,
	);
	await context.internalAdapter.createVerificationValue({
		identifier,
		value: binding.userId,
		expiresAt,
	});
	return true;
}

export async function consumeRegistrationProof(
	ctx: GenericEndpointContext,
	binding: RegistrationProofBinding,
) {
	if (!supportsAtomicRegistrationProofStorage(ctx)) return false;

	const identifier = await getRegistrationProofIdentifier(
		ctx.context.secret,
		binding,
	);
	const proof =
		await ctx.context.internalAdapter.consumeVerificationValue(identifier);
	return proof?.value === binding.userId;
}
