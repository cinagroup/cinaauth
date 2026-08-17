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
	multiSessionClient,
	oauthPopupClient,
	oneTapClient,
	oneTimeTokenClient,
	organizationClient,
	phoneNumberClient,
	siweClient,
	twoFactorClient,
} from "cinaauth/client/plugins";
import { createAuthClient } from "cinaauth/react";
import { toast } from "sonner";
import { adminAccessControl, adminRoles } from "./admin-access";
import { resolveAuthClientBaseURL } from "./auth-api";
import { dashClient } from "./infra";
import {
	buildTwoFactorAuthPath,
	getPreferredTwoFactorPath,
} from "./two-factor-navigation";

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
		organizationClient({
			dynamicAccessControl: { enabled: true },
			teams: { enabled: true },
		}),
		twoFactorClient({
			onTwoFactorRedirect({ twoFactorMethods }) {
				window.location.href = buildTwoFactorAuthPath(
					getPreferredTwoFactorPath(twoFactorMethods),
					new URLSearchParams(window.location.search),
				);
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
