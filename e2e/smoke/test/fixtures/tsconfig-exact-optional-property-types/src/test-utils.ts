/**
 * @see https://github.com/better-auth/better-auth/issues/11899
 */

import { CinaAuth } from "cinaauth";
import { testUtils } from "cinaauth/plugins";

export const auth = CinaAuth({
	plugins: [testUtils()],
});

export const authWithCaptureOTP = CinaAuth({
	plugins: [testUtils({ captureOTP: true })],
});

const ctx = await auth.$context;
ctx.test.createUser();

const ctxWithCaptureOTP = await authWithCaptureOTP.$context;
ctxWithCaptureOTP.test.getOTP?.("user@example.com");
