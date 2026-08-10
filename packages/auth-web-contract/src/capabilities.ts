/** Public, secret-free runtime capabilities advertised by the Auth Worker. */
export type AuthCapabilities = {
	version: 4;
	methods: {
		emailPassword: boolean;
		emailOtp: boolean;
		magicLink: boolean;
		phoneOtp: boolean;
		username: boolean;
		passkey: boolean;
		anonymous: boolean;
		twoFactor: boolean;
		siwe: boolean;
		sso: boolean;
	};
	oauthProviders: Array<
		| {
				id: string;
				type: "generic-oauth";
		  }
		| {
				id: "google" | "github";
				type: "social";
		  }
	>;
	oneTap: boolean;
	captcha: {
		enabled: boolean;
		provider: "cloudflare-turnstile" | null;
		siteKey: string | null;
		action: string | null;
		protectedEndpoints: string[];
	};
	billing: boolean;
};
