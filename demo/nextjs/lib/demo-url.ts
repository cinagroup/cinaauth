/**
 * Public URLs the auth server and the MCP route must agree on: JWT issuer,
 * token audience, protected-resource metadata, and the organization claim.
 * Server-only: `CINAAUTH_URL` is not exposed to the client bundle.
 */
export const baseURL = new URL(
	process.env.CINAAUTH_URL || "https://demo.better-auth.com",
).origin;

export const mcpResource = `${baseURL}/api/mcp`;

export const organizationClaim = `${baseURL}/org`;
