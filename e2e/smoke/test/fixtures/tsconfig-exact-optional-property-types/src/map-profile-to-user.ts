/**
 * @see https://github.com/better-auth/better-auth/issues/6491
 */
import { CinaAuth } from "cinaauth";
import { genericOAuth } from "cinaauth/plugins";

export const auth = CinaAuth({
	socialProviders: {
		google: {
			clientId: "google-client-id",
			clientSecret: "google-client-secret",
			mapProfileToUser: () => ({ image: undefined }),
		},
	},
	plugins: [
		genericOAuth({
			config: [
				{
					providerId: "example",
					clientId: "example-client-id",
					discoveryUrl: "https://example.com/.well-known/openid-configuration",
					mapProfileToUser: (profile) => ({
						name: profile.name,
						email: profile.email,
						image: profile.image,
					}),
				},
			],
		}),
	],
});
