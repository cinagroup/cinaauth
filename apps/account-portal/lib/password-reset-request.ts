const ACCOUNT_ORIGIN = "https://accounts.cinaseek.ai";

const ACCOUNT_PASSWORD_RESET_URL = `${ACCOUNT_ORIGIN}/reset-password`;

type CaptchaHeaders = { "x-captcha-response": string } | undefined;

export const createPasswordResetRequestPayload = (
	email: string,
	headers: CaptchaHeaders,
) => ({
	email,
	redirectTo: ACCOUNT_PASSWORD_RESET_URL,
	fetchOptions: { headers },
});
