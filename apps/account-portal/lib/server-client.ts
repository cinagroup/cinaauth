import { oauthProviderResourceClient } from "@cinaauth/oauth-provider/resource-client";
import { createAuthClient } from "cinaauth/client";
export const serverClient = createAuthClient({
	plugins: [oauthProviderResourceClient()],
});
