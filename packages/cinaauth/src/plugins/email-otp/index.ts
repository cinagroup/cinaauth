import type { CinaAuthPlugin } from "@cinaauth/core";
import { createAuthMiddleware } from "@cinaauth/core/api";
import { generateRandomString } from "../../crypto";
import { getDate } from "../../utils/date";
import { getEndpointResponse } from "../../utils/plugin-helper";
import { PACKAGE_VERSION } from "../../version";
import { EMAIL_OTP_ERROR_CODES } from "./error-codes";
import { storeOTP } from "./otp-token";
import {
	changeEmailEmailOTP,
	checkVerificationOTP,
	createVerificationOTP,
	forgetPasswordEmailOTP,
	getVerificationOTP,
	requestEmailChangeEmailOTP,
	requestPasswordResetEmailOTP,
	resetPasswordEmailOTP,
	sendVerificationOTP,
	signInEmailOTP,
	verifyEmailOTP,
} from "./routes";
import type { EmailOTPOptions } from "./types";
import { toOTPIdentifier } from "./utils";

declare module "@cinaauth/core" {
	interface CinaAuthPluginRegistry<AuthOptions, Options> {
		"email-otp": {
			creator: typeof emailOTP;
		};
	}
}

export type { EmailOTPOptions } from "./types";

const defaultOTPGenerator = (options: EmailOTPOptions) =>
	generateRandomString(options.otpLength ?? 6, "0-9");

export const emailOTP = (options: EmailOTPOptions) => {
	const opts = {
		expiresIn: 5 * 60,
		generateOTP: () => defaultOTPGenerator(options),
		storeOTP: "plain",
		...options,
	} satisfies EmailOTPOptions;

	const sendVerificationOTPAction = sendVerificationOTP(opts);
	type PasswordResetEndpoints = {
		requestPasswordResetEmailOTP: ReturnType<
			typeof requestPasswordResetEmailOTP
		>;
		forgetPasswordEmailOTP: ReturnType<typeof forgetPasswordEmailOTP>;
		resetPasswordEmailOTP: ReturnType<typeof resetPasswordEmailOTP>;
	};
	const passwordResetEndpoints: PasswordResetEndpoints =
		opts.disablePasswordReset
			? // The public endpoint type remains stable for existing integrations while
				// the disabled runtime registry receives no password-reset routes.
				({} as PasswordResetEndpoints)
			: {
					requestPasswordResetEmailOTP: requestPasswordResetEmailOTP(opts),
					forgetPasswordEmailOTP: forgetPasswordEmailOTP(opts),
					resetPasswordEmailOTP: resetPasswordEmailOTP(opts),
				};

	return {
		id: "email-otp",
		version: PACKAGE_VERSION,
		init(ctx) {
			if (!opts.overrideDefaultEmailVerification) {
				return;
			}
			return {
				options: {
					emailVerification: {
						async sendVerificationEmail(data, request) {
							await ctx.runInBackgroundOrAwait(
								sendVerificationOTPAction({
									context: ctx,
									request: request,
									body: {
										email: data.user.email,
										type: "email-verification",
									},
									//@ts-expect-error
									ctx,
								}),
							);
						},
					},
				},
			};
		},
		endpoints: {
			sendVerificationOTP: sendVerificationOTPAction,
			createVerificationOTP: createVerificationOTP(opts),
			getVerificationOTP: getVerificationOTP(opts),
			checkVerificationOTP: checkVerificationOTP(opts),
			verifyEmailOTP: verifyEmailOTP(opts),
			signInEmailOTP: signInEmailOTP(opts),
			...passwordResetEndpoints,
			requestEmailChangeEmailOTP: requestEmailChangeEmailOTP(opts),
			changeEmailEmailOTP: changeEmailEmailOTP(opts),
		},
		hooks: {
			after: [
				{
					matcher(context) {
						return !!(
							context.path?.startsWith("/sign-up") &&
							opts.sendVerificationOnSignUp &&
							!opts.overrideDefaultEmailVerification
						);
					},
					handler: createAuthMiddleware(async (ctx) => {
						const response = await getEndpointResponse<{
							user: { email: string };
						}>(ctx);
						const email = response?.user.email;
						if (email) {
							const otp =
								opts.generateOTP({ email, type: "email-verification" }, ctx) ||
								defaultOTPGenerator(opts);
							const storedOTP = await storeOTP(ctx, opts, otp);
							await ctx.context.internalAdapter.createVerificationValue({
								value: `${storedOTP}:0`,
								identifier: toOTPIdentifier("email-verification", email),
								expiresAt: getDate(opts.expiresIn, "sec"),
							});
							await ctx.context.runInBackgroundOrAwait(
								options.sendVerificationOTP(
									{
										email,
										otp,
										type: "email-verification",
									},
									ctx,
								),
							);
						}
					}),
				},
			],
		},

		rateLimit: [
			{
				pathMatcher(path) {
					return path === "/email-otp/send-verification-otp";
				},
				window: opts.rateLimit?.window || 60,
				max: opts.rateLimit?.max || 3,
			},
			{
				pathMatcher(path) {
					return path === "/email-otp/check-verification-otp";
				},
				window: opts.rateLimit?.window || 60,
				max: opts.rateLimit?.max || 3,
			},
			{
				pathMatcher(path) {
					return path === "/email-otp/verify-email";
				},
				window: opts.rateLimit?.window || 60,
				max: opts.rateLimit?.max || 3,
			},
			{
				pathMatcher(path) {
					return path === "/sign-in/email-otp";
				},
				window: opts.rateLimit?.window || 60,
				max: opts.rateLimit?.max || 3,
			},
			...(opts.disablePasswordReset
				? []
				: [
						{
							pathMatcher(path: string) {
								return path === "/email-otp/request-password-reset";
							},
							window: opts.rateLimit?.window || 60,
							max: opts.rateLimit?.max || 3,
						},
						{
							pathMatcher(path: string) {
								return path === "/email-otp/reset-password";
							},
							window: opts.rateLimit?.window || 60,
							max: opts.rateLimit?.max || 3,
						},
						{
							pathMatcher(path: string) {
								return path === "/forget-password/email-otp";
							},
							window: opts.rateLimit?.window || 60,
							max: opts.rateLimit?.max || 3,
						},
					]),
			{
				pathMatcher(path) {
					return path === "/email-otp/request-email-change";
				},
				window: opts.rateLimit?.window || 60,
				max: opts.rateLimit?.max || 3,
			},
			{
				pathMatcher(path) {
					return path === "/email-otp/change-email";
				},
				window: opts.rateLimit?.window || 60,
				max: opts.rateLimit?.max || 3,
			},
		],
		options,
		$ERROR_CODES: EMAIL_OTP_ERROR_CODES,
	} satisfies CinaAuthPlugin;
};
