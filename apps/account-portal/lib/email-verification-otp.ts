export const EMAIL_VERIFICATION_OTP_LENGTH = 6;

const NON_DIGIT_PATTERN = /\D/g;

export const normalizeEmailVerificationOtp = (value: string) =>
	value.replace(NON_DIGIT_PATTERN, "").slice(0, EMAIL_VERIFICATION_OTP_LENGTH);
