import { apiKeyClient } from "@cinaauth/api-key/client";
import { electronProxyClient } from "@cinaauth/electron/proxy";
import { oauthProviderClient } from "@cinaauth/oauth-provider/client";
import { passkeyClient } from "@cinaauth/passkey/client";
import { scimClient } from "@cinaauth/scim/client";
import { ssoClient } from "@cinaauth/sso/client";
import { stripeClient } from "@cinaauth/stripe/client";
import {
	adminClient,
	anonymousClient,
	deviceAuthorizationClient,
	emailOTPClient,
	genericOAuthClient,
	jwtClient,
	lastLoginMethodClient,
	magicLinkClient,
	multiSessionClient,
	oauthPopupClient,
	oneTapClient,
	oneTimeTokenClient,
	organizationClient,
	phoneNumberClient,
	siweClient,
	twoFactorClient,
	usernameClient,
} from "cinaauth/client/plugins";
import { createAuthClient } from "cinaauth/react";
import { toast } from "sonner";
import { adminAccessControl, adminRoles } from "./admin-access";
import { resolveAuthClientBaseURL } from "./auth-api";
import { dashClient } from "./infra";

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export const authClient = createAuthClient({
	baseURL: resolveAuthClientBaseURL(
		typeof window === "undefined" ? undefined : window.location.origin,
	),
	plugins: [
		dashClient(),
		apiKeyClient(),
		jwtClient(),
		anonymousClient(),
		usernameClient(),
		organizationClient({
			dynamicAccessControl: { enabled: true },
			teams: { enabled: true },
		}),
		twoFactorClient({
			onTwoFactorRedirect() {
				window.location.href = "/two-factor";
			},
		}),
		passkeyClient(),
		adminClient({ ac: adminAccessControl, roles: adminRoles }),
		multiSessionClient(),
		oauthProviderClient(),
		oauthPopupClient(),
		ssoClient({
			domainVerification: {
				enabled: true,
			},
		}),
		scimClient(),
		stripeClient({
			subscription: true,
		}),
		deviceAuthorizationClient(),
		lastLoginMethodClient(),
		emailOTPClient(),
		magicLinkClient(),
		phoneNumberClient(),
		genericOAuthClient(),
		oneTimeTokenClient(),
		siweClient(),
		...(googleClientId ? [oneTapClient({ clientId: googleClientId })] : []),
		electronProxyClient({
			protocol: {
				scheme: "com.cinaauth.demo",
			},
		}),
	],
	fetchOptions: {
		onError(e) {
			if (e.error.status === 429) {
				toast.error("Too many requests. Please try again later.");
			}
		},
	},
});
