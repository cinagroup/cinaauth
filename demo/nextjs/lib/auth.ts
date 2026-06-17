/**
 * Type stubs for Cloudflare Workers deployment.
 * All authentication is handled by the Worker API at auth.cinagroup.com.
 */
export const auth = {
	api: {
		getSession: async () => null,
		getOpenIdConfig: async () => ({}),
		getOAuthServerConfig: async () => ({}),
	},
	$Infer: {} as any,
} as any;

export type Session = any;
export type ActiveOrganization = any;
