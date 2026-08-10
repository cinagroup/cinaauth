import type { AuthFetcher } from "@cinaauth/auth-proxy";
import { getCloudflareContext } from "@opennextjs/cloudflare";

type AuthWorkerEnv = {
	AUTH_WORKER?: AuthFetcher;
};

const publicAuthFetcher: AuthFetcher = {
	fetch: (request) => fetch(request),
};

const resolveAuthFetcher = async (): Promise<AuthFetcher> => {
	try {
		const { env } = await getCloudflareContext({ async: true });
		const binding = (env as AuthWorkerEnv).AUTH_WORKER;
		if (binding && typeof binding.fetch === "function") return binding;
	} catch {
		// Local Next.js development can run without Wrangler.
	}
	return publicAuthFetcher;
};

/** Call the authoritative Auth Worker through Service Binding in production. */
export const fetchAuthRequest = async (request: Request) =>
	(await resolveAuthFetcher()).fetch(request);
