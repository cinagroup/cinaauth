import { CinaAuth } from "cinaauth";
import { username } from "cinaauth/plugins";

export const auth = CinaAuth({
	emailAndPassword: {
		enabled: true,
	},
	plugins: [
		username({
			minUsernameLength: 4,
			maxUsernameLength: 15,
		}),
	],
});
