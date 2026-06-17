import { CinaAuth } from "cinaauth";
import { organization } from "cinaauth/plugins";

export const auth = CinaAuth({
	plugins: [
		organization({
			requireEmailVerificationOnInvitation: true,
			creatorRole: "owner",
			teams: {
				enabled: true,
			},
			dynamicAccessControl: {
				maximumRolesPerOrganization: 20,
				enabled: true,
			},
		}),
	],
});

export const auth2 = CinaAuth({
	plugins: [organization({})],
});
