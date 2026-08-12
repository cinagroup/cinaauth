import { describe, expect, it } from "vitest";
import {
	createImpersonationMutationAuditBody,
	getImpersonationMutationRejection,
	requiresImpersonationMutationGuard,
} from "../src/impersonation-mutation-guard";

describe("impersonated session mutation guard", () => {
	it.each([
		["/api/auth/two-factor/enable", "POST"],
		["/api/auth/privacy/async-export", "POST"],
		["/api/auth/privacy/async-export", "DELETE"],
		["/api/auth/api-key/create", "POST"],
		["/api/auth/oauth2/create-client", "POST"],
		["/api/auth/organization/update", "POST"],
		["/api/auth/admin/set-role", "POST"],
		["/api/auth/email-otp/check-verification-otp", "POST"],
		["/api/auth/example", "PUT"],
		["/api/auth/example", "PATCH"],
	])("classifies %s %s as a potentially mutating request", (pathname, method) => {
		expect(requiresImpersonationMutationGuard(pathname, method)).toBe(true);
	});

	it.each([
		["/api/auth/callback/google", "GET"],
		["/api/auth/oauth2/callback/github", "GET"],
		["/api/auth/verify-email", "GET"],
		["/api/auth/delete-user/callback", "GET"],
		["/api/auth/magic-link/verify", "GET"],
		["/api/auth/oauth2/authorize", "GET"],
		["/api/auth/mcp/authorize", "GET"],
		["/api/auth/oauth-proxy-callback", "GET"],
		["/api/auth/oauth-popup/start", "GET"],
		["/api/auth/electron/init-oauth-proxy", "GET"],
		["/api/auth/one-time-token/generate", "GET"],
		["/api/auth/passkey/generate-register-options", "GET"],
		["/api/auth/passkey/generate-authenticate-options", "GET"],
		["/api/auth/sso/callback", "GET"],
		["/api/auth/sso/callback/acme", "GET"],
		["/api/auth/sso/saml2/callback/acme", "GET"],
		["/api/auth/subscription/success", "GET"],
		["/api/auth/token", "GET"],
		["/api/auth/token", "HEAD"],
	])("includes the state-changing GET/HEAD request %s", (pathname, method) => {
		expect(requiresImpersonationMutationGuard(pathname, method)).toBe(true);
	});

	it.each([
		["/api/auth/admin/stop-impersonating", "POST"],
		["/api/auth/admin/stop-impersonating///", "POST"],
		["/api/auth/sign-out", "POST"],
		["/api/auth/oauth2/endsession", "POST"],
		["/api/auth/get-session", "POST"],
		["/api/auth/admin/list-user-passkeys", "POST"],
		["/api/auth/admin/list-user-sessions", "POST"],
		["/api/auth/admin/has-permission", "POST"],
		["/api/auth/organization/check-slug", "POST"],
		["/api/auth/organization/has-permission", "POST"],
		["/api/auth/privacy/deletion-receipt/verify", "POST"],
		["/api/auth/is-username-available", "POST"],
		["/api/auth/verify-password", "POST"],
		["/api/auth/sso/saml2/logout/acme", "POST"],
		["/api/auth/sso/saml2/sp/slo/acme", "POST"],
		["/api/auth/get-session", "GET"],
		["/api/auth/organization/list", "GET"],
		["/api/auth/organization/list", "HEAD"],
		["/api/auth/organization/update", "OPTIONS"],
		["/api/ready", "POST"],
	])("keeps the recovery or read request %s %s available", (pathname, method) => {
		expect(requiresImpersonationMutationGuard(pathname, method)).toBe(false);
	});

	it("matches recovery paths exactly instead of allowing suffix bypasses", () => {
		expect(
			requiresImpersonationMutationGuard(
				"/api/auth/admin/stop-impersonating/extra",
				"POST",
			),
		).toBe(true);
		expect(
			requiresImpersonationMutationGuard("/api/auth/sign-out/continue", "POST"),
		).toBe(true);
		expect(
			requiresImpersonationMutationGuard("/api/auth/sso/saml2/logout/", "POST"),
		).toBe(true);
	});

	it("rejects only a classified mutation with a non-empty impersonation actor", () => {
		expect(
			getImpersonationMutationRejection(
				"/api/auth/change-password",
				"POST",
				"admin-user-id",
			),
		).toEqual({
			status: 403,
			code: "IMPERSONATION_NOT_ALLOWED",
			message: "Account changes are unavailable while impersonating",
		});

		for (const impersonatedBy of [undefined, null, "", "   "]) {
			expect(
				getImpersonationMutationRejection(
					"/api/auth/change-password",
					"POST",
					impersonatedBy,
				),
			).toBeUndefined();
		}
		expect(
			getImpersonationMutationRejection(
				"/api/auth/admin/stop-impersonating",
				"POST",
				"admin-user-id",
			),
		).toBeUndefined();
	});

	it("builds a redacted audit body that attributes the original admin and target", () => {
		expect(
			createImpersonationMutationAuditBody({
				impersonatedBy: "admin-user-id",
				targetUserId: "target-user-id",
				pathname: "/api/auth/api-key/create",
				method: "post",
			}),
		).toEqual({
			category: "admin",
			action: "admin.impersonation_mutation_rejected",
			result: "failure",
			actorSite: "auth-api",
			targetType: "user",
			targetId: "target-user-id",
			metadata: {
				actorId: "admin-user-id",
				requestMethod: "POST",
				requestPath: "/api/auth/api-key/create",
			},
		});
	});
});
