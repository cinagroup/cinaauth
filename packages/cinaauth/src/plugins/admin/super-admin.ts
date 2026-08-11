import type { InternalAdapter } from "@cinaauth/core";
import { APIError } from "@cinaauth/core/error";
import { ADMIN_ERROR_CODES } from "./error-codes";
import type { AdminOptions } from "./types";

const SUPER_ADMIN_ROLE = "super_admin";

const hasExactRole = (role: string | null | undefined, expected: string) =>
	role?.split(",").includes(expected) === true;

const protectsSuperAdminRole = (opts: AdminOptions) =>
	Object.prototype.hasOwnProperty.call(opts.roles ?? {}, SUPER_ADMIN_ROLE);

type SuperAdminCandidate = {
	id?: string;
	role?: string | null;
	isAnonymous?: boolean | null;
};

/** Rejects every mutation that would create an anonymous exact super admin. */
export const assertAnonymousUserIsNotSuperAdmin = (
	opts: AdminOptions,
	targetUser: SuperAdminCandidate,
	next?: Pick<SuperAdminCandidate, "isAnonymous" | "role">,
) => {
	if (!protectsSuperAdminRole(opts)) return;

	const targetIsAnonymous = targetUser.isAnonymous === true;
	const nextIsAnonymous = next?.isAnonymous ?? targetUser.isAnonymous;
	const nextRole = next?.role ?? targetUser.role;
	if (
		(targetIsAnonymous || nextIsAnonymous === true) &&
		hasExactRole(nextRole, SUPER_ADMIN_ROLE)
	) {
		throw APIError.from(
			"BAD_REQUEST",
			ADMIN_ERROR_CODES.ANONYMOUS_USER_CANNOT_BE_SUPER_ADMIN,
		);
	}
};

/** Rejects deletion of an anonymous exact super admin until it is demoted. */
export const assertSuperAdminCanBeDeleted = async (
	internalAdapter: InternalAdapter,
	opts: AdminOptions,
	targetUser: SuperAdminCandidate & { id: string },
) => {
	if (
		protectsSuperAdminRole(opts) &&
		targetUser.isAnonymous === true &&
		hasExactRole(targetUser.role, SUPER_ADMIN_ROLE)
	) {
		throw APIError.from(
			"BAD_REQUEST",
			ADMIN_ERROR_CODES.ANONYMOUS_SUPER_ADMIN_MUST_BE_DEMOTED_BEFORE_DELETION,
		);
	}
	await assertSuperAdminRemains(internalAdapter, opts, targetUser);
};

/**
 * Rejects a mutation that would remove the final exact `super_admin` role.
 *
 * The check is runtime-agnostic and intentionally uses the Admin plugin's
 * established comma-separated role semantics. Deployments must additionally
 * serialize concurrent calls because the generic adapter contract does not
 * expose a portable cross-request lock.
 */
export const assertSuperAdminRemains = async (
	internalAdapter: InternalAdapter,
	opts: AdminOptions,
	targetUser: { id: string; role?: string | null },
	nextRole?: string,
) => {
	if (
		!protectsSuperAdminRole(opts) ||
		!hasExactRole(targetUser.role, SUPER_ADMIN_ROLE) ||
		(nextRole !== undefined && hasExactRole(nextRole, SUPER_ADMIN_ROLE))
	) {
		return;
	}

	const candidates = (await internalAdapter.listUsers(
		undefined,
		undefined,
		undefined,
		[
			{
				field: "role",
				operator: "contains",
				value: SUPER_ADMIN_ROLE,
			},
		],
	)) as Array<{ id: string; role?: string }>;
	const hasAnotherSuperAdmin = candidates.some(
		(user) =>
			user.id !== targetUser.id && hasExactRole(user.role, SUPER_ADMIN_ROLE),
	);
	if (!hasAnotherSuperAdmin) {
		throw APIError.from(
			"BAD_REQUEST",
			ADMIN_ERROR_CODES.YOU_CANNOT_REMOVE_LAST_SUPER_ADMIN,
		);
	}
};
