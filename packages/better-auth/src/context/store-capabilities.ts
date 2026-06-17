import type { CinaAuthOptions } from "@cinaauth/core";

export function hasServerSessionStore(options: CinaAuthOptions): boolean {
	return !!options.database || !!options.secondaryStorage;
}

function hasServerAccountStore(options: CinaAuthOptions): boolean {
	return !!options.database;
}

export function shouldBindAccountCookieToSessionUser(
	options: CinaAuthOptions,
): boolean {
	return hasServerAccountStore(options);
}
