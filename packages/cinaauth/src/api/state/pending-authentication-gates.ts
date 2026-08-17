import { defineRequestState } from "@cinaauth/core/context";

const pendingAuthenticationGates = defineRequestState<Set<string>>(
	() => new Set(),
);

/** @internal Marks an authentication gate as pending for this request. */
export async function markAuthenticationGatePending(gate: string) {
	const gates = await pendingAuthenticationGates.get();
	gates.add(gate);
}

/** @internal Returns whether any authentication gate is pending for this request. */
export async function hasPendingAuthenticationGate() {
	return (await pendingAuthenticationGates.get()).size > 0;
}
